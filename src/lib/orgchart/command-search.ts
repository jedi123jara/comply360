import { COMPLIANCE_ROLES } from './compliance-rules'
import type { OrgChartTree, OrgPositionDTO } from './types'

export type OrgCommandKind = 'worker' | 'position' | 'unit' | 'role' | 'insight'
export type OrgCommandLens = 'general' | 'mof' | 'sst' | 'vacancies'
export type OrgCommandTab = 'organigrama' | 'directorio' | 'areas-cargos' | 'responsables' | 'historial'

export interface OrgCommandResult {
  id: string
  kind: OrgCommandKind
  title: string
  subtitle: string
  unitId: string | null
  positionId: string | null
  workerId: string | null
  tab: OrgCommandTab
  lens: OrgCommandLens
  score: number
}

export function buildOrgCommandResults(tree: OrgChartTree, query: string, limit = 12): OrgCommandResult[] {
  const normalizedQuery = normalize(query)
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))
  const assignmentsByPosition = groupAssignmentsByPosition(tree)
  const reportCounts = countReportsByPosition(tree)
  const results: OrgCommandResult[] = []

  results.push(...buildInsightResults(tree, normalizedQuery, unitsById, assignmentsByPosition, reportCounts))
  results.push(...buildRoleResults(tree, normalizedQuery, unitsById))

  for (const unit of tree.units) {
    const haystack = [unit.name, unit.code, unit.description, unit.kind].filter(Boolean).join(' ')
    const score = scoreMatch(haystack, normalizedQuery)
    if (score === 0) continue
    results.push({
      id: `unit:${unit.id}`,
      kind: 'unit',
      title: unit.name,
      subtitle: `${formatEnum(unit.kind)} · ${tree.positions.filter(position => position.orgUnitId === unit.id).length} cargos`,
      unitId: unit.id,
      positionId: null,
      workerId: null,
      tab: 'organigrama',
      lens: 'general',
      score,
    })
  }

  for (const position of tree.positions) {
    const unit = unitsById.get(position.orgUnitId)
    const occupants = assignmentsByPosition.get(position.id) ?? []
    const occupantNames = occupants.map(assignment => `${assignment.worker.firstName} ${assignment.worker.lastName}`).join(' ')
    const haystack = [
      position.title,
      position.code,
      position.level,
      position.category,
      position.riskCategory,
      ...positionSearchSignals(position, occupants.length),
      unit?.name,
      occupantNames,
    ].filter(Boolean).join(' ')
    const score = scoreMatch(haystack, normalizedQuery)
    if (score === 0) continue
    results.push({
      id: `position:${position.id}`,
      kind: 'position',
      title: position.title,
      subtitle: `${unit?.name ?? 'Sin area'} · ${occupants.length ? occupantNames : 'Vacante'} · ${reportCounts.get(position.id) ?? 0} reportes`,
      unitId: position.orgUnitId,
      positionId: position.id,
      workerId: null,
      tab: 'organigrama',
      lens: lensForPositionSearch(position, occupants.length, normalizedQuery),
      score,
    })
  }

  for (const assignment of tree.assignments) {
    const position = positionsById.get(assignment.positionId)
    const unit = position ? unitsById.get(position.orgUnitId) : null
    const workerName = `${assignment.worker.firstName} ${assignment.worker.lastName}`
    const haystack = [
      workerName,
      assignment.worker.dni,
      assignment.worker.email,
      assignment.worker.tipoContrato,
      assignment.worker.regimenLaboral,
      position?.title,
      unit?.name,
    ].filter(Boolean).join(' ')
    const score = scoreMatch(haystack, normalizedQuery)
    if (score === 0) continue
    results.push({
      id: `worker:${assignment.workerId}:${assignment.positionId}`,
      kind: 'worker',
      title: workerName,
      subtitle: `${assignment.worker.dni} · ${position?.title ?? 'Sin cargo'} · ${unit?.name ?? 'Sin area'}`,
      unitId: position?.orgUnitId ?? null,
      positionId: position?.id ?? null,
      workerId: assignment.workerId,
      tab: 'organigrama',
      lens: isCivilContractLike(assignment.worker.tipoContrato) ? 'general' : lensForPosition(position ?? null, 1),
      score,
    })
  }

  return dedupeResults(results)
    .sort((a, b) => b.score - a.score || kindWeight(a.kind) - kindWeight(b.kind) || a.title.localeCompare(b.title))
    .slice(0, Math.max(1, limit))
}

