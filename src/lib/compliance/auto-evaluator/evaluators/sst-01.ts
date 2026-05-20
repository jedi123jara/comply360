/**
 * SST-01: La empresa cuenta con Política de SST escrita y exhibida?
 * Base legal: Ley 29783, Art. 22
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, linkEvidence, hasOrgDocument, hasSstRecord } from './_helpers'

export const evaluatorSST01: QuestionEvaluator = {
  questionId: 'SST-01',
  evaluate: (ctx) => {
    const docPolitica = ctx.orgDocuments.find((d) => d.type === 'PLAN_SST' || d.type === 'REGLAMENTO_SST')
    const recordPolitica = hasSstRecord(ctx, 'POLITICA_SST')
    const exhibida = !!docPolitica?.publishedAt
    const has = !!docPolitica || recordPolitica
    return {
      questionId: 'SST-01',
      answer: has ? (exhibida ? 'SI' : 'PARCIAL') : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Política SST registrada', has ? 'Sí' : 'No'),
        metricEvidence('Publicada a trabajadores', exhibida ? 'Sí' : 'No'),
        ...(docPolitica
          ? [linkEvidence('Documento', docPolitica.title, `/dashboard/configuracion/empresa/documentos`)]
          : []),
      ],
      sources: ['OrgDocument', 'SstRecord'],
    }
  },
}
