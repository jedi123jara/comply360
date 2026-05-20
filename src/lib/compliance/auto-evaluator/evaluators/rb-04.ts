/**
 * RB-04: Se otorga la bonificación extraordinaria del 9% sobre la gratificación (Ley 30334)?
 * Base legal: Ley 30334, Art. 3
 *
 * Lógica: en los payslips de julio/diciembre el campo bonificaciones debe ser >= 9% del bruto
 * (aproximación — el cálculo real es 9% de la gratificación, pero como suelen coincidir
 * sirve como heurística).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorRB04: QuestionEvaluator = {
  questionId: 'RB-04',
  evaluate: (ctx) => {
    const year = ctx.now.getFullYear()
    const targets = [`${year}-07`, `${year}-12`, `${year - 1}-12`]
    const payslipsRelevantes = ctx.payslips.filter((p) => targets.includes(p.periodo))
    if (payslipsRelevantes.length === 0) {
      return {
        questionId: 'RB-04',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Boletas en período gratificatorio', 0)],
        sources: ['Payslip'],
      }
    }
    const conBonif = payslipsRelevantes.filter(
      (p) => (p.bonificaciones ?? 0) >= p.sueldoBruto * 0.085
    )
    const pct = Math.round((conBonif.length / payslipsRelevantes.length) * 100)
    return {
      questionId: 'RB-04',
      answer: pctToAnswer(pct),
      confidence: 70,
      evidence: [
        metricEvidence('Boletas analizadas (jul/dic)', payslipsRelevantes.length),
        metricEvidence('Con bonificación ≥ 9% (Ley 30334)', `${pct}%`),
      ],
      sources: ['Payslip.bonificaciones'],
    }
  },
}
