/**
 * DO-02: Boletas emitidas y conservadas para todos los trabajadores?
 * Base legal: D.S. 001-98-TR, Art. 18
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorDO02: QuestionEvaluator = {
  questionId: 'DO-02',
  evaluate: (ctx) => {
    if (ctx.workerCount === 0) {
      return {
        questionId: 'DO-02',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', 0)],
        sources: ['Worker', 'Payslip'],
      }
    }
    const conBoleta = new Set(ctx.payslips.map((p) => p.workerId))
    const cubiertos = ctx.workers.filter((w) => conBoleta.has(w.id))
    const pct = Math.round((cubiertos.length / ctx.workerCount) * 100)
    return {
      questionId: 'DO-02',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Trabajadores con al menos una boleta', `${pct}%`),
      ],
      sources: ['Payslip'],
    }
  },
}
