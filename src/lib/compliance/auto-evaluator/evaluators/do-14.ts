/**
 * DO-14: Política contra hostigamiento sexual exhibida en lugar visible?
 * Base legal: D.S. 014-2019-MIMP, Art. 5
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorDO14: QuestionEvaluator = {
  questionId: 'DO-14',
  evaluate: (ctx) => {
    const doc = ctx.orgDocuments.find((d) => d.type === 'POLITICA_HOSTIGAMIENTO')
    if (!doc) {
      return {
        questionId: 'DO-14',
        answer: 'NO',
        confidence: 95,
        evidence: [metricEvidence('Política de hostigamiento', 'No registrada')],
        sources: ['OrgDocument'],
      }
    }
    const exhibida = !!doc.publishedAt
    return {
      questionId: 'DO-14',
      answer: exhibida ? 'SI' : 'PARCIAL',
      confidence: 90,
      evidence: [
        metricEvidence('Política registrada', 'Sí'),
        metricEvidence('Publicada a trabajadores', exhibida ? 'Sí' : 'No'),
        metricEvidence('Acuse de recibo requerido', doc.acknowledgmentRequired ? 'Sí' : 'No'),
      ],
      sources: ['OrgDocument.POLITICA_HOSTIGAMIENTO'],
    }
  },
}
