/**
 * Cifras del diagnóstico SUNAFIL derivadas del banco de preguntas real.
 *
 * Fuente de verdad: `src/lib/compliance/questions`. No escribas números a mano en
 * el copy (intro, resultado, etc.): importa estas constantes para que todas las
 * pantallas digan lo mismo aunque el banco crezca.
 *
 * Nota: el servidor filtra algunas preguntas según el régimen y tamaño de la
 * empresa, y otras se responden solas con los datos ya cargados. Por eso estos
 * totales son el máximo ("hasta N preguntas").
 */
import { AREAS, EXPRESS_QUESTIONS, FULL_QUESTIONS } from '@/lib/compliance/questions'
import type { AreaKey } from '@/lib/compliance/questions'

export type DiagnosticMode = 'EXPRESS' | 'FULL'

/** Regla simple de tiempo: ~10 segundos por pregunta (leer y elegir Sí / Parcial / No). */
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

/**
 * Nombres de área con tildes. El catálogo base (`AREAS`) aún los guarda sin
 * tildes; aquí se corrigen solo para mostrarlos. El tipo obliga a cubrir las 10.
 */
const AREA_LABELS: Record<AreaKey, string> = {
  contratos_registro: 'Contratos y registro',
  remuneraciones_beneficios: 'Remuneraciones y beneficios',
  jornada_descansos: 'Jornada y descansos',
  sst: 'Seguridad y salud en el trabajo',
  documentos_obligatorios: 'Documentos obligatorios',
  relaciones_laborales: 'Relaciones laborales',
  igualdad_nodiscriminacion: 'Igualdad y no discriminación',
  trabajadores_especiales: 'Trabajadores especiales',
  tercerizacion_intermediacion: 'Tercerización e intermediación',
  hostigamiento_sexual_detallado: 'Hostigamiento sexual: procedimiento',
}

export function areaLabel(key: string): string {
  return AREA_LABELS[key as AreaKey] ?? AREAS.find((a) => a.key === key)?.label ?? key
}

/** Peso real del área en el puntaje global (mismo dato que usa el motor). */
export function areaWeight(key: string): number | null {
  return AREAS.find((a) => a.key === key)?.weight ?? null
}

/** El motor guarda plazos sin tildes ("Inmediato (7 dias)"); los corregimos al mostrarlos. */
export function formatPlazo(plazo: string): string {
  return plazo.replace(/\bdias\b/g, 'días')
}

/** Las preguntas del banco terminan en "?" pero no abren con "¿"; lo agregamos al mostrarlas. */
export function formatQuestionText(text: string): string {
  const trimmed = text.trim()
  if (trimmed.endsWith('?') && !trimmed.startsWith('¿')) return `¿${trimmed}`
  return trimmed
}
