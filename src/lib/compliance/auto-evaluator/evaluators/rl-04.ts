/**
 * RL-04: Estabilidad laboral de dirigentes sindicales (fuero sindical)?
 * Base legal: D.S. 010-2003-TR, Art. 30-31
 *
 * Lógica: para cada WorkerAfiliacionSindical.esDirigente=true, verificar que
 * el worker no esté cesado dentro del período de fuero sindical.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, workerEvidence } from './_helpers'

export const evaluatorRL04: QuestionEvaluator = {
  questionId: 'RL-04',
  evaluate: (ctx) => {
    const dirigentes = ctx.afiliacionesSindicales.filter((a) => a.esDirigente)
    if (dirigentes.length === 0) {
      return {
        questionId: 'RL-04',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Dirigentes sindicales', 0)],
        sources: ['WorkerAfiliacionSindical.esDirigente'],
      }
    }
    const workerMap = new Map(ctx.workers.map((w) => [w.id, w]))
    const violaciones: typeof ctx.workers = []
    for (const d of dirigentes) {
      const w = workerMap.get(d.workerId)
      if (!w || !w.fechaCese) continue
      // Si fue cesado dentro del fuero sindical → violación
      const fueroHasta = d.fueroSindicalHasta ?? ctx.now
      if (w.fechaCese <= fueroHasta) violaciones.push(w)
    }
    return {
      questionId: 'RL-04',
      answer: violaciones.length === 0 ? 'SI' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Dirigentes sindicales', dirigentes.length),
        metricEvidence('Cesados durante fuero sindical', violaciones.length),
        ...violaciones.slice(0, 5).map((w) => workerEvidence(w, 'Dirigente cesado en fuero')),
      ],
      sources: ['WorkerAfiliacionSindical', 'Worker.fechaCese'],
    }
  },
}
