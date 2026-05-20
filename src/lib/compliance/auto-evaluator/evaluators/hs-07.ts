/**
 * HS-07: Informe anual estadístico al MTPE de casos de hostigamiento?
 * Base legal: D.S. 014-2019-MIMP, Art. 30
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorHS07: QuestionEvaluator = {
  questionId: 'HS-07',
  evaluate: (ctx) => {
    const informe = isOrgDocumentVigente(ctx, 'INFORME_ANUAL_HOSTIGAMIENTO_MTPE')
    return {
      questionId: 'HS-07',
      answer: informe.vigente ? 'SI' : informe.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence(
          'Informe anual MTPE',
          informe.has ? (informe.vigente ? 'Vigente' : 'Vencido') : 'Falta'
        ),
        metricEvidence(
          'Validación',
          'Obligatorio anualmente incluso si hubo 0 casos'
        ),
      ],
      sources: ['OrgDocument.INFORME_ANUAL_HOSTIGAMIENTO_MTPE'],
    }
  },
}
