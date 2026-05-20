/**
 * TI-08: Registro actualizado de contratos de tercerización e intermediación?
 * Base legal: D.S. 006-2008-TR, Art. 8; D.S. 003-2002-TR, Art. 14
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorTI08: QuestionEvaluator = {
  questionId: 'TI-08',
  evaluate: (ctx) => {
    const activos = ctx.terceros.filter((t) => t.isActive)
    if (activos.length === 0) {
      return {
        questionId: 'TI-08',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Terceros activos', 0)],
        sources: ['Tercero'],
      }
    }
    const conContratoUrl = activos.filter((t) => t.contratoUrl !== null)
    const pct = Math.round((conContratoUrl.length / activos.length) * 100)
    return {
      questionId: 'TI-08',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 95,
      evidence: [
        metricEvidence('Terceros activos', activos.length),
        metricEvidence('Con contrato subido', `${pct}%`),
      ],
      sources: ['Tercero.contratoUrl'],
    }
  },
}
