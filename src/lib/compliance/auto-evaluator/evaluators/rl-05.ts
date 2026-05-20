/**
 * RL-05: Se cumple con el convenio colectivo vigente?
 * Base legal: D.S. 010-2003-TR, Art. 42
 *
 * Lógica: si hay ConvencionColectiva vigente, debe tener cumplimientoVerificadoAt
 * dentro de los últimos 6 meses.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

const SIX_MONTHS_MS = 180 * 24 * 60 * 60 * 1000

export const evaluatorRL05: QuestionEvaluator = {
  questionId: 'RL-05',
  evaluate: (ctx) => {
    const vigentes = ctx.convencionesColectivas.filter(
      (c) => c.vigenciaDesde <= ctx.now && c.vigenciaHasta >= ctx.now
    )
    if (vigentes.length === 0) {
      // Si no hay convenios, no aplica (no hay sindicato → no hay convenio)
      return {
        questionId: 'RL-05',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Convenios colectivos vigentes', 0)],
        sources: ['ConvencionColectiva'],
      }
    }
    const verificadosRecientes = vigentes.filter(
      (c) =>
        c.cumplimientoVerificadoAt !== null &&
        ctx.now.getTime() - c.cumplimientoVerificadoAt.getTime() <= SIX_MONTHS_MS
    )
    const pct = Math.round((verificadosRecientes.length / vigentes.length) * 100)
    return {
      questionId: 'RL-05',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Convenios colectivos vigentes', vigentes.length),
        metricEvidence('Verificados en últimos 6 meses', `${pct}%`),
      ],
      sources: ['ConvencionColectiva'],
    }
  },
}
