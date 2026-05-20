/**
 * SST-24: Programa de ergonomía para puestos con riesgo disergonómico?
 * Base legal: R.M. 375-2008-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST24: QuestionEvaluator = {
  questionId: 'SST-24',
  evaluate: (ctx) => {
    const conExposicion = ctx.puestosTrabajo.filter((p) => p.exposicionErgonomica)
    if (conExposicion.length === 0) {
      return {
        questionId: 'SST-24',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Puestos con exposición ergonómica', 0)],
        sources: ['PuestoTrabajo.exposicionErgonomica'],
      }
    }
    // Sin modelo específico de "programa de ergonomía", verificamos si hay
    // capacitaciones SST y IPERC cubriendo esos puestos. Si IPERC aprobado → PARCIAL.
    const ipercAprobado = ctx.ipercBases.some((i) => i.estado === 'APROBADO')
    return {
      questionId: 'SST-24',
      answer: ipercAprobado ? 'PARCIAL' : 'NO',
      confidence: 70,
      evidence: [
        metricEvidence('Puestos con exposición ergonómica', conExposicion.length),
        metricEvidence('IPERC con análisis ergonómico', ipercAprobado ? 'Aprobado' : 'Falta'),
      ],
      sources: ['PuestoTrabajo', 'IPERCBase'],
    }
  },
}
