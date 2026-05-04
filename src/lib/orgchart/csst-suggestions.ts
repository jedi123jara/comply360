import type { ComplianceRoleType, OrgAssignmentDTO, OrgChartTree, OrgPositionDTO } from './types'

type CsstRoleType = Extract<
  ComplianceRoleType,
  | 'PRESIDENTE_COMITE_SST'
  | 'SECRETARIO_COMITE_SST'
  | 'REPRESENTANTE_TRABAJADORES_SST'
  | 'REPRESENTANTE_EMPLEADOR_SST'
  | 'SUPERVISOR_SST'
>

export interface CsstCompositionSuggestion {
  roleType: CsstRoleType
  workerId: string
  workerName: string
  positionTitle: string
  unitName: string | null
  score: number
  reason: string
  evidence: string[]
}

export interface CsstCompositionSuggestionReport {
  generatedAt: string
  workerCount: number
  needsCommittee: boolean
  missingRoles: CsstRoleType[]
  suggestions: CsstCompositionSuggestion[]
}

interface Candidate {
  assignment: OrgAssignmentDTO
  position: OrgPositionDTO
  unitName: string | null
}

const CSST_ROLE_TYPES: CsstRoleType[] = [
  'PRESIDENTE_COMITE_SST',
  'SECRETARIO_COMITE_SST',
  'REPRESENTANTE_TRABAJADORES_SST',
  'REPRESENTANTE_EMPLEADOR_SST',
  'SUPERVISOR_SST',
]

export function buildCsstCompositionSuggestions(
  tree: OrgChartTree,
  now = parseGeneratedAt(tree.generatedAt),
): CsstCompositionSuggestionReport {
  const activeAssignments = uniqueActiveAssignmentsByWorker(tree)
  const activeCsstRoles = tree.complianceRoles.filter(role => {
    if (!CSST_ROLE_TYPES.includes(role.roleType as CsstRoleType)) return false
    return !role.endsAt || new Date(role.endsAt).getTime() >= now.getTime()
  })
  const roleCounts = (roleType: CsstRoleType) => activeCsstRoles.filter(role => role.roleType === roleType).length
  const needsCommittee = activeAssignments.length >= 20
  const missingRoles = missingCsstRoles({
    needsCommittee,
    president: roleCounts('PRESIDENTE_COMITE_SST'),
    secretary: roleCounts('SECRETARIO_COMITE_SST'),
    workerReps: roleCounts('REPRESENTANTE_TRABAJADORES_SST'),
    employerReps: roleCounts('REPRESENTANTE_EMPLEADOR_SST'),
    supervisors: roleCounts('SUPERVISOR_SST'),
  })

  const activeRoleWorkerIds = new Set(activeCsstRoles.map(role => role.workerId))
  const candidates = buildCandidates(tree, activeAssignments).filter(
    candidate => !activeRoleWorkerIds.has(candidate.assignment.workerId),
  )
  const usedWorkerIds = new Set<string>()
  const suggestions: CsstCompositionSuggestion[] = []

  for (const roleType of missingRoles) {
    const best = candidates
      .filter(candidate => !usedWorkerIds.has(candidate.assignment.workerId))
      .map(candidate => scoreCandidate(roleType, candidate, now))
      .sort((left, right) => right.score - left.score)[0]
    if (!best) continue

    usedWorkerIds.add(best.workerId)
    suggestions.push(best)
  }

  return {
    generatedAt: now.toISOString(),
    workerCount: activeAssignments.length,
    needsCommittee,
    missingRoles,
    suggestions,
  }
}

function missingCsstRoles(input: {
  needsCommittee: boolean
  president: number
  secretary: number
  workerReps: number
  employerReps: number
  supervisors: number
}): CsstRoleType[] {
  if (!input.needsCommittee) {
    return input.supervisors === 0 ? ['SUPERVISOR_SST'] : []
  }

  const roles: CsstRoleType[] = []
  if (input.president === 0) roles.push('PRESIDENTE_COMITE_SST')
  if (input.secretary === 0) roles.push('SECRETARIO_COMITE_SST')

  const workerRepSlots = Math.max(0, 2 - input.workerReps, input.employerReps - input.workerReps)
  const employerRepSlots = Math.max(0, 2 - input.employerReps, input.workerReps - input.employerReps)
  roles.push(...Array.from({ length: workerRepSlots }, () => 'REPRESENTANTE_TRABAJADORES_SST' as const))
  roles.push(...Array.from({ length: employerRepSlots }, () => 'REPRESENTANTE_EMPLEADOR_SST' as const))
  return roles
}

function buildCandidates(tree: OrgChartTree, assignments: OrgAssignmentDTO[]): Candidate[] {
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))

  return assignments.flatMap(assignment => {
    const position = positionsById.get(assignment.positionId)
    if (!position) return []
    const unit = unitsById.get(position.orgUnitId) ?? null
    return [{ assignment, position, unitName: unit?.name ?? null }]
  })
}

