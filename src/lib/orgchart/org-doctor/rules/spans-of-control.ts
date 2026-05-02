import type { DoctorFinding } from '../../types'
import type { DoctorContext } from '../index'

/**
 * Spans of control: cantidad de subordinados directos por cargo gerencial.
 *
 * Buenas prácticas (Drucker, McKinsey, IBM):
 *   - 5-9 reportes directos: óptimo
 *   - 10-15: tolerable, requiere disciplina
 *   - >15: indicador de riesgo operacional (micro-management imposible)
 *   - >25: prácticamente garantiza fallas de supervisión SST y compliance
 *
 * Aquí marcamos:
 *   - >25 = HIGH
 *   - 15-25 = MEDIUM
 *   - 12-14 = LOW (informativo)
 */
export function ruleSpansOfControl(ctx: DoctorContext): DoctorFinding[] {
  const out: DoctorFinding[] = []
  const reportsByPosition = new Map<string, number>()
  for (const p of ctx.tree.positions) {
    if (!p.reportsToPositionId) continue
    reportsByPosition.set(p.reportsToPositionId, (reportsByPosition.get(p.reportsToPositionId) ?? 0) + 1)
  }

  for (const [positionId, count] of reportsByPosition) {
    const pos = ctx.tree.positions.find(p => p.id === positionId)
    if (!pos) continue
    if (count >= 25) {
      out.push({
        rule: 'span-of-control-extreme',
        severity: 'HIGH',
        title: `Span of control extremo: ${count} reportes directos`,
        description: `El cargo "${pos.title}" tiene ${count} reportes directos. Es prácticamente imposible mantener supervisión SST y de compliance efectiva. Considera introducir una capa intermedia.`,
        baseLegal: null,
        affectedUnitIds: [pos.orgUnitId],
        affectedWorkerIds: [],
        suggestedTaskTitle: `Reorganizar estructura bajo "${pos.title}"`,
        suggestedFix: 'Agrega una capa intermedia de coordinadores o supervisores para reducir el span a un rango manejable.',
      })
    } else if (count >= 15) {
      out.push({
        rule: 'span-of-control-high',
        severity: 'MEDIUM',
        title: `Span of control alto: ${count} reportes directos`,
        description: `El cargo "${pos.title}" tiene ${count} reportes directos. La supervisión efectiva se vuelve difícil sobre 12-15.`,
        baseLegal: null,
        affectedUnitIds: [pos.orgUnitId],
        affectedWorkerIds: [],
        suggestedTaskTitle: null,
        suggestedFix: null,
      })
    } else if (count >= 12) {
      out.push({
        rule: 'span-of-control-borderline',
        severity: 'LOW',
        title: `Span of control en el límite: ${count} reportes directos`,
        description: `El cargo "${pos.title}" tiene ${count} reportes directos. Está en el límite de lo recomendable (5-12).`,
        baseLegal: null,
        affectedUnitIds: [pos.orgUnitId],
        affectedWorkerIds: [],
        suggestedTaskTitle: null,
        suggestedFix: null,
      })
    }
  }

  return out
}
