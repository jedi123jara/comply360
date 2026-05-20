/**
 * DO-11: Conserva certificados de capacitación SST con firma del trabajador?
 * Base legal: Ley 29783, Art. 35
 *
 * Lógica: WorkerCapacitacionSST.certificadoUrl IS NOT NULL + firmaWorkerUrl IS NOT NULL.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorDO11: QuestionEvaluator = {
  questionId: 'DO-11',
  evaluate: (ctx) => {
    if (ctx.capacitacionesSST.length === 0) {
      return {
        questionId: 'DO-11',
        answer: 'NO',
        confidence: 90,
        evidence: [metricEvidence('Capacitaciones registradas', 0)],
        sources: ['WorkerCapacitacionSST'],
      }
    }
    const completas = ctx.capacitacionesSST.filter(
      (c) => c.certificadoUrl !== null && c.firmaWorkerUrl !== null
    )
    const pct = Math.round((completas.length / ctx.capacitacionesSST.length) * 100)
    return {
      questionId: 'DO-11',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Capacitaciones registradas', ctx.capacitacionesSST.length),
        metricEvidence('Con certificado + firma', `${pct}%`),
      ],
      sources: ['WorkerCapacitacionSST'],
    }
  },
}
