/**
 * IN-07: Capacitaciones anuales sobre prevención de hostigamiento sexual?
 * Base legal: D.S. 014-2019-MIMP, Art. 6
 *
 * Lógica: al menos 50% de workers capacitados en HOSTIGAMIENTO este año.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorIN07: QuestionEvaluator = {
  questionId: 'IN-07',
  evaluate: (ctx) => {
    const year = ctx.now.getFullYear()
    const capacitados = new Set(
      ctx.capacitacionesSST
        .filter(
          (c) => c.tipo === 'HOSTIGAMIENTO' && c.fechaCapacitacion.getFullYear() === year
        )
        .map((c) => c.workerId)
    )
    if (ctx.workerCount === 0) {
      return {
        questionId: 'IN-07',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', 0)],
        sources: ['WorkerCapacitacionSST'],
      }
    }
    const pct = Math.round((capacitados.size / ctx.workerCount) * 100)
    return {
      questionId: 'IN-07',
      answer: pct >= 50 ? 'SI' : pct > 0 ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores capacitados en hostigamiento (año actual)', capacitados.size),
        metricEvidence('Total trabajadores', ctx.workerCount),
        metricEvidence('Cobertura', `${pct}%`),
      ],
      sources: ['WorkerCapacitacionSST'],
    }
  },
}
