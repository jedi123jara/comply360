/**
 * RB-10: Se emite boleta de pago con todos los conceptos detallados?
 * Base legal: D.S. 001-98-TR, Art. 18-19
 *
 * Lógica: en el último mes cerrado, todos los workers ACTIVE deben tener un Payslip.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer, workerEvidence } from './_helpers'

export const evaluatorRB10: QuestionEvaluator = {
  questionId: 'RB-10',
  evaluate: (ctx) => {
    // Mes anterior al actual
    const prev = new Date(ctx.now)
    prev.setMonth(prev.getMonth() - 1)
    const periodo = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`
    const activos = ctx.workers.filter((w) => w.status === 'ACTIVE')
    if (activos.length === 0) {
      return {
        questionId: 'RB-10',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores activos', 0)],
        sources: ['Worker', 'Payslip'],
      }
    }
    const conBoleta = activos.filter((w) =>
      ctx.payslips.some((p) => p.workerId === w.id && p.periodo === periodo)
    )
    const pct = Math.round((conBoleta.length / activos.length) * 100)
    const faltantes = activos.filter(
      (w) => !ctx.payslips.some((p) => p.workerId === w.id && p.periodo === periodo)
    ).slice(0, 5)
    return {
      questionId: 'RB-10',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Período evaluado', periodo),
        metricEvidence('Cobertura de boletas', `${pct}%`),
        ...faltantes.map((w) => workerEvidence(w, `Sin boleta de ${periodo}`)),
      ],
      sources: ['Payslip'],
    }
  },
}
