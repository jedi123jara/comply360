/**
 * TE-03: Menores de edad (14-17 años) con autorización y jornada reducida?
 * Base legal: Código de Niños y Adolescentes, Art. 51-68
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, workerEvidence } from './_helpers'
import { workerAge } from '../context'

export const evaluatorTE03: QuestionEvaluator = {
  questionId: 'TE-03',
  evaluate: (ctx) => {
    const menores = ctx.workers.filter((w) => {
      const age = workerAge(w, ctx.now)
      return age !== null && age >= 14 && age < 18
    })
    if (menores.length === 0) {
      return {
        questionId: 'TE-03',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores menores de edad', 0)],
        sources: ['Worker.birthDate'],
      }
    }
    // Jornada reducida: máximo 6h diarias = 30h semanales
    const ok = menores.filter((w) => w.jornadaSemanal <= 30)
    const problemas = menores.filter((w) => w.jornadaSemanal > 30)
    return {
      questionId: 'TE-03',
      answer: problemas.length === 0 ? 'SI' : 'NO',
      confidence: 85,
      evidence: [
        metricEvidence('Trabajadores menores (14-17)', menores.length),
        metricEvidence('Con jornada ≤ 30h semanales', ok.length),
        ...problemas
          .slice(0, 5)
          .map((w) => workerEvidence(w, `Menor con ${w.jornadaSemanal}h/semana`)),
      ],
      sources: ['Worker.birthDate', 'Worker.jornadaSemanal'],
    }
  },
}
