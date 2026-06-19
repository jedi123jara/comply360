import type { OrgAssignmentDTO, OrgPositionDTO, OrgUnitDTO } from './types'

type UnitLike = Pick<OrgUnitDTO, 'id' | 'parentId' | 'name' | 'kind' | 'description'>
type PositionLike = Pick<
  OrgPositionDTO,
  'id' | 'orgUnitId' | 'title' | 'isManagerial' | 'reportsToPositionId'
>
type AssignmentLike = Pick<OrgAssignmentDTO, 'positionId'>

export interface InferredUnitHierarchy<U extends UnitLike = UnitLike> {
  parentByUnit: Map<string, string | null>
  rootUnit: U | null
  inferredUnitIds: Set<string>
  processByUnit: Map<string, string>
}

export interface InferredPositionHierarchy<P extends PositionLike = PositionLike> {
  parentByPosition: Map<string, string | null>
  leadByUnit: Map<string, P>
  directReportsByPosition: Map<string, number>
  inferredPositionIds: Set<string>
  unitHierarchy: InferredUnitHierarchy
}

export function inferPositionHierarchy<P extends PositionLike>({
  units,
  positions,
  assignments = [],
  excludedUnitIds = [],
}: {
  units: UnitLike[]
  positions: P[]
  assignments?: AssignmentLike[]
  excludedUnitIds?: Iterable<string>
}): InferredPositionHierarchy<P> {
  const unitsById = new Map(units.map((unit) => [unit.id, unit]))
  const excludedUnits = new Set(excludedUnitIds)
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

  const unitHierarchy = inferUnitHierarchy({
    units,
    positions,
    assignments,
    excludedUnitIds: excludedUnits,
    leadByUnit,
  })

  const parentByPosition = new Map<string, string | null>()
  const inferredPositionIds = new Set<string>()

  function nearestSameUnitSuperior(position: P) {
    const unitPositions = positionsByUnit.get(position.orgUnitId) ?? []
    const currentTier = positionHierarchyTier(position.title)
    const candidates = unitPositions
      .filter((candidate) => {
        if (candidate.id === position.id) return false
        const candidateTier = positionHierarchyTier(candidate.title)
        const canManage =
          candidateTier >= 50 ||
          candidate.isManagerial ||
          (explicitReportsByPosition.get(candidate.id) ?? 0) > 0
        return canManage && candidateTier > currentTier
      })
      .sort((a, b) => {
        const tierDelta =
          positionHierarchyTier(a.title) - positionHierarchyTier(b.title)
        if (tierDelta !== 0) return tierDelta

        const leadDelta =
          Number(leadByUnit.get(position.orgUnitId)?.id === b.id) -
          Number(leadByUnit.get(position.orgUnitId)?.id === a.id)
        if (leadDelta !== 0) return leadDelta

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
    return candidates[0]?.id ?? null
  }

  function nearestAncestorLead(unitId: string, positionId: string) {
    let parentId = unitHierarchy.parentByUnit.get(unitId) ?? unitsById.get(unitId)?.parentId ?? null
    const seen = new Set<string>()
    while (parentId) {
      if (seen.has(parentId)) return null
      seen.add(parentId)
      const parentLead = leadByUnit.get(parentId)
      if (parentLead && parentLead.id !== positionId) return parentLead.id
      parentId = unitHierarchy.parentByUnit.get(parentId) ?? unitsById.get(parentId)?.parentId ?? null
    }
    return null
  }

  for (const position of positions) {
    if (excludedUnits.has(position.orgUnitId)) {
      const parentId =
        position.reportsToPositionId && positionIds.has(position.reportsToPositionId)
          ? position.reportsToPositionId
          : null
      parentByPosition.set(position.id, parentId && parentId !== position.id ? parentId : null)
      continue
    }

    let parentId =
      position.reportsToPositionId && positionIds.has(position.reportsToPositionId)
        ? position.reportsToPositionId
        : null

    if (!parentId) {
      const unitLead = leadByUnit.get(position.orgUnitId)
      const sameUnitSuperiorId = nearestSameUnitSuperior(position)
      if (sameUnitSuperiorId) {
        parentId = sameUnitSuperiorId
      } else if (
        unitLead &&
        unitLead.id !== position.id &&
        (positionHierarchyTier(unitLead.title) > positionHierarchyTier(position.title) ||
          (unitLead.isManagerial && !position.isManagerial))
      ) {
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
    unitHierarchy,
  }
}

export function inferUnitHierarchy<U extends UnitLike>({
  units,
  positions = [],
  assignments = [],
  excludedUnitIds = [],
  leadByUnit: providedLeadByUnit,
}: {
  units: U[]
  positions?: PositionLike[]
  assignments?: AssignmentLike[]
  excludedUnitIds?: Iterable<string>
  leadByUnit?: Map<string, PositionLike>
}): InferredUnitHierarchy<U> {
  const excludedUnits = new Set(excludedUnitIds)
  const unitIds = new Set(units.map((unit) => unit.id))
  const includedUnits = units.filter((unit) => !excludedUnits.has(unit.id))
  const leadByUnit = providedLeadByUnit ?? inferLeadByUnit({ positions, assignments })
  const processByUnit = new Map<string, string>()
  for (const unit of units) processByUnit.set(unit.id, processBucket(unit.name))

  const rootUnit = chooseEnterpriseRootUnit(includedUnits, leadByUnit)
  const parentByUnit = new Map<string, string | null>()
  const inferredUnitIds = new Set<string>()

  for (const unit of units) {
    if (excludedUnits.has(unit.id)) {
      parentByUnit.set(unit.id, null)
      continue
    }

    const explicitParentId =
      unit.parentId && unitIds.has(unit.parentId) && !excludedUnits.has(unit.parentId)
        ? unit.parentId
        : null

    if (explicitParentId) {
      parentByUnit.set(unit.id, explicitParentId)
      continue
    }

    if (!rootUnit || unit.id === rootUnit.id) {
      parentByUnit.set(unit.id, null)
      continue
    }

    const processParent = findProcessParent(unit, includedUnits, leadByUnit, rootUnit)
    const parentId = processParent?.id ?? rootUnit.id
    parentByUnit.set(unit.id, parentId)
    inferredUnitIds.add(unit.id)
  }

  return {
    parentByUnit,
    rootUnit,
    inferredUnitIds,
    processByUnit,
  }
}

function inferLeadByUnit({
  positions,
  assignments,
}: {
  positions: PositionLike[]
  assignments: AssignmentLike[]
}) {
  const positionsByUnit = new Map<string, PositionLike[]>()
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

  const leadByUnit = new Map<string, PositionLike>()
  for (const [unitId, unitPositions] of positionsByUnit) {
    const sorted = [...unitPositions].sort((a, b) => {
      const managerialDelta =
        Number(Boolean(b.isManagerial)) - Number(Boolean(a.isManagerial))
      if (managerialDelta !== 0) return managerialDelta

      const priorityDelta = titleRank(b.title) - titleRank(a.title)
      if (priorityDelta !== 0) return priorityDelta

      const occupiedDelta =
        (occupiedCountByPosition.get(b.id) ?? 0) -
        (occupiedCountByPosition.get(a.id) ?? 0)
      if (occupiedDelta !== 0) return occupiedDelta

      return a.title.localeCompare(b.title, 'es')
    })
    if (sorted[0]) leadByUnit.set(unitId, sorted[0])
  }
  return leadByUnit
}

function chooseEnterpriseRootUnit<U extends UnitLike>(
  units: U[],
  leadByUnit: ReadonlyMap<string, PositionLike>,
) {
  if (units.length === 0) return null
  return [...units].sort((a, b) => {
    const rootDelta = unitRootRank(b, leadByUnit.get(b.id)) - unitRootRank(a, leadByUnit.get(a.id))
    if (rootDelta !== 0) return rootDelta
    const levelDelta = Number(a.parentId !== null) - Number(b.parentId !== null)
    if (levelDelta !== 0) return levelDelta
    return a.name.localeCompare(b.name, 'es')
  })[0] ?? null
}

function findProcessParent<U extends UnitLike>(
  unit: U,
  units: U[],
  leadByUnit: ReadonlyMap<string, PositionLike>,
  rootUnit: U,
) {
  const bucket = processBucket(unit.name)
  const rank = unitHierarchyRank(unit, leadByUnit.get(unit.id))
  if (rank >= 78) return null

  return units
    .filter((candidate) => {
      if (candidate.id === unit.id || candidate.id === rootUnit.id) return false
      if (processBucket(candidate.name) !== bucket) return false
      return unitHierarchyRank(candidate, leadByUnit.get(candidate.id)) > rank
    })
    .sort((a, b) => {
      const rankDelta = unitHierarchyRank(b, leadByUnit.get(b.id)) - unitHierarchyRank(a, leadByUnit.get(a.id))
      if (rankDelta !== 0) return rankDelta
      return a.name.localeCompare(b.name, 'es')
    })[0] ?? null
}

function unitRootRank(unit: UnitLike, lead: PositionLike | undefined) {
  const text = normalize(`${unit.name} ${lead?.title ?? ''}`)
  if (/(gerencia general|direccion general|dirección general|gerente general|ceo|direccion ejecutiva|dirección ejecutiva)/.test(text)) {
    return 100
  }
  if (unit.kind === 'GERENCIA' && /(general|direccion|dirección|corporativa|ejecutiva)/.test(text)) {
    return 92
  }
  return Math.max(unitHierarchyRank(unit, lead), titleRank(lead?.title ?? ''))
}

function unitHierarchyRank(unit: UnitLike, lead: PositionLike | undefined) {
  const text = normalize(`${unit.name} ${lead?.title ?? ''}`)
  if (/(gerencia general|direccion general|dirección general|gerente general|ceo)/.test(text)) return 100
  if (/(subgerencia|subdirección|subdireccion)/.test(text)) return 72
  if (unit.kind === 'GERENCIA' || /\bgerencia\b|\bdireccion\b|\bdirección\b/.test(text)) return 84
  if (unit.kind === 'DEPARTAMENTO' || /\bdepartamento\b/.test(text)) return 58
  if (unit.kind === 'EQUIPO') return 48
  return Math.max(42, titleRank(lead?.title ?? ''))
}

export function isParallelGovernanceUnit(unit: UnitLike) {
  if (unit.kind === 'COMITE_LEGAL' || unit.kind === 'BRIGADA' || unit.kind === 'PROYECTO') {
    return true
  }
  const text = normalize(`${unit.name} ${unit.description ?? ''}`)
  return /\b(comite|comité|comision|comisión|brigada|mision|misión)\b/.test(text)
}

export function processBucket(name: string) {
  const text = normalize(name)
  if (/(operacion|operaciones|produccion|producción|planta|campo|obra|servicio|servicios)/.test(text)) return 'operaciones'
  if (/(comercial|venta|ventas|marketing|cliente|clientes)/.test(text)) return 'comercial'
  if (/(admin|administracion|administración|finanza|finanzas|contabilidad|tesoreria|tesorería)/.test(text)) return 'administracion'
  if (/(rrhh|recursos humanos|talento|personas|gestion humana|gestión humana)/.test(text)) return 'rrhh'
  if (/(legal|cumplimiento|compliance|auditoria|auditoría|riesgo|riesgos)/.test(text)) return 'legal'
  if (/(logistica|logística|almacen|almacén|compras|abastecimiento|distribucion|distribución)/.test(text)) return 'logistica'
  if (/(sst|ssoma|seguridad|salud|medio ambiente|ambiental)/.test(text)) return 'sst'
  if (/(tecnologia|tecnología|sistemas|ti|it|datos|data)/.test(text)) return 'tecnologia'
  if (/(proyecto|proyectos|pmO|pmo)/i.test(name)) return 'proyectos'
  if (/(calidad|qa|inocuidad)/.test(text)) return 'calidad'
  return text.split(' ')[0] || 'general'
}

export function titleRank(title: string) {
  return positionHierarchyTier(title)
}

function positionHierarchyTier(title: string) {
  const value = normalize(title)
  if (/(gerente general|ceo|director ejecutivo|dirección general|direccion general)/i.test(value)) {
    return 100
  }
  if (/(director|directora|gerente corporativo|gerenta corporativa)/i.test(value)) return 88
  if (/(gerente|gerenta)/i.test(value)) return 84
  if (/(subgerente|subdirector|subdirectora)/i.test(value)) return 72
  if (/(jefe de área|jefe de area|jefe|head|responsable)/i.test(value)) return 64
  if (/(supervisor|supervisora|líder|lider|encargado|encargada)/i.test(value)) return 58
  if (/(coordinador|coordinadora)/i.test(value)) return 52
  if (/(especialista|analista senior|consultor senior)/i.test(value)) return 42
  if (/(analista|consultor|tecnico|técnico)/i.test(value)) return 34
  if (/(asistente|auxiliar|apoyo|operativo|operaria|operario|practicante)/i.test(value)) return 22
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

function normalize(input: string) {
  return input
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
