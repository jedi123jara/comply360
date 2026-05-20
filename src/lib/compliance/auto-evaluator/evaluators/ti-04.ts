/**
 * TI-04: Empresas de intermediación con autorización SUNAFIL vigente?
 * Base legal: Ley 27626, Art. 11
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorTI04: QuestionEvaluator = {
  questionId: 'TI-04',
  evaluate: (ctx) => {
    const intermediadoras = ctx.terceros.filter(
      (t) => t.tipoServicio === 'INTERMEDIACION' && t.isActive
    )
    if (intermediadoras.length === 0) {
      return {
        questionId: 'TI-04',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Empresas de intermediación', 0)],
        sources: ['Tercero'],
      }
    }
    const registro = isOrgDocumentVigente(ctx, 'REGISTRO_SUNAFIL_TERCERIZADORA')
    return {
      questionId: 'TI-04',
      answer: registro.vigente ? 'PARCIAL' : 'NO',
      confidence: 75,
      evidence: [
        metricEvidence('Empresas de intermediación', intermediadoras.length),
        metricEvidence('Registros SUNAFIL', registro.has ? 'Sí' : 'Faltan'),
      ],
      sources: ['Tercero.tipoServicio', 'OrgDocument.REGISTRO_SUNAFIL_TERCERIZADORA'],
    }
  },
}
