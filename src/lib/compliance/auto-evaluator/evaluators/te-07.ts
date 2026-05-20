/**
 * TE-07: Trabajadores nocturnos con sobretasa y jornada máxima nocturna?
 * Base legal: D.S. 007-2002-TR, Art. 8
 *
 * Lógica: similar a JD-09 — workers con tipoJornada=NOCTURNO no deben superar 8h.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorTE07: QuestionEvaluator = {
  questionId: 'TE-07',
  evaluate: (ctx) => {
    const nocturnos = ctx.workers.filter((w) => w.tipoJornada === 'NOCTURNO')
    if (nocturnos.length === 0) {
      return {
        questionId: 'TE-07',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores nocturnos', 0)],
        sources: ['Worker.tipoJornada'],
      }
    }
    const ok = nocturnos.filter((w) => w.jornadaSemanal <= 48)
    const pct = Math.round((ok.length / nocturnos.length) * 100)
    return {
      questionId: 'TE-07',
      answer: pct >= 100 ? 'SI' : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Trabajadores nocturnos', nocturnos.length),
        metricEvidence('Con jornada ≤ 48h semanales', `${pct}%`),
      ],
      sources: ['Worker.tipoJornada', 'Worker.jornadaSemanal'],
    }
  },
}
