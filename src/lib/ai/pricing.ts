/**
 * Tabla de costos por modelo de IA.
 *
 * Precios en USD por 1M tokens, dato público de cada provider al 2026-04.
 * Mantener actualizado:
 *   - OpenAI:    https://openai.com/api/pricing/
 *   - Groq:      https://groq.com/pricing/
 *   - DeepSeek:  https://api-docs.deepseek.com/quick_start/pricing
 *   - Ollama:    self-hosted = $0
 *
 * Si un modelo no está listado, usamos la entrada DEFAULT del provider o
 * `costUsd=0` (con un warning en console). NO bloquear la llamada por
 * pricing — la observabilidad no debe romper feature.
 */

export interface ModelPricing {
  /** USD por 1M prompt tokens (cache miss). */
  promptPer1M: number
  /** USD por 1M completion tokens. */
  completionPer1M: number
  /** USD por 1M tokens servidos desde context cache (si el provider lo soporta). */
  cachedPer1M?: number
}

type ProviderName = 'openai' | 'anthropic' | 'groq' | 'deepseek' | 'ollama' | 'simulated'

/**
 * Tabla de pricing — match exacto por nombre de modelo. Si no encuentra,
 * cae al `*` del provider.
 */
const PRICING: Record<ProviderName, Record<string, ModelPricing>> = {
  openai: {
    // GPT-4o family
    'gpt-4o': { promptPer1M: 2.5, completionPer1M: 10 },
    'gpt-4o-2024-11-20': { promptPer1M: 2.5, completionPer1M: 10 },
    'gpt-4o-mini': { promptPer1M: 0.15, completionPer1M: 0.6 },
    'gpt-4o-mini-2024-07-18': { promptPer1M: 0.15, completionPer1M: 0.6 },
    // o1 / o3
    'o1': { promptPer1M: 15, completionPer1M: 60 },
    'o1-mini': { promptPer1M: 3, completionPer1M: 12 },
    'o3-mini': { promptPer1M: 1.1, completionPer1M: 4.4 },
    // text-embedding family
    'text-embedding-3-small': { promptPer1M: 0.02, completionPer1M: 0 },
    'text-embedding-3-large': { promptPer1M: 0.13, completionPer1M: 0 },
    // Default fallback (asume gpt-4o-mini para que no aterre el bill)
    '*': { promptPer1M: 0.15, completionPer1M: 0.6 },
  },
  groq: {
    // Modelos abiertos hospedados por Groq, precios públicos al 2026-04.
    'llama-3.3-70b-versatile': { promptPer1M: 0.59, completionPer1M: 0.79 },
    'llama-3.1-8b-instant': { promptPer1M: 0.05, completionPer1M: 0.08 },
    'mixtral-8x7b-32768': { promptPer1M: 0.24, completionPer1M: 0.24 },
    'gemma2-9b-it': { promptPer1M: 0.2, completionPer1M: 0.2 },
    'qwen-qwq-32b': { promptPer1M: 0.29, completionPer1M: 0.39 },
    '*': { promptPer1M: 0.5, completionPer1M: 0.7 },
  },
  deepseek: {
    // V4 Flash (alias `deepseek-chat`): el más barato del mercado.
    // Cache hit es ~10x más barato que cache miss.
    'deepseek-chat':      { promptPer1M: 0.14, completionPer1M: 0.28, cachedPer1M: 0.014 },
    'deepseek-v4':        { promptPer1M: 0.14, completionPer1M: 0.28, cachedPer1M: 0.014 },
    'deepseek-v4-flash':  { promptPer1M: 0.14, completionPer1M: 0.28, cachedPer1M: 0.014 },
    // V4 Pro (alias `deepseek-reasoner`): mejor razonamiento.
    'deepseek-reasoner':  { promptPer1M: 1.74, completionPer1M: 3.48, cachedPer1M: 0.174 },
    'deepseek-v4-pro':    { promptPer1M: 1.74, completionPer1M: 3.48, cachedPer1M: 0.174 },
    '*': { promptPer1M: 0.14, completionPer1M: 0.28, cachedPer1M: 0.014 },
  },
  anthropic: {
    // Claude 4 Opus — el más caro pero más exacto en legal high-stakes
    'claude-opus-4-20250514': { promptPer1M: 15, completionPer1M: 75 },
    'claude-4-opus': { promptPer1M: 15, completionPer1M: 75 },
    // Claude 4 Sonnet — sweet spot calidad/precio para tareas legales
    'claude-sonnet-4-20250514': { promptPer1M: 3, completionPer1M: 15 },
    'claude-4-sonnet': { promptPer1M: 3, completionPer1M: 15 },
    // Claude 4 Haiku — rápido y barato (similar a gpt-4o-mini)
    'claude-haiku-4-20250514': { promptPer1M: 0.8, completionPer1M: 4 },
    'claude-4-haiku': { promptPer1M: 0.8, completionPer1M: 4 },
    // Claude 3.5 Sonnet (legacy, todavía soportado)
    'claude-3-5-sonnet-20241022': { promptPer1M: 3, completionPer1M: 15 },
    '*': { promptPer1M: 3, completionPer1M: 15 },
  },
  ollama: {
    // Self-hosted. Costo de hardware no se contabiliza acá — las orgs que
    // usan Ollama es porque eligieron pagar infra ellos mismos.
    '*': { promptPer1M: 0, completionPer1M: 0 },
  },
  simulated: {
    '*': { promptPer1M: 0, completionPer1M: 0 },
  },
}

