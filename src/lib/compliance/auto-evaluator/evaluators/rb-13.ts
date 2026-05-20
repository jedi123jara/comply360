/**
 * RB-13: Participación de utilidades pagada en plazo (30 días desde DJ anual)?
 * Base legal: D.Leg. 892, Art. 6
 * Condición: empresa con 20+ trabajadores
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorRB13: QuestionEvaluator = {
  questionId: 'RB-13',
  evaluate: (ctx) => {
    if (ctx.workerCount < 20) {
      return {
        questionId: 'RB-13',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', `${ctx.workerCount} (no aplica si < 20)`)],
        sources: ['Worker'],
      }
    }
    const dj = isOrgDocumentVigente(ctx, 'DJ_UTILIDADES')
    return {
      questionId: 'RB-13',
      answer: dj.vigente ? 'SI' : dj.has ? 'PARCIAL' : 'NO',
      confidence: 85,
      evidence: [
        metricEvidence('Trabajadores', ctx.workerCount),
        metricEvidence(
          'DJ Utilidades',
          dj.has ? (dj.vigente ? 'Subida y vigente' : 'Vencida') : 'Falta'
        ),
      ],
      sources: ['OrgDocument.DJ_UTILIDADES'],
    }
  },
}
