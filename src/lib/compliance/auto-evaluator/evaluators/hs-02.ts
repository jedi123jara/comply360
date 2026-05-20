/**
 * HS-02: Comité de Intervención frente al Hostigamiento Sexual (CIHSO) paritario y capacitado?
 * Base legal: D.S. 014-2019-MIMP, Art. 10-11
 *
 * Lógica: empresas con 20+ trabajadores deben tener CIHSO. Sin modelo específico,
 * usamos ComiteSST como proxy + acknowledgment de política hostigamiento.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorHS02: QuestionEvaluator = {
  questionId: 'HS-02',
  evaluate: (ctx) => {
    if (ctx.workerCount < 20) {
      return {
        questionId: 'HS-02',
        answer: null,
        confidence: 100,
        evidence: [
          metricEvidence('Trabajadores', `${ctx.workerCount} (no aplica si < 20)`),
        ],
        sources: ['Worker'],
      }
    }
    // CIHSO no es un modelo independiente — usamos OrgComplianceRole o asumimos
    // que si hay denuncias procesadas, el comité opera.
    const tienePolicy = ctx.orgDocuments.some((d) => d.type === 'POLITICA_HOSTIGAMIENTO')
    return {
      questionId: 'HS-02',
      answer: tienePolicy ? 'PARCIAL' : 'NO',
      confidence: 65,
      evidence: [
        metricEvidence('Trabajadores', ctx.workerCount),
        metricEvidence('Política de hostigamiento', tienePolicy ? 'Sí' : 'No'),
        metricEvidence(
          'CIHSO',
          'Modelo dedicado pendiente — verificar designación manual en el organigrama'
        ),
      ],
      sources: ['Worker', 'OrgDocument'],
    }
  },
}
