/**
 * JD-13: Licencia pre y post natal de 49 días cada una a trabajadoras gestantes?
 * Base legal: Ley 26644, Art. 1
 *
 * Lógica: workers con condicionEspecial=EMBARAZADA|MATERNIDAD_EXTENDIDA →
 * deben tener WorkerStatus=ON_LEAVE durante el período.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorJD13: QuestionEvaluator = {
  questionId: 'JD-13',
  evaluate: (ctx) => {
    const gestantes = ctx.workers.filter(
      (w) =>
        w.condicionEspecial === 'EMBARAZADA' ||
        w.condicionEspecial === 'MATERNIDAD_EXTENDIDA' ||
        w.condicionEspecial === 'LACTANCIA'
    )
    if (gestantes.length === 0) {
      return {
        questionId: 'JD-13',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadoras gestantes/maternidad', 0)],
        sources: ['Worker.condicionEspecial'],
      }
    }
    const enMaternidad = gestantes.filter(
      (w) => w.condicionEspecial === 'MATERNIDAD_EXTENDIDA' && w.status === 'ON_LEAVE'
    )
    const total = gestantes.filter((w) => w.condicionEspecial === 'MATERNIDAD_EXTENDIDA').length
    return {
      questionId: 'JD-13',
      answer: total === 0 || total === enMaternidad.length ? 'SI' : 'PARCIAL',
      confidence: 80,
      evidence: [
        metricEvidence('Trabajadoras en maternidad', total),
        metricEvidence('Con status ON_LEAVE', enMaternidad.length),
      ],
      sources: ['Worker.condicionEspecial', 'Worker.status'],
    }
  },
}
