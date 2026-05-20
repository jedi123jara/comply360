/**
 * IN-02: No existen diferencias salariales basadas en género para funciones equivalentes?
 * Base legal: Ley 30709, Art. 1
 *
 * Lógica: para cada categoría del Cuadro, comparar AVG(sueldoBruto) de mujeres vs hombres.
 * Diferencia > 5% = posible discriminación → NO.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorIN02: QuestionEvaluator = {
  questionId: 'IN-02',
  evaluate: (ctx) => {
    const cuadro = ctx.cuadroCategoriasVigente
    if (!cuadro) {
      return {
        questionId: 'IN-02',
        answer: null,
        confidence: 60,
        evidence: [metricEvidence('Cuadro categorías', 'Sin cuadro vigente — no podemos comparar')],
        sources: ['CuadroCategorias'],
      }
    }
    // Agrupa workers por categoría
    const byCategoria = new Map<string, { mujeres: number[]; hombres: number[] }>()
    for (const w of ctx.workers) {
      const catId = ctx.workerCategoriaMap.get(w.id)
      if (!catId) continue
      if (!byCategoria.has(catId)) byCategoria.set(catId, { mujeres: [], hombres: [] })
      const bucket = byCategoria.get(catId)!
      if (w.gender === 'F') bucket.mujeres.push(w.sueldoBruto)
      else if (w.gender === 'M') bucket.hombres.push(w.sueldoBruto)
    }

    let categoriasConBrecha = 0
    let categoriasAnalizadas = 0
    const ejemplos: string[] = []
    for (const [catId, { mujeres, hombres }] of byCategoria) {
      if (mujeres.length === 0 || hombres.length === 0) continue
      categoriasAnalizadas++
      const avgM = mujeres.reduce((s, x) => s + x, 0) / mujeres.length
      const avgH = hombres.reduce((s, x) => s + x, 0) / hombres.length
      const diff = Math.abs(avgH - avgM) / Math.min(avgH, avgM)
      if (diff > 0.05) {
        categoriasConBrecha++
        const cat = cuadro.items.find((c) => c.id === catId)
        ejemplos.push(
          `Categoría ${cat?.codigo ?? catId}: F=${avgM.toFixed(0)} vs M=${avgH.toFixed(0)} (${(diff * 100).toFixed(1)}%)`
        )
      }
    }
    if (categoriasAnalizadas === 0) {
      return {
        questionId: 'IN-02',
        answer: null,
        confidence: 60,
        evidence: [metricEvidence('Categorías con ambos géneros', 0)],
        sources: ['Worker.gender', 'CuadroCategorias'],
      }
    }
    return {
      questionId: 'IN-02',
      answer: categoriasConBrecha === 0 ? 'SI' : 'NO',
      confidence: 85,
      evidence: [
        metricEvidence('Categorías analizadas', categoriasAnalizadas),
        metricEvidence('Con brecha > 5%', categoriasConBrecha),
        ...ejemplos.slice(0, 3).map((e) => metricEvidence('Ejemplo', e)),
      ],
      sources: ['Worker.gender', 'Worker.sueldoBruto', 'CuadroCategorias'],
    }
  },
}
