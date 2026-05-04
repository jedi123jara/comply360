/**
 * Funciones puras del builder de la Memoria Anual.
 *
 * Aisladas en un archivo sin imports de Prisma ni I/O para que sean
 * tree-shakeables y, sobre todo, testeables sin levantar la base de datos.
 */

import type { OrgChartTree, ComplianceRoleType } from '../types'
import type { MemoriaAnualEvolution } from './types'

/**
 * Encuentra el snapshot más cercano a una fecha objetivo (sin pasar de ella).
 * Si todos los snapshots son posteriores al objetivo, devuelve el más antiguo.
 * Si la lista está vacía, devuelve `null`.
 */
export function pickClosestSnapshot<
  T extends {
    createdAt: Date | string
    id: string
    label: string
    hash: string
    workerCount: number
    unitCount: number
    depthMax: number
  },
>(snapshots: T[], targetDate: Date): T | null {
  if (snapshots.length === 0) return null
  const target = targetDate.getTime()
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const before = sorted.filter((s) => new Date(s.createdAt).getTime() <= target)
  if (before.length > 0) return before[before.length - 1]
  return sorted[0]
}

/**
 * Compara dos árboles (start y end) y produce un listado plain de highlights
 * para narrar al usuario qué cambió durante el ejercicio.
 *
 * Si `startTree` es null (no hay snapshot de inicio), devuelve array vacío.
 */
export function computeHighlights(
  startTree: OrgChartTree | null,
  endTree: OrgChartTree,
): MemoriaAnualEvolution['highlights'] {
  const highlights: MemoriaAnualEvolution['highlights'] = []
  if (!startTree) return highlights

  const startUnitIds = new Set(startTree.units.map((u) => u.id))
  const endUnitIds = new Set(endTree.units.map((u) => u.id))

  for (const u of endTree.units) {
    if (!startUnitIds.has(u.id)) {
      highlights.push({
        kind: 'unit-added',
        description: `Se creó la unidad ${u.name}`,
      })
    }
  }
  for (const u of startTree.units) {
    if (!endUnitIds.has(u.id)) {
      highlights.push({
        kind: 'unit-removed',
        description: `Se desactivó la unidad ${u.name}`,
      })
    }
  }

  const startPosIds = new Set(startTree.positions.map((p) => p.id))
  let positionsAdded = 0
  for (const p of endTree.positions) {
    if (!startPosIds.has(p.id)) positionsAdded++
  }
  if (positionsAdded > 0) {
    highlights.push({
      kind: 'position-added',
      description: `Se crearon ${positionsAdded} cargos nuevos`,
    })
  }

  const startWorkerIds = new Set(startTree.assignments.map((a) => a.workerId))
  let workersAdded = 0
  for (const a of endTree.assignments) {
    if (!startWorkerIds.has(a.workerId)) workersAdded++
  }
  if (workersAdded > 0) {
    highlights.push({
      kind: 'worker-added',
      description: `Se asignaron ${workersAdded} personas nuevas a posiciones`,
    })
  }

  const startRoleKey = (r: { roleType: ComplianceRoleType; workerId: string }) =>
    `${r.roleType}::${r.workerId}`
  const startRoles = new Set(startTree.complianceRoles.map(startRoleKey))
  let rolesChanged = 0
  for (const r of endTree.complianceRoles) {
    if (!startRoles.has(startRoleKey(r))) rolesChanged++
  }
  if (rolesChanged > 0) {
    highlights.push({
      kind: 'role-changed',
      description: `Se actualizaron ${rolesChanged} responsables legales (DPO, CSST, etc.)`,
    })
  }

  return highlights
}
