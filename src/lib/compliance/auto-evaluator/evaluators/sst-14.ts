/**
 * SST-14: Actas del Comité SST con reuniones mensuales?
 * Base legal: D.S. 005-2012-TR, Art. 68
 *
 * Lógica: solo podemos verificar que existe el Comité y libro de actas.
 * Sin tracking por sesión hoy → PARCIAL si comité vigente.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST14: QuestionEvaluator = {
  questionId: 'SST-14',
  evaluate: (ctx) => {
    if (!ctx.comiteSst) {
      return {
        questionId: 'SST-14',
        answer: 'NO',
        confidence: 90,
        evidence: [metricEvidence('Comité SST', 'No registrado')],
        sources: ['ComiteSST'],
      }
    }
    const tieneLibro = !!ctx.comiteSst.libroActasUrl
    return {
      questionId: 'SST-14',
      answer: tieneLibro ? 'PARCIAL' : 'NO',
      confidence: 70,
      evidence: [
        metricEvidence('Comité SST vigente', ctx.comiteSst.estado),
        metricEvidence('Libro de actas registrado', tieneLibro ? 'Sí' : 'Falta'),
        metricEvidence('Validación adicional', 'Confirmar 12 sesiones anuales en el wizard'),
      ],
      sources: ['ComiteSST.libroActasUrl'],
    }
  },
}
