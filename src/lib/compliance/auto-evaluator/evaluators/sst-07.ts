/**
 * SST-07: Exámenes médicos ocupacionales de ingreso, periódicos y de retiro?
 * Base legal: Ley 29783, Art. 49-d; D.S. 005-2012-TR, Art. 101
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorSST07: QuestionEvaluator = {
  questionId: 'SST-07',
  evaluate: (ctx) => {
    if (ctx.workerCount === 0) {
      return {
        questionId: 'SST-07',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', 0)],
        sources: ['Worker', 'EMO'],
      }
    }
    const emoWorkerIds = new Set(ctx.emoRecords.map((e) => e.workerId))
    const cobertura = ctx.workers.filter((w) => emoWorkerIds.has(w.id))
    const pct = Math.round((cobertura.length / ctx.workerCount) * 100)
    return {
      questionId: 'SST-07',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Total trabajadores', ctx.workerCount),
        metricEvidence('Con al menos un EMO', `${pct}%`),
        metricEvidence('Total EMOs registrados', ctx.emoRecords.length),
      ],
      sources: ['EMO'],
    }
  },
}
