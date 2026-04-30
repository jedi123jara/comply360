/**
 * AI Provider — abstracción unificada para OpenAI y Ollama (local)
 *
 * Soporta:
 *  - Detección automática del provider via env vars
 *  - Override per-call via options.provider (arquitectura híbrida)
 *  - Override per-feature via env vars dedicadas (FEATURE_PROVIDER_*)
 *
 * Ejemplo de uso híbrido:
 *   await callAI(messages, { provider: 'openai' })  // Forzar OpenAI para esta llamada
 *   await callAI(messages, { feature: 'contracts' }) // Usa CONTRACTS_AI_PROVIDER si existe
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'deepseek' | 'groq' | 'simulated'

/** Features que pueden usar diferentes providers via env vars */
export type AIFeature =
  // ── Tier Flash (chat / clasificación / extracción) ─────────────────────
  | 'chat'             // Asistente IA del dashboard
  | 'worker-chat'      // Chatbot del trabajador en /mi-portal
  | 'complaint-triage' // Triaje de denuncias del canal
  | 'norm-classifier'  // Clasificador del crawler normativo
  | 'pdf-extract'      // Extracción batch de trabajadores desde PDF
  | 'doc-generator'    // Generadores SST + compliance docs
  // ── Tier Pro (legal high-stakes) ───────────────────────────────────────
  | 'contract-review'  // Revisión de contratos
  | 'contract-gen'     // Generación de contratos con IA
  | 'contract-fix'     // Auto-fix de contratos
  | 'action-plan'      // Plan de acción tras diagnóstico
  | 'pliego-analysis'  // Análisis de pliego de reclamos
  | 'sunafil-agent'    // Agente analista SUNAFIL (acta + descargos)
  | 'payslip-audit'    // Auditor de boletas
  | 'descargo-writer'  // Redactor de descargos
  // ── Excepciones OpenAI ─────────────────────────────────────────────────
  | 'rag-embed'        // Embeddings para RAG (text-embedding-3-small)
  | 'document-vision'  // Vision Fase 3.5 (gpt-4o-mini)

export interface AICallOptions {
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean // Pide respuesta JSON. No todos los modelos lo soportan.
  provider?: AIProvider // Override directo del provider
  feature?: AIFeature // Override basado en variable de entorno por feature
  /**
   * orgId para bucketing del rollout staged (AI_ROLLOUT_PERCENTAGE).
   * Permite que la misma org siempre caiga en el mismo bucket mientras el
   * porcentaje no cambie — evita que un cliente alterne entre proveedores.
   * Opcional: sin orgId el bucketing usa solo feature como salt.
   */
  orgId?: string | null
}

// ── Rotación de API keys (Groq multi-cuenta) ──────────────────────────────
// Permite usar múltiples cuentas gratuitas de Groq para evitar rate limits.
// .env: GROQ_API_KEY=gsk_key1,gsk_key2,gsk_key3  (separadas por coma)
// El sistema rota automáticamente cuando una key recibe 429.

const groqKeyState = {
  keys: [] as string[],
  currentIndex: 0,
  blockedUntil: new Map<number, number>(), // keyIndex → timestamp
}

function initGroqKeys() {
  if (groqKeyState.keys.length > 0) return
  const raw = process.env.GROQ_API_KEY || ''
  groqKeyState.keys = raw.split(',').map(k => k.trim()).filter(k => k.length > 0)
}

function getGroqKey(): string {
  initGroqKeys()
  if (groqKeyState.keys.length === 0) return ''
  if (groqKeyState.keys.length === 1) return groqKeyState.keys[0]

  const now = Date.now()
  // Buscar la siguiente key que no esté bloqueada
  for (let i = 0; i < groqKeyState.keys.length; i++) {
    const idx = (groqKeyState.currentIndex + i) % groqKeyState.keys.length
    const blockedUntil = groqKeyState.blockedUntil.get(idx) || 0
    if (now >= blockedUntil) {
      groqKeyState.currentIndex = idx
      return groqKeyState.keys[idx]
    }
  }
  // Todas bloqueadas — usar la que se desbloquea antes
  let earliest = Infinity
  let earliestIdx = 0
  for (const [idx, until] of groqKeyState.blockedUntil.entries()) {
    if (until < earliest) { earliest = until; earliestIdx = idx }
  }
  groqKeyState.currentIndex = earliestIdx
  return groqKeyState.keys[earliestIdx]
}

function markGroqKeyBlocked(retryAfterSec: number) {
  const blockMs = Math.max(retryAfterSec * 1000, 60_000) // mínimo 1 min
  groqKeyState.blockedUntil.set(groqKeyState.currentIndex, Date.now() + blockMs)
  // Rotar a la siguiente key
  groqKeyState.currentIndex = (groqKeyState.currentIndex + 1) % groqKeyState.keys.length
}

