/**
 * CR-15: Trabajadores MYPE registrados en REMYPE vigente?
 * Base legal: Ley 32353, Art. 7
 * Condición: regimenPrincipal=MYPE_MICRO
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorCR15: QuestionEvaluator = {
  questionId: 'CR-15',
  evaluate: (ctx) => {
    const isMype =
      ctx.organization.regimenPrincipal === 'MYPE_MICRO' ||
      ctx.organization.regimenPrincipal === 'MYPE_PEQUENA'
    if (!isMype) {
      return {
        questionId: 'CR-15',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Régimen empresa', ctx.organization.regimenPrincipal ?? 'N/A')],
        sources: ['Organization.regimenPrincipal'],
      }
    }
    // El flag remypeRegistered es declarativo; preferimos validar contra el doc.
    const remype = isOrgDocumentVigente(ctx, 'REMYPE_CONSTANCIA')
    return {
      questionId: 'CR-15',
      answer: remype.vigente ? 'SI' : remype.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Régimen empresa', ctx.organization.regimenPrincipal ?? '—'),
        metricEvidence(
          'Constancia REMYPE',
          remype.has
            ? remype.vigente
              ? `Vigente (renueva en ${remype.daysUntilExpiry ?? '∞'} días)`
              : 'Vencida'
            : 'Falta'
        ),
      ],
      sources: ['Organization.regimenPrincipal', 'OrgDocument.REMYPE_CONSTANCIA'],
    }
  },
}
