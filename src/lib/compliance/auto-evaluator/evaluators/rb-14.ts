/**
 * RB-14: Planilla electrónica PLAME actualizada mensualmente?
 * Base legal: D.S. 018-2007-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorRB14: QuestionEvaluator = {
  questionId: 'RB-14',
  evaluate: (ctx) => {
    const plame = isOrgDocumentVigente(ctx, 'PLAME_CONFIRMACION')
    return {
      questionId: 'RB-14',
      answer: plame.vigente ? 'SI' : plame.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence(
          'Confirmación PLAME',
          plame.has
            ? plame.vigente
              ? `Vigente (próximo envío en ${plame.daysUntilExpiry ?? '?'} días)`
              : 'Vencida'
            : 'Falta'
        ),
      ],
      sources: ['OrgDocument.PLAME_CONFIRMACION'],
    }
  },
}
