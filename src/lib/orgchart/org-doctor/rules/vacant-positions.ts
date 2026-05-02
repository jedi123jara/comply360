import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'

/**
 * Posiciones vacantes — cargos con `seats > 0` pero menos asignaciones vigentes
 * que asientos. Las vacantes en cargos gerenciales o de roles legales son
 * más graves.
 */
export function ruleVacantPositions(ctx: DoctorContext): DoctorFinding[] {
  const occupiedByPosition = new Map<string, number>()
  for (const a of ctx.tree.assignments) {
    occupiedByPosition.set(a.positionId, (occupiedByPosition.get(a.positionId) ?? 0) + 1)
  }

  const out: DoctorFinding[] = []
  for (const p of ctx.tree.positions) {
    if (p.seats === 0) continue
    const occupied = occupiedByPosition.get(p.id) ?? 0
    if (occupied >= p.seats) continue

    const vacant = p.seats - occupied
    if (p.isManagerial) {
      out.push({
        rule: 'vacant-managerial',
        severity: 'HIGH',
        title: `Cargo gerencial vacante: ${p.title}`,
        description: `El cargo gerencial "${p.title}" tiene ${vacant} vacante(s). La empresa opera sin titular en una posición de mando.`,
        baseLegal: null,
        affectedUnitIds: [p.orgUnitId],
        affectedWorkerIds: [],
        suggestedTaskTitle: `Cubrir vacante de "${p.title}"`,
        suggestedFix: null,
      })
    } else if (vacant > 1) {
      out.push({
        rule: 'vacant-positions',
        severity: 'LOW',
        title: `${vacant} vacantes en "${p.title}"`,
        description: `El cargo "${p.title}" tiene ${vacant} vacante(s) sin cubrir.`,
        baseLegal: null,
        affectedUnitIds: [p.orgUnitId],
        affectedWorkerIds: [],
        suggestedTaskTitle: null,
        suggestedFix: null,
      })
    }
  }

  return out
}
