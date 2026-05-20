/**
 * HS-01: Política de hostigamiento aprobada, publicada y comunicada a todos los trabajadores?
 * Base legal: D.S. 014-2019-MIMP, Art. 4 y 5; Ley 27942, Art. 7-A
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorHS01: QuestionEvaluator = {
  questionId: 'HS-01',
  evaluate: (ctx) => {
    const doc = ctx.orgDocuments.find((d) => d.type === 'POLITICA_HOSTIGAMIENTO')
    if (!doc) {
      return {
        questionId: 'HS-01',
        answer: 'NO',
        confidence: 95,
        evidence: [metricEvidence('Política de hostigamiento', 'No registrada')],
        sources: ['OrgDocument'],
      }
    }
    const exhibida = !!doc.publishedAt
    const conAck = doc.acknowledgmentRequired
    return {
      questionId: 'HS-01',
      answer: exhibida && conAck ? 'SI' : exhibida ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Política registrada', 'Sí'),
        metricEvidence('Publicada', exhibida ? 'Sí' : 'No'),
        metricEvidence('Acuse de recibo requerido', conAck ? 'Sí' : 'No'),
      ],
      sources: ['OrgDocument'],
    }
  },
}
