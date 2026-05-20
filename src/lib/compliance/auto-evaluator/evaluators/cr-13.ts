/**
 * CR-13: Trabajadores extranjeros con aprobación MTPE y límite del 20%?
 * Base legal: D.Leg. 689, Art. 4
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorCR13: QuestionEvaluator = {
  questionId: 'CR-13',
  evaluate: (ctx) => {
    const extranjeros = ctx.workers.filter(
      (w) => w.nationality && w.nationality.toLowerCase() !== 'peruana'
    )
    if (extranjeros.length === 0) {
      return {
        questionId: 'CR-13',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores extranjeros', 0)],
        sources: ['Worker.nationality'],
      }
    }
    const pct = Math.round((extranjeros.length / ctx.workerCount) * 100)
    const respeta20pct = pct <= 20
    const auto = isOrgDocumentVigente(ctx, 'AUTORIZACION_MTPE_EXTRANJERO')
    return {
      questionId: 'CR-13',
      answer: respeta20pct && auto.has ? (auto.vigente ? 'SI' : 'PARCIAL') : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Trabajadores extranjeros', extranjeros.length),
        metricEvidence('Proporción del total', `${pct}% (límite 20%)`),
        metricEvidence(
          'Autorización MTPE',
          auto.has ? (auto.vigente ? 'Vigente' : 'Vencida') : 'Falta'
        ),
      ],
      sources: ['Worker.nationality', 'OrgDocument.AUTORIZACION_MTPE_EXTRANJERO'],
    }
  },
}
