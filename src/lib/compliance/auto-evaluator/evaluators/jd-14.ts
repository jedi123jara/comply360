/**
 * JD-14: Hora de lactancia materna durante el primer año del hijo?
 * Base legal: Ley 27240, Art. 1
 *
 * Lógica: workers con condicionEspecial=LACTANCIA → asumimos cumplimiento si está flagged.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorJD14: QuestionEvaluator = {
  questionId: 'JD-14',
  evaluate: (ctx) => {
    const lactando = ctx.workers.filter((w) => w.condicionEspecial === 'LACTANCIA')
    if (lactando.length === 0) {
      return {
        questionId: 'JD-14',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadoras en lactancia', 0)],
        sources: ['Worker.condicionEspecial'],
      }
    }
    return {
      questionId: 'JD-14',
      answer: 'SI',
      confidence: 75,
      evidence: [
        metricEvidence('Trabajadoras en lactancia identificadas', lactando.length),
        metricEvidence(
          'Validación',
          'Marcadas como LACTANCIA — verificar que se otorgue hora diaria'
        ),
      ],
      sources: ['Worker.condicionEspecial'],
    }
  },
}
