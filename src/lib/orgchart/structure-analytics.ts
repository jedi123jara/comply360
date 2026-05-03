import type { OrgChartTree, OrgPositionDTO } from './types'

export type SpanSeverity = 'healthy' | 'watch' | 'high' | 'critical'
export type StructureHealth = 'excellent' | 'stable' | 'attention' | 'critical'

export interface SpanControlRecord {
  positionId: string
  title: string
  unitId: string
  unitName: string
  occupantNames: string[]
  directReports: number
  totalSubtree: number
  depth: number
  severity: SpanSeverity
  recommendation: string
}

export interface UnitStructureScore {
  unitId: string
  unitName: string
  parentId: string | null
  level: number
  score: number
  health: StructureHealth
  positions: number
  occupants: number
  vacancies: number
  vacancyRate: number
  missingMof: number
  missingMofRate: number
  sstSensitive: number
  managerialPositions: number
  maxSpan: number
  averageSpan: number
  maxDepth: number
  flags: string[]
}

export interface StructureAnalyticsSummary {
  generatedAt: string
  score: number
  health: StructureHealth
  totals: {
    units: number
    positions: number
    occupants: number
    vacancies: number
    vacancyRate: number
    missingMof: number
    missingMofRate: number
    sstSensitive: number
    managers: number
    overloadedManagers: number
    criticalManagers: number
    maxDepth: number
    averageSpan: number
  }
  spanRecords: SpanControlRecord[]
  unitScores: UnitStructureScore[]
  topRisks: Array<{
    id: string
    title: string
    description: string
    severity: SpanSeverity
    unitId: string | null
    positionId: string | null
  }>
}

export function buildStructureAnalytics(tree: OrgChartTree, now = new Date()): StructureAnalyticsSummary {
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))
  const assignmentsByPosition = groupAssignmentsByPosition(tree)
  const directReportsByPosition = groupDirectReports(tree)
  const depths = computePositionDepths(tree.positions, positionsById)
  const subtreeCounts = computeSubtreeCounts(tree.positions, directReportsByPosition)
  const spanRecords = tree.positions
    .filter(position => (directReportsByPosition.get(position.id)?.length ?? 0) > 0 || position.isManagerial)
    .map(position => {
      const unit = unitsById.get(position.orgUnitId)
      const directReports = directReportsByPosition.get(position.id)?.length ?? 0
      return {
        positionId: position.id,
        title: position.title,
        unitId: position.orgUnitId,
        unitName: unit?.name ?? 'Sin area',
        occupantNames: (assignmentsByPosition.get(position.id) ?? []).map(
          assignment => `${assignment.worker.firstName} ${assignment.worker.lastName}`,
        ),
        directReports,
        totalSubtree: subtreeCounts.get(position.id) ?? directReports,
        depth: depths.get(position.id) ?? 0,
        severity: spanSeverity(directReports),
        recommendation: spanRecommendation(directReports),
      } satisfies SpanControlRecord
    })
    .sort((a, b) => b.directReports - a.directReports || b.totalSubtree - a.totalSubtree || a.title.localeCompare(b.title))

  const unitScores = tree.units.map(unit =>
    buildUnitScore(unit.id, tree, {
      assignmentsByPosition,
      directReportsByPosition,
      depths,
    }),
  ).sort((a, b) => a.score - b.score || b.positions - a.positions || a.unitName.localeCompare(b.unitName))

  const totalVacancies = tree.positions.reduce((sum, position) => {
    const occupants = assignmentsByPosition.get(position.id)?.length ?? 0
    return sum + Math.max(0, position.seats - occupants)
  }, 0)
  const totalSeats = tree.positions.reduce((sum, position) => sum + position.seats, 0)
  const missingMof = tree.positions.filter(position => !hasMof(position)).length
  const managers = spanRecords.length
  const overloadedManagers = spanRecords.filter(record => record.severity === 'high' || record.severity === 'critical').length
  const criticalManagers = spanRecords.filter(record => record.severity === 'critical').length
  const averageSpan = managers ? round(spanRecords.reduce((sum, record) => sum + record.directReports, 0) / managers, 1) : 0
  const maxDepth = Math.max(0, ...Array.from(depths.values()))
  const score = scoreOrganization({
    vacancyRate: ratio(totalVacancies, totalSeats),
    missingMofRate: ratio(missingMof, tree.positions.length),
    overloadedManagers,
    criticalManagers,
    maxDepth,
    unitCriticalCount: unitScores.filter(unit => unit.health === 'critical').length,
  })

  return {
    generatedAt: now.toISOString(),
    score,
    health: healthFromScore(score),
    totals: {
      units: tree.units.length,
      positions: tree.positions.length,
      occupants: tree.assignments.length,
      vacancies: totalVacancies,
      vacancyRate: ratio(totalVacancies, totalSeats),
      missingMof,
      missingMofRate: ratio(missingMof, tree.positions.length),
      sstSensitive: tree.positions.filter(isSstSensitive).length,
      managers,
      overloadedManagers,
      criticalManagers,
      maxDepth,
      averageSpan,
    },
    spanRecords,
    unitScores,
    topRisks: buildTopRisks(spanRecords, unitScores),
  }
}

