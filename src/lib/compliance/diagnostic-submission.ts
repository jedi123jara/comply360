/**
 * Validación del envío de un diagnóstico (`POST /api/diagnostics`).
 *
 * Acepta las cinco respuestas (Sí, Parcial, No, No sé, No aplica) y también
 * `null` (sin responder: el scorer la cuenta como «No»), así que los clientes y
 * diagnósticos antiguos que solo envían SI / PARCIAL / NO siguen funcionando.
 *
 * Archivo solo de servidor (usa zod); en el cliente importa los valores desde
 * `questions/types` para no cargar zod en el bundle.
 */
import { z } from 'zod'
import { ANSWER_VALUES } from './questions/types'

/** Tope defensivo: el banco completo tiene 135 preguntas. */
export const MAX_ANSWERS = 500

const answerSchema = z.object({
  questionId: z.string().trim().min(1).max(40),
  answer: z.enum(ANSWER_VALUES).nullable(),
  evidenceUrl: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
})

export const diagnosticSubmissionSchema = z.object({
  type: z.enum(['FULL', 'EXPRESS', 'SIMULATION']).default('FULL'),
  answers: z
    .array(answerSchema)
    .min(1, 'Envía al menos una respuesta.')
    .max(MAX_ANSWERS, 'Hay demasiadas respuestas en el envío.'),
})

export type DiagnosticSubmission = z.infer<typeof diagnosticSubmissionSchema>

export type ParseSubmissionResult =
  | { ok: true; data: DiagnosticSubmission }
  | { ok: false; error: string }

/**
 * Valida el cuerpo del envío. Si una pregunta viene repetida, se queda la última
 * respuesta (igual que el mapa que usa el scorer).
 */
export function parseDiagnosticSubmission(body: unknown): ParseSubmissionResult {
  const parsed = diagnosticSubmissionSchema.safeParse(body)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path ?? []
    let error = 'Los datos del diagnóstico no son válidos.'
    if (path[0] === 'type') {
      error = "El tipo de diagnóstico debe ser 'FULL', 'EXPRESS' o 'SIMULATION'."
    } else if (path[0] === 'answers' && path.length === 1) {
      error = issue.message.startsWith('Envía') || issue.message.startsWith('Hay')
        ? issue.message
        : 'Envía al menos una respuesta.'
    } else if (path[0] === 'answers' && path[2] === 'answer') {
      error = 'Una de las respuestas no es válida. Usa Sí, Parcial, No, No sé o No aplica.'
    } else if (path[0] === 'answers') {
      error = 'Una de las respuestas no tiene el formato esperado.'
    }
    return { ok: false, error }
  }

  const byQuestion = new Map(parsed.data.answers.map((a) => [a.questionId, a]))
  return { ok: true, data: { ...parsed.data, answers: [...byQuestion.values()] } }
}
