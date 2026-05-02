/**
 * Tipos compartidos del módulo Organigrama.
 *
 * Estos DTOs se usan tanto en API routes como en componentes cliente para
 * mantener una sola fuente de verdad sobre la forma del árbol.
 */

import type { UnitKind, ComplianceRoleType } from '@/generated/prisma/client'

export type { UnitKind, ComplianceRoleType }

export interface OrgUnitDTO {
  id: string
  parentId: string | null
  name: string
  slug: string
  kind: UnitKind
  code: string | null
  description: string | null
  costCenter: string | null
  level: number
  sortOrder: number
  color: string | null
  icon: string | null
  version: number
  isActive: boolean
  validFrom?: string
  validTo?: string | null
}

export interface OrgPositionDTO {
  id: string
  orgUnitId: string
  title: string
  code: string | null
  description: string | null
  level?: string | null
  purpose?: string | null
  functions?: unknown
  responsibilities?: unknown
  requirements?: unknown
  salaryBandMin?: string | null
  salaryBandMax?: string | null
  category?: string | null
  riskCategory?: string | null
  requiresSctr?: boolean
  requiresMedicalExam?: boolean
  isCritical?: boolean
  isManagerial: boolean
  reportsToPositionId: string | null
  backupPositionId: string | null
  seats: number
  validFrom?: string
  validTo?: string | null
}

export interface OrgAssignmentDTO {
  id: string
  workerId: string
  positionId: string
  isPrimary: boolean
  isInterim: boolean
  startedAt: string
  endedAt: string | null
  capacityPct: number
  worker: {
    id: string
    dni: string
    email: string | null
    firstName: string
    lastName: string
    photoUrl: string | null
    position: string | null
    department: string | null
    regimenLaboral: string
    tipoContrato: string
    fechaIngreso: string
    legajoScore: number | null
    status: string
  }
}

export interface OrgComplianceRoleDTO {
  id: string
  workerId: string
  roleType: ComplianceRoleType
  unitId: string | null
  startsAt: string
  endsAt: string | null
  electedAt: string | null
  actaUrl: string | null
  baseLegal: string | null
  worker: {
    id: string
    firstName: string
    lastName: string
  }
}

export interface OrgChartTree {
  rootUnitIds: string[]
  units: OrgUnitDTO[]
  positions: OrgPositionDTO[]
  assignments: OrgAssignmentDTO[]
  complianceRoles: OrgComplianceRoleDTO[]
  generatedAt: string
  asOf: string | null
}

export type DoctorSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface DoctorFinding {
  rule: string
  severity: DoctorSeverity
  title: string
  description: string
  baseLegal: string | null
  affectedUnitIds: string[]
  affectedWorkerIds: string[]
  suggestedTaskTitle: string | null
  suggestedFix: string | null
}

export interface DoctorReport {
  generatedAt: string
  scoreOrgHealth: number // 0-100
  findings: DoctorFinding[]
  totals: {
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface OrgChartSnapshotDTO {
  id: string
  label: string
  reason: string | null
  workerCount: number
  unitCount: number
  depthMax: number
  hash: string
  isAuto: boolean
  createdAt: string
}

export interface PublicOrgChartPayload {
  org: {
    name: string
    ruc: string | null
  }
  snapshotLabel: string
  takenAt: string
  hashShort: string
  units: Array<{
    id: string
    parentId: string | null
    name: string
    kind: UnitKind
  }>
  positions: Array<{
    id: string
    orgUnitId: string
    title: string
    occupants: Array<{ name: string; isInterim: boolean }>
  }>
  complianceRoles: Array<{
    roleType: ComplianceRoleType
    workerName: string
    unitId: string | null
    endsAt: string | null
  }>
}

/** Niveles de redacción para Auditor Link. */
export interface PublicLinkOptions {
  expiresInHours: number // 24 / 48 / 72
  includeWorkers: boolean // si false, solo unidades + posiciones (sin nombres)
  includeSalaries: false // SIEMPRE false — los sueldos no salen jamás
  includeComplianceRoles: boolean
}