function buildUnitScore(
  unitId: string,
  tree: OrgChartTree,
  context: {
    assignmentsByPosition: Map<string, OrgChartTree['assignments']>
    directReportsByPosition: Map<string, OrgPositionDTO[]>
    depths: Map<string, number>
  },
): UnitStructureScore {
  const unit = tree.units.find(candidate => candidate.id === unitId)
  const positions = tree.positions.filter(position => position.orgUnitId === unitId)
  const totalSeats = positions.reduce((sum, position) => sum + position.seats, 0)
  const occupants = positions.reduce((sum, position) => sum + (context.assignmentsByPosition.get(position.id)?.length ?? 0), 0)
  const vacancies = positions.reduce((sum, position) => {
    const occupied = context.assignmentsByPosition.get(position.id)?.length ?? 0
    return sum + Math.max(0, position.seats - occupied)
  }, 0)
  const missingMof = positions.filter(position => !hasMof(position)).length
  const spans = positions.map(position => context.directReportsByPosition.get(position.id)?.length ?? 0)
  const maxSpan = Math.max(0, ...spans)
  const averageSpan = spans.length ? round(spans.reduce((sum, span) => sum + span, 0) / spans.length, 1) : 0
  const managerialPositions = positions.filter(position => position.isManagerial || (context.directReportsByPosition.get(position.id)?.length ?? 0) > 0).length
  const maxDepth = Math.max(0, ...positions.map(position => context.depths.get(position.id) ?? 0))
  const vacancyRate = ratio(vacancies, totalSeats)
  const missingMofRate = ratio(missingMof, positions.length)
  const flags = unitFlags({
    positions: positions.length,
    vacancies,
    vacancyRate,
    missingMof,
    missingMofRate,
    maxSpan,
    managerialPositions,
    maxDepth,
  })
  const score = scoreUnit({
    positions: positions.length,
    vacancyRate,
    missingMofRate,
    maxSpan,
    managerialPositions,
    maxDepth,
  })

  return {
    unitId,
    unitName: unit?.name ?? 'Unidad no encontrada',
    parentId: unit?.parentId ?? null,
    level: unit?.level ?? 0,
    score,
    health: healthFromScore(score),
    positions: positions.length,
    occupants,
    vacancies,
    vacancyRate,
    missingMof,
    missingMofRate,
    sstSensitive: positions.filter(isSstSensitive).length,
    managerialPositions,
    maxSpan,
    averageSpan,
    maxDepth,
    flags,
  }
}

function buildTopRisks(spanRecords: SpanControlRecord[], unitScores: UnitStructureScore[]) {
  const risks: StructureAnalyticsSummary['topRisks'] = []
  for (const record of spanRecords.filter(record => record.severity === 'critical' || record.severity === 'high').slice(0, 5)) {
    risks.push({
      id: `span:${record.positionId}`,
      title: `Span alto: ${record.title}`,
      description: `${record.directReports} reportes directos en ${record.unitName}. ${record.recommendation}`,
      severity: record.severity,
      unitId: record.unitId,
      positionId: record.positionId,
    })
  }
  for (const unit of unitScores.filter(item => item.health === 'critical' || item.health === 'attention').slice(0, 5)) {
    risks.push({
      id: `unit:${unit.unitId}`,
      title: `Salud baja: ${unit.unitName}`,
      description: unit.flags.length ? unit.flags.join(' · ') : `Score estructural ${unit.score}/100`,
      severity: unit.health === 'critical' ? 'critical' : 'high',
      unitId: unit.unitId,
      positionId: null,
    })
  }
  return risks.slice(0, 8)
}

function groupAssignmentsByPosition(tree: OrgChartTree) {
  const grouped = new Map<string, OrgChartTree['assignments']>()
  for (const assignment of tree.assignments) {
    grouped.set(assignment.positionId, [...(grouped.get(assignment.positionId) ?? []), assignment])
  }
  return grouped
}

function groupDirectReports(tree: OrgChartTree) {
  const grouped = new Map<string, OrgPositionDTO[]>()
  for (const position of tree.positions) {
    if (!position.reportsToPositionId) continue
    grouped.set(position.reportsToPositionId, [...(grouped.get(position.reportsToPositionId) ?? []), position])
  }
  return grouped
}

