/**
 * Registry de evaluators. Cada evaluator se registra acá; el motor los corre
 * en paralelo durante el prefill y persiste los resultados.
 *
 * Para agregar un evaluator nuevo:
 *   1. Crearlo en `src/lib/compliance/auto-evaluator/evaluators/{area}-{id}.ts`
 *   2. Importarlo acá y agregarlo al array EVALUATORS
 *   3. Listo — el endpoint /api/diagnostico/auto-prefill lo recoge automáticamente.
 */

import type { AutoAnswer, EvaluatorContext, QuestionEvaluator } from './types'
import { buildEvaluatorContext } from './context'
import { persistAnswers } from './cache'

// ── Fase 1 evaluators ──────────────────────────────────────────────────
// Se importan dinámicamente desde el index del directorio para evitar
// que este registry tenga que cambiar cada vez que se agrega uno nuevo.
import { ALL_EVALUATORS } from './evaluators'

export const EVALUATORS: QuestionEvaluator[] = ALL_EVALUATORS

/**
 * Ejecuta todos los evaluators registrados sobre el contexto.
 * Devuelve un array de AutoAnswer por cada evaluator que produjo un resultado.
 *
 * Captura excepciones individuales — un evaluator roto no rompe el resto.
 */
export async function evaluateAll(ctx: EvaluatorContext): Promise<AutoAnswer[]> {
  const results = await Promise.allSettled(EVALUATORS.map((ev) => Promise.resolve(ev.evaluate(ctx))))
  const answers: AutoAnswer[] = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const ev = EVALUATORS[i]
    if (r.status === 'fulfilled') {
      answers.push(r.value)
    } else {
      // Log el error pero NO bloqueamos al usuario. El evaluator fallido
      // queda como "no determinable" → la pregunta cae al wizard manual.
      console.error(`[auto-evaluator] ${ev.questionId} fallo:`, r.reason)
      answers.push({
        questionId: ev.questionId,
        answer: null,
        confidence: 0,
        evidence: [],
        sources: [],
        evaluatorName: ev.questionId,
      })
    }
  }
  return answers
}

/**
 * Pipeline completo: construye contexto, corre evaluators, persiste, retorna.
 *
 * @returns objeto con counters + las answers
 */
export async function runFullPrefill(orgId: string): Promise<{
  total: number
  answered: number
  duration: number
  answers: AutoAnswer[]
}> {
  const t0 = Date.now()
  const ctx = await buildEvaluatorContext(orgId)
  const answers = await evaluateAll(ctx)
  await persistAnswers(orgId, answers)
  const duration = Date.now() - t0
  const answered = answers.filter((a) => a.answer !== null).length
  return {
    total: answers.length,
    answered,
    duration,
    answers,
  }
}
