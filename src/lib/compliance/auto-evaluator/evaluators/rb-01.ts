/**
 * RB-01: Se paga al menos la RMV (S/ 1,130) a todos los trabajadores a tiempo completo?
 * Base legal: D.S. 003-97-TR, Art. 24
 *
 * Lógica: Worker.tiempoCompleto=true → sueldoBruto >= RMV_2026.
 */
import type { QuestionEvaluator } from '../types'
import { affectedWorkers, metricEvidence, pctToAnswer, RMV_2026, workerEvidence, workerPct } from './_helpers'

export const evaluatorRB01: QuestionEvaluator = {
  questionId: 'RB-01',
  evaluate: (ctx) => {
    const predicate = (w: { tiempoCompleto: boolean; sueldoBruto: number }) =>
      !w.tiempoCompleto || w.sueldoBruto >= RMV_2026
    const pct = workerPct(ctx, predicate)
    const debajo = affectedWorkers(ctx, predicate)
    return {
      questionId: 'RB-01',
      answer: pctToAnswer(pct),
      confidence: 98,
      evidence: [
        metricEvidence('RMV vigente 2026', `S/ ${RMV_2026}`),
        metricEvidence('Trabajadores tiempo completo ≥ RMV', `${pct}%`),
        ...debajo.map((w) =>
          workerEvidence(w, `Sueldo bruto S/ ${w.sueldoBruto.toFixed(2)} (< RMV)`)
        ),
      ],
      sources: ['Worker.sueldoBruto', 'Worker.tiempoCompleto'],
    }
  },
}
