/**
 * TI-05: Número de trabajadores intermediados no supera el 20% del total?
 * Base legal: Ley 27626, Art. 3; D.S. 003-2002-TR, Art. 4
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorTI05: QuestionEvaluator = {
  questionId: 'TI-05',
  evaluate: (ctx) => {
    const intermediados = ctx.terceros
      .filter((t) => t.tipoServicio === 'INTERMEDIACION' && t.isActive)
      .reduce((sum, t) => sum + (t.trabajadoresAsignados ?? 0), 0)
    if (intermediados === 0) {
      return {
        questionId: 'TI-05',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores intermediados', 0)],
        sources: ['Tercero.trabajadoresAsignados'],
      }
    }
    const total = ctx.workerCount + intermediados
    const pct = Math.round((intermediados / total) * 100)
    return {
      questionId: 'TI-05',
      answer: pct <= 20 ? 'SI' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores intermediados', intermediados),
        metricEvidence('Trabajadores directos', ctx.workerCount),
        metricEvidence('Proporción intermediados', `${pct}% (límite 20%)`),
      ],
      sources: ['Tercero', 'Worker'],
    }
  },
}
