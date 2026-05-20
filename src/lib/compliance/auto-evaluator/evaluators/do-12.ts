/**
 * DO-12: Constancia de SCTR vigente para actividades de riesgo?
 * Base legal: Ley 26790, Art. 19
 * (Reusa lógica de SST-13)
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorDO12: QuestionEvaluator = {
  questionId: 'DO-12',
  evaluate: (ctx) => {
    const poliza = isOrgDocumentVigente(ctx, 'SCTR_POLIZA')
    return {
      questionId: 'DO-12',
      answer: poliza.vigente ? 'SI' : poliza.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence(
          'Póliza SCTR',
          poliza.has ? (poliza.vigente ? 'Vigente' : 'Vencida') : 'Falta'
        ),
      ],
      sources: ['OrgDocument.SCTR_POLIZA'],
    }
  },
}
