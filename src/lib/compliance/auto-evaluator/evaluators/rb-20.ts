/**
 * RB-20: Trabajadores de construcción civil reciben la BUC (bonificación unificada)?
 * Base legal: R.M. varios - sector construcción
 * Condición: regimenPrincipal=CONSTRUCCION_CIVIL
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorRB20: QuestionEvaluator = {
  questionId: 'RB-20',
  evaluate: (ctx) => {
    const construccion = ctx.workers.filter((w) => w.regimenLaboral === 'CONSTRUCCION_CIVIL')
    if (construccion.length === 0) {
      return {
        questionId: 'RB-20',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores en construcción civil', 0)],
        sources: ['Worker.regimenLaboral'],
      }
    }
    // BUC viene en bonificaciones del payslip
    const conBuc = construccion.filter((w) =>
      ctx.payslips.some((p) => p.workerId === w.id && (p.bonificaciones ?? 0) > 0)
    )
    const pct = Math.round((conBuc.length / construccion.length) * 100)
    return {
      questionId: 'RB-20',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 75,
      evidence: [
        metricEvidence('Trabajadores construcción civil', construccion.length),
        metricEvidence('Con BUC en boleta', `${pct}%`),
      ],
      sources: ['Worker', 'Payslip.bonificaciones'],
    }
  },
}
