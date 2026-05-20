/**
 * DO-06: Registros de vacaciones gozadas y truncas de cada trabajador?
 * Base legal: D.Leg. 713, Art. 14
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorDO06: QuestionEvaluator = {
  questionId: 'DO-06',
  evaluate: (ctx) => {
    const oneYearAgo = new Date(ctx.now)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const elegibles = ctx.workers.filter((w) => w.fechaIngreso <= oneYearAgo)
    if (elegibles.length === 0) {
      return {
        questionId: 'DO-06',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con 1+ años', 0)],
        sources: ['Worker', 'VacationRecord'],
      }
    }
    const recordWorkers = new Set(ctx.vacationRecords.map((v) => v.workerId))
    const conRegistro = elegibles.filter((w) => recordWorkers.has(w.id))
    const pct = Math.round((conRegistro.length / elegibles.length) * 100)
    return {
      questionId: 'DO-06',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores con derecho vacacional', elegibles.length),
        metricEvidence('Con registro vacacional', `${pct}%`),
      ],
      sources: ['VacationRecord'],
    }
  },
}
