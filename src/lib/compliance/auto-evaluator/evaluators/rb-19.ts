/**
 * RB-19: Liquidación de beneficios sociales pagada dentro de las 48 horas del cese?
 * Base legal: D.S. 001-97-TR, Art. 3
 *
 * Lógica: CeseRecord.fechaPagoLiquidacion - CeseRecord.fechaCese ≤ 48h.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

const TWO_DAYS_MS = 48 * 60 * 60 * 1000

export const evaluatorRB19: QuestionEvaluator = {
  questionId: 'RB-19',
  evaluate: (ctx) => {
    const ceses = ctx.ceseRecords.filter((c) => c.fechaPagoLiquidacion !== null)
    if (ceses.length === 0) {
      return {
        questionId: 'RB-19',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Liquidaciones de cese pagadas', 0)],
        sources: ['CeseRecord'],
      }
    }
    const aTiempo = ceses.filter(
      (c) => c.fechaPagoLiquidacion!.getTime() - c.fechaCese.getTime() <= TWO_DAYS_MS
    )
    const pct = Math.round((aTiempo.length / ceses.length) * 100)
    return {
      questionId: 'RB-19',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Liquidaciones evaluadas', ceses.length),
        metricEvidence('Pagadas dentro de 48 horas', `${pct}%`),
      ],
      sources: ['CeseRecord.fechaCese', 'CeseRecord.fechaPagoLiquidacion'],
    }
  },
}