function getGroqKeyCount(): number {
  initGroqKeys()
  return groqKeyState.keys.length
}

// ── Detección de proveedor ──────────────────────────────────────────────────

/**
 * Detecta el provider a usar:
 * 1. Si options.provider está definido → ese
 * 2. Si options.feature está definido y la env var del feature existe → esa
 * 3. AI_PROVIDER global
 * 4. Auto-detect por keys disponibles
 */
/**
 * Features que son LEGAL HIGH-STAKES — requieren máxima calidad.
 * Cuando ANTHROPIC_API_KEY está configurada, estas features usan Claude por
 * default (mejor en redacción/análisis legal peruano que DeepSeek).
 *
 * Si quieres forzar otro provider para alguna de estas, override via env:
 *   CONTRACT_REVIEW_AI_PROVIDER=deepseek    (vuelve a DeepSeek)
 *   CONTRACT_GEN_AI_PROVIDER=openai         (usa GPT-4o)
 */
// ─── Routing declarativo por feature ─────────────────────────────────────
// FEATURE_ROUTING (en feature-routing.ts) es la fuente única de verdad.
// Las listas debajo se mantienen por compat hacia atrás con detectProvider
// pero ahora se derivan automáticamente del mapping.
import { FEATURE_ROUTING, tierToDeepSeekModel, getFeatureConfig } from './feature-routing'
import { redactPii, unredact, type RedactOptions } from './pii-redactor'
import { rolloutProvider } from './rollout'

const LEGAL_HIGH_STAKES_FEATURES: AIFeature[] = (
  Object.entries(FEATURE_ROUTING) as Array<[AIFeature, typeof FEATURE_ROUTING[AIFeature]]>
)
  .filter(([, cfg]) => cfg.tier === 'pro')
  .map(([feature]) => feature)

const CHAT_FEATURES: AIFeature[] = (
  Object.entries(FEATURE_ROUTING) as Array<[AIFeature, typeof FEATURE_ROUTING[AIFeature]]>
)
  .filter(([, cfg]) => cfg.tier === 'flash')
  .map(([feature]) => feature)

const EMBEDDING_FEATURES: AIFeature[] = ['rag-embed']
const VISION_FEATURES: AIFeature[] = ['document-vision']

export function detectProvider(opts?: {
  provider?: AIProvider
  feature?: AIFeature
  orgId?: string | null
}): AIProvider {
  // 1. Override directo
  if (opts?.provider) return opts.provider

  // 1b. Rollout staged: si AI_ROLLOUT_PERCENTAGE está configurado, decide
  // entre DeepSeek y OpenAI con bucketing estable por orgId+feature.
  // SOLO se aplica si la feature no es vision/embeddings (que requieren OpenAI
  // sí o sí) — esas se siguen ruteando por el flujo normal abajo.
  if (
    process.env.AI_ROLLOUT_PERCENTAGE !== undefined &&
    process.env.AI_ROLLOUT_PERCENTAGE !== '' &&
    opts?.feature &&
    !VISION_FEATURES.includes(opts.feature) &&
    !EMBEDDING_FEATURES.includes(opts.feature)
  ) {
    const rolled = rolloutProvider({ orgId: opts.orgId, feature: opts.feature })
    if (rolled === 'deepseek' && process.env.DEEPSEEK_API_KEY) return 'deepseek'
    if (rolled === 'openai' && process.env.OPENAI_API_KEY?.startsWith('sk-')) return 'openai'
  }

  // 2. Override por feature via env var (ej: CONTRACT_REVIEW_AI_PROVIDER=anthropic)
  if (opts?.feature) {
    const envKey = `${opts.feature.toUpperCase().replace(/-/g, '_')}_AI_PROVIDER`
    const featureProvider = (process.env[envKey] || '').toLowerCase().trim()
    if (featureProvider === 'ollama') return 'ollama'
    if (featureProvider === 'openai') return 'openai'
    if (featureProvider === 'anthropic') return 'anthropic'
    if (featureProvider === 'deepseek') return 'deepseek'
    if (featureProvider === 'groq') return 'groq'
  }

  // 3. AI_PROVIDER global
  const explicit = (process.env.AI_PROVIDER || '').toLowerCase().trim()
  if (explicit === 'ollama') return 'ollama'
  if (explicit === 'openai') return 'openai'
  if (explicit === 'anthropic') return 'anthropic'
  if (explicit === 'deepseek') return 'deepseek'
  if (explicit === 'groq') return 'groq'

  // 4. ─── Routing declarativo desde FEATURE_ROUTING ─────────────────────
  // FEATURE_ROUTING (feature-routing.ts) es la fuente única de verdad.
  // Si la key del provider preferido está disponible, se usa. Si no, fallback.
  if (opts?.feature) {
    const cfg = FEATURE_ROUTING[opts.feature]
    if (cfg) {
      // Vision y embeddings: OpenAI obligatorio (DeepSeek no soporta).
      if (VISION_FEATURES.includes(opts.feature) || EMBEDDING_FEATURES.includes(opts.feature)) {
        const openaiKey = process.env.OPENAI_API_KEY || ''
        if (openaiKey && openaiKey.startsWith('sk-')) return 'openai'
        // Si no hay OpenAI y es vision/embeddings, falla explícito en callAI.
      }
      // Provider preferido del feature
      if (cfg.provider === 'deepseek' && process.env.DEEPSEEK_API_KEY) return 'deepseek'
      if (cfg.provider === 'openai' && process.env.OPENAI_API_KEY?.startsWith('sk-')) return 'openai'
      if (cfg.provider === 'anthropic' && process.env.ANTHROPIC_API_KEY) return 'anthropic'
      if (cfg.provider === 'groq' && process.env.GROQ_API_KEY) return 'groq'
      // Si el preferido no está, caer al global priority abajo.
    }
  }

  // 5. Auto-detect global priority (sin feature o feature sin key del preferido):
  //    DeepSeek V4 es el motor único del producto; resto son fallback.
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek'

  // 6. OpenAI (vision + embeddings + fallback general)
  const openaiKey = process.env.OPENAI_API_KEY || ''
  if (openaiKey && openaiKey !== 'sk-xxxxx' && openaiKey.startsWith('sk-')) {
    return 'openai'
  }

  // 7. Anthropic (deprecated en este producto, mantener por compat)
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'

  // 8. Groq (deprecated, mantener por compat)
  if (process.env.GROQ_API_KEY) return 'groq'

  // 9. Ollama (self-hosted, gratis pero requiere infra)
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) return 'ollama'

  // 10. Default: Ollama (fallará al fetch si no está corriendo)
  return 'ollama'
}

