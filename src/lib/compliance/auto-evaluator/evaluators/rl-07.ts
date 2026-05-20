/**
 * RL-07: Indemnización por despido arbitrario pagada conforme a ley?
 * Base legal: D.S. 003-97-TR, Art. 38
 *
 * Lógica: CeseRecord con tipoCese=DESPIDO_ARBITRARIO debe tener indemnizacionMonto > 0
 * y fechaPagoLiquidacion.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorRL07: QuestionEvaluator = {
  questionId: 'RL-07',
  evaluate: (ctx) => {
    const arbitrarios = ctx.ceseRecords.filter((c) => c.tipoCese === 'DESPIDO_ARBITRARIO')
    if (arbitrarios.length === 0) {
      return {
        questionId: 'RL-07',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Despidos arbitrarios', 0)],
        sources: ['CeseRecord.tipoCese'],
      }
    }
    const conIndemnizacion = arbitrarios.filter(
      (c) => c.indemnizacionMonto > 0 && c.fechaPagoLiquidacion !== null
    )
    const pct = Math.round((conIndemnizacion.length / arbitrarios.length) * 100)
    return {
      questionId: 'RL-07',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Despidos arbitrarios', arbitrarios.length),
        metricEvidence('Con indemnización pagada', `${pct}%`),
      ],
      sources: ['CeseRecord.indemnizacionMonto'],
    }
  },
}
