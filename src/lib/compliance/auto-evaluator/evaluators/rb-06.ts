/**
 * RB-06: Se paga la asignación familiar (10% RMV) a los trabajadores con hijos menores?
 * Base legal: Ley 25129, Art. 2
 *
 * Lógica: workers con WorkerDependent (hijos < 18) → debe tener asignacionFamiliar=true.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence, pctToAnswer, workerEvidence } from './_helpers'

export const evaluatorRB06: QuestionEvaluator = {
  questionId: 'RB-06',
  evaluate: (ctx) => {
    const now = ctx.now
    const hijosMenoresByWorker = new Map<string, number>()
    for (const d of ctx.workerDependents) {
      if (!d.birthDate || !d.esBeneficiarioAsigFam) continue
      const age = (now.getTime() - d.birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      if (age < 18) {
        hijosMenoresByWorker.set(d.workerId, (hijosMenoresByWorker.get(d.workerId) ?? 0) + 1)
      }
    }
    const conHijos = ctx.workers.filter((w) => hijosMenoresByWorker.has(w.id))
    if (conHijos.length === 0) {
      return {
        questionId: 'RB-06',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Trabajadores con hijos menores registrados', 0)],
        sources: ['WorkerDependent'],
      }
    }
    const ok = conHijos.filter((w) => w.asignacionFamiliar)
    const pct = Math.round((ok.length / conHijos.length) * 100)
    const faltantes = conHijos.filter((w) => !w.asignacionFamiliar).slice(0, 5)
    return {
      questionId: 'RB-06',
      answer: pctToAnswer(pct),
      confidence: 90,
      evidence: [
        metricEvidence('Trabajadores con hijos menores', conHijos.length),
        metricEvidence('Con asignación familiar activada', `${pct}%`),
        ...faltantes.map((w) => workerEvidence(w, 'Hijos menores sin asignación')),
      ],
      sources: ['Worker.asignacionFamiliar', 'WorkerDependent'],
    }
  },
}
