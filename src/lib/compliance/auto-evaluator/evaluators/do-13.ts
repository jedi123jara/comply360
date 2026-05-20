/**
 * DO-13: Póliza de Seguro Vida Ley para trabajadores con 4+ años?
 * Base legal: D.Leg. 688, Art. 1
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorDO13: QuestionEvaluator = {
  questionId: 'DO-13',
  evaluate: (ctx) => {
    const fourYearsAgo = new Date(ctx.now)
    fourYearsAgo.setFullYear(fourYearsAgo.getFullYear() - 4)
    const elegibles = ctx.workers.filter((w) => w.fechaIngreso <= fourYearsAgo)
    if (elegibles.length === 0) {
      return {
        questionId: 'DO-13',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con 4+ años', 0)],
        sources: ['Worker.fechaIngreso'],
      }
    }
    const seguro = isOrgDocumentVigente(ctx, 'CONSTANCIA_SEGURO_VIDA_LEY')
    return {
      questionId: 'DO-13',
      answer: seguro.vigente ? 'SI' : seguro.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores con 4+ años', elegibles.length),
        metricEvidence(
          'Constancia Seguro Vida Ley',
          seguro.has ? (seguro.vigente ? 'Vigente' : 'Vencida') : 'Falta'
        ),
      ],
      sources: ['Worker.fechaIngreso', 'OrgDocument.CONSTANCIA_SEGURO_VIDA_LEY'],
    }
  },
}
