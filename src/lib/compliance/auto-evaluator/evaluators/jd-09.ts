/**
 * JD-09: Trabajo nocturno (10pm-6am) remunerado con sobretasa mínima 35%?
 * Base legal: D.S. 007-2002-TR, Art. 8
 *
 * Lógica: workers con tipoJornada=NOCTURNO|MIXTO → sueldoBruto ≥ RMV × 1.35.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer, workerEvidence, RMV_2026 } from './_helpers'

export const evaluatorJD09: QuestionEvaluator = {
  questionId: 'JD-09',
  evaluate: (ctx) => {
    const nocturnos = ctx.workers.filter(
      (w) => w.tipoJornada === 'NOCTURNO' || w.tipoJornada === 'MIXTO'
    )
    if (nocturnos.length === 0) {
      return {
        questionId: 'JD-09',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con jornada nocturna/mixta', 0)],
        sources: ['Worker.tipoJornada'],
      }
    }
    const minRequired = RMV_2026 * 1.35
    const ok = nocturnos.filter((w) => w.sueldoBruto >= minRequired)
    const pct = Math.round((ok.length / nocturnos.length) * 100)
    const faltantes = nocturnos.filter((w) => w.sueldoBruto < minRequired).slice(0, 5)
    return {
      questionId: 'JD-09',
      answer: pctToAnswer(pct),
      confidence: 80,
      evidence: [
        metricEvidence('Trabajadores nocturno/mixto', nocturnos.length),
        metricEvidence('Sueldo mínimo legal (RMV+35%)', `S/ ${minRequired.toFixed(2)}`),
        metricEvidence('Cumplen sobretasa', `${pct}%`),
        ...faltantes.map((w) =>
          workerEvidence(w, `Nocturno con sueldo S/ ${w.sueldoBruto.toFixed(2)}`)
        ),
      ],
      sources: ['Worker.tipoJornada', 'Worker.sueldoBruto'],
    }
  },
}