export function getModelName(opts?: { provider?: AIProvider; feature?: AIFeature }): string {
  const provider = detectProvider(opts)

  if (provider === 'openai') {
    // Permite modelo dedicado por feature (ej: CONTRACT_REVIEW_OPENAI_MODEL=gpt-4o)
    if (opts?.feature) {
      const envKey = `${opts.feature.toUpperCase().replace(/-/g, '_')}_OPENAI_MODEL`
      if (process.env[envKey]) return process.env[envKey]!
    }
    return process.env.OPENAI_MODEL || 'gpt-4o'
  }

  if (provider === 'deepseek') {
    if (opts?.feature) {
      // 1. Override directo del modelo por env (máxima precedencia)
      const envKeyModel = `${opts.feature.toUpperCase().replace(/-/g, '_')}_DEEPSEEK_MODEL`
      if (process.env[envKeyModel]) return process.env[envKeyModel]!
      // 2. Override del TIER por env (flash | pro)
      const envKeyTier = `${opts.feature.toUpperCase().replace(/-/g, '_')}_TIER`
      const tierEnv = (process.env[envKeyTier] || '').toLowerCase().trim()
      if (tierEnv === 'flash') return 'deepseek-chat'
      if (tierEnv === 'pro') return 'deepseek-reasoner'
      // 3. Tier declarativo desde FEATURE_ROUTING
      const cfg = FEATURE_ROUTING[opts.feature]
      if (cfg && cfg.tier) return tierToDeepSeekModel(cfg.tier)
    }
    // DeepSeek aliases auto-upgradan al modelo más reciente:
    //   - "deepseek-chat" → V4 Flash (1M context, $0.14/M input)
    //   - "deepseek-reasoner" → V4 Pro (mejor razonamiento, $1.74/M input)
    return process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  }

  if (provider === 'anthropic') {
    if (opts?.feature) {
      const envKey = `${opts.feature.toUpperCase().replace(/-/g, '_')}_ANTHROPIC_MODEL`
      if (process.env[envKey]) return process.env[envKey]!
    }
    // Default: claude-3-5-sonnet — modelo estable disponible para TODAS las
    // cuentas (incluyendo "Acceso de evaluación"). Excelente para legal high-
    // stakes. Para Claude 4 (Sonnet 4 / Opus 4) override via env var
    // ANTHROPIC_MODEL — pero requiere saldo cargado, no funciona en eval.
    return process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
  }

  if (provider === 'groq') {
    if (opts?.feature) {
      const envKey = `${opts.feature.toUpperCase().replace(/-/g, '_')}_GROQ_MODEL`
      if (process.env[envKey]) return process.env[envKey]!
    }
    return process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
  }

  if (provider === 'ollama') {
    if (opts?.feature) {
      const envKey = `${opts.feature.toUpperCase().replace(/-/g, '_')}_OLLAMA_MODEL`
      if (process.env[envKey]) return process.env[envKey]!
    }
    return process.env.OLLAMA_MODEL || 'qwen2.5:latest'
  }

  return 'simulated'
}

