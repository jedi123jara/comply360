/**
 * HS-03: Canal de denuncias (físico y/o virtual) garantiza confidencialidad y es accesible?
 * Base legal: Ley 27942, Art. 7-A; D.S. 014-2019-MIMP, Art. 14
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorHS03: QuestionEvaluator = {
  questionId: 'HS-03',
  evaluate: (ctx) => {
    // El canal público COMPLY360 (/denuncias/[orgSlug]) está siempre disponible,
    // permite denuncia anónima, y guarda evidencia segura.
    const recibidas = ctx.complaints.filter((c) => c.type === 'HOSTIGAMIENTO_SEXUAL').length
    return {
      questionId: 'HS-03',
      answer: 'SI',
      confidence: 95,
      evidence: [
        metricEvidence('Canal público', 'Operativo (denuncia anónima soportada)'),
        metricEvidence('Confidencialidad', 'Garantizada por diseño'),
        metricEvidence('Denuncias HOSTIGAMIENTO_SEXUAL recibidas', recibidas),
      ],
      sources: ['Complaint', 'Sistema (canal público)'],
    }
  },
}
