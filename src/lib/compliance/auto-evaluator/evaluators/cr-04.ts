/**
 * CR-04: ¿Todos los trabajadores están registrados en T-REGISTRO dentro del día hábil
 * de inicio de labores?
 * Base legal: D.S. 018-2007-TR, Art. 4-A
 *
 * Lógica: Worker.flagTRegistroPresentado debe ser true para todos los ACTIVE.
 * El detalle de fecha la maneja el cron de sync-tregistro (Fase 5).
 */
import type { QuestionEvaluator } from '../types'
import { affectedWorkers, metricEvidence, pctToAnswer, workerEvidence, workerPct } from './_helpers'

export const evaluatorCR04: QuestionEvaluator = {
  questionId: 'CR-04',
  evaluate: (ctx) => {
    const predicate = (w: { flagTRegistroPresentado: boolean }) => w.flagTRegistroPresentado
    const pct = workerPct(ctx, predicate)
    const missing = affectedWorkers(ctx, predicate)
    return {
      questionId: 'CR-04',
      answer: pctToAnswer(pct),
      confidence: pct === 100 ? 90 : 75,
      evidence: [
        metricEvidence('Cobertura T-REGISTRO', `${pct}%`),
        ...missing.map((w) => workerEvidence(w, 'Sin marca T-REGISTRO')),
      ],
      sources: ['Worker.flagTRegistroPresentado'],
    }
  },
}
