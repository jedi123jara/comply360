import { COMPLIANCE_ROLES, type ComplianceRoleDef } from './compliance-rules'
import type { ComplianceRoleType, OrgChartTree, OrgComplianceRoleDTO } from './types'

export type LegalResponsibilityStatus = 'covered' | 'missing' | 'expiring' | 'expired' | 'orphaned'
export type LegalResponsibilityGroupKey = ComplianceRoleDef['committeeKind']

export interface LegalResponsibilityHolder {
  roleId: string
  workerId: string
  workerName: string
  unitId: string | null
  unitName: string | null
  startsAt: string
  endsAt: string | null
  actaUrl: string | null
  baseLegal: string | null
  daysToExpiry: number | null
  isExpired: boolean
  isExpiringSoon: boolean
  hasActivePosition: boolean
}

export interface LegalResponsibilityItem {
  roleType: ComplianceRoleType
  label: string
  shortLabel: string
  description: string
  baseLegal: string
  committeeKind: LegalResponsibilityGroupKey
  defaultDurationMonths: number | null
  status: LegalResponsibilityStatus
  holders: LegalResponsibilityHolder[]
}

export interface LegalResponsibilityGroup {
  key: LegalResponsibilityGroupKey
  label: string
  description: string
  items: LegalResponsibilityItem[]
  totals: {
    covered: number
    missing: number
    expiring: number
    orphaned: number
  }
}

export interface LegalResponsiblesSummary {
  generatedAt: string
  totals: {
    assignedRoles: number
    catalogRoleTypes: number
    coveredRoleTypes: number
    missingRoleTypes: number
    expiringSoon: number
    expired: number
    orphaned: number
  }
  groups: LegalResponsibilityGroup[]
}

const GROUP_LABELS: Record<LegalResponsibilityGroupKey, { label: string; description: string }> = {
  COMITE_SST: {
    label: 'Comite SST',
    description: 'Presidencia, secretaria y representantes de Seguridad y Salud en el Trabajo.',
  },
  COMITE_HOSTIGAMIENTO: {
    label: 'Hostigamiento',
    description: 'Comite o receptor para denuncias de hostigamiento sexual.',
  },
  BRIGADA_EMERGENCIA: {
    label: 'Brigada de emergencia',
    description: 'Roles operativos de respuesta, evacuacion y primeros auxilios.',
  },
  INDIVIDUAL: {
    label: 'Responsables individuales',
    description: 'Responsables legales o funcionales asignados a una persona concreta.',
  },
}

const GROUP_ORDER: LegalResponsibilityGroupKey[] = [
  'COMITE_SST',
  'COMITE_HOSTIGAMIENTO',
  'BRIGADA_EMERGENCIA',
  'INDIVIDUAL',
]

export function buildLegalResponsiblesSummary(tree: OrgChartTree, now = new Date()): LegalResponsiblesSummary {
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const assignedWorkerIds = new Set(tree.assignments.map(assignment => assignment.workerId))
  const rolesByType = groupRolesByType(tree.complianceRoles)
  const items = Object.values(COMPLIANCE_ROLES).map(def => {
    const holders = (rolesByType.get(def.type) ?? []).map(role => {
      const daysToExpiry = daysUntil(role.endsAt, now)
      return {
        roleId: role.id,
        workerId: role.workerId,
        workerName: `${role.worker.firstName} ${role.worker.lastName}`,
        unitId: role.unitId,
        unitName: role.unitId ? unitsById.get(role.unitId)?.name ?? null : null,
        startsAt: role.startsAt,
        endsAt: role.endsAt,
        actaUrl: role.actaUrl,
        baseLegal: role.baseLegal,
        daysToExpiry,
        isExpired: daysToExpiry !== null && daysToExpiry < 0,
        isExpiringSoon: daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 30,
        hasActivePosition: assignedWorkerIds.has(role.workerId),
      } satisfies LegalResponsibilityHolder
    })

    return {
      roleType: def.type,
      label: def.label,
      shortLabel: def.shortLabel,
      description: def.description,
      baseLegal: def.baseLegal,
      committeeKind: def.committeeKind,
      defaultDurationMonths: def.defaultDurationMonths,
      status: statusForHolders(holders),
      holders,
    } satisfies LegalResponsibilityItem
  })

  const groups = GROUP_ORDER.map(key => {
    const groupItems = items.filter(item => item.committeeKind === key)
    const labels = GROUP_LABELS[key]
    return {
      key,
      ...labels,
      items: groupItems,
      totals: {
        covered: groupItems.filter(item => item.status === 'covered').length,
        missing: groupItems.filter(item => item.status === 'missing').length,
        expiring: groupItems.filter(item => item.status === 'expiring').length,
        orphaned: groupItems.filter(item => item.status === 'orphaned').length,
      },
    }
  }).filter(group => group.items.length > 0)

  return {
    generatedAt: now.toISOString(),
    totals: {
      assignedRoles: tree.complianceRoles.length,
      catalogRoleTypes: items.length,
      coveredRoleTypes: items.filter(item => item.holders.length > 0).length,
      missingRoleTypes: items.filter(item => item.status === 'missing').length,
      expiringSoon: items.reduce((sum, item) => sum + item.holders.filter(holder => holder.isExpiringSoon).length, 0),
      expired: items.reduce((sum, item) => sum + item.holders.filter(holder => holder.isExpired).length, 0),
      orphaned: items.reduce((sum, item) => sum + item.holders.filter(holder => !holder.hasActivePosition).length, 0),
    },
    groups,
  }
}

function groupRolesByType(roles: OrgComplianceRoleDTO[]) {
  const grouped = new Map<ComplianceRoleType, OrgComplianceRoleDTO[]>()
  for (const role of roles) {
    grouped.set(role.roleType, [...(grouped.get(role.roleType) ?? []), role])
  }
  return grouped
}

function statusForHolders(holders: LegalResponsibilityHolder[]): LegalResponsibilityStatus {
  if (holders.length === 0) return 'missing'
  if (holders.some(holder => holder.isExpired)) return 'expired'
  if (holders.some(holder => !holder.hasActivePosition)) return 'orphaned'
  if (holders.some(holder => holder.isExpiringSoon)) return 'expiring'
  return 'covered'
}

function daysUntil(value: string | null, now: Date) {
  if (!value) return null
  const endsAt = new Date(value)
  return Math.ceil((endsAt.getTime() - now.getTime()) / 86_400_000)
}
