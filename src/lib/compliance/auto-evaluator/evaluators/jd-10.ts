/**
 * JD-10: Goce vacacional programado con anticipación y registrado formalmente?
 * Base legal: D.Leg. 713, Art. 14
 *
 * Lógica: VacationRecord con fechaGoce != null para los que ya gozaron.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorJD10: QuestionEvaluator = {
  questionId: 'JD-10',
  evaluate: (ctx) => {
    const gozados = ctx.vacationRecords.filter((v) => v.diasGozados > 0)
    if (gozados.length === 0) {
      return {
        questionId: 'JD-10',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Vacaciones gozadas registradas', 0)],
        sources: ['VacationRecord'],
      }
    }
    const conFecha = gozados.filter((v) => v.fechaGoce !== null)
    const pct = Math.round((conFecha.length / gozados.length) * 100)
    return {
      questionId: 'JD-10',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Vacaciones gozadas analizadas', gozados.length),
        metricEvidence('Con fecha de goce registrada', `${pct}%`),
      ],
      sources: ['VacationRecord.fechaGoce'],
    }
  },
}
