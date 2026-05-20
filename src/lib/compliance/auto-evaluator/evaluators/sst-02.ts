/**
 * SST-02: Reglamento Interno de SST (obligatorio para 20+ trabajadores)?
 * Base legal: Ley 29783, Art. 34
 */
import type { QuestionEvaluator } from '../types'
import { hasOrgDocument, metricEvidence } from './_helpers'

export const evaluatorSST02: QuestionEvaluator = {
  questionId: 'SST-02',
  evaluate: (ctx) => {
    if (ctx.workerCount < 20) {
      return {
        questionId: 'SST-02',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', `${ctx.workerCount} (no aplica si < 20)`)],
        sources: ['Worker'],
      }
    }
    const has = hasOrgDocument(ctx, 'REGLAMENTO_SST')
    return {
      questionId: 'SST-02',
      answer: has ? 'SI' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores', ctx.workerCount),
        metricEvidence('Reglamento Interno SST', has ? 'Registrado' : 'Falta'),
      ],
      sources: ['OrgDocument'],
    }
  },
}
