import { createHash } from 'node:crypto'
import { runOrgDoctor } from './org-doctor'
import type { DoctorFinding, DoctorSeverity } from './types'

export type OrgAlertCategory =
  | 'MOF'
  | 'SST'
  | 'LEGAL_ROLE'
  | 'VACANCY'
  | 'SUBORDINATION'
  | 'SUCCESSION'
  | 'STRUCTURE'

export interface OrgAlert {
  id: string
  category: OrgAlertCategory
  severity: DoctorSeverity
  title: string
  description: string
  baseLegal: string | null
  affectedUnitIds: string[]
  affectedWorkerIds: string[]
  suggestedTaskTitle: string | null
  suggestedFix: string | null
  sourceRule: string
  priority: number
}

export interface OrgAlertReport {
  generatedAt: string
  scoreOrgHealth: number
  alerts: OrgAlert[]
  totals: Record<Lowercase<DoctorSeverity>, number> & {
    open: number
    byCategory: Record<OrgAlertCategory, number>
  }
}

const SEVERITY_PRIORITY: Record<DoctorSeverity, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
}

export async function getOrgAlerts(orgId: string): Promise<OrgAlertReport> {
  const report = await runOrgDoctor(orgId)
  const alerts = report.findings
    .map(findingToAlert)
    .sort((a, b) => a.priority - b.priority || a.category.localeCompare(b.category) || a.title.localeCompare(b.title))

  const byCategory = emptyCategoryTotals()
  for (const alert of alerts) {
    byCategory[alert.category]++
  }

  return {
    generatedAt: report.generatedAt,
    scoreOrgHealth: report.scoreOrgHealth,
    alerts,
    totals: {
      ...report.totals,
      open: alerts.length,
      byCategory,
    },
  }
}

function findingToAlert(finding: DoctorFinding): OrgAlert {
  return {
    id: alertId(finding),
    category: categoryForRule(finding.rule),
    severity: finding.severity,
    title: finding.title,
    description: finding.description,
    baseLegal: finding.baseLegal,
    affectedUnitIds: finding.affectedUnitIds,
    affectedWorkerIds: finding.affectedWorkerIds,
    suggestedTaskTitle: finding.suggestedTaskTitle,
    suggestedFix: finding.suggestedFix,
    sourceRule: finding.rule,
    priority: SEVERITY_PRIORITY[finding.severity],
  }
}

function categoryForRule(rule: string): OrgAlertCategory {
  if (rule.includes('mof')) return 'MOF'
  if (rule.includes('sst')) return 'SST'
  if (rule.includes('role') || rule.includes('committee') || rule.includes('dpo') || rule.includes('hostigamiento')) {
    return 'LEGAL_ROLE'
  }
  if (rule.includes('vacant')) return 'VACANCY'
  if (rule.includes('subordination')) return 'SUBORDINATION'
  if (rule.includes('succession')) return 'SUCCESSION'
  return 'STRUCTURE'
}

function emptyCategoryTotals(): Record<OrgAlertCategory, number> {
  return {
    MOF: 0,
    SST: 0,
    LEGAL_ROLE: 0,
    VACANCY: 0,
    SUBORDINATION: 0,
    SUCCESSION: 0,
    STRUCTURE: 0,
  }
}

function alertId(finding: DoctorFinding) {
  return createHash('sha1')
    .update(
      JSON.stringify({
        rule: finding.rule,
        title: finding.title,
        units: finding.affectedUnitIds,
        workers: finding.affectedWorkerIds,
      }),
    )
    .digest('hex')
    .slice(0, 16)
}
