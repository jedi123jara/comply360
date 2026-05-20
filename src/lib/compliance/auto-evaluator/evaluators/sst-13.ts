/**
 * SST-13: SCTR vigente para actividades de riesgo?
 * Base legal: Ley 26790, Art. 19; D.S. 003-98-SA
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, isOrgDocumentVigente } from './_helpers'

export const evaluatorSST13: QuestionEvaluator = {
  questionId: 'SST-13',
  evaluate: (ctx) => {
    const conSctr = ctx.workers.filter((w) => w.sctr).length
    const puestosRiesgo = ctx.puestosTrabajo.filter((p) => p.requiereSCTR).length
    if (conSctr === 0 && puestosRiesgo === 0) {
      return {
        questionId: 'SST-13',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con SCTR', 0), metricEvidence('Puestos que requieren SCTR', 0)],
        sources: ['Worker.sctr', 'PuestoTrabajo.requiereSCTR'],
      }
    }
    const poliza = isOrgDocumentVigente(ctx, 'SCTR_POLIZA')
    return {
      questionId: 'SST-13',
      answer: poliza.vigente ? 'SI' : poliza.has ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores con SCTR', conSctr),
        metricEvidence('Puestos que requieren SCTR', puestosRiesgo),
        metricEvidence(
          'Póliza SCTR',
          poliza.has
            ? poliza.vigente
              ? `Vigente (${poliza.daysUntilExpiry ?? '?'} días para renovar)`
              : 'Vencida'
            : 'Falta subir'
        ),
      ],
      sources: ['Worker.sctr', 'OrgDocument.SCTR_POLIZA'],
    }
  },
}
