import { prisma } from '@/lib/prisma'
import { getTree } from '../tree-service'
import { COMPLIANCE_ROLES } from '../compliance-rules'
import type { DoctorReport, DoctorFinding, OrgChartTree } from '../types'

import { ruleCommitteeSST } from './rules/committee-sst'
import { ruleCommitteeHostigamiento } from './rules/committee-hostigamiento'
import { ruleDpoLey29733 } from './rules/dpo-required'
import { ruleSpansOfControl } from './rules/spans-of-control'
import { ruleSuccessionCoverage } from './rules/succession-coverage'
import { ruleVacantPositions } from './rules/vacant-positions'
import { ruleExpiringRoles } from './rules/expiring-roles'
import { ruleSubordinationRisk } from './rules/subordination-risk'
import { ruleMofCompleteness } from './rules/mof-completeness'

export type RuleFn = (ctx: DoctorContext) => DoctorFinding[]

export interface DoctorContext {
  orgId: string
  workerCount: number
  tree: OrgChartTree
  now: Date
  serviceProviders?: ServiceProviderForDoctor[]
}

export interface ServiceProviderForDoctor {
  id: string
  firstName: string
  lastName: string
  documentNumber: string
  area: string | null
  servicioDescripcion: string
  hasFixedSchedule: boolean
  hasExclusivity: boolean
  worksOnPremises: boolean
  usesCompanyTools: boolean
  reportsToSupervisor: boolean
  receivesOrders: boolean
  desnaturalizacionRisk: number
  status: string
}

const RULES: RuleFn[] = [
  ruleCommitteeSST,
  ruleCommitteeHostigamiento,
  ruleDpoLey29733,
  ruleSpansOfControl,
  ruleSuccessionCoverage,
  ruleMofCompleteness,
  ruleVacantPositions,
  ruleExpiringRoles,
  ruleSubordinationRisk,
]

export async function runOrgDoctor(orgId: string): Promise<DoctorReport> {
  const [tree, workerCount, serviceProviders] = await Promise.all([
    getTree(orgId),
    prisma.worker.count({ where: { orgId, status: { in: ['ACTIVE', 'ON_LEAVE', 'SUSPENDED'] } } }),
    prisma.serviceProvider.findMany({
      where: { orgId, status: { in: ['ACTIVE', 'AT_RISK'] } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentNumber: true,
        area: true,
        servicioDescripcion: true,
        hasFixedSchedule: true,
        hasExclusivity: true,
        worksOnPremises: true,
        usesCompanyTools: true,
        reportsToSupervisor: true,
        receivesOrders: true,
        desnaturalizacionRisk: true,
        status: true,
      },
    }),
  ])

  const ctx: DoctorContext = { orgId, workerCount, tree, now: new Date(), serviceProviders }
  const findings = RULES.flatMap(r => {
    try {
      return r(ctx)
    } catch (err) {
      console.error('[OrgDoctor] regla falló:', err)
      return []
    }
  })

  const totals = {
    critical: findings.filter(f => f.severity === 'CRITICAL').length,
    high: findings.filter(f => f.severity === 'HIGH').length,
    medium: findings.filter(f => f.severity === 'MEDIUM').length,
    low: findings.filter(f => f.severity === 'LOW').length,
  }

  // Score salud organigrama: 100 - penalty
  // CRITICAL = -15, HIGH = -8, MEDIUM = -3, LOW = -1
  const penalty =
    totals.critical * 15 + totals.high * 8 + totals.medium * 3 + totals.low * 1
  const scoreOrgHealth = Math.max(0, Math.min(100, 100 - penalty))

  return {
    generatedAt: ctx.now.toISOString(),
    scoreOrgHealth,
    findings,
    totals,
  }
}

/** Convierte un finding en payload de ComplianceTask. */
export function findingToTaskPayload(orgId: string, finding: DoctorFinding) {
  const sevToGravedad: Record<DoctorFinding['severity'], 'MUY_GRAVE' | 'GRAVE' | 'LEVE'> = {
    CRITICAL: 'MUY_GRAVE',
    HIGH: 'GRAVE',
    MEDIUM: 'GRAVE',
    LOW: 'LEVE',
  }
  return {
    orgId,
    area: 'organigrama',
    title: finding.suggestedTaskTitle ?? finding.title,
    description: `${finding.description}\n\n${finding.suggestedFix ?? ''}\n\nBase legal: ${finding.baseLegal ?? '—'}`.trim(),
    baseLegal: finding.baseLegal,
    gravedad: sevToGravedad[finding.severity],
    sourceId: finding.rule,
  }
}

export { COMPLIANCE_ROLES }
