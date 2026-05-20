/**
 * TE-09: Trabajadores de construcción civil reciben beneficios especiales?
 * Base legal: D.Leg. 727; R.M. sector construcción
 * Condición: regimenPrincipal=CONSTRUCCION_CIVIL
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, RMV_2026 } from './_helpers'

export const evaluatorTE09: QuestionEvaluator = {
  questionId: 'TE-09',
  evaluate: (ctx) => {
    const construccion = ctx.workers.filter((w) => w.regimenLaboral === 'CONSTRUCCION_CIVIL')
    if (construccion.length === 0) {
      return {
        questionId: 'TE-09',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores de construcción civil', 0)],
        sources: ['Worker.regimenLaboral'],
      }
    }
    // Validamos: sueldo coherente + SCTR activo
    const sctr = construccion.filter((w) => w.sctr).length
    const sueldoOk = construccion.filter((w) => w.sueldoBruto >= RMV_2026).length
    const pctSctr = Math.round((sctr / construccion.length) * 100)
    const pctSueldo = Math.round((sueldoOk / construccion.length) * 100)
    return {
      questionId: 'TE-09',
      answer: pctSctr >= 100 && pctSueldo >= 100 ? 'SI' : 'PARCIAL',
      confidence: 75,
      evidence: [
        metricEvidence('Trabajadores construcción civil', construccion.length),
        metricEvidence('Con SCTR activado', `${pctSctr}%`),
        metricEvidence('Con sueldo ≥ RMV', `${pctSueldo}%`),
      ],
      sources: ['Worker'],
    }
  },
}
