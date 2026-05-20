/**
 * SST-11: Accidentes mortales y peligrosos notificados al MTPE en 24 horas?
 * Base legal: Ley 29783, Art. 82
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST11: QuestionEvaluator = {
  questionId: 'SST-11',
  evaluate: (ctx) => {
    const criticos = ctx.accidentes.filter((a) =>
      ['MORTAL', 'INCIDENTE_PELIGROSO', 'ACCIDENTE_PELIGROSO'].some((tipo) =>
        a.tipo.includes(tipo)
      )
    )
    if (criticos.length === 0) {
      return {
        questionId: 'SST-11',
        answer: 'SI',
        confidence: 95,
        evidence: [metricEvidence('Accidentes mortales/peligrosos', 0)],
        sources: ['Accidente'],
      }
    }
    const notificados = criticos.filter((a) => a.satNumeroManual !== null)
    const pct = Math.round((notificados.length / criticos.length) * 100)
    return {
      questionId: 'SST-11',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Accidentes críticos', criticos.length),
        metricEvidence('Notificados a SAT', `${pct}%`),
      ],
      sources: ['Accidente'],
    }
  },
}
