/**
 * RB-05: Se otorgan vacaciones de 30 días calendario por cada año completo de servicio?
 * Base legal: D.Leg. 713, Art. 10
 *
 * Lógica: VacationRecord.diasCorresponden = 30 para todos (excepto MYPE: 15).
 * Verifica también que los workers con ≥1 año de antigüedad tienen al menos un registro.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer, workerEvidence, affectedWorkers, workerPct } from './_helpers'

export const evaluatorRB05: QuestionEvaluator = {
  questionId: 'RB-05',
  evaluate: (ctx) => {
    const oneYearAgo = new Date(ctx.now)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const conAntiguedad = ctx.workers.filter((w) => w.fechaIngreso <= oneYearAgo)
    if (conAntiguedad.length === 0) {
      return {
        questionId: 'RB-05',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con 1+ años', 0)],
        sources: ['Worker', 'VacationRecord'],
      }
    }
    const recordsByWorker = new Map<string, number>()
    for (const v of ctx.vacationRecords) {
      recordsByWorker.set(v.workerId, (recordsByWorker.get(v.workerId) ?? 0) + 1)
    }
    const predicate = (w: { id: string; regimenLaboral: string }) => {
      // MYPE: 15 días — solo nos importa que tengan registro
      return (recordsByWorker.get(w.id) ?? 0) > 0
    }
    const pct = workerPct({ ...ctx, workers: conAntiguedad, workerCount: conAntiguedad.length }, predicate)
    const faltantes = affectedWorkers(
      { ...ctx, workers: conAntiguedad, workerCount: conAntiguedad.length },
      predicate
    )
    return {
      questionId: 'RB-05',
      answer: pctToAnswer(pct),
      confidence: 80,
      evidence: [
        metricEvidence('Trabajadores con derecho vacacional (1+ años)', conAntiguedad.length),
        metricEvidence('Con registro de vacaciones', `${pct}%`),
        ...faltantes.map((w) => workerEvidence(w, 'Sin registro vacacional')),
      ],
      sources: ['Worker', 'VacationRecord'],
    }
  },
}
