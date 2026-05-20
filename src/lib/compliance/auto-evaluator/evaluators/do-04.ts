/**
 * DO-04: Reglamento Interno de Trabajo (obligatorio 100+ trabajadores)?
 * Base legal: D.S. 039-91-TR, Art. 2
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, hasOrgDocument } from './_helpers'

export const evaluatorDO04: QuestionEvaluator = {
  questionId: 'DO-04',
  evaluate: (ctx) => {
    if (ctx.workerCount < 100) {
      return {
        questionId: 'DO-04',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores', `${ctx.workerCount} (no aplica si < 100)`)],
        sources: ['Worker'],
      }
    }
    const tieneRit = hasOrgDocument(ctx, 'RIT')
    return {
      questionId: 'DO-04',
      answer: tieneRit ? 'SI' : 'NO',
      confidence: 95,
      evidence: [
        metricEvidence('Trabajadores', ctx.workerCount),
        metricEvidence('RIT registrado', tieneRit ? 'Sí' : 'Falta'),
      ],
      sources: ['OrgDocument.RIT'],
    }
  },
}
