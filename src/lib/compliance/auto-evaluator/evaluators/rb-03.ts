/**
 * RB-03: Se paga la gratificación completa en julio y diciembre (o proporcional)?
 * Base legal: Ley 27735, Art. 2-3
 *
 * Lógica: payslips con periodo julio o diciembre del año actual deben existir
 * para todos los workers activos.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorRB03: QuestionEvaluator = {
  questionId: 'RB-03',
  evaluate: (ctx) => {
    const year = ctx.now.getFullYear()
    const month = ctx.now.getMonth() + 1 // 1-12

    // Ventanas de gratificación: si estamos pasado julio, debió haber pago jul;
    // si pasado diciembre, debió haber dic. Si no llegamos al mes, no aplica.
    const targets: string[] = []
    if (month >= 8) targets.push(`${year}-07`)
    if (month === 12 || (month === 1 && false)) targets.push(`${year}-12`)
    // Fallback al año anterior si estamos en enero/febrero
    if (month <= 2) targets.push(`${year - 1}-12`)

    if (targets.length === 0) {
      return {
        questionId: 'RB-03',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Período gratificatorio aún no transcurrido', 'N/A')],
        sources: ['Payslip.periodo'],
      }
    }
    const total = ctx.workerCount
    if (total === 0) {
      return {
        questionId: 'RB-03',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', 0)],
        sources: ['Worker', 'Payslip'],
      }
    }
    // Cobertura: % de workers con al menos un payslip en alguno de los targets
    const cobertura = ctx.workers.filter((w) =>
      ctx.payslips.some((p) => p.workerId === w.id && targets.includes(p.periodo))
    )
    const pct = Math.round((cobertura.length / total) * 100)
    return {
      questionId: 'RB-03',
      answer: pctToAnswer(pct),
      confidence: 85,
      evidence: [
        metricEvidence('Períodos gratificatorios analizados', targets.join(', ')),
        metricEvidence('Cobertura de boletas con gratificación', `${pct}%`),
      ],
      sources: ['Payslip'],
    }
  },
}
