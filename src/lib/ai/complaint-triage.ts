/**
 * Triaje automático de denuncias del canal Ley 27942.
 *
 * Al recibir una denuncia, la IA:
 *  1. Clasifica severidad (BAJA | MEDIA | ALTA | CRITICA)
 *  2. Clasifica urgencia de respuesta (BAJA | MEDIA | ALTA | INMEDIATA)
 *  3. Sugiere medidas de protección específicas según el tipo (hostigamiento,
 *     discriminación, acoso laboral), alineadas al D.S. 014-2019-MIMP
 *  4. Detecta red flags que requieren escalamiento inmediato
 *  5. Genera un summary de 1-2 oraciones que va al panel del Comité
 *
 * Uso:
 * ```ts
 * const result = await triageComplaint({ type, description, accusedPosition })
 * if (result.ok) {
 *   await prisma.complaint.update({ where:{id}, data:{
 *     severityAi: result.severity,
 *     urgencyAi: result.urgency,
 *     triageJson: result,
 *     triagedAt: new Date(),
 *   }})
 * }
 * ```
 *
 * Seguridad:
 *  - Timeout defensivo de 20s — si el provider no responde, `ok=false`.
 *  - Rate-limit con `p-limit` (semáforo homemade) con concurrency 3 para no
 *    saturar el provider ante picos de denuncias. Sin lib externa nueva.
 *  - Nunca lanza excepciones — siempre devuelve un TriageOutcome.
 */

import { callAI, type AIMessage } from './provider'
import type { ComplaintType } from '@/generated/prisma/client'

export type TriageSeverity = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA'
export type TriageUrgency = 'BAJA' | 'MEDIA' | 'ALTA' | 'INMEDIATA'

export interface TriageInput {
  type: ComplaintType
  description: string
  accusedPosition?: string | null
}

export interface TriageSuccess {
  ok: true
  severity: TriageSeverity
  urgency: TriageUrgency
  summary: string
  redFlags: string[]
  suggestedProtectionMeasures: string[]
  model: string
}

export interface TriageFailure {
  ok: false
  reason: 'provider_not_configured' | 'timeout' | 'invalid_response' | 'api_error'
  error: string
}

export type TriageOutcome = TriageSuccess | TriageFailure

const TIMEOUT_MS = 20_000

// ═══════════════════════════════════════════════════════════════════════════
// Rate limiting — semáforo simple de concurrency 3
// Cuando llegan 100 denuncias en batch no saturamos el provider.
// ═══════════════════════════════════════════════════════════════════════════

const MAX_CONCURRENT = 3
let inFlight = 0
const waiting: Array<() => void> = []

async function acquireSlot(): Promise<void> {
  if (inFlight < MAX_CONCURRENT) {
    inFlight++
    return
  }
  await new Promise<void>((resolve) => {
    waiting.push(() => {
      inFlight++
      resolve()
    })
  })
}

function releaseSlot(): void {
  inFlight--
  const next = waiting.shift()
  if (next) next()
}

// ═══════════════════════════════════════════════════════════════════════════
// Prompts
// ═══════════════════════════════════════════════════════════════════════════

const TYPE_LABELS: Record<ComplaintType, string> = {
  HOSTIGAMIENTO_SEXUAL: 'hostigamiento sexual',
  DISCRIMINACION: 'discriminación',
  ACOSO_LABORAL: 'acoso laboral',
  OTRO: 'denuncia laboral (otro)',
}

function buildSystemPrompt(): string {
  return `Eres un asistente legal especializado en el canal de denuncias laborales del Perú, conforme a la Ley 27942 (Ley de Prevención y Sanción del Hostigamiento Sexual) y el D.S. 014-2019-MIMP.

Tu rol es analizar la descripción de una denuncia y clasificarla para el Comité de Intervención.

Devuelves SIEMPRE JSON con el siguiente formato, sin texto adicional:
{
  "severity": "BAJA" | "MEDIA" | "ALTA" | "CRITICA",
  "urgency": "BAJA" | "MEDIA" | "ALTA" | "INMEDIATA",
  "summary": "1-2 oraciones resumiendo objetivamente la denuncia",
  "redFlags": ["señal que requiere atención inmediata", ...],
  "suggestedProtectionMeasures": ["medida concreta del D.S. 014-2019-MIMP", ...]
}

Criterios de severidad:
- CRITICA: hay amenaza física, agresión sexual consumada o intento, represalia activa, conducta reiterada con evidencia documentada.
- ALTA: conducta reiterada, uso de jerarquía para presionar, afectación clara a la salud mental del denunciante.
- MEDIA: hecho único con impacto moderado, comentarios inapropiados sin agresión física, ambiente laboral deteriorado.
- BAJA: roce laboral puntual, malentendido, falta de evidencia específica más allá del relato.

Criterios de urgencia (independiente de severidad):
- INMEDIATA: hay riesgo físico actual, necesidad de separar al denunciado YA, la víctima necesita atención psicológica urgente.
- ALTA: actuar en 24-48 horas para prevenir represalia o evidencia desaparecida.
- MEDIA: investigar en los plazos legales normales (30 días).
- BAJA: caso que admite investigación sin urgencia, sin riesgo inminente.

Medidas de protección que puedes sugerir (elige las que apliquen):
- Separación física del denunciado (cambio de oficina/turno)
- Cambio de reporting line temporal
- Licencia con goce para la víctima durante la investigación
- Acompañamiento psicológico (EsSalud o privado)
- Revisión de cámaras / logs de acceso para preservar evidencia
- Prohibición de contacto directo entre las partes
- Notificación al Ministerio Público si hay delito (art. 11 Ley 27942)
- Capacitación obligatoria al equipo (en discriminación / acoso)
- Revisión de política interna de la empresa

Red flags que debes destacar si aparecen:
- Mención de amenaza física o sexual
- Mención explícita de represalia por denunciar previamente
- Conducta reiterada explícita ("me lo hace todos los días", "varias veces")
- Menor de edad involucrado
- Relación de subordinación directa con el denunciado
- Evidencia documental ofrecida (fotos, chats, audio)
- Múltiples víctimas mencionadas

Sé conservador con "CRITICA" e "INMEDIATA": úsalas solo con evidencia clara en el texto. No inventes hechos no mencionados.`
}

