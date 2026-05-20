/**
 * RL-01: Se respeta el derecho de sindicalización?
 * Base legal: D.S. 010-2003-TR, Art. 2
 *
 * Lógica: si existe al menos un Sindicato registrado y activo → SI.
 * Si no hay sindicato pero tampoco hay trabajadores cesados con motivo
 * sospechoso (despido por afiliación), asumimos PARCIAL (no podemos
 * confirmar respeto sin sindicato).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorRL01: QuestionEvaluator = {
  questionId: 'RL-01',
  evaluate: (ctx) => {
    const activos = ctx.sindicatos.filter((s) => s.isActive)
    if (activos.length > 0) {
      return {
        questionId: 'RL-01',
        answer: 'SI',
        confidence: 90,
        evidence: [
          metricEvidence('Sindicatos activos en la empresa', activos.length),
          metricEvidence(
            'Total afiliados',
            activos.reduce((sum, s) => sum + s.numeroAfiliados, 0)
          ),
        ],
        sources: ['Sindicato'],
      }
    }
    // Sin sindicato — no podemos confirmar
    return {
      questionId: 'RL-01',
      answer: 'PARCIAL',
      confidence: 50,
      evidence: [
        metricEvidence('Sindicatos registrados', 0),
        metricEvidence(
          'Verificación',
          'No hay sindicato registrado. Confirma si los trabajadores tienen libertad de sindicación'
        ),
      ],
      sources: ['Sindicato'],
    }
  },
}
