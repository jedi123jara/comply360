/**
 * TE-05: Trabajadores extranjeros con contrato aprobado por MTPE y situación migratoria regular?
 * Base legal: D.Leg. 689, Art. 2-4
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorTE05: QuestionEvaluator = {
  questionId: 'TE-05',
  evaluate: (ctx) => {
    const extranjeros = ctx.workers.filter(
      (w) => w.nationality && w.nationality.toLowerCase() !== 'peruana'
    )
    if (extranjeros.length === 0) {
      return {
        questionId: 'TE-05',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores extranjeros', 0)],
        sources: ['Worker.nationality'],
      }
    }
    // Sin tracking de aprobación MTPE → marca PARCIAL
    return {
      questionId: 'TE-05',
      answer: 'PARCIAL',
      confidence: 60,
      evidence: [
        metricEvidence('Trabajadores extranjeros', extranjeros.length),
        metricEvidence(
          'Aprobación MTPE',
          'Pendiente verificación manual (subir AUTORIZACION_MTPE_EXTRANJERO)'
        ),
      ],
      sources: ['Worker.nationality'],
    }
  },
}
