/**
 * Preguntas del diagnóstico gratis público (/diagnostico-gratis).
 *
 * Fuente única para el formulario y para cualquier texto que diga cuántas
 * preguntas tiene (la propia página, la 404, etc.). Usa las preguntas
 * "express" de mayor peso del banco real, hasta PUBLIC_QUESTION_LIMIT.
 */
import { EXPRESS_QUESTIONS } from '@/lib/compliance/questions'
import type { ComplianceQuestion } from '@/lib/compliance/questions'
import { formatEstimate } from '@/app/dashboard/diagnostico/_lib/diagnostic-meta'

/** Máximo de preguntas del diagnóstico público (las de mayor peso). */
export const PUBLIC_QUESTION_LIMIT = 20

export const PUBLIC_QUESTIONS: ComplianceQuestion[] = [...EXPRESS_QUESTIONS]
  .sort((a, b) => b.peso - a.peso)
  .slice(0, PUBLIC_QUESTION_LIMIT)

/** Cantidad real de preguntas del formulario público. */
export const PUBLIC_QUESTION_COUNT = PUBLIC_QUESTIONS.length

/** Duración estimada con la misma regla que el diagnóstico del panel ("~4 min"). */
export const PUBLIC_ESTIMATE = formatEstimate(PUBLIC_QUESTION_COUNT)
