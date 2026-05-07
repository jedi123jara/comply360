/**
 * AI Chat Engine — Asistente IA Laboral Peruano
 * Context-aware chat with Peruvian labor law expertise
 * Soporta: OpenAI GPT-4o, Ollama (Qwen2.5, Llama3, etc.) o modo simulado
 *
 * RAG Pipeline:
 *  1. Extrae la última consulta del usuario
 *  2. Recupera chunks legales relevantes del corpus (keyword search)
 *  3. Inyecta el contexto normativo antes de las messages del usuario
 *  4. Genera la respuesta con el LLM (o fallback simulado)
 */
import { callAIWithUsage, callAIRedacted, callAIStream, detectProvider, getModelName } from './provider'
import { retrieveRelevantLaw, formatRetrievedContext, type RetrievalResult } from './rag/retriever'
import { retrieveRelevantLawVector, formatVectorContext } from './rag/vector-retriever'
import { recordAiUsage } from './usage'

export type { RetrievalResult }

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface OrgContext {
  razonSocial?: string
  sector?: string
  sizeRange?: string
  regimenPrincipal?: string
  totalWorkers: number
  complianceScore?: number
  openAlerts?: number
}

const SYSTEM_PROMPT = `Eres el Asistente IA Laboral de COMPLY360, un experto en derecho laboral peruano.
Tu rol es ayudar a empresas peruanas con consultas sobre:
- Obligaciones laborales y compliance
- Regimenes laborales (General, MYPE, Agrario, Construccion Civil, etc.)
- Calculos laborales (CTS, gratificaciones, vacaciones, liquidaciones)
- Inspecciones SUNAFIL y multas
- Seguridad y Salud en el Trabajo (Ley 29783)
- Hostigamiento sexual (Ley 27942)
- Contratos de trabajo y modalidades
- Despidos y procedimiento disciplinario

REGLAS:
1. Siempre cita la base legal especifica (norma, articulo) en tus respuestas
2. Usa los datos del contexto de la empresa para personalizar tus respuestas
3. Si no estas seguro de algo, indicalo y sugiere consultar con un abogado
4. Responde en espanol, de forma clara y practica
5. Cuando sea relevante, menciona los montos en soles y UITs (UIT 2026 = S/ 5,500)
6. Si te preguntan algo que no es laboral, indica que tu especialidad es derecho laboral peruano
7. No inventes normas. Si no conoces la norma exacta, indícalo.
8. Ofrece pasos concretos y accionables cuando sea posible`

function buildContextMessage(ctx: OrgContext): string {
  const parts = ['CONTEXTO DE LA EMPRESA DEL USUARIO:']
  if (ctx.razonSocial) parts.push(`- Razon Social: ${ctx.razonSocial}`)
  if (ctx.sector) parts.push(`- Sector: ${ctx.sector}`)
  if (ctx.sizeRange) parts.push(`- Tamanio: ${ctx.sizeRange} trabajadores`)
  if (ctx.regimenPrincipal) parts.push(`- Regimen principal: ${ctx.regimenPrincipal}`)
  parts.push(`- Total trabajadores activos: ${ctx.totalWorkers}`)
  if (ctx.complianceScore !== undefined) parts.push(`- Score de compliance: ${ctx.complianceScore}/100`)
  if (ctx.openAlerts !== undefined) parts.push(`- Alertas abiertas: ${ctx.openAlerts}`)
  parts.push('\nUsa estos datos para contextualizar tus respuestas.')
  return parts.join('\n')
}

// ─── RAG: extract citations from retrieved results ────────────────────────────

function extractCitationsFromRetrieval(results: RetrievalResult[]): string[] {
  return results.map(r => {
    const chunk = r.chunk
    return chunk.articulo
      ? `${chunk.norma} — ${chunk.articulo}`
      : chunk.norma
  })
}

// ─── Response type ─────────────────────────────────────────────────────────────

export interface ChatResponseWithCitations {
  content: string
  citations: string[]
  ragChunksUsed: number
  simulated?: boolean
}

