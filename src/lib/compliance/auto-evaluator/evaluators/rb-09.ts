/**
 * RB-09: Horas extras pagadas con sobretasa legal (25% primeras 2h, 35% siguientes)?
 * Base legal: D.S. 007-2002-TR, Art. 10
 *
 * Lógica: payslips con horasExtras > 0 deben tener el monto coherente con la sobretasa.
 * Heurística: si horasExtras > 0 lo damos por bien (assume calculator hizo bien).
 * Si Attendance detectó overtime pero payslip no refleja → PARCIAL.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorRB09: QuestionEvaluator = {
  questionId: 'RB-09',
  evaluate: (ctx) => {
    const workersConOvertime = new Set(
      ctx.attendanceRecent.filter((a) => a.isOvertime).map((a) => a.workerId)
    )
    if (workersConOvertime.size === 0) {
      return {
        questionId: 'RB-09',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con horas extras detectadas (90 días)', 0)],
        sources: ['Attendance.isOvertime'],
      }
    }
    const conPago = ctx.workers.filter((w) => {
      if (!workersConOvertime.has(w.id)) return true
      return ctx.payslips.some((p) => p.workerId === w.id && (p.horasExtras ?? 0) > 0)
    })
    const pct = Math.round((conPago.length / ctx.workers.length) * 100)
    return {
      questionId: 'RB-09',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 70,
      evidence: [
        metricEvidence('Trabajadores con horas extras detectadas', workersConOvertime.size),
        metricEvidence('Con horas extras pagadas en boleta', `${pct}%`),
      ],
      sources: ['Attendance', 'Payslip.horasExtras'],
    }
  },
}
