/**
 * CR-12: Comunicar la baja en T-REGISTRO dentro de 24 horas del cese?
 * Base legal: D.S. 018-2007-TR
 *
 * Lógica: workers con fechaCese != null deben tener flagTRegistroPresentado=false
 * (baja registrada) o, en su defecto, un CeseRecord con etapa COMPLETADO.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, workerEvidence } from './_helpers'

export const evaluatorCR12: QuestionEvaluator = {
  questionId: 'CR-12',
  evaluate: (ctx) => {
    const cesados = ctx.workers.filter((w) => w.fechaCese !== null)
    if (cesados.length === 0) {
      return {
        questionId: 'CR-12',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores cesados encontrados', 0)],
        sources: ['Worker.fechaCese'],
      }
    }
    const ceseMap = new Map(ctx.ceseRecords.map((c) => [c.workerId, c]))
    const ok = cesados.filter((w) => {
      const cese = ceseMap.get(w.id)
      // Si tiene CeseRecord con etapa COMPLETADO o pago liquidación, asumimos baja procesada.
      return cese?.etapa === 'COMPLETADO' || cese?.fechaPagoLiquidacion !== null
    })
    const pct = Math.round((ok.length / cesados.length) * 100)
    const faltantes = cesados.filter((w) => {
      const cese = ceseMap.get(w.id)
      return !(cese?.etapa === 'COMPLETADO' || cese?.fechaPagoLiquidacion !== null)
    })
    return {
      questionId: 'CR-12',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 80,
      evidence: [
        metricEvidence('Trabajadores cesados', cesados.length),
        metricEvidence('Con baja procesada', `${pct}%`),
        ...faltantes.slice(0, 5).map((w) => workerEvidence(w, 'Cese sin baja completa')),
      ],
      sources: ['Worker.fechaCese', 'CeseRecord'],
    }
  },
}
