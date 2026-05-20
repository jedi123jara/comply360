/**
 * DO-09: Registro de control de asistencia disponible para inspección?
 * Base legal: D.S. 004-2006-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorDO09: QuestionEvaluator = {
  questionId: 'DO-09',
  evaluate: (ctx) => {
    const has = ctx.attendanceRecent.length > 0
    return {
      questionId: 'DO-09',
      answer: has ? 'SI' : 'NO',
      confidence: 95,
      evidence: [
        metricEvidence(
          'Registro digital de asistencia',
          has ? `${ctx.attendanceRecent.length} marcas en 90 días` : 'Sin data'
        ),
      ],
      sources: ['Attendance'],
    }
  },
}
