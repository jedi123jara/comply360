/**
 * JD-03: El registro de asistencia consigna hora de ingreso y salida?
 * Base legal: D.S. 004-2006-TR, Art. 2
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorJD03: QuestionEvaluator = {
  questionId: 'JD-03',
  evaluate: (ctx) => {
    if (ctx.attendanceRecent.length === 0) {
      return {
        questionId: 'JD-03',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Asistencias registradas (90 días)', 0)],
        sources: ['Attendance'],
      }
    }
    const completas = ctx.attendanceRecent.filter((a) => a.clockIn && a.clockOut)
    const pct = Math.round((completas.length / ctx.attendanceRecent.length) * 100)
    return {
      questionId: 'JD-03',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Asistencias analizadas', ctx.attendanceRecent.length),
        metricEvidence('Con ingreso + salida', `${pct}%`),
      ],
      sources: ['Attendance.clockIn', 'Attendance.clockOut'],
    }
  },
}
