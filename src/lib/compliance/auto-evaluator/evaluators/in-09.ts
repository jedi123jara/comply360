/**
 * IN-09: Protección a denunciantes contra represalias?
 * Base legal: Ley 27942, Art. 8
 *
 * Lógica: cada Complaint con type=HOSTIGAMIENTO_SEXUAL en INVESTIGATING/RESOLVED
 * debe tener protectionMeasures aplicadas + timeline con acción de protección.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorIN09: QuestionEvaluator = {
  questionId: 'IN-09',
  evaluate: (ctx) => {
    const activas = ctx.complaints.filter(
      (c) =>
        ['HOSTIGAMIENTO_SEXUAL', 'DISCRIMINACION', 'ACOSO_LABORAL'].includes(c.type) &&
        ['UNDER_REVIEW', 'INVESTIGATING', 'PROTECTION_APPLIED', 'RESOLVED'].includes(c.status)
    )
    if (activas.length === 0) {
      return {
        questionId: 'IN-09',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Denuncias en proceso', 0)],
        sources: ['Complaint'],
      }
    }
    const conProteccion = activas.filter(
      (c) =>
        c.protectionMeasures !== null ||
        c.status === 'PROTECTION_APPLIED' ||
        c.timeline.some((t) => /protec/i.test(t.action))
    )
    const pct = Math.round((conProteccion.length / activas.length) * 100)
    return {
      questionId: 'IN-09',
      answer: pctToAnswer(pct),
      confidence: 85,
      evidence: [
        metricEvidence('Denuncias activas', activas.length),
        metricEvidence('Con medidas de protección aplicadas', `${pct}%`),
      ],
      sources: ['Complaint.protectionMeasures', 'ComplaintTimeline'],
    }
  },
}
