/**
 * TE-04: Trabajadores con discapacidad cuentan con ajustes razonables?
 * Base legal: Ley 29973, Art. 50
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorTE04: QuestionEvaluator = {
  questionId: 'TE-04',
  evaluate: (ctx) => {
    const conDiscapacidad = ctx.workers.filter((w) => w.discapacidad)
    if (conDiscapacidad.length === 0) {
      return {
        questionId: 'TE-04',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con discapacidad registrados', 0)],
        sources: ['Worker.discapacidad'],
      }
    }
    const certificados = conDiscapacidad.filter((w) => w.discapacidadCertificado)
    const pct = Math.round((certificados.length / conDiscapacidad.length) * 100)
    return {
      questionId: 'TE-04',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 70,
      evidence: [
        metricEvidence('Trabajadores con discapacidad', conDiscapacidad.length),
        metricEvidence('Con certificado CONADIS', `${pct}%`),
        metricEvidence('Validación adicional', 'Confirmar ajustes razonables en el puesto'),
      ],
      sources: ['Worker.discapacidad', 'Worker.discapacidadCertificado'],
    }
  },
}
