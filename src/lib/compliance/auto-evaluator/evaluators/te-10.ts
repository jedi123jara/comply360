/**
 * TE-10: Modalidad formativa reciben subvención económica y seguro médico?
 * Base legal: Ley 28518, Art. 42-47
 * Condición: regimenPrincipal=MODALIDAD_FORMATIVA
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, RMV_2026 } from './_helpers'

export const evaluatorTE10: QuestionEvaluator = {
  questionId: 'TE-10',
  evaluate: (ctx) => {
    const practicantes = ctx.workers.filter((w) => w.regimenLaboral === 'MODALIDAD_FORMATIVA')
    if (practicantes.length === 0) {
      return {
        questionId: 'TE-10',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Practicantes', 0)],
        sources: ['Worker.regimenLaboral'],
      }
    }
    // Subvención mínima = RMV; EsSalud por planilla
    const conSubvencion = practicantes.filter((w) => w.sueldoBruto >= RMV_2026)
    const pctSubvencion = Math.round((conSubvencion.length / practicantes.length) * 100)
    return {
      questionId: 'TE-10',
      answer: pctSubvencion >= 100 ? 'SI' : pctSubvencion >= 80 ? 'PARCIAL' : 'NO',
      confidence: 75,
      evidence: [
        metricEvidence('Practicantes', practicantes.length),
        metricEvidence('Con subvención ≥ RMV', `${pctSubvencion}%`),
      ],
      sources: ['Worker'],
    }
  },
}
