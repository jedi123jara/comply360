/**
 * HS-06: Capacitaciones anuales de hostigamiento sexual a TODOS los trabajadores?
 * Base legal: D.S. 014-2019-MIMP, Art. 6 y 7
 *
 * Diferencia con IN-07: HS-06 exige cobertura ≥ 100% (no solo ≥ 50%).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorHS06: QuestionEvaluator = {
  questionId: 'HS-06',
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
        questionId: 'HS-06',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', 0)],
        sources: ['WorkerCapacitacionSST'],
      }
    }
    const pct = Math.round((capacitados.size / ctx.workerCount) * 100)
    return {
      questionId: 'HS-06',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Trabajadores capacitados en hostigamiento', capacitados.size),
        metricEvidence('Total trabajadores', ctx.workerCount),
        metricEvidence('Cobertura (requerido 100%)', `${pct}%`),
      ],
      sources: ['WorkerCapacitacionSST'],
    }
  },
}