function buildInsightResults(
  tree: OrgChartTree,
  normalizedQuery: string,
  unitsById: Map<string, OrgChartTree['units'][number]>,
  assignmentsByPosition: Map<string, OrgChartTree['assignments']>,
  reportCounts: Map<string, number>,
) {
  const results: OrgCommandResult[] = []
  const queryEmpty = normalizedQuery.length === 0
  const wantsVacancies = queryEmpty || includesAny(normalizedQuery, ['vacante', 'vacantes', 'sin cubrir'])
  const wantsMof = queryEmpty || includesAny(normalizedQuery, ['mof', 'funciones', 'manual'])
  const wantsSst = queryEmpty || includesAny(normalizedQuery, ['sst', 'sctr', 'seguridad', 'salud'])
  const wantsSpan = queryEmpty || includesAny(normalizedQuery, ['span', 'reportes', 'sobrecarga', 'jefes'])
  const wantsCivil = queryEmpty || includesAny(normalizedQuery, ['locador', 'locacion', 'servicio', 'civil', 'subordinacion'])
  const wantsRoles = includesAny(normalizedQuery, ['responsable', 'responsables', 'roles legales', 'comite', 'comites', 'dpo'])

  if (wantsVacancies) {
    const vacantCount = tree.positions.reduce((sum, position) => {
      const occupied = assignmentsByPosition.get(position.id)?.length ?? 0
      return sum + Math.max(0, position.seats - occupied)
    }, 0)
    results.push(insight('vacancies', 'Puestos vacantes', `${vacantCount} cupo(s) sin cubrir`, 'vacancies', 80))
  }

  if (wantsMof) {
    const missingMof = tree.positions.filter(position => !hasMof(position)).length
    results.push(insight('mof', 'MOF pendiente', `${missingMof} cargo(s) sin MOF completo`, 'mof', 78))
  }

  if (wantsSst) {
    const sensitive = tree.positions.filter(isSstSensitive).length
    results.push(insight('sst', 'Cargos sensibles SST', `${sensitive} cargo(s) con marcador SST`, 'sst', 76))
  }

  if (wantsSpan) {
    const overloaded = tree.positions.filter(position => (reportCounts.get(position.id) ?? 0) >= 10)
    results.push(insight('span', 'Jefes con alto span', `${overloaded.length} cargo(s) con 10+ reportes`, 'general', 74))
  }

  if (wantsRoles) {
    results.push(
      insight(
        'responsibles',
        'Responsables legales',
        `${tree.complianceRoles.length} designacion(es) activas`,
        'general',
        82,
        'responsables',
      ),
    )
  }

  if (wantsCivil) {
    const civilAssignments = tree.assignments.filter(assignment => isCivilContractLike(assignment.worker.tipoContrato))
    for (const assignment of civilAssignments.slice(0, 5)) {
      const position = tree.positions.find(candidate => candidate.id === assignment.positionId)
      const unit = position ? unitsById.get(position.orgUnitId) : null
      results.push({
        id: `civil:${assignment.id}`,
        kind: 'insight',
        title: `${assignment.worker.firstName} ${assignment.worker.lastName}`,
        subtitle: `Relacion civil en ${position?.title ?? 'cargo no encontrado'} · ${unit?.name ?? 'sin area'}`,
        unitId: position?.orgUnitId ?? null,
        positionId: position?.id ?? null,
        workerId: assignment.workerId,
        tab: 'organigrama',
        lens: 'general',
        score: 90,
      })
    }
  }

  return results
}

function buildRoleResults(
  tree: OrgChartTree,
  normalizedQuery: string,
  unitsById: Map<string, OrgChartTree['units'][number]>,
) {
  if (!normalizedQuery) return []

  const results: OrgCommandResult[] = []
  for (const role of tree.complianceRoles) {
    const def = COMPLIANCE_ROLES[role.roleType]
    const unit = role.unitId ? unitsById.get(role.unitId) : null
    const workerName = `${role.worker.firstName} ${role.worker.lastName}`
    const haystack = [
      def.label,
      def.shortLabel,
      def.description,
      def.baseLegal,
      def.committeeKind,
      role.roleType,
      workerName,
      unit?.name,
    ].filter(Boolean).join(' ')
    const score = scoreMatch(haystack, normalizedQuery)
    if (score === 0) continue
    results.push({
      id: `role:${role.id}`,
      kind: 'role',
      title: def.label,
      subtitle: `${workerName} · ${unit?.name ?? 'Alcance organizacion'}`,
      unitId: role.unitId,
      positionId: null,
      workerId: role.workerId,
      tab: 'responsables',
      lens: 'general',
      score,
    })
  }
  return results
}

