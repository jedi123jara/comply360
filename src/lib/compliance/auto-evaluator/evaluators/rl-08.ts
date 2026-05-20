/**
 * RL-08: Certificados de trabajo entregados dentro de las 48 horas del cese?
 * Base legal: D.S. 001-96-TR, Art. 1
 *
 * Lógica: workers cesados deben tener un WorkerDocument tipo certificado_trabajo.
 * Sin tracking explícito, marcamos PARCIAL si hay liquidación pagada (asume entregado junto).
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorRL08: QuestionEvaluator = {
  questionId: 'RL-08',
  evaluate: (ctx) => {
    const cesados = ctx.workers.filter((w) => w.fechaCese !== null)
    if (cesados.length === 0) {
      return {
        questionId: 'RL-08',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores cesados', 0)],
        sources: ['Worker.fechaCese'],
      }
    }
    // Proxy: CeseRecord con liquidación pagada → asumimos certificado entregado
    const pagoLiquidacion = new Set(
      ctx.ceseRecords.filter((c) => c.fechaPagoLiquidacion).map((c) => c.workerId)
    )
    const conCertificado = cesados.filter((w) => pagoLiquidacion.has(w.id))
    const pct = Math.round((conCertificado.length / cesados.length) * 100)
    return {
      questionId: 'RL-08',
      answer: pctToAnswer(pct),
      confidence: 60, // baja: usamos proxy
      evidence: [
        metricEvidence('Trabajadores cesados', cesados.length),
        metricEvidence('Con liquidación procesada (proxy)', `${pct}%`),
        metricEvidence('Verificación', 'Confirmar entrega física del certificado'),
      ],
      sources: ['Worker.fechaCese', 'CeseRecord.fechaPagoLiquidacion'],
    }
  },
}
