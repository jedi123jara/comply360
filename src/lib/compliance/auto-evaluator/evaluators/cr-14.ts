/**
 * CR-14: Registro actualizado de contratos vigentes con fechas de vencimiento?
 * Base legal: D.S. 003-97-TR
 *
 * Lógica: contratos con tipoContrato modal deben tener endDate; indefinidos pueden no tener.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorCR14: QuestionEvaluator = {
  questionId: 'CR-14',
  evaluate: (ctx) => {
    const modales = ctx.contracts.filter(
      (c) =>
        c.type &&
        c.type !== 'INDEFINIDO' &&
        (c.status === 'APPROVED' || c.status === 'SIGNED')
    )
    if (modales.length === 0) {
      return {
        questionId: 'CR-14',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Contratos modales vigentes', 0)],
        sources: ['Contract'],
      }
    }
    const conFecha = modales.filter((c) => c.expiresAt !== null)
    const pct = Math.round((conFecha.length / modales.length) * 100)
    return {
      questionId: 'CR-14',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Contratos modales vigentes', modales.length),
        metricEvidence('Con fecha de vencimiento registrada', `${pct}%`),
      ],
      sources: ['Contract'],
    }
  },
}
