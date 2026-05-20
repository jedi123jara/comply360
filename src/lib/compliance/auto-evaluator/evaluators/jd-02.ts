/**
 * JD-02: Se cuenta con un registro de control de asistencia?
 * Base legal: D.S. 004-2006-TR, Art. 1
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorJD02: QuestionEvaluator = {
  questionId: 'JD-02',
  evaluate: (ctx) => {
    const hasAttendance = ctx.attendanceRecent.length > 0
    return {
      questionId: 'JD-02',
      answer: hasAttendance ? 'SI' : 'NO',
      confidence: 98,
      evidence: [
        metricEvidence('Asistencias registradas (90 días)', ctx.attendanceRecent.length),
      ],
      sources: ['Attendance'],
    }
  },
}
