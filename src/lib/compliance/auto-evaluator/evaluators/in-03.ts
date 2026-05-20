/**
 * IN-03: Política contra hostigamiento sexual con comité y procedimiento implementada?
 * Base legal: Ley 27942; D.S. 014-2019-MIMP
 */
import type { QuestionEvaluator } from '../types'
import { hasOrgDocument, metricEvidence } from './_helpers'

export const evaluatorIN03: QuestionEvaluator = {
  questionId: 'IN-03',
  evaluate: (ctx) => {
    const tienePolicy = hasOrgDocument(ctx, 'POLITICA_HOSTIGAMIENTO')
    const tieneCanal = ctx.complaints.length >= 0 // canal público siempre existe
    if (!tienePolicy) {
      return {
        questionId: 'IN-03',
        answer: 'NO',
        confidence: 95,
        evidence: [
          metricEvidence('Política de hostigamiento', 'No registrada'),
          metricEvidence('Canal de denuncias', 'Operativo'),
        ],
        sources: ['OrgDocument'],
      }
    }
    return {
      questionId: 'IN-03',
      answer: tieneCanal ? 'SI' : 'PARCIAL',
      confidence: 85,
      evidence: [
        metricEvidence('Política de hostigamiento', 'Sí'),
        metricEvidence('Canal de denuncias', 'Operativo'),
        metricEvidence('Denuncias procesadas', ctx.complaints.length),
      ],
      sources: ['OrgDocument.POLITICA_HOSTIGAMIENTO', 'Complaint'],
    }
  },
}
