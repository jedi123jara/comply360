/**
 * SST-08: Entrega de EPP adecuados con registro?
 * Base legal: Ley 29783, Art. 60
 *
 * Lógica: workers en puestos con exposición física/química/biológica/alturas/SCTR
 * deben tener al menos un WorkerEPP registrado en el último año.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer } from './_helpers'

export const evaluatorSST08: QuestionEvaluator = {
  questionId: 'SST-08',
  evaluate: (ctx) => {
    // Workers que requieren EPP (tienen puesto con exposición)
    const workersConPuestoRiesgo = new Set<string>()
    for (const p of ctx.puestosTrabajo) {
      if (
        p.workerId &&
        (p.exposicionFisica ||
          p.exposicionQuimica ||
          p.exposicionBiologica ||
          p.requiereAlturas ||
          p.requiereEspacioConfinado ||
          p.requiereSCTR)
      ) {
        workersConPuestoRiesgo.add(p.workerId)
      }
    }
    if (workersConPuestoRiesgo.size === 0) {
      return {
        questionId: 'SST-08',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores en puestos con riesgo', 0)],
        sources: ['PuestoTrabajo'],
      }
    }
    const oneYearAgo = new Date(ctx.now)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const workersConEpp = new Set(
      ctx.epps.filter((e) => e.fechaEntrega >= oneYearAgo).map((e) => e.workerId)
    )
    const cubiertos = Array.from(workersConPuestoRiesgo).filter((w) => workersConEpp.has(w))
    const pct = Math.round((cubiertos.length / workersConPuestoRiesgo.size) * 100)
    return {
      questionId: 'SST-08',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores que requieren EPP', workersConPuestoRiesgo.size),
        metricEvidence('Con EPP entregado último año', `${pct}%`),
        metricEvidence('Total entregas EPP', ctx.epps.length),
      ],
      sources: ['WorkerEPP', 'PuestoTrabajo'],
    }
  },
}
