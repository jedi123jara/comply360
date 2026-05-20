/**
 * SST-04: Matriz IPERC elaborada?
 * Base legal: Ley 29783, Art. 57; R.M. 050-2013-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST04: QuestionEvaluator = {
  questionId: 'SST-04',
  evaluate: (ctx) => {
    const aprobados = ctx.ipercBases.filter((i) => i.estado === 'APROBADO')
    return {
      questionId: 'SST-04',
      answer: aprobados.length > 0 ? 'SI' : ctx.ipercBases.length > 0 ? 'PARCIAL' : 'NO',
      confidence: 95,
      evidence: [
        metricEvidence('IPERC bases aprobadas', aprobados.length),
        metricEvidence('IPERC bases registradas (total)', ctx.ipercBases.length),
      ],
      sources: ['IPERCBase'],
    }
  },
}