// ── Llamada principal ────────────────────────────────────────────────────────

/**
 * Llama al LLM configurado y devuelve el texto de la respuesta.
 * Lanza un Error si la llamada falla — el caller decide si hacer fallback.
 */
export async function callAI(
  messages: AIMessage[],
  options: AICallOptions = {}
): Promise<string> {
  const { temperature = 0.4, maxTokens = 2000, jsonMode = false, provider: providerOpt, feature, orgId } = options
  const provider = detectProvider({ provider: providerOpt, feature, orgId })

  if (provider === 'simulated') {
    throw new Error('No AI provider configured (use AI_PROVIDER=ollama or set OPENAI_API_KEY)')
  }

  // ── Construir URL y headers según proveedor ─────────────────────────────
  let url: string
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions'
    headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY}`
  } else if (provider === 'anthropic') {
    // Claude usa /v1/messages (NO /chat/completions). API distinta.
    url = 'https://api.anthropic.com/v1/messages'
    headers['x-api-key'] = process.env.ANTHROPIC_API_KEY ?? ''
    headers['anthropic-version'] = '2023-06-01'
  } else if (provider === 'deepseek') {
    url = 'https://api.deepseek.com/v1/chat/completions'
    headers['Authorization'] = `Bearer ${process.env.DEEPSEEK_API_KEY}`
  } else if (provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/chat/completions'
    const groqKey = getGroqKey()
    headers['Authorization'] = `Bearer ${groqKey}`
    if (getGroqKeyCount() > 1) {
      console.log(`[AI] Groq key ${groqKeyState.currentIndex + 1}/${getGroqKeyCount()}`)
    }
  } else {
    const base = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '')
    url = `${base}/v1/chat/completions`
    headers['Authorization'] = 'Bearer ollama'
  }

  // ── Construir body ────────────────────────────────────────────────────────
  const model = getModelName({ provider: providerOpt, feature })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: Record<string, any>

  if (provider === 'anthropic') {
    // Anthropic Messages API: system es top-level (no en messages[]),
    // messages[] solo acepta roles 'user' y 'assistant', y max_tokens es obligatorio.
    const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n')
    const conversation = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    body = {
      model,
      max_tokens: maxTokens,
      temperature,
      messages: conversation,
      stream: false,
    }
    if (systemMessages) body.system = systemMessages
    // Anthropic no tiene response_format JSON nativo. Si jsonMode, el caller
    // debe pedir JSON en el system prompt y extractJson() limpia la respuesta.
  } else {
    // OpenAI / DeepSeek / Groq / Ollama — todos compatibles con shape OpenAI
    body = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false,
    }

    if (jsonMode) {
      if (provider === 'openai' || provider === 'deepseek' || provider === 'groq') {
        body.response_format = { type: 'json_object' }
      } else {
        // Ollama
        body.format = 'json'
        // Qwen3 tiene modo "thinking" activado por defecto.
        // Con thinking activo: content="" y la respuesta va en message.thinking → rompe el parser.
        // Desactivarlo de 3 formas para compatibilidad con distintas versiones de Ollama:
        body.think = false           // Ollama >= 0.6 (top-level)
        body.options = { think: false } // Ollama native options
        // Inyectar /no_think en el último mensaje del usuario como fallback universal
        const lastUserIdx = [...messages].reverse().findIndex(m => m.role === 'user')
        if (lastUserIdx !== -1) {
          const realIdx = messages.length - 1 - lastUserIdx
          body.messages = messages.map((m, i) =>
            i === realIdx ? { ...m, content: m.content + ' /no_think' } : m
          )
        }
      }
    }
  }

  // ── Fetch con retry automático para rate limits (429) ─────────────────────
  // Cloud providers (Groq, DeepSeek) tienen rate limits que se alcanzan
  // al procesar muchos contratos. Retry con backoff exponencial.
  const MAX_RETRIES = 2
  const timeoutMs = provider === 'ollama' ? 120_000 : 60_000
  const bodyStr = JSON.stringify(body)

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: bodyStr,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))

    // Rate limit (429) → rotar key si hay varias, o esperar con tope
    if (response.status === 429 && attempt < MAX_RETRIES) {
      const retryAfter = response.headers.get('retry-after')
      const parsed = retryAfter ? Number(retryAfter) : NaN

      // Si hay múltiples keys de Groq, marcar la actual como bloqueada y rotar
      if (provider === 'groq' && getGroqKeyCount() > 1) {
        markGroqKeyBlocked(isNaN(parsed) ? 60 : parsed)
        const newKey = getGroqKey()
        headers['Authorization'] = `Bearer ${newKey}`
        console.log(`[AI] Key ${groqKeyState.currentIndex + 1}/${getGroqKeyCount()} rate-limited → rotando`)
        // Esperar solo 2s antes de reintentar con la nueva key
        await new Promise(resolve => setTimeout(resolve, 2_000))
        continue
      }

      // Una sola key — fallar rápido si pide esperar mucho
      if (!isNaN(parsed) && parsed > 30) {
        throw new Error(`Límite de uso de ${provider} alcanzado. Espera ${Math.ceil(parsed / 60)} min y reintenta.`)
      }

      let waitMs = isNaN(parsed) ? 10_000 : Math.max(parsed * 1000, 5_000)
      waitMs = Math.min(waitMs, 30_000)

      console.log(`[AI] Rate limit 429 (intento ${attempt + 1}/${MAX_RETRIES}). Esperando ${Math.round(waitMs / 1000)}s...`)
      await new Promise(resolve => setTimeout(resolve, waitMs))
      continue
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`${provider} API error ${response.status}: ${errText.slice(0, 200)}`)
    }

    const data = await response.json()

    // ── Extraer content según shape del provider ─────────────────────────
    let content: string | undefined
    if (provider === 'anthropic') {
      // Anthropic: { content: [{ type: 'text', text: '...' }, ...], usage: {...} }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blocks = data?.content as Array<{ type?: string; text?: string }> | undefined
      content = blocks?.filter(b => b.type === 'text').map(b => b.text ?? '').join('') || undefined
    } else {
      // OpenAI / DeepSeek / Groq / Ollama: { choices: [{ message: { content } }], usage: {...} }
      content = data?.choices?.[0]?.message?.content
    }

    if (!content) {
      throw new Error(`${provider} devolvió respuesta vacía`)
    }

    // ── Telemetría de tokens ──────────────────────────────────────────────
    let promptTokens = 0
    let completionTokens = 0
    let cachedTokens = 0
    let reasoningTokens = 0
    if (provider === 'anthropic') {
      // Anthropic: usage.input_tokens / output_tokens
      // cache_read_input_tokens si activado prompt caching.
      const u = data?.usage as {
        input_tokens?: number
        output_tokens?: number
        cache_read_input_tokens?: number
      } | undefined
      promptTokens = u?.input_tokens ?? 0
      completionTokens = u?.output_tokens ?? 0
      cachedTokens = u?.cache_read_input_tokens ?? 0
    } else {
      // OpenAI/DeepSeek shape: usage.prompt_tokens / completion_tokens.
      // DeepSeek devuelve `prompt_cache_hit_tokens` (cache hit) y
      // `prompt_cache_miss_tokens` cuando el context cache está activo.
      // DeepSeek-reasoner devuelve `completion_tokens_details.reasoning_tokens`.
      const u = data?.usage as
        | {
            prompt_tokens?: number
            completion_tokens?: number
            total_tokens?: number
            prompt_cache_hit_tokens?: number
            prompt_cache_miss_tokens?: number
            completion_tokens_details?: { reasoning_tokens?: number }
          }
        | undefined
      promptTokens = u?.prompt_tokens ?? 0
      completionTokens = u?.completion_tokens ?? 0
      cachedTokens = u?.prompt_cache_hit_tokens ?? 0
      reasoningTokens = u?.completion_tokens_details?.reasoning_tokens ?? 0
    }
    if (promptTokens > 0 || completionTokens > 0) {
      lastCallMetadata.set(messages, {
        provider,
        model,
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cachedTokens,
        reasoningTokens,
      })
    }

    return content
  }

  throw new Error(`Límite de velocidad de ${provider}. Espera unos segundos y reintenta.`)
}

// ═══════════════════════════════════════════════════════════════════════════
// callAIWithUsage — variante que devuelve content + usage para telemetría
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Metadata efímera por messages-array. WeakMap permite GC automático cuando
 * el caller deja de referenciar el array. Sirve para no romper la firma de
 * `callAI` — los call sites que quieran telemetría llaman `callAIWithUsage`.
 */
const lastCallMetadata = new WeakMap<
  AIMessage[],
  {
    provider: AIProvider
    model: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    cachedTokens: number
    reasoningTokens: number
  }
>()

export interface AICallUsage {
  provider: AIProvider
  model: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** Tokens servidos desde context cache del provider (DeepSeek/Anthropic). */
  cachedTokens: number
  /** Tokens de reasoning interno (DeepSeek-reasoner / o1). */
  reasoningTokens: number
  latencyMs: number
}

/**
 * Igual que `callAI` pero retorna también `usage` para telemetría.
 * Si el provider no expone `usage` en su respuesta (Ollama puede no hacerlo),
 * los tokens vienen en cero y el caller decide si igual loggear.
 */
export async function callAIWithUsage(
  messages: AIMessage[],
  options: AICallOptions = {},
): Promise<{ content: string; usage: AICallUsage }> {
  const start = Date.now()
  const content = await callAI(messages, options)
  const latencyMs = Date.now() - start
  const meta = lastCallMetadata.get(messages)

  const provider = meta?.provider ?? detectProvider({ provider: options.provider, feature: options.feature })
  const model = meta?.model ?? getModelName({ provider: options.provider, feature: options.feature })

  return {
    content,
    usage: {
      provider,
      model,
      promptTokens: meta?.promptTokens ?? 0,
      completionTokens: meta?.completionTokens ?? 0,
      totalTokens: meta?.totalTokens ?? 0,
      cachedTokens: meta?.cachedTokens ?? 0,
      reasoningTokens: meta?.reasoningTokens ?? 0,
      latencyMs,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Fallback chain — intenta provider principal, cae a alternativos si falla
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Calcula la chain de fallback según qué providers tienen keys configuradas.
 * Orden de preferencia (cuando el primario falla):
 *   1. DeepSeek — más barato, calidad alta
 *   2. Anthropic — mejor para legal high-stakes
 *   3. OpenAI — vision + fallback histórico
 *   4. Groq — ultra-rápido, free tier
 *   5. Ollama — self-hosted, último recurso
 * Excluye el provider principal para evitar loop.
 */
function getFallbackChain(primary: AIProvider): AIProvider[] {
  const candidates: AIProvider[] = []
  if (primary !== 'deepseek' && process.env.DEEPSEEK_API_KEY) candidates.push('deepseek')
  if (primary !== 'anthropic' && process.env.ANTHROPIC_API_KEY) candidates.push('anthropic')
  if (primary !== 'openai' && process.env.OPENAI_API_KEY) candidates.push('openai')
  if (primary !== 'groq' && process.env.GROQ_API_KEY) candidates.push('groq')
  if (primary !== 'ollama' && (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL)) {
    candidates.push('ollama')
  }
  return candidates
}

/**
 * Llama al LLM con fallback automático a providers alternativos si el primario
 * falla. Uso recomendado para llamadas críticas (copilot, diagnóstico, review).
 *
 * Retry automático de rate limits está en `callAI`; `callAIWithFallback` maneja
 * los fallos duros (500, timeout, provider down).
 *
 * Devuelve `{ content, provider }` para que el caller pueda trackear cuál
 * proveedor respondió efectivamente.
 */
export async function callAIWithFallback(
  messages: AIMessage[],
  options: AICallOptions = {},
): Promise<{ content: string; provider: AIProvider; attempts: number }> {
  const primary = detectProvider(options)
  const chain: AIProvider[] = [primary, ...getFallbackChain(primary)]

  let lastError: Error | null = null
  let attempts = 0

  for (const provider of chain) {
    attempts++
    try {
      const content = await callAI(messages, { ...options, provider })
      if (attempts > 1) {
        console.log(`[AI Fallback] Éxito con ${provider} tras fallar ${attempts - 1} provider(s)`)
      }
      return { content, provider, attempts }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(
        `[AI Fallback] ${provider} falló: ${lastError.message.slice(0, 150)}. ${attempts < chain.length ? 'Probando siguiente...' : 'Sin más fallbacks.'}`,
      )
    }
  }

  throw (
    lastError ??
    new Error('No hay providers de AI disponibles. Configura DEEPSEEK_API_KEY / ANTHROPIC_API_KEY / OPENAI_API_KEY / GROQ_API_KEY.')
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// callAIStream — streaming SSE para hot path (chat copilot, worker chat).
// Devuelve un AsyncIterable de chunks que el endpoint API puede transmitir
// directo como SSE al cliente.
// ═══════════════════════════════════════════════════════════════════════════

export interface AIStreamChunk {
  /** Delta de texto incremental. Vacío en el chunk final. */
  delta: string
  /** Verdadero solo en el último chunk del stream. */
  done: boolean
  /** Usage acumulado, solo presente cuando done=true. */
  usage?: AICallUsage
}

export interface AIStreamOptions extends AICallOptions {
  /** AbortSignal para cancelar el stream. */
  signal?: AbortSignal
  /**
   * TTFT timeout en ms. Si el primer chunk no llega en este plazo, el stream
   * lanza error y el caller puede caer a fallback. Default 5000.
   */
  firstTokenTimeoutMs?: number
}

/**
 * Llama al LLM en modo stream. Yieldea chunks parsea SSE format del provider.
 * Soporta DeepSeek, OpenAI, Groq (todos OpenAI-compatible).
 * Lanza error si TTFT > firstTokenTimeoutMs (5s default) — el caller decide fallback.
 */
export async function* callAIStream(
  messages: AIMessage[],
  options: AIStreamOptions = {},
): AsyncGenerator<AIStreamChunk, void, unknown> {
  const { temperature = 0.4, maxTokens = 2000, jsonMode = false, provider: providerOpt, feature, orgId, signal, firstTokenTimeoutMs = 5000 } = options
  const provider = detectProvider({ provider: providerOpt, feature, orgId })
  const model = getModelName({ provider: providerOpt, feature })

  if (provider === 'simulated') {
    throw new Error('No AI provider configured')
  }

  // Construir URL/headers
  let url: string
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (provider === 'deepseek') {
    url = 'https://api.deepseek.com/v1/chat/completions'
    headers['Authorization'] = `Bearer ${process.env.DEEPSEEK_API_KEY}`
  } else if (provider === 'openai') {
    url = 'https://api.openai.com/v1/chat/completions'
    headers['Authorization'] = `Bearer ${process.env.OPENAI_API_KEY}`
  } else if (provider === 'groq') {
    url = 'https://api.groq.com/openai/v1/chat/completions'
    headers['Authorization'] = `Bearer ${getGroqKey()}`
  } else if (provider === 'ollama') {
    const base = (process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '')
    url = `${base}/v1/chat/completions`
    headers['Authorization'] = 'Bearer ollama'
  } else if (provider === 'anthropic') {
    // Anthropic Messages API tiene streaming pero shape distinto. No lo usamos en hot path.
    throw new Error('Anthropic streaming no soportado en este wrapper. Usa OpenAI/DeepSeek.')
  } else {
    throw new Error(`Provider ${provider} no soporta streaming`)
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature,
    max_tokens: maxTokens,
    stream: true,
    stream_options: { include_usage: true }, // OpenAI-compatible: pide usage en el último chunk
  }
  if (jsonMode && (provider === 'openai' || provider === 'deepseek' || provider === 'groq')) {
    body.response_format = { type: 'json_object' }
  }

  const controller = new AbortController()
  const ttftTimer = setTimeout(() => controller.abort(new Error('TTFT timeout')), firstTokenTimeoutMs)
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason)
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }

  const start = Date.now()
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: controller.signal,
  })

  if (!response.ok) {
    clearTimeout(ttftTimer)
    const errText = await response.text().catch(() => '')
    throw new Error(`${provider} stream error ${response.status}: ${errText.slice(0, 200)}`)
  }

  if (!response.body) {
    clearTimeout(ttftTimer)
    throw new Error('Response sin body — stream no soportado')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let firstTokenReceived = false
  let promptTokens = 0
  let completionTokens = 0
  let cachedTokens = 0
  let reasoningTokens = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Parsear SSE: cada evento es "data: {json}\n\n"
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') {
          continue
        }
        let parsed: {
          choices?: Array<{ delta?: { content?: string } }>
          usage?: {
            prompt_tokens?: number
            completion_tokens?: number
            prompt_cache_hit_tokens?: number
            completion_tokens_details?: { reasoning_tokens?: number }
          }
        }
        try {
          parsed = JSON.parse(payload)
        } catch {
          continue
        }
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) {
          if (!firstTokenReceived) {
            firstTokenReceived = true
            clearTimeout(ttftTimer)
          }
          yield { delta, done: false }
        }
        if (parsed.usage) {
          promptTokens = parsed.usage.prompt_tokens ?? promptTokens
          completionTokens = parsed.usage.completion_tokens ?? completionTokens
          cachedTokens = parsed.usage.prompt_cache_hit_tokens ?? cachedTokens
          reasoningTokens = parsed.usage.completion_tokens_details?.reasoning_tokens ?? reasoningTokens
        }
      }
    }
  } finally {
    clearTimeout(ttftTimer)
    try { reader.releaseLock() } catch { /* noop */ }
  }

  const latencyMs = Date.now() - start
  yield {
    delta: '',
    done: true,
    usage: {
      provider,
      model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cachedTokens,
      reasoningTokens,
      latencyMs,
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// callAIRedacted — variante que redacta PII automáticamente antes de mandar
// y restaura placeholders en la respuesta. Usar para todo entry point AI que
// reciba contenido del usuario / contratos / boletas / denuncias.
// ═══════════════════════════════════════════════════════════════════════════

export interface AIRedactedOptions extends AICallOptions {
  /** Nombres del trabajador a redactar como [WORKER_N]. */
  workerNames?: string[]
  /** Si true, redacta también códigos médicos CIE-10. */
  redactMedical?: boolean
  /**
   * Si true (default), restaura los placeholders en la respuesta antes de
   * devolverla al caller. Si false, devuelve el response tal cual con [DNI_1] etc
   * (útil cuando NO queremos exponer los datos al admin después del LLM).
   */
  unredactResponse?: boolean
}

/**
 * Llama al LLM con redaction automática de PII antes y restauración después.
 *
 * Flujo:
 *   1. Cada message.content pasa por redactPii() — DNIs, RUCs, emails, etc → placeholders.
 *   2. Se envía al LLM.
 *   3. La respuesta se desredacta (los placeholders vuelven a ser DNIs reales).
 *
 * El mapping nunca sale del proceso. El LLM solo ve placeholders.
 *
 * Usar SIEMPRE en: chat, worker-chat, complaint-triage, pdf-extract, action-plan,
 * cualquier flujo donde el input contenga datos personales identificables.
 */
export async function callAIRedacted(
  messages: AIMessage[],
  options: AIRedactedOptions = {},
): Promise<{ content: string; usage: AICallUsage; redactionCounts: Record<string, number> }> {
  const redactOpts: RedactOptions = {
    workerNames: options.workerNames,
    redactMedical: options.redactMedical,
  }

  // Acumulamos un mapping conjunto de todos los messages.
  const combinedMapping: Record<string, string> = {}
  const combinedCounts: Record<string, number> = {
    dni: 0, ruc: 0, email: 0, phone: 0, name: 0, account: 0, medical: 0,
  }

  // Redactamos cada message preservando el shape {role, content}.
  // NOTA: redactPii reinicia el counter por llamada; combinamos manualmente.
  // Para simplicidad concatenamos todos los content, redactamos juntos, y
  // luego separamos por longitud original. Eso garantiza que el mismo DNI en
  // dos messages distintos comparta placeholder.
  const sep = '\n\n[[__MSG_SEP__]]\n\n'
  const joined = messages.map(m => m.content).join(sep)
  const redacted = redactPii(joined, redactOpts)
  Object.assign(combinedMapping, redacted.mapping)
  for (const [k, v] of Object.entries(redacted.counts)) {
    combinedCounts[k] = (combinedCounts[k] ?? 0) + v
  }

  const redactedParts = redacted.redacted.split(sep)
  const redactedMessages: AIMessage[] = messages.map((m, i) => ({
    role: m.role,
    content: redactedParts[i] ?? m.content,
  }))

  const { content, usage } = await callAIWithUsage(redactedMessages, options)

  const finalContent = options.unredactResponse !== false
    ? unredact(content, combinedMapping)
    : content

  return { content: finalContent, usage, redactionCounts: combinedCounts }
}

/**
 * Helper: extrae JSON de una respuesta del LLM.
 * Maneja:
 *  - Qwen3 <think>...</think> blocks (reasoning trace antes del JSON)
 *  - Fences markdown (```json ... ```)
 *  - JSON puro sin wrapper
 *  - JSON embebido en texto libre
 */
export function extractJson<T = unknown>(content: string): T {
  // 1. Eliminar bloques <think>...</think> de Qwen3 (incluyendo si vienen con <|think|>)
  const cleaned = content
    .replace(/<\|think\|>[\s\S]*?<\|\/think\|>/g, '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .trim()

  // 2. Intentar parsear directo
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // 3. Buscar dentro de fences markdown
    const fenceMatch = cleaned.match(/```json\s*([\s\S]*?)\s*```/) ||
                       cleaned.match(/```\s*([\s\S]*?)\s*```/)
    if (fenceMatch) {
      return JSON.parse(fenceMatch[1]) as T
    }

    // 4. Extraer el primer objeto JSON balanceado { ... }
    const start = cleaned.indexOf('{')
    const arrStart = cleaned.indexOf('[')
    const useArr = arrStart !== -1 && (start === -1 || arrStart < start)
    const openChar = useArr ? '[' : '{'
    const closeChar = useArr ? ']' : '}'
    const idx = cleaned.indexOf(openChar)
    if (idx !== -1) {
      let depth = 0
      for (let i = idx; i < cleaned.length; i++) {
        if (cleaned[i] === openChar) depth++
        else if (cleaned[i] === closeChar) {
          depth--
          if (depth === 0) {
            return JSON.parse(cleaned.slice(idx, i + 1)) as T
          }
        }
      }
    }

    throw new Error('No se pudo extraer JSON de la respuesta del LLM')
  }
}
