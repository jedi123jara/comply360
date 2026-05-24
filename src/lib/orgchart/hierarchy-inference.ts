import type { OrgAssignmentDTO, OrgPositionDTO, OrgUnitDTO } from './types'

type UnitLike = Pick<OrgUnitDTO, 'id' | 'parentId' | 'name'>
type PositionLike = Pick<
  OrgPositionDTO,
  'id' | 'orgUnitId' | 'title' | 'isManagerial' | 'reportsToPositionId'
>
type AssignmentLike = Pick<OrgAssignmentDTO, 'positionId'>

export interface InferredPositionHierarchy<P extends PositionLike = PositionLike> {
  parentByPosition: Map<string, string | null>
  leadByUnit: Map<string, P>
  directReportsByPosition: Map<string, number>
  inferredPositionIds: Set<string>
}

export function inferPositionHierarchy<P extends PositionLike>({
  units,
  positions,
  assignments = [],
}: {
  units: UnitLike[]
  positions: P[]
  assignments?: AssignmentLike[]
}): InferredPositionHierarchy<P> {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]))
  const positionIds = new Set(positions.map((position) => position.id))
  const positionsByUnit = new Map<string, P[]>()
  for (const position of positions) {
    positionsByUnit.set(position.orgUnitId, [
      ...(positionsByUnit.get(position.orgUnitId) ?? []),
      position,
    ])
  }

  const occupiedCountByPosition = new Map<string, number>()
  for (const assignment of assignments) {
    occupiedCountByPosition.set(
      assignment.positionId,
      (occupiedCountByPosition.get(assignment.positionId) ?? 0) + 1,
    )
  }

  const explicitReportsByPosition = new Map<string, number>()
  for (const position of positions) {
    if (position.reportsToPositionId && positionIds.has(position.reportsToPositionId)) {
      explicitReportsByPosition.set(
        position.reportsToPositionId,
        (explicitReportsByPosition.get(position.reportsToPositionId) ?? 0) + 1,
      )
    }
  }

  const leadByUnit = new Map<string, P>()
  for (const [unitId, unitPositions] of positionsByUnit) {
    const sorted = [...unitPositions].sort((a, b) => {
      const managerialDelta =
        Number(Boolean(b.isManagerial)) - Number(Boolean(a.isManagerial))
      if (managerialDelta !== 0) return managerialDelta

      const priorityDelta = titleRank(b.title) - titleRank(a.title)
      if (priorityDelta !== 0) return priorityDelta

      const reportsDelta =
        (explicitReportsByPosition.get(b.id) ?? 0) -
        (explicitReportsByPosition.get(a.id) ?? 0)
      if (reportsDelta !== 0) return reportsDelta

      const occupiedDelta =
        (occupiedCountByPosition.get(b.id) ?? 0) -
        (occupiedCountByPosition.get(a.id) ?? 0)
      if (occupiedDelta !== 0) return occupiedDelta

      return a.title.localeCompare(b.title, 'es')
    })
    if (sorted[0]) leadByUnit.set(unitId, sorted[0])
  }

  const parentByPosition = new Map<string, string | null>()
  const inferredPositionIds = new Set<string>()

  function nearestAncestorLead(unitId: string, positionId: string) {
    let parentId = unitsById.get(unitId)?.parentId ?? null
    while (parentId) {
      const parentLead = leadByUnit.get(parentId)
      if (parentLead && parentLead.id !== positionId) return parentLead.id
      parentId = unitsById.get(parentId)?.parentId ?? null
    }
    return null
  }

  for (const position of positions) {
    let parentId =
      position.reportsToPositionId && positionIds.has(position.reportsToPositionId)
        ? position.reportsToPositionId
        : null

    if (!parentId) {
      const unitLead = leadByUnit.get(position.orgUnitId)
      if (unitLead && unitLead.id !== position.id) {
        parentId = unitLead.id
      } else {
        parentId = nearestAncestorLead(position.orgUnitId, position.id)
      }
      if (parentId) inferredPositionIds.add(position.id)
    }

    parentByPosition.set(position.id, parentId && parentId !== position.id ? parentId : null)
  }

  const directReportsByPosition = new Map<string, number>()
  for (const parentId of parentByPosition.values()) {
    if (!parentId) continue
    directReportsByPosition.set(
      parentId,
      (directReportsByPosition.get(parentId) ?? 0) + 1,
    )
  }

  return {
    parentByPosition,
    leadByUnit,
    directReportsByPosition,
    inferredPositionIds,
  }
}

export function titleRank(title: string) {
  const value = title.toLocaleLowerCase('es')
  if (/(gerente general|ceo|director ejecutivo|dirección general|direccion general)/i.test(value)) {
    return 100
  }
  if (/(gerente|director|jefe de área|jefe de area)/i.test(value)) return 80
  if (/(jefe|head|supervisor|responsable|líder|lider|coordinador)/i.test(value)) return 60
  if (/(analista|especialista|asistente|auxiliar|consultor)/i.test(value)) return 20
  return 40
}

export function buildUnitPath(
  unitId: string | null,
  unitsById: ReadonlyMap<string, UnitLike>,
) {
  if (!unitId) return 'Sin unidad'
  const path: string[] = []
  const visited = new Set<string>()
  let currentId: string | null = unitId
  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const unit = unitsById.get(currentId)
    if (!unit) break
    path.unshift(unit.name)
    currentId = unit.parentId
  }
  return path.join(' / ')
}
