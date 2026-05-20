/**
 * IN-01: Política de igualdad salarial y cuadro de categorías?
 * Base legal: Ley 30709, Art. 2; D.S. 002-2018-TR
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorIN01: QuestionEvaluator = {
  questionId: 'IN-01',
  evaluate: (ctx) => {
    const cuadro = ctx.cuadroCategoriasVigente
    if (!cuadro) {
      return {
        questionId: 'IN-01',
        answer: 'NO',
        confidence: 95,
        evidence: [metricEvidence('Cuadro de categorías vigente', 'No registrado')],
        sources: ['CuadroCategorias'],
      }
    }
    const totalWorkers = ctx.workerCount
    const conCategoria = ctx.workerCategoriaMap.size
    const cobertura = totalWorkers === 0 ? 0 : Math.round((conCategoria / totalWorkers) * 100)
    return {
      questionId: 'IN-01',
      answer: cobertura >= 95 ? 'SI' : cobertura >= 70 ? 'PARCIAL' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Cuadro de categorías', `${cuadro.items.length} categorías vigentes`),
        metricEvidence('Workers asignados a categoría', `${cobertura}%`),
        metricEvidence('Vigente desde', cuadro.vigenteDesde.toLocaleDateString('es-PE')),
      ],
      sources: ['CuadroCategorias', 'Worker.cuadroCategoriaId'],
    }
  },
}
