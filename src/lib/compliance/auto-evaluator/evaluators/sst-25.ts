/**
 * SST-25: Documentación del Sistema de Gestión de SST actualizada?
 * Base legal: Ley 29783, Art. 28
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST25: QuestionEvaluator = {
  questionId: 'SST-25',
  evaluate: (ctx) => {
    // Documentos clave: política SST, plan anual, IPERC, reglamento SST
    const claves = {
      politicaSST: ctx.orgDocuments.find((d) => d.type === 'PLAN_SST'),
      reglamentoSST: ctx.orgDocuments.find((d) => d.type === 'REGLAMENTO_SST'),
      iperc: ctx.ipercBases.find((i) => i.estado === 'APROBADO'),
      planAnual: ctx.sstRecords.find((r) => r.type === 'PLAN_ANUAL'),
    }
    const total = Object.values(claves).filter(Boolean).length
    const pct = Math.round((total / 4) * 100)
    return {
      questionId: 'SST-25',
      answer: pct >= 100 ? 'SI' : pct >= 75 ? 'PARCIAL' : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Documentos SGSST identificados', `${total}/4`),
        metricEvidence('Cobertura SGSST', `${pct}%`),
      ],
      sources: ['OrgDocument', 'IPERCBase', 'SstRecord'],
    }
  },
}
