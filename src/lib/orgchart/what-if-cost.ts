import type { OrgChartTree, OrgPositionDTO } from './types'

export interface WhatIfCostImpact {
  basis: 'POSITION_SALARY_BAND'
  currency: 'PEN'
  positionsAffected: number
  workersAffected: number
  vacantSeatsAffected: number
  estimatedMonthlyPayroll: number
  estimatedAnnualPayroll: number
  estimatedMonthlyVacancyBudget: number
  estimatedSeveranceExposure: number
  salaryBandCoverage: {
    positionsWithBand: number
    positionsMissingBand: number
    assignmentsWithBand: number
    assignmentsMissingBand: number
  }
  notes: string[]
}

const CIVIL_CONTRACT_MARKERS = ['LOCACION', 'LOCACIÓN', 'SERVICIO', 'CIVIL', 'HONORARIO', 'RECIBO']
const FIXED_TERM_MARKERS = [
  'PLAZO_FIJO',
  'INICIO_ACTIVIDAD',
  'NECESIDAD_MERCADO',
  'RECONVERSION',
  'SUPLENCIA',
  'EMERGENCIA',
  'OBRA_DETERMINADA',
  'INTERMITENTE',
  'EXPORTACION',
]

export function buildWhatIfCostImpact(
  tree: OrgChartTree,
  rootPositionId: string,
  asOf: Date = new Date(tree.generatedAt),
): WhatIfCostImpact {
  const affectedPositionIds = collectPositionSubtreeIds(tree, rootPositionId)
  const affectedPositions = tree.positions.filter(position => affectedPositionIds.has(position.id))
  const affectedAssignments = tree.assignments.filter(assignment => affectedPositionIds.has(assignment.positionId))
  const positionById = new Map(tree.positions.map(position => [position.id, position]))

  let estimatedMonthlyPayroll = 0
  let estimatedMonthlyVacancyBudget = 0
  let estimatedSeveranceExposure = 0
  let assignmentsWithBand = 0
  let assignmentsMissingBand = 0

  const positionsWithBand = affectedPositions.filter(position => salaryBandMidpoint(position) !== null).length
  const positionsMissingBand = affectedPositions.length - positionsWithBand

  for (const assignment of affectedAssignments) {
    const position = positionById.get(assignment.positionId)
    const monthlyBase = position ? salaryBandMidpoint(position) : null
    if (monthlyBase === null) {
      assignmentsMissingBand++
      continue
    }

    assignmentsWithBand++
    const monthlyEquivalent = roundMoney(monthlyBase * (assignment.capacityPct / 100))
    estimatedMonthlyPayroll += monthlyEquivalent
    estimatedSeveranceExposure += roundMoney(
      monthlyEquivalent *
        estimateSeveranceMonths({
          regimenLaboral: assignment.worker.regimenLaboral,
          tipoContrato: assignment.worker.tipoContrato,
          fechaIngreso: assignment.worker.fechaIngreso,
          asOf,
        }),
    )
  }

  for (const position of affectedPositions) {
    const monthlyBase = salaryBandMidpoint(position)
    if (monthlyBase === null) continue

    const occupiedSeats = affectedAssignments.filter(assignment => assignment.positionId === position.id).length
    const vacantSeats = Math.max(0, position.seats - occupiedSeats)
    estimatedMonthlyVacancyBudget += roundMoney(monthlyBase * vacantSeats)
  }

  const vacantSeatsAffected = affectedPositions.reduce((total, position) => {
    const occupiedSeats = affectedAssignments.filter(assignment => assignment.positionId === position.id).length
    return total + Math.max(0, position.seats - occupiedSeats)
  }, 0)

  return {
    basis: 'POSITION_SALARY_BAND',
    currency: 'PEN',
    positionsAffected: affectedPositions.length,
    workersAffected: affectedAssignments.length,
    vacantSeatsAffected,
    estimatedMonthlyPayroll: roundMoney(estimatedMonthlyPayroll),
    estimatedAnnualPayroll: roundMoney(estimatedMonthlyPayroll * 12),
    estimatedMonthlyVacancyBudget: roundMoney(estimatedMonthlyVacancyBudget),
    estimatedSeveranceExposure: roundMoney(estimatedSeveranceExposure),
    salaryBandCoverage: {
      positionsWithBand,
      positionsMissingBand,
      assignmentsWithBand,
      assignmentsMissingBand,
    },
    notes: buildCostNotes({ positionsMissingBand, assignmentsMissingBand }),
  }
}

function collectPositionSubtreeIds(tree: OrgChartTree, rootPositionId: string) {
  const childrenByParent = new Map<string, string[]>()
  for (const position of tree.positions) {
    if (!position.reportsToPositionId) continue
    const current = childrenByParent.get(position.reportsToPositionId) ?? []
    current.push(position.id)
    childrenByParent.set(position.reportsToPositionId, current)
  }

  const result = new Set<string>()
  const stack = [rootPositionId]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (result.has(current)) continue
    result.add(current)
    stack.push(...(childrenByParent.get(current) ?? []))
  }
  return result
}

function salaryBandMidpoint(position: OrgPositionDTO) {
  const min = parseMoney(position.salaryBandMin)
  const max = parseMoney(position.salaryBandMax)
  if (min === null && max === null) return null
  if (min !== null && max !== null) return roundMoney((min + max) / 2)
  return min ?? max
}

function parseMoney(value: string | number | null | undefined) {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function estimateSeveranceMonths({
  regimenLaboral,
  tipoContrato,
  fechaIngreso,
  asOf,
}: {
  regimenLaboral: string
  tipoContrato: string
  fechaIngreso: string
  asOf: Date
}) {
  if (isCivilContractLike(tipoContrato) || regimenLaboral === 'MODALIDAD_FORMATIVA' || regimenLaboral === 'CAS') {
    return 0
  }

  const years = Math.max(0, (asOf.getTime() - new Date(fechaIngreso).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
  if (regimenLaboral === 'MYPE_MICRO') return Math.min(3, years / 3)
  if (regimenLaboral === 'MYPE_PEQUENA') return Math.min(4, (years * 2) / 3)

  const baseMonths = Math.min(12, years * 1.5)
  if (FIXED_TERM_MARKERS.includes(tipoContrato)) return Math.max(1.5, baseMonths)
  return baseMonths
}

function isCivilContractLike(contractType: string) {
  const normalized = contractType.toUpperCase()
  return CIVIL_CONTRACT_MARKERS.some(marker => normalized.includes(marker))
}

function buildCostNotes({
  positionsMissingBand,
  assignmentsMissingBand,
}: {
  positionsMissingBand: number
  assignmentsMissingBand: number
}) {
  const notes = [
    'Estimación referencial basada en punto medio de banda salarial del cargo; no usa sueldo individual del trabajador.',
    'La exposición por indemnización es una aproximación para planeamiento y debe recalcularse en el módulo de cese antes de ejecutar una desvinculación.',
  ]
  if (positionsMissingBand > 0 || assignmentsMissingBand > 0) {
    notes.push('Completar bandas salariales mejora la precisión del impacto económico del escenario.')
  }
  return notes
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
