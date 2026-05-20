/**
 * CR-09: No se excede el límite de 20% de practicantes respecto al total de trabajadores?
 * Base legal: Ley 28518, Art. 17
 *
 * Lógica: COUNT(MODALIDAD_FORMATIVA) / total ≤ 20%.
 */
import type { QuestionEvaluator } from '../types'
import { workersPracticantes } from '../context'
import { metricEvidence } from './_helpers'

export const evaluatorCR09: QuestionEvaluator = {
  questionId: 'CR-09',
  evaluate: (ctx) => {
    const total = ctx.workerCount
    const practicantes = workersPracticantes(ctx).length
    if (total === 0) {
      return {
        questionId: 'CR-09',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Total de trabajadores', 0)],
        sources: ['Worker.regimenLaboral'],
      }
    }
    const pct = Math.round((practicantes / total) * 100)
    const ok = pct <= 20
    return {
      questionId: 'CR-09',
      answer: ok ? 'SI' : 'NO',
      confidence: 95,
      evidence: [
        metricEvidence('Practicantes (modalidad formativa)', practicantes),
        metricEvidence('Total de trabajadores', total),
        metricEvidence('Porcentaje de practicantes', `${pct}% (límite legal 20%)`),
      ],
      sources: ['Worker.regimenLaboral'],
    }
  },
}
