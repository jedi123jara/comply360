/**
 * RL-03: Sanciones disciplinarias siguen procedimiento gradual?
 * Base legal: D.S. 003-97-TR, Art. 33
 *
 * Lógica: para cada worker con DisciplinaryAction, verificar que no haya
 * un DESPIDO sin una SUSPENSION previa, ni SUSPENSION sin AMONESTACION_ESCRITA previa.
 */
import type { QuestionEvaluator } from '../types'
import { metricEvidence } from './_helpers'

const ORDEN: Record<string, number> = {
  AMONESTACION_VERBAL: 1,
  AMONESTACION_ESCRITA: 2,
  SUSPENSION: 3,
  DESPIDO: 4,
}

export const evaluatorRL03: QuestionEvaluator = {
  questionId: 'RL-03',
  evaluate: (ctx) => {
    if (ctx.disciplinaryActions.length === 0) {
      return {
        questionId: 'RL-03',
        answer: null,
        confidence: 100,
        evidence: [metricEvidence('Acciones disciplinarias registradas', 0)],
        sources: ['DisciplinaryAction'],
      }
    }
    // Agrupa por worker y verifica orden
    const byWorker = new Map<string, { tipo: string; fecha: Date }[]>()
    for (const a of ctx.disciplinaryActions) {
      if (!byWorker.has(a.workerId)) byWorker.set(a.workerId, [])
      byWorker.get(a.workerId)!.push({ tipo: a.tipo, fecha: a.fechaAccion })
    }
    let violaciones = 0
    for (const [, acciones] of byWorker) {
      acciones.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())
      // Si hay DESPIDO al final sin SUSPENSION previa → violación
      const ultima = acciones[acciones.length - 1]
      if (ultima.tipo === 'DESPIDO') {
        const previas = acciones.slice(0, -1).map((a) => ORDEN[a.tipo] ?? 0)
        if (Math.max(0, ...previas) < ORDEN.SUSPENSION) violaciones++
      }
    }
    const total = byWorker.size
    const correctos = total - violaciones
    const pct = Math.round((correctos / total) * 100)
    return {
      questionId: 'RL-03',
      answer: pct >= 100 ? 'SI' : pct >= 80 ? 'PARCIAL' : 'NO',
      confidence: 85,
      evidence: [
        metricEvidence('Trabajadores con acciones disciplinarias', total),
        metricEvidence('Sin saltos en el procedimiento gradual', `${pct}%`),
        metricEvidence('Violaciones detectadas', violaciones),
      ],
      sources: ['DisciplinaryAction'],
    }
  },
}
