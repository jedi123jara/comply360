/**
 * SST-06: Se realizan al menos 4 capacitaciones anuales en SST?
 * Base legal: Ley 29783, Art. 35
 *
 * Lógica: COUNT(WorkerCapacitacionSST WHERE tipo='ANUAL' AND YEAR=actual) ≥ 4
 * agrupados por fecha distinta (no 4 inscritos a la misma capacitación, sino 4 sesiones).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST06: QuestionEvaluator = {
  questionId: 'SST-06',
  evaluate: (ctx) => {
    const year = ctx.now.getFullYear()
    const capYear = ctx.capacitacionesSST.filter(
      (c) =>
        c.fechaCapacitacion.getFullYear() === year &&
        (c.tipo === 'ANUAL' || c.tipo === 'ESPECIFICA' || c.tipo === 'EMERGENCIAS')
    )
    // Distinct fechas (en formato YYYY-MM-DD)
    const sesiones = new Set(capYear.map((c) => c.fechaCapacitacion.toISOString().slice(0, 10)))
    return {
      questionId: 'SST-06',
      answer: sesiones.size >= 4 ? 'SI' : sesiones.size >= 2 ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Capacitaciones SST realizadas este año', sesiones.size),
        metricEvidence('Requeridas por ley', '4 mínimo'),
        metricEvidence('Trabajadores capacitados (registros totales)', capYear.length),
      ],
      sources: ['WorkerCapacitacionSST'],
    }
  },
}
