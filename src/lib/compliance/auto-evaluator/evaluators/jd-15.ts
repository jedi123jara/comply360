/**
 * JD-15: Teletrabajadores con derecho a desconexión digital?
 * Base legal: Ley 31572, Art. 8
 * Condición: regimenPrincipal=TELETRABAJO
 *
 * Lógica: workers con regimenLaboral=TELETRABAJO — verificamos que hay OrgDocument
 * con politica de desconexión digital.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, hasOrgDocument } from './_helpers'

export const evaluatorJD15: QuestionEvaluator = {
  questionId: 'JD-15',
  evaluate: (ctx) => {
    const teletrabajadores = ctx.workers.filter((w) => w.regimenLaboral === 'TELETRABAJO')
    if (teletrabajadores.length === 0) {
      return {
        questionId: 'JD-15',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Teletrabajadores', 0)],
        sources: ['Worker.regimenLaboral'],
      }
    }
    const tienePolicy =
      hasOrgDocument(ctx, 'POLITICA_IGUALDAD') || hasOrgDocument(ctx, 'CODIGO_ETICA')
    return {
      questionId: 'JD-15',
      answer: tienePolicy ? 'PARCIAL' : 'NO',
      confidence: 60,
      evidence: [
        metricEvidence('Teletrabajadores', teletrabajadores.length),
        metricEvidence('Política de desconexión digital', tienePolicy ? 'Detectada' : 'Falta'),
      ],
      sources: ['Worker.regimenLaboral', 'OrgDocument'],
    }
  },
}
