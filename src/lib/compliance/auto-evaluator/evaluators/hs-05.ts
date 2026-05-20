/**
 * HS-05: Plazos de investigación de hostigamiento sexual respetados?
 * Base legal: D.S. 014-2019-MIMP, Art. 15-18
 *
 * Plazos:
 *   - Calificación + medidas de protección: 3 días hábiles
 *   - Investigación: 30 días hábiles
 *   - Sanción: 10 días hábiles
 *
 * Lógica: por cada Complaint HOSTIGAMIENTO_SEXUAL resuelto, verificar que
 * resolvedAt - receivedAt ≤ 43 días hábiles (≈ 60 días calendario).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000

export const evaluatorHS05: QuestionEvaluator = {
  questionId: 'HS-05',
  evaluate: (ctx) => {
    const hsl = ctx.complaints.filter(
      (c) => c.type === 'HOSTIGAMIENTO_SEXUAL' && c.resolvedAt && c.receivedAt
    )
    if (hsl.length === 0) {
      return {
        questionId: 'HS-05',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Denuncias HSL resueltas', 0)],
        sources: ['Complaint'],
      }
    }
    const aTiempo = hsl.filter(
      (c) => c.resolvedAt!.getTime() - c.receivedAt!.getTime() <= SIXTY_DAYS_MS
    )
    const pct = Math.round((aTiempo.length / hsl.length) * 100)
    return {
      questionId: 'HS-05',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Denuncias HSL resueltas', hsl.length),
        metricEvidence('Resueltas en ≤ 60 días calendario', `${pct}%`),
        metricEvidence(
          'Plazo legal',
          '3 días medidas + 30 días investigación + 10 días sanción (D.S. 014-2019-MIMP)'
        ),
      ],
      sources: ['Complaint.receivedAt', 'Complaint.resolvedAt'],
    }
  },
}