/**
 * Calcula el costo en USD de una llamada dado provider, model y usage.
 * Considera tokens servidos desde cache si `cachedTokens` se provee.
 * Devuelve 0 si el provider/model no están en la tabla (con warning).
 */
export function estimateCostUsd(params: {
  provider: string
  model: string
  promptTokens: number
  completionTokens: number
  /** Tokens servidos desde cache de contexto (DeepSeek). Se cobran a cachedPer1M. */
  cachedTokens?: number
  /** Tokens de reasoning (DeepSeek-reasoner). Se cobran como completion. */
  reasoningTokens?: number
}): number {
  const provider = params.provider.toLowerCase() as ProviderName
  const providerTable = PRICING[provider]
  if (!providerTable) {
    console.warn(`[ai/pricing] provider desconocido: ${params.provider} — costUsd=0`)
    return 0
  }
  const modelPricing = providerTable[params.model] ?? providerTable['*']
  const cachedTokens = Math.max(0, params.cachedTokens ?? 0)
  const reasoningTokens = Math.max(0, params.reasoningTokens ?? 0)
  // promptTokens viene del provider e incluye los cached. Restamos para no contar doble.
  const billablePromptTokens = Math.max(0, params.promptTokens - cachedTokens)
  // reasoning ya está incluido en completionTokens en la API DeepSeek (no se duplica).
  const promptCost = (billablePromptTokens / 1_000_000) * modelPricing.promptPer1M
  const cachedCost = cachedTokens > 0 && modelPricing.cachedPer1M !== undefined
    ? (cachedTokens / 1_000_000) * modelPricing.cachedPer1M
    : 0
  const completionCost = (params.completionTokens / 1_000_000) * modelPricing.completionPer1M
  // reasoningCost ya está dentro de completionCost. Se loguea aparte solo para
  // observabilidad — no se cobra extra.
  void reasoningTokens
  return Number((promptCost + cachedCost + completionCost).toFixed(6))
}

/**
 * Util para tests / dashboard: lista de modelos pricing-aware.
 */
export function getKnownModels(provider: string): string[] {
  const table = PRICING[provider.toLowerCase() as ProviderName]
  if (!table) return []
  return Object.keys(table).filter((k) => k !== '*')
}
