/**
 * RB-16: Trabajadores MYPE reciben los beneficios reducidos correspondientes?
 * Base legal: Ley 32353
 * Condición: regimenPrincipal=MYPE_MICRO
 *
 * Lógica: si Org no es MYPE → null. Si lo es, validamos que workers MYPE
 * tengan jornadaSemanal/sueldoBruto coherentes con el régimen.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, RMV_2026 } from './_helpers'

export const evaluatorRB16: QuestionEvaluator = {
  questionId: 'RB-16',
  evaluate: (ctx) => {
    const isMype =
      ctx.organization.regimenPrincipal === 'MYPE_MICRO' ||
      ctx.organization.regimenPrincipal === 'MYPE_PEQUENA'
    if (!isMype) {
      return {
        questionId: 'RB-16',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Régimen de la empresa', ctx.organization.regimenPrincipal ?? 'N/A')],
        sources: ['Organization.regimenPrincipal'],
      }
    }
    const mypeWorkers = ctx.workers.filter(
      (w) => w.regimenLaboral === 'MYPE_MICRO' || w.regimenLaboral === 'MYPE_PEQUENA'
    )
    if (mypeWorkers.length === 0) {
      return {
        questionId: 'RB-16',
        answer: 'NO',
        confidence: 85,
        evidence: [
          metricEvidence('Trabajadores MYPE registrados', 0),
          metricEvidence('Empresa declarada como', ctx.organization.regimenPrincipal ?? '—'),
        ],
        sources: ['Worker.regimenLaboral'],
      }
    }
    const conRmv = mypeWorkers.filter((w) => !w.tiempoCompleto || w.sueldoBruto >= RMV_2026).length
    const pct = Math.round((conRmv / mypeWorkers.length) * 100)
    return {
      questionId: 'RB-16',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 75,
      evidence: [
        metricEvidence('Trabajadores MYPE', mypeWorkers.length),
        metricEvidence('Con sueldo ≥ RMV', `${pct}%`),
      ],
      sources: ['Worker'],
    }
  },
}