function computePositionDepths(positions: OrgPositionDTO[], positionsById: Map<string, OrgPositionDTO>) {
  const depths = new Map<string, number>()
  const visit = (position: OrgPositionDTO, seen = new Set<string>()): number => {
    if (depths.has(position.id)) return depths.get(position.id)!
    if (!position.reportsToPositionId) {
      depths.set(position.id, 0)
      return 0
    }
    if (seen.has(position.id)) {
      depths.set(position.id, 0)
      return 0
    }
    const parent = positionsById.get(position.reportsToPositionId)
    if (!parent) {
      depths.set(position.id, 0)
      return 0
    }
    const nextSeen = new Set(seen).add(position.id)
    const depth = visit(parent, nextSeen) + 1
    depths.set(position.id, depth)
    return depth
  }

  for (const position of positions) visit(position)
  return depths
}

function computeSubtreeCounts(positions: OrgPositionDTO[], directReportsByPosition: Map<string, OrgPositionDTO[]>) {
  const counts = new Map<string, number>()
  const visit = (positionId: string, seen = new Set<string>()): number => {
    if (counts.has(positionId)) return counts.get(positionId)!
    if (seen.has(positionId)) return 0
    const children = directReportsByPosition.get(positionId) ?? []
    const nextSeen = new Set(seen).add(positionId)
    const count = children.reduce((sum, child) => sum + 1 + visit(child.id, nextSeen), 0)
    counts.set(positionId, count)
    return count
  }
  for (const position of positions) visit(position.id)
  return counts
}

function scoreOrganization(input: {
  vacancyRate: number
  missingMofRate: number
  overloadedManagers: number
  criticalManagers: number
  maxDepth: number
  unitCriticalCount: number
}) {
  const raw = 100
    - input.vacancyRate * 24
    - input.missingMofRate * 28
    - Math.min(18, input.overloadedManagers * 4)
    - Math.min(16, input.criticalManagers * 8)
    - Math.max(0, input.maxDepth - 6) * 3
    - Math.min(12, input.unitCriticalCount * 4)
  return clampScore(raw)
}

function scoreUnit(input: {
  positions: number
  vacancyRate: number
  missingMofRate: number
  maxSpan: number
  managerialPositions: number
  maxDepth: number
}) {
  if (input.positions === 0) return 100
  const raw = 100
    - input.vacancyRate * 24
    - input.missingMofRate * 28
    - spanPenalty(input.maxSpan)
    - (input.positions >= 4 && input.managerialPositions === 0 ? 10 : 0)
    - Math.max(0, input.maxDepth - 6) * 3
  return clampScore(raw)
}

function unitFlags(input: {
  positions: number
  vacancies: number
  vacancyRate: number
  missingMof: number
  missingMofRate: number
  maxSpan: number
  managerialPositions: number
  maxDepth: number
}) {
  const flags: string[] = []
  if (input.vacancies > 0) flags.push(`${input.vacancies} vacante(s)`)
  if (input.missingMof > 0) flags.push(`${input.missingMof} cargo(s) sin MOF`)
  if (input.maxSpan >= 13) flags.push(`span maximo ${input.maxSpan}`)
  if (input.positions >= 4 && input.managerialPositions === 0) flags.push('sin jefatura definida')
  if (input.maxDepth >= 7) flags.push(`profundidad ${input.maxDepth}`)
  if (input.vacancyRate >= 0.4) flags.push('alta exposicion por vacancia')
  if (input.missingMofRate >= 0.5) flags.push('MOF incompleto dominante')
  return flags
}

function spanPenalty(value: number) {
  if (value >= 21) return 30
  if (value >= 13) return 20
  if (value >= 9) return 10
  return 0
}

function spanSeverity(value: number): SpanSeverity {
  if (value >= 21) return 'critical'
  if (value >= 13) return 'high'
  if (value >= 9) return 'watch'
  return 'healthy'
}

function spanRecommendation(value: number) {
  if (value >= 21) return 'Requiere rediseno de mandos o subliderazgos.'
  if (value >= 13) return 'Conviene dividir supervision o formalizar coordinadores.'
  if (value >= 9) return 'Monitorear carga y riesgo de cuello de botella.'
  return 'Span dentro de rango controlable.'
}

function healthFromScore(score: number): StructureHealth {
  if (score >= 85) return 'excellent'
  if (score >= 70) return 'stable'
  if (score >= 50) return 'attention'
  return 'critical'
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

function ratio(numerator: number, denominator: number) {
  if (denominator <= 0) return 0
  return round(numerator / denominator, 3)
}

function round(value: number, decimals = 0) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
