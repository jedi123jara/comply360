import { prisma } from '@/lib/prisma'
import type { InfracGravedad } from '@/generated/prisma/client'
import { getSubordinationDossier, type SubordinationCase, type SubordinationDossier } from './subordination-dossier'

export const LOCADOR_SUBORDINATED_EVENT_CODE = 'LOCADOR_SUBORDINATED'
export const LOCADOR_SUBORDINATED_ACTION = `risk.event.${LOCADOR_SUBORDINATED_EVENT_CODE}`

const OPEN_TASK_STATUSES = ['PENDING', 'IN_PROGRESS'] as const

export interface SyncSubordinationRiskOptions {
  actorUserId?: string | null
  createTasks?: boolean
  includeMediumTasks?: boolean
  now?: Date
}

export interface SubordinationRiskEventCreated {
  providerId: string
  providerName: string
  severity: SubordinationCase['severity']
  score: number
  auditLogId: string
}

export interface SubordinationRiskEventSkipped {
  providerId: string
  providerName: string
  severity: SubordinationCase['severity']
  score: number
  reason: 'clear' | 'unchanged_event'
}

export interface SubordinationRiskTaskCreated {
  providerId: string
  taskId: string
  title: string
  sourceId: string
  dueDate: string
}

export interface SubordinationRiskTaskSkipped {
  providerId: string
  existingTaskId: string
  sourceId: string | null
  reason: 'not_actionable' | 'already_open'
}

export interface SubordinationRiskSyncReport {
  generatedAt: string
  dossierGeneratedAt: string
  eventCode: typeof LOCADOR_SUBORDINATED_EVENT_CODE
  considered: number
  eventsCreated: number
  eventsSkipped: number
  scoresUpdated: number
  statusUpdated: number
  tasksCreated: number
  tasksSkipped: number
  bySeverity: Record<'critical' | 'high' | 'medium' | 'low', number>
  createdEvents: SubordinationRiskEventCreated[]
  skippedEvents: SubordinationRiskEventSkipped[]
  createdTasks: SubordinationRiskTaskCreated[]
  skippedTasks: SubordinationRiskTaskSkipped[]
}

type LatestRiskEventMetadata = {
  riskEvent?: {
    code?: string
    score?: number
    severity?: string
    affectedUnitId?: string | null
  }
}

export async function syncSubordinationRiskEvents(
  orgId: string,
  options: SyncSubordinationRiskOptions = {},
): Promise<SubordinationRiskSyncReport> {
  const now = options.now ?? new Date()
  const dossier = await getSubordinationDossier(orgId)
  const cases = dossier.cases.filter(shouldEmitRiskEventForCase)
  const bySeverity = countBySeverity(cases)
  const createdEvents: SubordinationRiskEventCreated[] = []
  const skippedEvents: SubordinationRiskEventSkipped[] = dossier.cases
    .filter(item => !shouldEmitRiskEventForCase(item))
    .map(item => ({
      providerId: item.providerId,
      providerName: item.providerName,
      severity: item.severity,
      score: item.score,
      reason: 'clear' as const,
    }))
  const createdTasks: SubordinationRiskTaskCreated[] = []
  const skippedTasks: SubordinationRiskTaskSkipped[] = []
  let scoresUpdated = 0
  let statusUpdated = 0

  for (const item of cases) {
    const updateResult = await persistProviderRiskScore(orgId, item)
    if (updateResult.scoreChanged) scoresUpdated++
    if (updateResult.statusChanged) statusUpdated++

    const latestEvent = await prisma.auditLog.findFirst({
      where: {
        orgId,
        action: LOCADOR_SUBORDINATED_ACTION,
        entityType: 'ServiceProvider',
        entityId: item.providerId,
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, metadataJson: true },
    })

    if (latestEvent && isSameRiskEvent(latestEvent.metadataJson, item)) {
      skippedEvents.push({
        providerId: item.providerId,
        providerName: item.providerName,
        severity: item.severity,
        score: item.score,
        reason: 'unchanged_event',
      })
    } else {
      const audit = await prisma.auditLog.create({
        data: {
          orgId,
          userId: options.actorUserId ?? null,
          action: LOCADOR_SUBORDINATED_ACTION,
          entityType: 'ServiceProvider',
          entityId: item.providerId,
          metadataJson: subordinationCaseToRiskEventMetadata(item, dossier, now),
        },
        select: { id: true },
      })
      createdEvents.push({
        providerId: item.providerId,
        providerName: item.providerName,
        severity: item.severity,
        score: item.score,
        auditLogId: audit.id,
      })
    }

    if (options.createTasks === true) {
      const taskResult = await createRemediationTaskIfNeeded(orgId, item, {
        includeMediumTasks: options.includeMediumTasks === true,
        now,
      })
      if (taskResult.created) createdTasks.push(taskResult.created)
      if (taskResult.skipped) skippedTasks.push(taskResult.skipped)
    }
  }

  await prisma.auditLog.create({
    data: {
      orgId,
      userId: options.actorUserId ?? null,
      action: 'orgchart.subordination.sync_risk_engine',
      entityType: 'OrgChart',
      metadataJson: {
        eventCode: LOCADOR_SUBORDINATED_EVENT_CODE,
        considered: cases.length,
        eventsCreated: createdEvents.length,
        eventsSkipped: skippedEvents.length,
        scoresUpdated,
        statusUpdated,
        tasksCreated: createdTasks.length,
        tasksSkipped: skippedTasks.length,
        generatedAt: now.toISOString(),
      },
    },
  }).catch(err => {
    console.error('[orgchart.subordination-risk-sync] audit summary failed:', err)
  })

  return {
    generatedAt: now.toISOString(),
    dossierGeneratedAt: dossier.generatedAt,
    eventCode: LOCADOR_SUBORDINATED_EVENT_CODE,
    considered: cases.length,
    eventsCreated: createdEvents.length,
    eventsSkipped: skippedEvents.length,
    scoresUpdated,
    statusUpdated,
    tasksCreated: createdTasks.length,
    tasksSkipped: skippedTasks.length,
    bySeverity,
    createdEvents,
    skippedEvents,
    createdTasks,
    skippedTasks,
  }
}