function uniqueActiveAssignmentsByWorker(tree: OrgChartTree) {
  const active = tree.assignments
    .filter(assignment => !assignment.endedAt)
    .sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary))
  const byWorker = new Map<string, OrgAssignmentDTO>()
  for (const assignment of active) {
    if (!byWorker.has(assignment.workerId)) byWorker.set(assignment.workerId, assignment)
  }
  return [...byWorker.values()]
}

function scoreCandidate(roleType: CsstRoleType, candidate: Candidate, now: Date): CsstCompositionSuggestion {
  const worker = candidate.assignment.worker
  const workerName = `${worker.firstName} ${worker.lastName}`
  const text = normalize(
    [
      worker.position,
      worker.department,
      candidate.position.title,
      candidate.position.category,
      candidate.position.level,
      candidate.unitName,
      candidate.position.riskCategory,
    ]
      .filter(Boolean)
      .join(' '),
  )
  const managerial = candidate.position.isManagerial || matches(text, ['gerente', 'jefe', 'supervisor', 'coordinador', 'responsable'])
  const executive = matches(text, ['gerente', 'direccion general', 'dirección general'])
  const sstSpecialist = matches(text, ['supervisor sst', 'sst', 'ssoma', 'prevencionista', 'prevencion'])
  const sst = isSstSensitive(candidate.position, text)
  const administrative = matches(text, ['recursos humanos', 'rrhh', 'administracion', 'legal', 'cumplimiento', 'compliance'])
  const operational = matches(text, ['operaciones', 'produccion', 'planta', 'obra', 'campo', 'almacen', 'flota', 'packing', 'mantenimiento'])
  const tenureMonths = monthsBetween(new Date(worker.fechaIngreso), now)
  const evidence: string[] = []
  let score = 40

  if (candidate.assignment.isPrimary) {
    score += 6
    evidence.push('cargo primario')
  }
  if (tenureMonths >= 12) {
    score += Math.min(14, Math.floor(tenureMonths / 12) * 4)
    evidence.push(`${Math.floor(tenureMonths / 12)} año(s) de antigüedad`)
  }
  if (worker.legajoScore !== null && worker.legajoScore >= 80) {
    score += 6
    evidence.push(`legajo ${worker.legajoScore}/100`)
  }

  if (roleType === 'PRESIDENTE_COMITE_SST') {
    if (managerial) {
      score += 24
      evidence.push('rol de jefatura o gerencia')
    }
    if (executive) score += 12
    if (administrative) score += 8
  } else if (roleType === 'SECRETARIO_COMITE_SST') {
    if (administrative) {
      score += 24
      evidence.push('perfil administrativo/legal')
    }
    if (managerial) score += 8
  } else if (roleType === 'REPRESENTANTE_TRABAJADORES_SST') {
    if (!managerial) {
      score += 16
      evidence.push('no es jefatura')
    } else {
      score -= 8
    }
    if (operational) {
      score += 16
      evidence.push('representa área operativa')
    }
    if (sst) score += 10
  } else if (roleType === 'REPRESENTANTE_EMPLEADOR_SST') {
    if (managerial) {
      score += 22
      evidence.push('representa línea empleadora')
    }
    if (sst) score += 10
  } else {
    if (sstSpecialist) {
      score += 14
      evidence.push('perfil SST directo')
    }
    if (sst) {
      score += 28
      evidence.push('exposición SST/SCTR')
    }
    if (operational) score += 10
  }

  return {
    roleType,
    workerId: worker.id,
    workerName,
    positionTitle: candidate.position.title,
    unitName: candidate.unitName,
    score: Math.max(20, Math.min(100, score)),
    reason: reasonForRole(roleType),
    evidence: evidence.slice(0, 4),
  }
}

function reasonForRole(roleType: CsstRoleType) {
  if (roleType === 'PRESIDENTE_COMITE_SST') return 'Candidato con autoridad formal para presidir el comité.'
  if (roleType === 'SECRETARIO_COMITE_SST') return 'Candidato apto para actas, convocatorias y trazabilidad documental.'
  if (roleType === 'REPRESENTANTE_TRABAJADORES_SST') return 'Candidato para representación de trabajadores.'
  if (roleType === 'REPRESENTANTE_EMPLEADOR_SST') return 'Candidato para representación del empleador.'
  return 'Candidato para Supervisor SST en empresa sin comité obligatorio.'
}

function isSstSensitive(position: OrgPositionDTO, normalizedText: string) {
  return Boolean(
    position.requiresSctr ||
      position.requiresMedicalExam ||
      position.isCritical ||
      matches(normalizedText, ['sst', 'ssoma', 'seguridad', 'salud', 'prevencion', 'riesgo', 'alto']),
  )
}

function matches(input: string, needles: string[]) {
  return needles.some(needle => input.includes(normalize(needle)))
}

function normalize(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function monthsBetween(from: Date, to: Date) {
  if (Number.isNaN(from.getTime())) return 0
  return Math.max(0, (to.getFullYear() - from.getFullYear()) * 12 + to.getMonth() - from.getMonth())
}

function parseGeneratedAt(value: string) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}
