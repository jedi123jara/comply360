/**
 * IN-06: Canal de denuncias accesible para casos de hostigamiento?
 * Base legal: Ley 27942, Art. 7-A
 *
 * Lógica: el canal público `/denuncias/[orgSlug]` siempre existe en COMPLY360.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorIN06: QuestionEvaluator = {
  questionId: 'IN-06',
  evaluate: (ctx) => {
    const recibidas = ctx.complaints.length
    return {
      questionId: 'IN-06',
      answer: 'SI',
      confidence: 95,
      evidence: [
        metricEvidence('Canal de denuncias público', 'Operativo'),
        metricEvidence('URL', `/denuncias/${ctx.organization.id.slice(0, 8)}`),
        metricEvidence('Denuncias recibidas (total)', recibidas),
      ],
      sources: ['Complaint', 'Sistema (canal público)'],
    }
  },
}
