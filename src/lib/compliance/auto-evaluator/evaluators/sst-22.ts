/**
 * SST-22: Registro de capacitaciones SST con firma de asistentes?
 * Base legal: D.S. 005-2012-TR, Art. 33
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorSST22: QuestionEvaluator = {
  questionId: 'SST-22',
  evaluate: (ctx) => {
    if (ctx.capacitacionesSST.length === 0) {
      return {
        questionId: 'SST-22',
        answer: 'NO',
        confidence: 90,
        evidence: [metricEvidence('Capacitaciones registradas', 0)],
        sources: ['WorkerCapacitacionSST'],
      }
    }
    const conFirma = ctx.capacitacionesSST.filter((c) => c.firmaWorkerUrl !== null)
    const pct = Math.round((conFirma.length / ctx.capacitacionesSST.length) * 100)
    return {
      questionId: 'SST-22',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Capacitaciones registradas', ctx.capacitacionesSST.length),
        metricEvidence('Con firma del trabajador', `${pct}%`),
      ],
      sources: ['WorkerCapacitacionSST.firmaWorkerUrl'],
    }
  },
}
