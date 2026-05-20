/**
 * RB-15: Se ha pagado la indemnización vacacional cuando el trabajador no gozó vacaciones?
 * Base legal: D.Leg. 713, Art. 23
 *
 * Lógica: VacationRecord.esDoble=true significa que el worker acumuló > 1 año sin gozar.
 * Si esos casos tienen indemnización vacacional pagada (campo en boleta o documento) → SI.
 * Sin tracking explícito hoy, marcamos PARCIAL si hay registros esDoble.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorRB15: QuestionEvaluator = {
  questionId: 'RB-15',
  evaluate: (ctx) => {
    const dobles = ctx.vacationRecords.filter((v) => v.esDoble)
    if (dobles.length === 0) {
      return {
        questionId: 'RB-15',
        answer: 'SI', // sin casos = cumplido por ausencia
        confidence: 90,
        evidence: [metricEvidence('Registros con doble vacacional acumulado', 0)],
        sources: ['VacationRecord.esDoble'],
      }
    }
    return {
      questionId: 'RB-15',
      answer: null, // necesitamos tracking explícito de pago indemnizatorio
      confidence: 80,
      evidence: [
        metricEvidence('Registros vacacionales con doble periodo', dobles.length),
        metricEvidence('Requiere verificación', 'Confirmar pago indemnizatorio'),
      ],
      sources: ['VacationRecord'],
    }
  },
}
