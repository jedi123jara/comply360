/**
 * SST-12: Inducción SST a todos los nuevos trabajadores?
 * Base legal: Ley 29783, Art. 49-g
 *
 * Lógica: workers creados en los últimos 90 días deben tener WorkerCapacitacionSST tipo='INDUCCION'.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer, workerEvidence } from './_helpers'

export const evaluatorSST12: QuestionEvaluator = {
  questionId: 'SST-12',
  evaluate: (ctx) => {
    const ninetyDaysAgo = new Date(ctx.now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    const nuevos = ctx.workers.filter((w) => w.fechaIngreso >= ninetyDaysAgo)
    if (nuevos.length === 0) {
      return {
        questionId: 'SST-12',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores nuevos (90 días)', 0)],
        sources: ['Worker.fechaIngreso'],
      }
    }
    const inducciones = new Set(
      ctx.capacitacionesSST.filter((c) => c.tipo === 'INDUCCION').map((c) => c.workerId)
    )
    const ok = nuevos.filter((w) => inducciones.has(w.id))
    const faltantes = nuevos.filter((w) => !inducciones.has(w.id)).slice(0, 5)
    const pct = Math.round((ok.length / nuevos.length) * 100)
    return {
      questionId: 'SST-12',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores nuevos (90 días)', nuevos.length),
        metricEvidence('Con inducción SST', `${pct}%`),
        ...faltantes.map((w) => workerEvidence(w, 'Sin inducción SST')),
      ],
      sources: ['WorkerCapacitacionSST', 'Worker.fechaIngreso'],
    }
  },
}
