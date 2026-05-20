/**
 * DO-08: Síntesis de la legislación laboral exhibida en lugar visible?
 * Base legal: D.S. 001-98-TR, Art. 48
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, hasOrgDocument } from './_helpers'

export const evaluatorDO08: QuestionEvaluator = {
  questionId: 'DO-08',
  evaluate: (ctx) => {
    const tiene = hasOrgDocument(ctx, 'SINTESIS_LEGISLACION_LABORAL')
    return {
      questionId: 'DO-08',
      answer: tiene ? 'PARCIAL' : 'NO',
      confidence: 75,
      evidence: [
        metricEvidence('Síntesis subida', tiene ? 'Sí' : 'No'),
        metricEvidence('Verificación adicional', 'Confirmar exhibición física en sitio'),
      ],
      sources: ['OrgDocument.SINTESIS_LEGISLACION_LABORAL'],
    }
  },
}
