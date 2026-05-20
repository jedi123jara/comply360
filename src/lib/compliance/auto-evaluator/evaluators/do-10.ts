/**
 * DO-10: Cuadro de categorías y funciones (igualdad salarial Ley 30709)?
 * Base legal: Ley 30709, Art. 2; D.S. 002-2018-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, hasOrgDocument } from './_helpers'

export const evaluatorDO10: QuestionEvaluator = {
  questionId: 'DO-10',
  evaluate: (ctx) => {
    const tiene = hasOrgDocument(ctx, 'CUADRO_CATEGORIAS_LEY_30709')
    return {
      questionId: 'DO-10',
      answer: tiene ? 'SI' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Cuadro de categorías', tiene ? 'Subido' : 'Falta'),
        metricEvidence('Validación adicional', 'Confirmar cobertura ≥ 95% de workers asignados'),
      ],
      sources: ['OrgDocument.CUADRO_CATEGORIAS_LEY_30709'],
    }
  },
}
