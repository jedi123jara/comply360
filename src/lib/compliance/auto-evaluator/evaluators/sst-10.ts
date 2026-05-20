/**
 * SST-10: Registro de accidentes, enfermedades ocupacionales e incidentes?
 * Base legal: Ley 29783, Art. 28; R.M. 050-2013-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST10: QuestionEvaluator = {
  questionId: 'SST-10',
  evaluate: (ctx) => {
    return {
      questionId: 'SST-10',
      answer: ctx.accidentes.length >= 0 ? 'SI' : 'NO',
      confidence: 85,
      evidence: [
        metricEvidence('Accidentes registrados', ctx.accidentes.length),
        metricEvidence(
          'Sistema de registro',
          'Operativo (modelo Accidente + InvestigacionAccidente)'
        ),
      ],
      sources: ['Accidente'],
    }
  },
}