/**
 * Generate AI response using the configured provider (Ollama o OpenAI).
 * Falls back to simulated response if el proveedor no está disponible.
 *
 * Returns the response text + legal citations retrieved via RAG.
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  orgContext: OrgContext,
  meta?: { orgId?: string | null; userId?: string | null; feature?: string },
): Promise<ChatResponseWithCitations> {
  // ── 1. RAG híbrido: vector (si embeddings existen) + keyword fallback ──
  // El retriever v2 intenta embedding con OpenAI; si falla usa el corpus unificado
  // v1 + v2 con scoring keyword. Esto garantiza que no hay regresión si
  // embeddings.json aún no se generó.
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  let ragResults: RetrievalResult[] = []
  let ragContext = ''
  try {
    ragResults = await retrieveRelevantLawVector(lastUserMessage, { topK: 5, minScore: 0.05 })
    ragContext = formatVectorContext(ragResults)
  } catch (err) {
    // Safety net: si el retriever v2 lanza, caer al retriever v1.
    console.error('[chat-engine] vector retriever error, falling back to v1:', err)
    ragResults = retrieveRelevantLaw(lastUserMessage, 5, 0.05)
    ragContext = formatRetrievedContext(ragResults)
  }
  const citations = extractCitationsFromRetrieval(ragResults)

  // ── 2. Build system messages: base prompt + org context + RAG context ────
  const systemMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: buildContextMessage(orgContext) },
  ]

  // Inject RAG context as a system message if we found relevant chunks
  if (ragContext) {
    systemMessages.push({
      role: 'system',
      content: `A continuación encontrarás los artículos legales más relevantes para la consulta del usuario. Úsalos para fundamentar tu respuesta con citas exactas:\n${ragContext}`,
    })
  }

  const allMessages = [...systemMessages, ...messages]

  try {
    // FIX #4.B: usar callAIRedacted para que los DNIs/RUCs/emails/teléfonos
    // del usuario (cuando consulta sobre un trabajador específico) se
    // redacten antes de salir al provider IA. El comentario en provider.ts
    // ya recomendaba "Usar SIEMPRE en: chat, worker-chat, complaint-triage,
    // pdf-extract, action-plan" pero el chat seguía usando callAIWithUsage.
    const { content, usage } = await callAIRedacted(allMessages, {
      temperature: 0.4,
      maxTokens: 2000,
      feature: (meta?.feature as 'chat' | 'worker-chat' | undefined) ?? 'chat',
      orgId: meta?.orgId,
    })

    // Telemetría — fire-and-forget (no bloquea la respuesta al usuario)
    void recordAiUsage({
      orgId: meta?.orgId,
      userId: meta?.userId,
      feature: meta?.feature ?? 'chat',
      provider: usage.provider,
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      cachedTokens: usage.cachedTokens,
      reasoningTokens: usage.reasoningTokens,
      latencyMs: usage.latencyMs,
    })

    return { content, citations, ragChunksUsed: ragResults.length, simulated: false }
  } catch (error) {
    console.error('AI chat error:', error)
    if (error instanceof Error && error.stack) {
      console.error('AI chat stack:', error.stack)
    }
    // Registrar el fallo también — útil para alertar si un provider está caído
    void recordAiUsage({
      orgId: meta?.orgId,
      userId: meta?.userId,
      feature: meta?.feature ?? 'chat',
      provider: detectProvider(),
      model: getModelName(),
      success: false,
      errorMessage: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
    })

    // Bug fix 2026-04-30: ANTES caíamos a respuesta simulada (mock) y el
    // usuario veía respuestas falsas creyendo que el Copilot funcionaba.
    // Eso enmascaró el bug del 500 durante horas. Ahora propagamos el error
    // real al endpoint que lo retornará al cliente con detalle.
    //
    // Solo en desarrollo (NODE_ENV=development) Y si la env var explícita
    // FALLBACK_SIMULATED_AI=1 está activa, mostramos la respuesta simulada
    // — esto solo para debug local cuando no quieres consumir cuota.
    const allowSimulated =
      process.env.NODE_ENV === 'development' &&
      process.env.FALLBACK_SIMULATED_AI === '1'

    if (allowSimulated) {
      const content = generateSimulatedResponse(lastUserMessage, orgContext)
      return { content, citations, ragChunksUsed: ragResults.length, simulated: true }
    }

    // En producción: re-throw para que el endpoint /api/ai-chat retorne 500
    // con detalle del error (commit d06adec ya expone provider, hint, type).
    throw error
  }
}

/** Exporta info del proveedor activo para mostrar en la UI */
export { detectProvider, getModelName }

// ═══════════════════════════════════════════════════════════════════════════
// generateChatStream — versión streaming SSE del copilot.
// ═══════════════════════════════════════════════════════════════════════════