function insight(
  id: string,
  title: string,
  subtitle: string,
  lens: OrgCommandLens,
  score: number,
  tab: OrgCommandTab = 'organigrama',
): OrgCommandResult {
  return {
    id: `insight:${id}`,
    kind: 'insight',
    title,
    subtitle,
    unitId: null,
    positionId: null,
    workerId: null,
    tab,
    lens,
    score,
  }
}

function scoreMatch(haystack: string, normalizedQuery: string) {
  if (!normalizedQuery) return 1
  const normalizedHaystack = normalize(haystack)
  if (normalizedHaystack === normalizedQuery) return 100
  if (normalizedHaystack.startsWith(normalizedQuery)) return 85
  if (normalizedHaystack.includes(normalizedQuery)) return 70
  const tokens = normalizedQuery.split(' ').filter(Boolean)
  if (tokens.length > 1 && tokens.every(token => normalizedHaystack.includes(token))) return 60
  return 0
}

function dedupeResults(results: OrgCommandResult[]) {
  const seen = new Set<string>()
  return results.filter(result => {
    if (seen.has(result.id)) return false
    seen.add(result.id)
    return true
  })
}

function groupAssignmentsByPosition(tree: OrgChartTree) {
  const grouped = new Map<string, OrgChartTree['assignments']>()
  for (const assignment of tree.assignments) {
    grouped.set(assignment.positionId, [...(grouped.get(assignment.positionId) ?? []), assignment])
  }
  return grouped
}

function countReportsByPosition(tree: OrgChartTree) {
  const counts = new Map<string, number>()
  for (const position of tree.positions) {
    if (!position.reportsToPositionId) continue
    counts.set(position.reportsToPositionId, (counts.get(position.reportsToPositionId) ?? 0) + 1)
  }
  return counts
}

function lensForPosition(position: OrgPositionDTO | null, occupants: number): OrgCommandLens {
  if (!position) return 'general'
  if (occupants < position.seats) return 'vacancies'
  if (!hasMof(position)) return 'mof'
  if (isSstSensitive(position)) return 'sst'
  return 'general'
}

function lensForPositionSearch(position: OrgPositionDTO, occupants: number, normalizedQuery: string): OrgCommandLens {
  if (includesAny(normalizedQuery, ['mof', 'funciones', 'manual']) && !hasMof(position)) return 'mof'
  if (includesAny(normalizedQuery, ['sst', 'sctr', 'seguridad', 'salud']) && isSstSensitive(position)) return 'sst'
  if (includesAny(normalizedQuery, ['vacante', 'vacantes', 'sin cubrir']) && occupants < position.seats) return 'vacancies'
  return lensForPosition(position, occupants)
}

function positionSearchSignals(position: OrgPositionDTO, occupants: number) {
  const signals: string[] = []
  if (occupants < position.seats) signals.push('vacante vacantes sin cubrir cupo')
  if (!hasMof(position)) signals.push('mof manual funciones pendiente')
  if (isSstSensitive(position)) signals.push('sst sctr seguridad salud riesgo critico')
  return signals
}

function hasMof(position: OrgPositionDTO) {
  return Boolean(position.purpose && position.functions && position.responsibilities && position.requirements)
}

function isSstSensitive(position: OrgPositionDTO) {
  const risk = normalize(position.riskCategory ?? '').toUpperCase()
  return Boolean(
    position.requiresSctr ||
    position.requiresMedicalExam ||
    position.isCritical ||
    ['ALTO', 'CRITICO'].includes(risk),
  )
}

function isCivilContractLike(contractType: string) {
  const normalized = normalize(contractType).toUpperCase()
  return normalized.includes('LOCACION') || normalized.includes('SERVICIO') || normalized.includes('CIVIL')
}

function includesAny(value: string, needles: string[]) {
  return needles.some(needle => value.includes(needle))
}

function kindWeight(kind: OrgCommandKind) {
  if (kind === 'insight') return 0
  if (kind === 'worker') return 1
  if (kind === 'position') return 2
  if (kind === 'role') return 3
  return 4
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
