/**
 * SST-20: Simulacros de evacuación al menos 2 veces al año?
 * Base legal: Ley 28551; INDECI
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST20: QuestionEvaluator = {
  questionId: 'SST-20',
  evaluate: (ctx) => {
    const year = ctx.now.getFullYear()
    const ejecutados = ctx.simulacros.filter(
      (s) => s.fechaEjecutada && s.fechaEjecutada.getFullYear() === year
    )
    return {
      questionId: 'SST-20',
      answer: ejecutados.length >= 2 ? 'SI' : ejecutados.length === 1 ? 'PARCIAL' : 'NO',
      confidence: 95,
      evidence: [
        metricEvidence('Simulacros ejecutados este año', ejecutados.length),
        metricEvidence('Requeridos por ley', '2 mínimo'),
        metricEvidence(
          'Con acta firmada',
          ejecutados.filter((s) => s.actaUrl !== null).length
        ),
      ],
      sources: ['Simulacro'],
    }
  },
}