function buildUserPrompt(input: TriageInput): string {
  const typeLabel = TYPE_LABELS[input.type]
  const accusedInfo = input.accusedPosition
    ? `\nCargo del denunciado: ${input.accusedPosition}`
    : ''
  return `Tipo de denuncia: ${typeLabel}${accusedInfo}

Descripción del denunciante:
"""
${input.description.slice(0, 4000)}
"""

Clasifica esta denuncia y responde con el JSON especificado.`
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

const VALID_SEVERITIES: TriageSeverity[] = ['BAJA', 'MEDIA', 'ALTA', 'CRITICA']
const VALID_URGENCIES: TriageUrgency[] = ['BAJA', 'MEDIA', 'ALTA', 'INMEDIATA']

export async function triageComplaint(input: TriageInput): Promise<TriageOutcome> {
  await acquireSlot()
  try {
    return await runTriage(input)
  } finally {
    releaseSlot()
  }
}

async function runTriage(input: TriageInput): Promise<TriageOutcome> {
  const messages: AIMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(input) },
  ]

  // Timeout defensivo. callAI no expone AbortController — armamos un race.
  let timedOut = false
  const timeoutPromise = new Promise<string>((_, reject) => {
    setTimeout(() => {
      timedOut = true
      reject(new Error('timeout'))
    }, TIMEOUT_MS)
  })

  let raw: string
  try {
    raw = await Promise.race([
      callAI(messages, { temperature: 0.1, maxTokens: 800, jsonMode: true }),
      timeoutPromise,
    ])
  } catch (err) {
    if (timedOut) {
      return { ok: false, reason: 'timeout', error: `Timeout de ${TIMEOUT_MS}ms esperando al modelo` }
    }
    const message = err instanceof Error ? err.message : String(err)
    if (message.includes('No AI provider configured')) {
      return { ok: false, reason: 'provider_not_configured', error: message }
    }
    return { ok: false, reason: 'api_error', error: message }
  }

  return parseTriageResponse(raw)
}

/**
 * Parsea la respuesta del modelo y valida el shape. Expuesto para testing.
 */
export function parseTriageResponse(raw: string): TriageOutcome {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, reason: 'invalid_response', error: `JSON inválido: ${raw.slice(0, 200)}` }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, reason: 'invalid_response', error: 'Respuesta no es un objeto' }
  }

  const p = parsed as Record<string, unknown>

  const severity = typeof p.severity === 'string' && VALID_SEVERITIES.includes(p.severity as TriageSeverity)
    ? (p.severity as TriageSeverity)
    : null
  const urgency = typeof p.urgency === 'string' && VALID_URGENCIES.includes(p.urgency as TriageUrgency)
    ? (p.urgency as TriageUrgency)
    : null

  if (!severity || !urgency) {
    return {
      ok: false,
      reason: 'invalid_response',
      error: `Falta severity o urgency válido. Recibido: severity=${String(p.severity)}, urgency=${String(p.urgency)}`,
    }
  }

  const summary = typeof p.summary === 'string' ? p.summary.slice(0, 500) : ''
  const redFlags = Array.isArray(p.redFlags)
    ? (p.redFlags as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 10)
    : []
  const measures = Array.isArray(p.suggestedProtectionMeasures)
    ? (p.suggestedProtectionMeasures as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0).slice(0, 15)
    : []

  return {
    ok: true,
    severity,
    urgency,
    summary,
    redFlags,
    suggestedProtectionMeasures: measures,
    model: 'callAI',
  }
}