export function shouldEmitRiskEventForCase(item: SubordinationCase) {
  return item.severity !== 'CLEAR' && item.score > 0
}

export function subordinationCaseToRiskEventMetadata(
  item: SubordinationCase,
  dossier: Pick<SubordinationDossier, 'generatedAt'>,
  now = new Date(),
) {
  return {
    riskEvent: {
      code: LOCADOR_SUBORDINATED_EVENT_CODE,
      source: item.riskEnginePayload.source,
      riskType: item.riskEnginePayload.riskType,
      score: item.score,
      severity: item.severity,
      affectedUnitId: item.unitId,
      providerId: item.providerId,
      providerName: item.providerName,
      factors: item.riskEnginePayload.factors,
      legalBasis: item.riskEnginePayload.legalBasis,
      emittedAt: now.toISOString(),
      dossierGeneratedAt: dossier.generatedAt,
    },
    evidence: {
      document: item.document,
      areaName: item.areaName,
      unitName: item.unitName,
      monthlyAmount: item.monthlyAmount,
      currency: item.currency,
      invoiceCount: item.evidence.invoiceCount,
      latestInvoicePeriod: item.evidence.latestInvoicePeriod,
      hasContractFile: item.evidence.hasContractFile,
      hasAreaMapping: item.evidence.hasAreaMapping,
    },
    recommendedActions: item.recommendedActions,
  }
}

export function subordinationCaseToTaskPayload(orgId: string, item: SubordinationCase, now = new Date()) {
  const dueInDays = dueDaysForSeverity(item.severity)
  const dueDate = addDays(now, dueInDays)
  const indicators = item.presentIndicators.map(indicator => indicator.label).join(', ') || 'Sin indicadores declarados'
  const legalBasis = item.riskEnginePayload.legalBasis.join('; ')

  return {
    orgId,
    area: 'organigrama',
    priority: priorityForSeverity(item.severity),
    title: `Remediar subordinacion civil: ${item.providerName}`.slice(0, 255),
    description: [
      `${item.providerName} esta registrado como prestador civil, pero presenta riesgo ${item.severity} (${item.score}/100).`,
      `Indicadores: ${indicators}.`,
      `Area declarada: ${item.areaName ?? 'sin area'}${item.unitName ? ` | Unidad organigrama: ${item.unitName}` : ''}.`,
      `Gasto mensual expuesto: ${item.currency} ${item.monthlyAmount}.`,
      `Acciones recomendadas: ${item.recommendedActions.join(' ')}`,
    ].join('\n\n'),
    baseLegal: legalBasis,
    gravedad: gravedadForSeverity(item.severity),
    sourceId: subordinationTaskSourceId(item.providerId),
    plazoSugerido: plazoForSeverity(item.severity),
    dueDate,
  }
}

function isSameRiskEvent(metadata: unknown, item: SubordinationCase) {
  const latest = metadata as LatestRiskEventMetadata | null
  return (
    latest?.riskEvent?.code === LOCADOR_SUBORDINATED_EVENT_CODE &&
    latest.riskEvent.score === item.score &&
    latest.riskEvent.severity === item.severity &&
    latest.riskEvent.affectedUnitId === item.unitId
  )
}

