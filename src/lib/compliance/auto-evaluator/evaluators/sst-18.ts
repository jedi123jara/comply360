/**
 * SST-18: Trabajadores participan en la elección de representantes del Comité SST?
 * Base legal: Ley 29783, Art. 29
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorSST18: QuestionEvaluator = {
  questionId: 'SST-18',
  evaluate: (ctx) => {
    if (!ctx.comiteSst) {
      return {
        questionId: 'SST-18',
        answer: ctx.workerCount >= 20 ? 'NO' : null,
        confidence: 80,
        evidence: [metricEvidence('Comité SST', 'No registrado')],
        sources: ['ComiteSST'],
      }
    }
    // El módulo de elecciones está implementado en /dashboard/sst/comite/elecciones
    // y eligible workers se gestiona allí. Asumimos SI si el comité está vigente.
    return {
      questionId: 'SST-18',
      answer: ctx.comiteSst.estado === 'VIGENTE' ? 'SI' : 'PARCIAL',
      confidence: 75,
      evidence: [
        metricEvidence('Comité SST', ctx.comiteSst.estado),
        metricEvidence('Mandato', `${ctx.comiteSst.mandatoInicio?.getFullYear() ?? '—'} → ${ctx.comiteSst.mandatoFin?.getFullYear() ?? '—'}`),
      ],
      sources: ['ComiteSST'],
    }
  },
}
