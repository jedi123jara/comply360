/**
 * TE-01: Trabajadoras gestantes no realizan labores de riesgo?
 * Base legal: Ley 28048, Art. 1
 *
 * Lógica: workers con condicionEspecial=EMBARAZADA + PuestoTrabajo con
 * requiereAlturas/EspacioConfinado/SCTR → INFRACCIÓN.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, workerEvidence } from './_helpers'

export const evaluatorTE01: QuestionEvaluator = {
  questionId: 'TE-01',
  evaluate: (ctx) => {
    const gestantes = ctx.workers.filter((w) => w.condicionEspecial === 'EMBARAZADA')
    if (gestantes.length === 0) {
      return {
        questionId: 'TE-01',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadoras gestantes', 0)],
        sources: ['Worker.condicionEspecial'],
      }
    }
    const puestosRiesgo = ctx.puestosTrabajo.filter(
      (p) =>
        p.requiereAlturas ||
        p.requiereEspacioConfinado ||
        p.requiereSCTR ||
        p.exposicionQuimica ||
        p.exposicionBiologica
    )
    const workersEnRiesgo = puestosRiesgo
      .map((p) => p.workerId)
      .filter((id): id is string => id !== null)
    const gestantesEnRiesgo = gestantes.filter((g) => workersEnRiesgo.includes(g.id))
    return {
      questionId: 'TE-01',
      answer: gestantesEnRiesgo.length === 0 ? 'SI' : 'NO',
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadoras gestantes', gestantes.length),
        metricEvidence('En puestos de riesgo', gestantesEnRiesgo.length),
        ...gestantesEnRiesgo.slice(0, 5).map((w) => workerEvidence(w, 'Gestante en puesto de riesgo')),
      ],
      sources: ['Worker.condicionEspecial', 'PuestoTrabajo'],
    }
  },
}
