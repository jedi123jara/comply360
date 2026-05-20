/**
 * DO-01: Planilla electrónica de pago actualizada y archivada?
 * Base legal: D.S. 018-2007-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorDO01: QuestionEvaluator = {
  questionId: 'DO-01',
  evaluate: (ctx) => {
    // Hay payslips en el último mes
    const oneMonthAgo = new Date(ctx.now)
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const recent = ctx.payslips.filter((p) => p.createdAt >= oneMonthAgo)
    return {
      questionId: 'DO-01',
      answer: recent.length > 0 ? 'SI' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Boletas generadas (30 días)', recent.length),
        metricEvidence('Total trabajadores', ctx.workerCount),
      ],
      sources: ['Payslip'],
    }
  },
}
