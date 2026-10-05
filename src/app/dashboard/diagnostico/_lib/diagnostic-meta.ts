/**
 * Cifras y textos del diagnóstico SUNAFIL derivados del banco de preguntas real.
 *
 * Fuente de verdad: `src/lib/compliance/questions`. No escribas números a mano en
 * el copy (intro, resultado, etc.): importa estas constantes para que todas las
 * pantallas digan lo mismo aunque el banco crezca.
 *
 * Nota: el servidor filtra algunas preguntas según el régimen y tamaño de la
 * empresa, y otras se responden solas con los datos ya cargados. Por eso estos
 * totales son el máximo ("hasta N preguntas").
 */
import { AREAS, EXPRESS_QUESTIONS, FULL_QUESTIONS, getQuestionById } from '@/lib/compliance/questions'
import type { AnswerOption } from '@/lib/compliance/questions'
import { leerRespuestasGuardadas } from '@/lib/compliance/diagnostic-guidance'

export type DiagnosticMode = 'EXPRESS' | 'FULL'

/** Regla simple de tiempo: ~10 segundos por pregunta (leer y elegir una respuesta). */
export const SECONDS_PER_QUESTION = 10

export const QUESTION_COUNT: Record<DiagnosticMode, number> = {
  EXPRESS: EXPRESS_QUESTIONS.length,
  FULL: FULL_QUESTIONS.length,
}

export const AREA_COUNT = AREAS.length

/** Minutos estimados para responder `questionCount` preguntas (mínimo 1). */
export function estimateMinutes(questionCount: number): number {
  return Math.max(1, Math.ceil((questionCount * SECONDS_PER_QUESTION) / 60))
}

/** Texto corto de duración, igual en todas las pantallas: "~7 min". */
export function formatEstimate(questionCount: number): string {
  return `~${estimateMinutes(questionCount)} min`
}

/** Nombre visible del área (el catálogo `AREAS` ya lo guarda con tildes). */
export function areaLabel(key: string): string {
  return AREAS.find((a) => a.key === key)?.label ?? key
}

/** Peso real del área en el puntaje global (mismo dato que usa el motor). */
export function areaWeight(key: string): number | null {
  return AREAS.find((a) => a.key === key)?.weight ?? null
}

/**
 * El motor guarda los plazos sin tilde ("Inmediato (7 dias)") porque
 * `task-spawner` los interpreta; se corrigen solo al mostrarlos.
 */
export function formatPlazo(plazo: string): string {
  return plazo.replace(/\bdias\b/g, 'días')
}

/**
 * Agrega «¿» a una pregunta guardada sin él. El banco actual ya trae los signos;
 * esto queda para los diagnósticos guardados antes de la corrección.
 */
export function formatQuestionText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.endsWith('?') && !trimmed.startsWith('¿')) return `¿${trimmed}`
  return trimmed
}

/**
 * Texto de una pregunta para mostrar en el resultado: el del banco actual (con
 * tildes) si la pregunta existe; si no, el guardado en el diagnóstico.
 */
export function displayQuestionText(questionId: string, storedText: string): string {
  return getQuestionById(questionId)?.text ?? formatQuestionText(storedText)
}

/** Etiqueta corta de cada respuesta, igual en el cuestionario, el resumen y el resultado. */
export const ANSWER_LABEL: Record<AnswerOption, string> = {
  SI: 'Sí',
  PARCIAL: 'Parcial',
  NO: 'No',
  NO_SE: 'No sé',
  NO_APLICA: 'No aplica',
}

export interface RespuestasDelArea {
  /** Preguntas del área que tienen respuesta guardada (incluye «No aplica»). */
  respondidas: number
  /** Cuántas se marcaron «No aplica» (no cuentan en el puntaje). */
  noAplica: number
}

/**
 * Cuenta, por área, las respuestas guardadas y cuántas son «No aplica». Sirve
 * para que el resultado no muestre «100 %» en un área que en realidad no aplica
 * a la empresa o que no se evaluó. Devuelve `null` si el diagnóstico no guardó
 * respuestas legibles (por ejemplo, un simulacro): en ese caso se muestra todo.
 */
export function respuestasPorArea(questionsJson: unknown): Record<string, RespuestasDelArea> | null {
  const respuestas = leerRespuestasGuardadas(questionsJson)
  if (respuestas.length === 0) return null
  const porArea: Record<string, RespuestasDelArea> = {}
  for (const { questionId, answer } of respuestas) {
    const area = getQuestionById(questionId)?.area
    if (!area) continue
    const resumen = (porArea[area] ??= { respondidas: 0, noAplica: 0 })
    resumen.respondidas++
    if (answer === 'NO_APLICA') resumen.noAplica++
  }
  return Object.keys(porArea).length > 0 ? porArea : null
}
