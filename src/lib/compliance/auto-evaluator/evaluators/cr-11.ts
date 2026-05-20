/**
 * CR-11: Los contratos modales no exceden el plazo máximo legal (5 años)?
 * Base legal: D.S. 003-97-TR, Art. 74
 *
 * Lógica: Contract con tipoContrato modal y (endDate - startDate) ≤ 5 años.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, linkEvidence } from './_helpers'

// Tipos de Contract considerados "modales" (sujetos a plazo)
const MODALES = new Set([
  'PLAZO_FIJO',
  'TEMPORAL_INICIO_ACTIVIDAD',
  'TEMPORAL_NECESIDAD_MERCADO',
  'TEMPORAL_RECONVERSION',
  'TEMPORAL_OCASIONAL',
  'TEMPORAL_SUPLENCIA',
  'TEMPORAL_EMERGENCIA',
  'OBRA_DETERMINADA',
  'INTERMITENTE',
  'EXPORTACION_NO_TRADICIONAL',
])

const FIVE_YEARS_MS = 5 * 365 * 24 * 60 * 60 * 1000

export const evaluatorCR11: QuestionEvaluator = {
  questionId: 'CR-11',
  evaluate: (ctx) => {
    const modales = ctx.contracts.filter(
      (c) => MODALES.has(c.type) && c.signedAt && c.expiresAt
    )
    if (modales.length === 0) {
      return {
        questionId: 'CR-11',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Contratos modales encontrados', 0)],
        sources: ['Contract.type'],
      }
    }
    const excedidos = modales.filter((c) => {
      if (!c.signedAt || !c.expiresAt) return false
      return c.expiresAt.getTime() - c.signedAt.getTime() > FIVE_YEARS_MS
    })
    return {
      questionId: 'CR-11',
      answer: excedidos.length === 0 ? 'SI' : 'NO',
      confidence: 95,
      evidence: [
        metricEvidence('Contratos modales analizados', modales.length),
        metricEvidence('Contratos que exceden 5 años', excedidos.length),
        ...excedidos.slice(0, 5).map((c) =>
          linkEvidence(
            'Contrato excedido',
            `${c.type} (${c.signedAt?.toLocaleDateString('es-PE')} → ${c.expiresAt?.toLocaleDateString('es-PE')})`,
            `/dashboard/contratos/${c.id}`
          )
        ),
      ],
      sources: ['Contract'],
    }
  },
}
