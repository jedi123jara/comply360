import { prisma } from '@/lib/prisma'
import type { InfracGravedad } from '@/generated/prisma/client'
import { getOrgAlerts, type OrgAlert, type OrgAlertReport } from './alerts'

type SeverityCounts = Record<'critical' | 'high' | 'medium' | 'low', number>

export interface OrgAlertTaskPayload {
  orgId: string
  area: 'organigrama'
  priority: number
  title: string
  description: string
  baseLegal: string | null
  gravedad: InfracGravedad
  sourceId: string
  plazoSugerido: string
  dueDate: Date
}

export interface OrgAlertTaskCreated {
  alertId: string
  taskId: string
  title: string
  sourceId: string
  dueDate: string
}

export interface OrgAlertTaskSkipped {
  alertId: string
  existingTaskId: string
  title: string
  sourceId: string | null
  reason: 'already_open'
}

export interface OrgAlertMonitorReport {
  generatedAt: string
  sourceGeneratedAt: string
  scoreOrgHealth: number
  totals: OrgAlertReport['totals']
  includedSeverities: OrgAlert['severity'][]
  considered: number
  created: number
  skipped: number
  bySeverity: SeverityCounts
  createdTasks: OrgAlertTaskCreated[]
  skippedTasks: OrgAlertTaskSkipped[]
}

export interface MonitorOrgAlertsOptions {
  includeMedium?: boolean
  actorUserId?: string | null
  now?: Date
}

const OPEN_TASK_STATUSES = ['PENDING', 'IN_PROGRESS'] as const

export async function monitorOrgAlerts(
  orgId: string,
  options: MonitorOrgAlertsOptions = {},
): Promise<OrgAlertMonitorReport> {
  const now = options.now ?? new Date()
  const includedSeverities = getIncludedSeverities(options.includeMedium === true)
  const report = await getOrgAlerts(orgId)
  const actionableAlerts = report.alerts.filter(alert => includedSeverities.includes(alert.severity))
  const bySeverity = countBySeverity(actionableAlerts)
  const createdTasks: OrgAlertTaskCreated[] = []
  const skippedTasks: OrgAlertTaskSkipped[] = []

  for (const alert of actionableAlerts) {
    const payload = alertToTaskPayload(orgId, alert, now)
    const existing = await prisma.complianceTask.findFirst({
      where: {
        orgId,
        status: { in: [...OPEN_TASK_STATUSES] },
        OR: [
          { sourceId: payload.sourceId },
          { sourceId: alert.sourceRule },
        ],
      },
      select: { id: true, title: true, sourceId: true },
    })

    if (existing) {
      skippedTasks.push({
        alertId: alert.id,
        existingTaskId: existing.id,
        title: existing.title,
        sourceId: existing.sourceId,
        reason: 'already_open',
      })
      continue
    }

    const task = await prisma.complianceTask.create({
      data: payload,
      select: { id: true, title: true, sourceId: true, dueDate: true },
    })
    createdTasks.push({
      alertId: alert.id,
      taskId: task.id,
      title: task.title,
      sourceId: task.sourceId ?? payload.sourceId,
      dueDate: (task.dueDate ?? payload.dueDate).toISOString(),
    })
  }

  await prisma.auditLog.create({
    data: {
      orgId,
      userId: options.actorUserId ?? null,
      action: 'orgchart.alert_monitor.ran',
      entityType: 'OrgChart',
      metadataJson: {
        scoreOrgHealth: report.scoreOrgHealth,
        considered: actionableAlerts.length,
        created: createdTasks.length,
        skipped: skippedTasks.length,
        includedSeverities,
        generatedAt: now.toISOString(),
      },
    },
  }).catch(err => {
    console.error('[orgchart.alert-monitor] audit log failed:', err)
  })

  return {
    generatedAt: now.toISOString(),
    sourceGeneratedAt: report.generatedAt,
    scoreOrgHealth: report.scoreOrgHealth,
    totals: report.totals,
    includedSeverities,
    considered: actionableAlerts.length,
    created: createdTasks.length,
    skipped: skippedTasks.length,
    bySeverity,
    createdTasks,
    skippedTasks,
  }
}

export function alertToTaskPayload(orgId: string, alert: OrgAlert, now = new Date()): OrgAlertTaskPayload {
  const dueInDays = dueDaysForSeverity(alert.severity)
  const dueDate = addDays(now, dueInDays)
  const suggestedFix = alert.suggestedFix ? `Accion sugerida: ${alert.suggestedFix}` : null
  const baseLegal = alert.baseLegal ? `Base legal: ${alert.baseLegal}` : 'Base legal: no especificada'
  const affected = affectedSummary(alert)

  return {
    orgId,
    area: 'organigrama',
    priority: alert.priority,
    title: (alert.suggestedTaskTitle ?? alert.title).slice(0, 255),
    description: [alert.description, suggestedFix, baseLegal, affected].filter(Boolean).join('\n\n'),
    baseLegal: alert.baseLegal,
    gravedad: gravedadForSeverity(alert.severity),
    sourceId: `orgchart-alert:${alert.id}`,
    plazoSugerido: plazoForSeverity(alert.severity),
    dueDate,
  }
}

function getIncludedSeverities(includeMedium: boolean): OrgAlert['severity'][] {
  return includeMedium ? ['CRITICAL', 'HIGH', 'MEDIUM'] : ['CRITICAL', 'HIGH']
}

function countBySeverity(alerts: OrgAlert[]): SeverityCounts {
  return alerts.reduce<SeverityCounts>(
    (acc, alert) => {
      acc[alert.severity.toLowerCase() as keyof SeverityCounts]++
      return acc
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  )
}

function gravedadForSeverity(severity: OrgAlert['severity']): InfracGravedad {
  if (severity === 'CRITICAL') return 'MUY_GRAVE'
  if (severity === 'HIGH' || severity === 'MEDIUM') return 'GRAVE'
  return 'LEVE'
}

function plazoForSeverity(severity: OrgAlert['severity']) {
  if (severity === 'CRITICAL') return 'Inmediato (7 dias)'
  if (severity === 'HIGH') return 'Prioritario (15 dias)'
  if (severity === 'MEDIUM') return 'Planificado (30 dias)'
  return 'Observacion (45 dias)'
}

function dueDaysForSeverity(severity: OrgAlert['severity']) {
  if (severity === 'CRITICAL') return 7
  if (severity === 'HIGH') return 15
  if (severity === 'MEDIUM') return 30
  return 45
}

function affectedSummary(alert: OrgAlert) {
  const parts = [
    alert.affectedUnitIds.length > 0 ? `${alert.affectedUnitIds.length} unidad(es) afectada(s)` : null,
    alert.affectedWorkerIds.length > 0 ? `${alert.affectedWorkerIds.length} trabajador(es) afectado(s)` : null,
    `Regla: ${alert.sourceRule}`,
  ].filter(Boolean)
  return parts.join(' | ')
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
