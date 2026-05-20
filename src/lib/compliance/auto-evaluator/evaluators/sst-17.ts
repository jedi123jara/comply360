/**
 * SST-17: Monitoreo de agentes físicos, químicos y biológicos en el ambiente de trabajo?
 * Base legal: Ley 29783, Art. 56; D.S. 005-2012-TR, Art. 103
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorSST17: QuestionEvaluator = {
  questionId: 'SST-17',
  evaluate: (ctx) => {
    const exposiciones = {
      fisico: ctx.puestosTrabajo.some((p) => p.exposicionFisica),
      quimico: ctx.puestosTrabajo.some((p) => p.exposicionQuimica),
      biologico: ctx.puestosTrabajo.some((p) => p.exposicionBiologica),
    }
    const aplicable = exposiciones.fisico || exposiciones.quimico || exposiciones.biologico
    if (!aplicable) {
      return {
        questionId: 'SST-17',
        answer: null,
        confidence: 100,
        evidence: [
          metricEvidence('Puestos con exposición a agentes', 0),
        ],
        sources: ['PuestoTrabajo'],
      }
    }
    const fisico = isOrgDocumentVigente(ctx, 'INFORME_LAB_FISICO')
    const quimico = isOrgDocumentVigente(ctx, 'INFORME_LAB_QUIMICO')
    const biologico = isOrgDocumentVigente(ctx, 'INFORME_LAB_BIOLOGICO')

    const required = [
      exposiciones.fisico && !fisico.vigente,
      exposiciones.quimico && !quimico.vigente,
      exposiciones.biologico && !biologico.vigente,
    ].filter(Boolean).length
    const total = [exposiciones.fisico, exposiciones.quimico, exposiciones.biologico].filter(Boolean)
      .length
    const completos = total - required
    const pct = total === 0 ? 100 : Math.round((completos / total) * 100)
    return {
      questionId: 'SST-17',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 85,
      evidence: [
        metricEvidence(
          'Monitoreo físico',
          exposiciones.fisico
            ? fisico.vigente
              ? 'Vigente'
              : 'Falta'
            : 'No aplica'
        ),
        metricEvidence(
          'Monitoreo químico',
          exposiciones.quimico
            ? quimico.vigente
              ? 'Vigente'
              : 'Falta'
            : 'No aplica'
        ),
        metricEvidence(
          'Monitoreo biológico',
          exposiciones.biologico
            ? biologico.vigente
              ? 'Vigente'
              : 'Falta'
            : 'No aplica'
        ),
        metricEvidence('Cobertura', `${pct}%`),
      ],
      sources: [
        'PuestoTrabajo',
        'OrgDocument.INFORME_LAB_FISICO',
        'OrgDocument.INFORME_LAB_QUIMICO',
        'OrgDocument.INFORME_LAB_BIOLOGICO',
      ],
    }
  },
}
