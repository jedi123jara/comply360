/**
 * SST-21: Programa de prevención de riesgos psicosociales implementado?
 * Base legal: R.M. 375-2008-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorSST21: QuestionEvaluator = {
  questionId: 'SST-21',
  evaluate: (ctx) => {
    const expuestos = ctx.puestosTrabajo.filter((p) => p.exposicionPsicosocial).length
    if (expuestos === 0 && ctx.workerCount < 20) {
      return {
        questionId: 'SST-21',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Puestos con riesgo psicosocial', 0)],
        sources: ['PuestoTrabajo.exposicionPsicosocial'],
      }
    }
    const informe = isOrgDocumentVigente(ctx, 'INFORME_LAB_PSICOSOCIAL')
    return {
      questionId: 'SST-21',
      answer: informe.vigente ? 'SI' : informe.has ? 'PARCIAL' : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Puestos con riesgo psicosocial', expuestos),
        metricEvidence(
          'Evaluación psicosocial',
          informe.has ? (informe.vigente ? 'Vigente' : 'Vencida') : 'Falta'
        ),
      ],
      sources: ['OrgDocument.INFORME_LAB_PSICOSOCIAL'],
    }
  },
}
