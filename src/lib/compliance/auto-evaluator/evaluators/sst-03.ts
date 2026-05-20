/**
 * SST-03: Comité SST (20+ trabajadores) o Supervisor SST (<20)?
 * Base legal: Ley 29783, Art. 29-30
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST03: QuestionEvaluator = {
  questionId: 'SST-03',
  evaluate: (ctx) => {
    if (ctx.workerCount >= 20) {
      const has = ctx.comiteSst?.estado === 'VIGENTE'
      return {
        questionId: 'SST-03',
        answer: has ? 'SI' : 'NO',
        confidence: 95,
        evidence: [
          metricEvidence('Trabajadores', ctx.workerCount),
          metricEvidence('Comité SST vigente', has ? 'Sí' : 'No'),
        ],
        sources: ['ComiteSST'],
      }
    }
    // < 20 → basta con un Supervisor SST. No tenemos modelo explícito;
    // confiamos en OrgComplianceRole (no proyectado) o lo dejamos para wizard.
    return {
      questionId: 'SST-03',
      answer: null,
      confidence: 60,
      evidence: [
        metricEvidence('Trabajadores', ctx.workerCount),
        metricEvidence('Modalidad', 'Supervisor SST (verificación manual)'),
      ],
      sources: ['Worker', 'ComiteSST'],
    }
  },
}
