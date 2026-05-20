/**
 * HS-04: Medidas de protección al denunciante aplicadas dentro de 3 días?
 * Base legal: D.S. 014-2019-MIMP, Art. 13; Ley 27942, Art. 12
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export const evaluatorHS04: QuestionEvaluator = {
  questionId: 'HS-04',
  evaluate: (ctx) => {
    const hsl = ctx.complaints.filter((c) => c.type === 'HOSTIGAMIENTO_SEXUAL')
    if (hsl.length === 0) {
      return {
        questionId: 'HS-04',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Denuncias HOSTIGAMIENTO_SEXUAL', 0)],
        sources: ['Complaint'],
      }
    }
    const ok = hsl.filter((c) => {
      if (!c.receivedAt) return false
      const proteccion = c.timeline.find(
        (t) =>
          /protec|medida/i.test(t.action) ||
          /protec|medida/i.test(t.description ?? '')
      )
      if (!proteccion) return c.status === 'PROTECTION_APPLIED'
      return proteccion.createdAt.getTime() - c.receivedAt.getTime() <= THREE_DAYS_MS
    })
    const pct = Math.round((ok.length / hsl.length) * 100)
    return {
      questionId: 'HS-04',
      answer: pctToAnswer(pct),
      confidence: 80,
      evidence: [
        metricEvidence('Denuncias HSL', hsl.length),
        metricEvidence('Con medidas en ≤ 3 días', `${pct}%`),
      ],
      sources: ['Complaint', 'ComplaintTimeline'],
    }
  },
}
