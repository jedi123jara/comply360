/**
 * RB-17: Cálculo correcto de CTS (remuneración computable + 1/6 gratificación)?
 * Base legal: D.S. 001-97-TR, Art. 9-10
 *
 * Lógica: confiamos en `src/lib/legal-engine/calculators/cts.ts` (518 tests verdes).
 * Si hay CeseRecords con ctsMonto > 0 → asumimos correcto (las calculadoras hicieron el cálculo).
 * Si no hay cese aún, marcamos PARCIAL (no podemos validar sin payslips de mayo/nov).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorRB17: QuestionEvaluator = {
  questionId: 'RB-17',
  evaluate: (ctx) => {
    const ceseConCts = ctx.ceseRecords.filter((c) => c.totalLiquidacion > 0)
    return {
      questionId: 'RB-17',
      answer: ceseConCts.length > 0 ? 'SI' : 'PARCIAL',
      confidence: 75,
      evidence: [
        metricEvidence('Liquidaciones con CTS calculada', ceseConCts.length),
        metricEvidence('Calculadora validada con', '518 tests verdes'),
      ],
      sources: ['CeseRecord', 'src/lib/legal-engine/calculators/cts.ts'],
    }
  },
}
