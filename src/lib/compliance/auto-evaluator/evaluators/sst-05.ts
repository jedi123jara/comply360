/**
 * SST-05: Plan Anual de SST aprobado por el Comité/Supervisor?
 * Base legal: Ley 29783, Art. 38
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, hasSstRecord } from './_helpers'

export const evaluatorSST05: QuestionEvaluator = {
  questionId: 'SST-05',
  evaluate: (ctx) => {
    const has = hasSstRecord(ctx, 'PLAN_ANUAL')
    return {
      questionId: 'SST-05',
      answer: has ? 'SI' : 'NO',
      confidence: 90,
      evidence: [metricEvidence('Plan Anual SST', has ? 'Registrado' : 'Falta')],
      sources: ['SstRecord.type=PLAN_ANUAL'],
    }
  },
}
