/**
 * DO-15: Documentos de liquidación de beneficios sociales al cese?
 * Base legal: D.S. 003-97-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorDO15: QuestionEvaluator = {
  questionId: 'DO-15',
  evaluate: (ctx) => {
    if (ctx.ceseRecords.length === 0) {
      return {
        questionId: 'DO-15',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Ceses registrados', 0)],
        sources: ['CeseRecord'],
      }
    }
    const conLiquidacion = ctx.ceseRecords.filter((c) => c.totalLiquidacion > 0)
    const pct = Math.round((conLiquidacion.length / ctx.ceseRecords.length) * 100)
    return {
      questionId: 'DO-15',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Ceses registrados', ctx.ceseRecords.length),
        metricEvidence('Con liquidación calculada', `${pct}%`),
      ],
      sources: ['CeseRecord.totalLiquidacion'],
    }
  },
}
