/**
 * TE-06: Trabajadores del hogar gozan de todos los derechos laborales?
 * Base legal: Ley 27986
 * Condición: regimenPrincipal=DOMESTICO
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

export const evaluatorTE06: QuestionEvaluator = {
  questionId: 'TE-06',
  evaluate: (ctx) => {
    const domesticos = ctx.workers.filter((w) => w.regimenLaboral === 'DOMESTICO')
    if (domesticos.length === 0) {
      return {
        questionId: 'TE-06',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores del hogar', 0)],
        sources: ['Worker.regimenLaboral'],
      }
    }
    // Verificamos boleta + vacaciones registradas + AFP/ONP
    const conBoleta = new Set(ctx.payslips.map((p) => p.workerId))
    const conVacaciones = new Set(ctx.vacationRecords.map((v) => v.workerId))
    const completos = domesticos.filter(
      (w) => conBoleta.has(w.id) && conVacaciones.has(w.id) && w.tipoAporte !== 'SIN_APORTE'
    )
    const pct = Math.round((completos.length / domesticos.length) * 100)
    return {
      questionId: 'TE-06',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 75,
      evidence: [
        metricEvidence('Trabajadores del hogar', domesticos.length),
        metricEvidence('Con derechos básicos (boleta + vac + AFP/ONP)', `${pct}%`),
      ],
      sources: ['Worker', 'Payslip', 'VacationRecord'],
    }
  },
}
