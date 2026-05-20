/**
 * DO-05: Legajo personal por cada trabajador con documentos básicos completos?
 * Base legal: D.S. 001-98-TR
 *
 * Lógica: Worker.legajoScore >= 80% promedio.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorDO05: QuestionEvaluator = {
  questionId: 'DO-05',
  evaluate: (ctx) => {
    if (ctx.workerCount === 0) {
      return {
        questionId: 'DO-05',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', 0)],
        sources: ['Worker'],
      }
    }
    const totalScore = ctx.workers.reduce((sum, w) => sum + (w.legajoScore ?? 0), 0)
    const avg = Math.round(totalScore / ctx.workerCount)
    return {
      questionId: 'DO-05',
      answer: avg >= 90 ? 'SI' : avg >= 70 ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Legajo promedio', `${avg}%`),
        metricEvidence('Trabajadores evaluados', ctx.workerCount),
      ],
      sources: ['Worker.legajoScore'],
    }
  },
}
