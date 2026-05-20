/**
 * CR-06: Los contratos de tiempo parcial (< 4 horas) constan por escrito y están registrados?
 * Base legal: D.S. 003-97-TR, Art. 4
 *
 * Lógica: workers con tipoContrato=TIEMPO_PARCIAL deben tener contrato SIGNED/ACTIVE asociado.
 * Si no hay workers tiempo parcial → answer = null (no aplica).
 */
import type { QuestionEvaluator } from '../types'
import { workersWithActiveContract } from '../context'
import { metricEvidence, pctToAnswer, workerEvidence } from './_helpers'

export const evaluatorCR06: QuestionEvaluator = {
  questionId: 'CR-06',
  evaluate: (ctx) => {
    const parciales = ctx.workers.filter((w) => w.tipoContrato === 'TIEMPO_PARCIAL')
    if (parciales.length === 0) {
      return {
        questionId: 'CR-06',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores a tiempo parcial', 0)],
        sources: ['Worker.tipoContrato'],
      }
    }
    const withContract = workersWithActiveContract(ctx)
    const cumplen = parciales.filter((w) => withContract.has(w.id))
    const pct = Math.round((cumplen.length / parciales.length) * 100)
    const faltantes = parciales.filter((w) => !withContract.has(w.id)).slice(0, 5)
    return {
      questionId: 'CR-06',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores a tiempo parcial', parciales.length),
        metricEvidence('Con contrato firmado', `${pct}%`),
        ...faltantes.map((w) => workerEvidence(w, 'Tiempo parcial sin contrato')),
      ],
      sources: ['Worker', 'Contract', 'WorkerContract'],
    }
  },
}
