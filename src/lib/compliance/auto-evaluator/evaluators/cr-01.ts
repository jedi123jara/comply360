/**
 * CR-01: ¿Todos los trabajadores cuentan con contrato de trabajo escrito y firmado?
 * Base legal: D.Leg. 728, Art. 4
 *
 * Lógica: cruza Worker con WorkerContract → Contract donde status ∈ {ACTIVE, SIGNED, ENVIADO_FIRMA}.
 * Si < 100% → NO con lista de workers afectados.
 */
import type { QuestionEvaluator } from '../types'
import { workersWithActiveContract } from '../context'
import { affectedWorkers, metricEvidence, pctToAnswer, workerEvidence, workerPct } from './_helpers'

export const evaluatorCR01: QuestionEvaluator = {
  questionId: 'CR-01',
  evaluate: (ctx) => {
    const withContract = workersWithActiveContract(ctx)
    const predicate = (w: { id: string }) => withContract.has(w.id)
    const pct = workerPct(ctx, predicate)
    const missing = affectedWorkers(ctx, predicate)
    return {
      questionId: 'CR-01',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Cobertura de contratos firmados', `${pct}%`),
        metricEvidence('Total de trabajadores', ctx.workerCount),
        ...missing.map((w) => workerEvidence(w, 'Sin contrato vigente')),
      ],
      sources: ['Worker', 'Contract', 'WorkerContract'],
    }
  },
}
