/**
 * JD-01: Se respeta la jornada máxima de 8 horas diarias o 48 horas semanales?
 * Base legal: D.S. 007-2002-TR, Art. 1
 *
 * Lógica: Attendance del último mes — % de días con hoursWorked ≤ 9 (1h tolerancia).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorJD01: QuestionEvaluator = {
  questionId: 'JD-01',
  evaluate: (ctx) => {
    if (ctx.attendanceRecent.length === 0) {
      return {
        questionId: 'JD-01',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Asistencias registradas (90 días)', 0)],
        sources: ['Attendance'],
      }
    }
    const conHoras = ctx.attendanceRecent.filter((a) => a.hoursWorked !== null)
    if (conHoras.length === 0) {
      return {
        questionId: 'JD-01',
        answer: null,
        confidence: 90,
        evidence: [metricEvidence('Asistencias con horas calculadas', 0)],
        sources: ['Attendance.hoursWorked'],
      }
    }
    const excedidas = conHoras.filter((a) => (a.hoursWorked ?? 0) > 9)
    const pct = Math.round(((conHoras.length - excedidas.length) / conHoras.length) * 100)
    return {
      questionId: 'JD-01',
      answer: pctToAnswer(pct),
      confidence: 85,
      evidence: [
        metricEvidence('Asistencias analizadas', conHoras.length),
        metricEvidence('Días con jornada > 9h', excedidas.length),
        metricEvidence('Cumplimiento jornada legal', `${pct}%`),
      ],
      sources: ['Attendance'],
    }
  },
}
