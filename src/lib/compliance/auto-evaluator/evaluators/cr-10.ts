/**
 * CR-10: Trabajadores de dirección y confianza debidamente calificados y registrados?
 * Base legal: D.S. 003-97-TR, Art. 43-44
 *
 * Lógica: validamos solo que esté declarado y tenga contrato firmado.
 * La validación cualitativa de "debidamente calificado" requiere humano → confidence baja.
 */
import type { QuestionEvaluator } from '../types'
import { workersWithActiveContract } from '../context'
import { metricEvidence } from './_helpers'

const DIRECTIVOS = ['DIRECTIVO', 'CONFIANZA']

export const evaluatorCR10: QuestionEvaluator = {
  questionId: 'CR-10',
  evaluate: (ctx) => {
    // No tenemos campo explícito "esDireccionConfianza" en Worker — usamos tipoContrato
    // o el position cuando indica gerencia. Cobertura conservadora: si todos tienen
    // contrato firmado, asumimos cumplimiento parcial.
    const directivos = ctx.workers.filter((w) =>
      DIRECTIVOS.includes(w.tipoContrato) || /gerent|director|jefe/i.test(w.tipoContrato)
    )
    if (directivos.length === 0) {
      return {
        questionId: 'CR-10',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores de dirección/confianza identificados', 0)],
        sources: ['Worker.tipoContrato'],
      }
    }
    const withContract = workersWithActiveContract(ctx)
    const ok = directivos.filter((w) => withContract.has(w.id))
    const pct = Math.round((ok.length / directivos.length) * 100)
    return {
      questionId: 'CR-10',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 60, // baja: calificación es decisión interna
      evidence: [
        metricEvidence('Directivos/Confianza identificados', directivos.length),
        metricEvidence('Con contrato firmado', `${pct}%`),
      ],
      sources: ['Worker', 'Contract'],
    }
  },
}
