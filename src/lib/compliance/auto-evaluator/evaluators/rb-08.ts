/**
 * RB-08: EsSalud (9%) pagado sobre la remuneración de todos los trabajadores?
 * Base legal: Ley 26790, Art. 6
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorRB08: QuestionEvaluator = {
  questionId: 'RB-08',
  evaluate: (ctx) => {
    const essalud = isOrgDocumentVigente(ctx, 'ESSALUD_PAGO_CONSTANCIA')
    return {
      questionId: 'RB-08',
      answer: essalud.vigente ? 'SI' : essalud.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence(
          'Constancia EsSalud',
          essalud.has
            ? essalud.vigente
              ? `Vigente (próximo pago en ${essalud.daysUntilExpiry ?? '?'} días)`
              : 'Vencida'
            : 'Falta'
        ),
        metricEvidence('Acción', 'Sube comprobante mensual de pago a EsSalud'),
      ],
      sources: ['OrgDocument.ESSALUD_PAGO_CONSTANCIA'],
    }
  },
}