async function persistProviderRiskScore(orgId: string, item: SubordinationCase) {
  const provider = await prisma.serviceProvider.findFirst({
    where: { orgId, id: item.providerId },
    select: { desnaturalizacionRisk: true, status: true },
  })
  if (!provider) return { scoreChanged: false, statusChanged: false }

  const nextStatus = statusForSeverity(item.severity)
  const scoreChanged = provider.desnaturalizacionRisk !== item.score
  const statusChanged = provider.status !== nextStatus

  if (scoreChanged || statusChanged) {
    await prisma.serviceProvider.update({
      where: { id: item.providerId },
      data: {
        desnaturalizacionRisk: item.score,
        status: nextStatus,
      },
    })
  }

  return { scoreChanged, statusChanged }
}

async function createRemediationTaskIfNeeded(
  orgId: string,
  item: SubordinationCase,
  options: { includeMediumTasks: boolean; now: Date },
): Promise<{ created?: SubordinationRiskTaskCreated; skipped?: SubordinationRiskTaskSkipped }> {
  if (!isTaskActionable(item, options.includeMediumTasks)) {
    return {
      skipped: {
        providerId: item.providerId,
        existingTaskId: '',
        sourceId: subordinationTaskSourceId(item.providerId),
        reason: 'not_actionable',
      },
    }
  }

  const payload = subordinationCaseToTaskPayload(orgId, item, options.now)
  const existing = await prisma.complianceTask.findFirst({
    where: {
      orgId,
      sourceId: payload.sourceId,
      status: { in: [...OPEN_TASK_STATUSES] },
    },
    select: { id: true, sourceId: true },
  })

  if (existing) {
    return {
      skipped: {
        providerId: item.providerId,
        existingTaskId: existing.id,
        sourceId: existing.sourceId,
        reason: 'already_open',
      },
    }
  }

  const task = await prisma.complianceTask.create({
    data: payload,
    select: { id: true, title: true, sourceId: true, dueDate: true },
  })

  return {
    created: {
      providerId: item.providerId,
      taskId: task.id,
      title: task.title,
      sourceId: task.sourceId ?? payload.sourceId,
      dueDate: (task.dueDate ?? payload.dueDate).toISOString(),
    },
  }
}

function countBySeverity(cases: SubordinationCase[]) {
  return cases.reduce<Record<'critical' | 'high' | 'medium' | 'low', number>>(
    (acc, item) => {
      if (item.severity === 'CRITICAL') acc.critical++
      if (item.severity === 'HIGH') acc.high++
      if (item.severity === 'MEDIUM') acc.medium++
      if (item.severity === 'LOW') acc.low++
      return acc
    },
    { critical: 0, high: 0, medium: 0, low: 0 },
  )
}

function isTaskActionable(item: SubordinationCase, includeMediumTasks: boolean) {
  if (item.severity === 'CRITICAL' || item.severity === 'HIGH') return true
  return includeMediumTasks && item.severity === 'MEDIUM'
}

function statusForSeverity(severity: SubordinationCase['severity']) {
  if (severity === 'CRITICAL' || severity === 'HIGH') return 'AT_RISK'
  return 'ACTIVE'
}

function subordinationTaskSourceId(providerId: string) {
  return `risk-event:${LOCADOR_SUBORDINATED_EVENT_CODE}:${providerId}`
}

function gravedadForSeverity(severity: SubordinationCase['severity']): InfracGravedad {
  if (severity === 'CRITICAL') return 'MUY_GRAVE'
  if (severity === 'HIGH' || severity === 'MEDIUM') return 'GRAVE'
  return 'LEVE'
}

function priorityForSeverity(severity: SubordinationCase['severity']) {
  if (severity === 'CRITICAL') return 1
  if (severity === 'HIGH') return 2
  if (severity === 'MEDIUM') return 3
  return 4
}

function plazoForSeverity(severity: SubordinationCase['severity']) {
  if (severity === 'CRITICAL') return 'Inmediato (7 dias)'
  if (severity === 'HIGH') return 'Prioritario (15 dias)'
  if (severity === 'MEDIUM') return 'Planificado (30 dias)'
  return 'Observacion (45 dias)'
}

function dueDaysForSeverity(severity: SubordinationCase['severity']) {
  if (severity === 'CRITICAL') return 7
  if (severity === 'HIGH') return 15
  if (severity === 'MEDIUM') return 30
  return 45
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