export interface ChatStreamEvent {
  type: 'citations' | 'delta' | 'done' | 'error'
  /** Solo en type='delta' */
  delta?: string
  /** Solo en type='citations' */
  citations?: string[]
  ragChunksUsed?: number
  /** Solo en type='done' */
  usage?: {
    provider: string
    model: string
    promptTokens: number
    completionTokens: number
    cachedTokens: number
    totalTokens: number
    latencyMs: number
  }
  /** Solo en type='error' */
  error?: string
}

/**
 * Stream SSE-compatible de la respuesta del copilot.
 * Yieldea eventos tipados: primero las citations recuperadas del RAG, luego
 * los deltas de texto, y al final un done con usage para telemetría.
 */
export async function* generateChatStream(
  messages: ChatMessage[],
  orgContext: OrgContext,
  meta?: { orgId?: string | null; userId?: string | null; feature?: string; signal?: AbortSignal },
): AsyncGenerator<ChatStreamEvent, void, unknown> {
  // 1. RAG (idéntico a generateChatResponse)
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || ''
  let ragResults: RetrievalResult[] = []
  let ragContext = ''
  try {
    ragResults = await retrieveRelevantLawVector(lastUserMessage, { topK: 5, minScore: 0.05 })
    ragContext = formatVectorContext(ragResults)
  } catch (err) {
    console.error('[chat-engine.stream] vector retriever fallback:', err)
    ragResults = retrieveRelevantLaw(lastUserMessage, 5, 0.05)
    ragContext = formatRetrievedContext(ragResults)
  }
  const citations = extractCitationsFromRetrieval(ragResults)

  yield { type: 'citations', citations, ragChunksUsed: ragResults.length }

  // 2. System messages (mismo orden que en generateChatResponse: system, context, RAG)
  // Importante: el system prompt + org context van PRIMERO siempre. DeepSeek
  // cachea el prefijo común, así que mantener orden estable maximiza cache hits.
  const systemMessages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: buildContextMessage(orgContext) },
  ]
  if (ragContext) {
    systemMessages.push({
      role: 'system',
      content: `A continuación encontrarás los artículos legales más relevantes para la consulta del usuario. Úsalos para fundamentar tu respuesta con citas exactas:\n${ragContext}`,
    })
  }
  const allMessages = [...systemMessages, ...messages]

  // 3. Stream del LLM
  let firstChunkAt: number | null = null
  let totalContent = ''
  try {
    const featureName = (meta?.feature as 'chat' | 'worker-chat' | undefined) ?? 'chat'
    for await (const chunk of callAIStream(allMessages, {
      temperature: 0.4,
      maxTokens: 2000,
      feature: featureName,
      orgId: meta?.orgId,
      signal: meta?.signal,
    })) {
      if (chunk.delta) {
        if (firstChunkAt === null) firstChunkAt = Date.now()
        totalContent += chunk.delta
        yield { type: 'delta', delta: chunk.delta }
      }
      if (chunk.done && chunk.usage) {
        const ttftMs = firstChunkAt && (chunk.usage.latencyMs - (Date.now() - firstChunkAt))
        // Telemetría fire-and-forget
        void recordAiUsage({
          orgId: meta?.orgId,
          userId: meta?.userId,
          feature: featureName,
          provider: chunk.usage.provider,
          model: chunk.usage.model,
          promptTokens: chunk.usage.promptTokens,
          completionTokens: chunk.usage.completionTokens,
          cachedTokens: chunk.usage.cachedTokens,
          reasoningTokens: chunk.usage.reasoningTokens,
          ttftMs: typeof ttftMs === 'number' ? ttftMs : null,
          latencyMs: chunk.usage.latencyMs,
        })
        yield {
          type: 'done',
          usage: {
            provider: chunk.usage.provider,
            model: chunk.usage.model,
            promptTokens: chunk.usage.promptTokens,
            completionTokens: chunk.usage.completionTokens,
            cachedTokens: chunk.usage.cachedTokens,
            totalTokens: chunk.usage.totalTokens,
            latencyMs: chunk.usage.latencyMs,
          },
        }
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (err instanceof Error && err.stack) {
      console.error('[chat-engine stream] error stack:', err.stack)
    }
    yield { type: 'error', error: message }
    void recordAiUsage({
      orgId: meta?.orgId,
      userId: meta?.userId,
      feature: meta?.feature ?? 'chat',
      provider: detectProvider(),
      model: getModelName(),
      success: false,
      errorMessage: message.slice(0, 500),
    })
    // Bug fix 2026-04-30: solo emitimos respuesta simulada en dev con flag
    // explícita FALLBACK_SIMULATED_AI=1. En producción, el cliente recibe
    // solo el evento 'error' y muestra UI apropiada.
    const allowSimulated =
      process.env.NODE_ENV === 'development' &&
      process.env.FALLBACK_SIMULATED_AI === '1'
    if (allowSimulated && !totalContent) {
      const sim = generateSimulatedResponse(lastUserMessage, orgContext)
      yield { type: 'delta', delta: sim }
      yield { type: 'done' }
    }
  }
}

/**
 * Simulated response for demo/development (no API key needed)
 */
function generateSimulatedResponse(userMessage: string, ctx: OrgContext): string {
  const msg = userMessage.toLowerCase()

  if (msg.includes('cts') || msg.includes('compensacion')) {
    return `## CTS — Compensacion por Tiempo de Servicios

La CTS se deposita **semestralmente** en la entidad financiera elegida por el trabajador:

- **Mayo**: computa el periodo noviembre-abril
- **Noviembre**: computa el periodo mayo-octubre
- **Plazo**: hasta el **15 de mayo** y **15 de noviembre**

### Calculo base:
**CTS = (Remuneracion computable + 1/6 de ultima gratificacion) / 12 x meses trabajados**

La remuneracion computable incluye: sueldo basico + asignacion familiar + promedio de horas extras + comisiones habituales.

${ctx.regimenPrincipal === 'MYPE_MICRO' ? '⚠️ **Importante para tu empresa**: En el regimen de **microempresa**, los trabajadores **NO tienen derecho a CTS** (Ley 32353).' : ctx.regimenPrincipal === 'MYPE_PEQUENA' ? '⚠️ **Importante para tu empresa**: En el regimen de **pequeña empresa**, la CTS se reduce al **50%** (15 remuneraciones diarias por año, D.S. 013-2013-TR).' : ''}

**Base legal**: D.S. 001-97-TR (TUO de la Ley de CTS), Art. 2, 9-10, 21-22.

**Multa por incumplimiento**: Infraccion grave — hasta 1.57 UIT (S/ ${Math.round(1.57 * 5500).toLocaleString()}) por trabajador afectado.`
  }

  if (msg.includes('gratifica')) {
    return `## Gratificaciones

Los trabajadores tienen derecho a **2 gratificaciones al año**:
- **Fiestas Patrias**: se paga en la primera quincena de **julio**
- **Navidad**: se paga en la primera quincena de **diciembre**

### Calculo:
**Gratificacion = Remuneracion computable x (meses completos trabajados en el semestre / 6)**

Ademas, se agrega la **bonificacion extraordinaria del 9%** (Ley 30334) por no aportar a EsSalud sobre la gratificacion.

${ctx.regimenPrincipal === 'MYPE_MICRO' ? '⚠️ **Tu empresa es microempresa**: Los trabajadores del regimen MYPE Micro **NO tienen derecho a gratificaciones** (Ley 32353).' : ctx.regimenPrincipal === 'MYPE_PEQUENA' ? '⚠️ **Tu empresa es pequeña empresa**: Las gratificaciones se reducen al **50%** de la remuneracion.' : ''}

**Base legal**: Ley 27735, Art. 1-6; Ley 30334, Art. 3.

**Plazo**: Antes del **15 de julio** y **15 de diciembre**.`
  }

  if (msg.includes('despido') || msg.includes('despedir')) {
    return `## Procedimiento de Despido por Causa Justa

El despido en Peru debe seguir un procedimiento estricto:

### 1. Carta de Pre-aviso
- Detallar la **causa justa** (falta grave) con precision
- Otorgar **6 dias naturales** para descargos (30 dias si es capacidad)
- Entregar de forma personal o notarial

### 2. Carta de Despido
- Solo despues de vencido el plazo de descargos
- Si el trabajador no se defiende o su defensa es insatisfactoria
- Especificar la fecha de cese

### Causas justas (Art. 22-28 D.S. 003-97-TR):
- Falta grave: incumplimiento de obligaciones, abandono de trabajo, violencia, etc.
- Condena penal
- Inhabilitacion del trabajador

### Indemnizacion por despido arbitrario:
${ctx.regimenPrincipal === 'MYPE_MICRO' ? '- **Microempresa**: 10 remuneraciones diarias por anio (tope 90 rem. diarias)' : ctx.regimenPrincipal === 'MYPE_PEQUENA' ? '- **Pequeña empresa**: 20 remuneraciones diarias por anio (tope 120 rem. diarias)' : '- **Regimen general**: 1.5 remuneraciones mensuales por anio (tope 12 remuneraciones)'}

**Base legal**: D.S. 003-97-TR, Art. 16, 22-40.`
  }

  if (msg.includes('sunafil') || msg.includes('inspeccion') || msg.includes('multa')) {
    return `## Inspecciones SUNAFIL

### Tipos de inspeccion:
1. **Preventiva**: revision general programada
2. **Por denuncia**: originada por queja de trabajador
3. **Programa sectorial**: por sector economico especifico

### Escalas de multas (D.S. 019-2006-TR):
| Gravedad | 1-10 trabajadores | 11-50 | 51-200 | 201+ |
|----------|------------------|-------|--------|------|
| Leve | 0.045 - 0.45 UIT | 0.45 - 1.80 | 1.80 - 4.50 | 4.50+ |
| Grave | 0.27 - 1.57 UIT | 1.57 - 6.30 | 6.30 - 15.75 | 15.75+ |
| Muy Grave | 0.45 - 2.63 UIT | 2.63 - 10.13 | 10.13 - 26.32 | 26.32+ |

**UIT 2026 = S/ 5,500**

### Descuentos por subsanacion:
- **Antes de inspeccion**: -90% (Art. 40 Ley 28806)
- **Durante inspeccion**: hasta -70%
- **Despues de requerimiento**: segun plazo otorgado

${ctx.totalWorkers > 0 ? `Con **${ctx.totalWorkers} trabajadores**, tu empresa esta en el rango de ${ctx.totalWorkers <= 10 ? '1-10' : ctx.totalWorkers <= 50 ? '11-50' : ctx.totalWorkers <= 200 ? '51-200' : '201+'} trabajadores para efectos de calculo de multas.` : ''}

**Recomendacion**: Usa el **Simulacro SUNAFIL** de COMPLY360 para evaluar tu nivel de preparacion ante una inspeccion real.`
  }

  if (msg.includes('vacacion')) {
    return `## Vacaciones

Cada trabajador tiene derecho a **30 dias calendario** de descanso vacacional por cada anio completo de servicios.

### Reglas clave:
- El goce debe darse dentro del anio siguiente al cumplimiento del record
- Se puede fraccionar en periodos (minimo 15 dias, luego periodos de 7+ dias)
- Si acumula **2 periodos** sin goce → el trabajador tiene derecho a **triple vacacional** (remuneracion vacacional + indemnizacion vacacional + remuneracion del periodo trabajado)

${ctx.regimenPrincipal === 'MYPE_MICRO' || ctx.regimenPrincipal === 'MYPE_PEQUENA' ? `⚠️ **Tu regimen MYPE**: Las vacaciones son de **15 dias** (no 30).` : ''}

### Calculo de vacaciones truncas:
**Vacaciones truncas = (Remuneracion / 12) x meses y dias trabajados**

**Base legal**: D.Leg. 713, Art. 10-23.`
  }

  // Default response
  return `Gracias por tu consulta. Soy el Asistente IA Laboral de COMPLY360, especializado en derecho laboral peruano.

Puedo ayudarte con:
- **Calculos laborales**: CTS, gratificaciones, vacaciones, liquidaciones, horas extras
- **Obligaciones laborales**: por regimen (General, MYPE, Agrario, etc.)
- **Inspecciones SUNAFIL**: preparacion, multas, procedimiento
- **Contratos**: tipos, clausulas obligatorias, desnaturalizacion
- **SST**: obligaciones de la Ley 29783
- **Despidos**: procedimiento legal, indemnizaciones
- **Hostigamiento sexual**: obligaciones del empleador (Ley 27942)

${ctx.totalWorkers > 0 ? `Veo que tu empresa tiene **${ctx.totalWorkers} trabajadores** en regimen **${ctx.regimenPrincipal || 'GENERAL'}**.` : 'Para respuestas mas personalizadas, registra trabajadores en el modulo de Trabajadores.'}

¿En que puedo ayudarte?`
}
