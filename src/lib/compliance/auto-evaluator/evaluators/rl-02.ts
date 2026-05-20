/**
 * RL-02: Procedimiento de despido (pre-aviso 6 días + carta de despido)?
 * Base legal: D.S. 003-97-TR, Art. 31-32
 *
 * Lógica: CeseRecord con tipoCese=DESPIDO_CAUSA_JUSTA o DESPIDO_ARBITRARIO debe tener
 * fechaCartaPreaviso + fechaLimiteDescargos + fechaCartaDespido.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorRL02: QuestionEvaluator = {
  questionId: 'RL-02',
  evaluate: (ctx) => {
    const despidos = ctx.ceseRecords.filter((c) =>
      ['DESPIDO_CAUSA_JUSTA', 'DESPIDO_ARBITRARIO'].includes(c.tipoCese)
    )
    if (despidos.length === 0) {
      return {
        questionId: 'RL-02',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Despidos registrados', 0)],
        sources: ['CeseRecord.tipoCese'],
      }
    }
    // Solo DESPIDO_CAUSA_JUSTA requiere pre-aviso + descargos + carta despido
    const conCausa = despidos.filter((c) => c.tipoCese === 'DESPIDO_CAUSA_JUSTA')
    if (conCausa.length === 0) {
      // Solo despidos arbitrarios — no aplica el procedimiento de pre-aviso
      return {
        questionId: 'RL-02',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Despidos por causa justa', 0)],
        sources: ['CeseRecord'],
      }
    }
    const completos = conCausa.filter(
      (c) => c.fechaCartaPreaviso && c.fechaLimiteDescargos && c.fechaCartaDespido
    )
    const pct = Math.round((completos.length / conCausa.length) * 100)
    return {
      questionId: 'RL-02',
      answer: pctToAnswer(pct),
      confidence: 95,
      evidence: [
        metricEvidence('Despidos por causa justa', conCausa.length),
        metricEvidence('Con procedimiento completo (pre-aviso + descargos + despido)', `${pct}%`),
      ],
      sources: ['CeseRecord.fechaCartaPreaviso', 'CeseRecord.fechaCartaDespido'],
    }
  },
}
