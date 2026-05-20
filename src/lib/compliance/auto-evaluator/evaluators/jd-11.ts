/**
 * JD-11: No hay acumulación de más de 2 períodos vacacionales pendientes?
 * Base legal: D.Leg. 713, Art. 23
 *
 * Lógica: workers con > 60 días pendientes (más de 2 períodos) → infracción.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer, workerEvidence } from './_helpers'

export const evaluatorJD11: QuestionEvaluator = {
  questionId: 'JD-11',
  evaluate: (ctx) => {
    const pendientesByWorker = new Map<string, number>()
    for (const v of ctx.vacationRecords) {
      pendientesByWorker.set(v.workerId, (pendientesByWorker.get(v.workerId) ?? 0) + v.diasPendientes)
    }
    const conAcumulacion = ctx.workers.filter((w) => (pendientesByWorker.get(w.id) ?? 0) > 60)
    const pct = Math.round(((ctx.workerCount - conAcumulacion.length) / Math.max(1, ctx.workerCount)) * 100)
    return {
      questionId: 'JD-11',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Trabajadores con > 60 días vacacionales pendientes', conAcumulacion.length),
        metricEvidence('Cumplen límite', `${pct}%`),
        ...conAcumulacion
          .slice(0, 5)
          .map((w) =>
            workerEvidence(w, `${pendientesByWorker.get(w.id) ?? 0} días pendientes`)
          ),
      ],
      sources: ['VacationRecord.diasPendientes'],
    }
  },
}
