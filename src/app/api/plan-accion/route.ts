/**
 * /api/plan-accion
 *
 * GET — Agrega tareas accionables de múltiples fuentes en una vista unificada:
 *   - ComplianceTask (PENDING / IN_PROGRESS) → resultado de diagnóstico/simulacro
 *   - WorkerAlert (no resueltas) → alertas críticas del alert engine
 *   - Enrollment de cursos obligatorios incompletos > 30 días → capacitaciones vencidas
 *
 * Esta es la fuente de verdad del módulo Plan de Acción (Fase 1). Los wizards
 * de Decisiones Laborales (Fase 2+) consumen este mismo endpoint.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import type { Prisma } from '@/generated/prisma/client'
import { resolveTaskRoute } from '@/lib/compliance/task-route-resolver'
import {
  classifyActionLane,
  computeActionRiskScore,
  evidenceGoalForAction,
  nextActionForAction,
  type ActionPlanLane,
} from '@/lib/compliance/action-plan'

export const runtime = 'nodejs'

type Source = 'task' | 'alert' | 'training'
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface PlanItem {
  id: string
  source: Source
  entityId: string
  sourceId: string | null
  sourceLabel: string
  severity: Severity
  area: string
  title: string
  description: string | null
  dueDate: string | null
  multaEvitable: number | null
  link: string
  routeHref: string
  routeLabel: string
  riskScore: number
  daysLeft: number | null
  lane: ActionPlanLane
  evidenceGoal: string
  nextAction: string
  status?: string
  assignedTo?: string | null
  notes?: string | null
  evidenceUrl?: string | null
  evidenceCount?: number
  completedAt?: string | null
  /** Si es tarea de un worker específico, su nombre para mostrar */
  workerName?: string
}

const GRAVEDAD_TO_SEVERITY: Record<string, Severity> = {
  MUY_GRAVE: 'CRITICAL',
  GRAVE: 'HIGH',
  LEVE: 'MEDIUM',
}

const ALERT_SEVERITY: Record<string, Severity> = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
}

/** Capacitaciones obligatorias se consideran vencidas si > 30 días sin completar */
const TRAINING_OVERDUE_DAYS = 30

interface PlanEvidenceInput {
  title?: string
  fileName?: string
  fileUrl?: string
  storagePath?: string
  bucket?: string
  mimeType?: string
  sizeBytes?: number
  hashSha256?: string
}

export const GET = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const sourceFilter = searchParams.get('source') as Source | null
    const severityFilter = searchParams.get('severity') as Severity | null
    const limitParam = Number(searchParams.get('limit') ?? 200)
    const limit = Math.min(Math.max(limitParam, 5), 500)

    const items: PlanItem[] = []
    const now = new Date()
    const overdueThreshold = new Date(now)
    overdueThreshold.setDate(overdueThreshold.getDate() - TRAINING_OVERDUE_DAYS)

    const enrich = (item: Omit<PlanItem, 'riskScore' | 'daysLeft' | 'lane' | 'evidenceGoal' | 'nextAction'>): PlanItem => {
      const riskScore = computeActionRiskScore({
        severity: item.severity,
        dueDate: item.dueDate,
        multaEvitable: item.multaEvitable,
        source: item.source,
      }, now)
      const lane = classifyActionLane({ severity: item.severity, dueDate: item.dueDate }, now)
      return {
        ...item,
        riskScore,
        daysLeft: item.dueDate
          ? Math.ceil((new Date(item.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null,
        lane,
        evidenceGoal: evidenceGoalForAction(item),
        nextAction: nextActionForAction(item),
      }
    }

    // 1. ComplianceTask abiertas
    if (!sourceFilter || sourceFilter === 'task') {
      const tasks = await prisma.complianceTask.findMany({
        where: {
          orgId: ctx.orgId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: {
          _count: {
            select: { evidences: true },
          },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: limit,
      })
      for (const t of tasks) {
        const route = resolveTaskRoute({ sourceId: t.sourceId, area: t.area })
        items.push(enrich({
          id: `task:${t.id}`,
          source: 'task',
          entityId: t.id,
          sourceId: t.sourceId,
          sourceLabel: 'Tarea de compliance',
          severity: GRAVEDAD_TO_SEVERITY[t.gravedad] ?? 'MEDIUM',
          area: t.area,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate?.toISOString() ?? null,
          multaEvitable: t.multaEvitable ? Number(t.multaEvitable) : null,
          link: `/dashboard/tareas?focus=${t.id}`,
          routeHref: route?.href ?? `/dashboard/tareas?focus=${t.id}`,
          routeLabel: route?.label ?? 'Abrir tarea',
          status: t.status,
          assignedTo: t.assignedTo,
          notes: t.notes,
          evidenceUrl: t.evidenceUrl,
          evidenceCount: t._count.evidences + (t.evidenceUrl ? 1 : 0),
          completedAt: t.completedAt?.toISOString() ?? null,
        }))
      }
    }

    // 2. WorkerAlert sin resolver
    if (!sourceFilter || sourceFilter === 'alert') {
      const alerts = await prisma.workerAlert.findMany({
        where: { orgId: ctx.orgId, resolvedAt: null },
        orderBy: [{ severity: 'desc' }, { dueDate: 'asc' }],
        take: limit,
        include: {
          worker: {
            select: { firstName: true, lastName: true },
          },
        },
      })
      for (const a of alerts) {
        const workerName = a.worker
          ? `${a.worker.firstName} ${a.worker.lastName}`.trim()
          : undefined
        items.push(enrich({
          id: `alert:${a.id}`,
          source: 'alert',
          entityId: a.id,
          sourceId: a.id,
          sourceLabel: 'Alerta',
          severity: ALERT_SEVERITY[a.severity] ?? 'MEDIUM',
          area: a.type,
          title: a.title,
          description: a.description ?? null,
          dueDate: a.dueDate?.toISOString() ?? null,
          multaEvitable: a.multaEstimada ? Number(a.multaEstimada) : null,
          link: `/dashboard/alertas?focus=${a.id}`,
          routeHref: `/dashboard/alertas?focus=${a.id}`,
          routeLabel: 'Resolver alerta',
          workerName,
        }))
      }
    }

    // 3. Capacitaciones obligatorias vencidas (> 30 días sin completar)
    // Estados "no completados" en este schema: NOT_STARTED, IN_PROGRESS,
    // EXAM_PENDING, FAILED. PASSED es el único estado terminal positivo.
    if (!sourceFilter || sourceFilter === 'training') {
      const overdueTrainings = await prisma.enrollment.findMany({
        where: {
          orgId: ctx.orgId,
          status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING', 'FAILED'] },
          createdAt: { lt: overdueThreshold },
          course: { isObligatory: true, isActive: true },
        },
        include: {
          course: true,
        },
        orderBy: { createdAt: 'asc' },
        take: limit,
      })
      for (const e of overdueTrainings) {
        const daysOverdue = Math.floor(
          (now.getTime() - e.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )
        // Severidad escala con antigüedad: 30-60 días MEDIUM, 60-90 HIGH, >90 CRITICAL
        const severity: Severity =
          daysOverdue > 90 ? 'CRITICAL' : daysOverdue > 60 ? 'HIGH' : 'MEDIUM'
        items.push(enrich({
          id: `training:${e.id}`,
          source: 'training',
          entityId: e.id,
          sourceId: e.id,
          sourceLabel: 'Capacitación obligatoria',
          severity,
          area: e.course.category,
          title: `Capacitación pendiente: ${e.course.title}`,
          description: `${daysOverdue} días desde asignación · ${e.workerName ?? 'Sin trabajador'}`,
          dueDate: null,
          multaEvitable: null,
          link: `/dashboard/capacitaciones/${e.course.slug}`,
          routeHref: `/dashboard/capacitaciones/${e.course.slug}`,
          routeLabel: 'Abrir capacitación',
          workerName: e.workerName ?? undefined,
        }))
      }
    }

    // Filtro adicional por severidad
    let filtered = items
    if (severityFilter) {
      filtered = items.filter((i) => i.severity === severityFilter)
    }

    filtered.sort((a, b) => {
      if (b.riskScore !== a.riskScore) return b.riskScore - a.riskScore
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY
      if (aDue !== bDue) return aDue - bDue
      return (b.multaEvitable ?? 0) - (a.multaEvitable ?? 0)
    })

    // Stats agregadas (sobre el set completo, no sobre el filtrado)
    const nextDue = items
      .filter((i) => i.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())[0]?.dueDate ?? null
    const stats = {
      total: items.length,
      critical: items.filter((i) => i.severity === 'CRITICAL').length,
      overdue: items.filter(
        (i) => i.dueDate && new Date(i.dueDate).getTime() < now.getTime()
      ).length,
      byCategory: {
        tasks: items.filter((i) => i.source === 'task').length,
        alerts: items.filter((i) => i.source === 'alert').length,
        trainings: items.filter((i) => i.source === 'training').length,
      },
      bySeverity: {
        critical: items.filter((i) => i.severity === 'CRITICAL').length,
        high: items.filter((i) => i.severity === 'HIGH').length,
        medium: items.filter((i) => i.severity === 'MEDIUM').length,
        low: items.filter((i) => i.severity === 'LOW').length,
      },
      byLane: {
        today: items.filter((i) => i.lane === 'today').length,
        week: items.filter((i) => i.lane === 'week').length,
        month: items.filter((i) => i.lane === 'month').length,
        backlog: items.filter((i) => i.lane === 'backlog').length,
      },
      nextDueDate: nextDue,
      topExposure: items
        .filter((i) => (i.multaEvitable ?? 0) > 0)
        .sort((a, b) => (b.multaEvitable ?? 0) - (a.multaEvitable ?? 0))
        .slice(0, 3)
        .map((i) => ({
          id: i.id,
          title: i.title,
          multaEvitable: i.multaEvitable,
          routeHref: i.routeHref,
        })),
      multaEvitableTotal: items.reduce(
        (acc, i) => acc + (i.multaEvitable ?? 0),
        0
      ),
    }

    return NextResponse.json({ items: filtered, stats })
  } catch (error) {
    console.error('[plan-accion GET]', error)
    return NextResponse.json(
      { error: 'Error al cargar plan de acción' },
      { status: 500 }
    )
  }
})

export const PATCH = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { source, entityId, notes, evidence } = body as {
      source?: Source
      entityId?: string
      notes?: string | null
      evidence?: PlanEvidenceInput | null
    }

    if (!source || !entityId) {
      return NextResponse.json({ error: 'source y entityId son requeridos' }, { status: 400 })
    }

    if (source !== 'alert' && source !== 'training') {
      return NextResponse.json({ error: 'Solo alertas y capacitaciones se cierran desde este endpoint' }, { status: 400 })
    }

    if (!evidence?.fileUrl) {
      return NextResponse.json({ error: 'Adjunta evidencia antes de cerrar esta acción' }, { status: 400 })
    }

    if (source === 'alert') {
      const alert = await prisma.workerAlert.findFirst({
        where: { id: entityId, orgId: ctx.orgId },
        include: { worker: { select: { firstName: true, lastName: true } } },
      })
      if (!alert) return NextResponse.json({ error: 'Alerta no encontrada' }, { status: 404 })

      const task = await ensurePlanEvidenceTask(ctx, {
        source,
        entityId,
        title: `Cierre de alerta: ${alert.title}`,
        description: alert.description ?? `Alerta ${alert.type} resuelta desde Plan de acción`,
        area: String(alert.type).toLowerCase(),
        gravedad: alert.severity === 'CRITICAL' ? 'MUY_GRAVE' : alert.severity === 'HIGH' ? 'GRAVE' : 'LEVE',
        multaEvitable: alert.multaEstimada ? Number(alert.multaEstimada) : null,
        notes,
        evidence,
      })

      await prisma.workerAlert.update({
        where: { id: alert.id },
        data: { resolvedAt: new Date(), resolvedBy: ctx.userId ?? 'plan-accion' },
      })

      return NextResponse.json({
        ok: true,
        source,
        entityId,
        taskId: task.id,
        message: 'Alerta cerrada con evidencia.',
      })
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { id: entityId, orgId: ctx.orgId },
      include: { course: { select: { title: true, category: true, passingScore: true } } },
    })
    if (!enrollment) return NextResponse.json({ error: 'Capacitación no encontrada' }, { status: 404 })

    const task = await ensurePlanEvidenceTask(ctx, {
      source,
      entityId,
      title: `Cierre de capacitación: ${enrollment.course.title}`,
      description: `${enrollment.workerName ?? 'Trabajador'} completó capacitación obligatoria con evidencia externa.`,
      area: `capacitacion_${String(enrollment.course.category).toLowerCase()}`,
      gravedad: 'GRAVE',
      multaEvitable: null,
      notes,
      evidence,
    })

    await prisma.enrollment.update({
      where: { id: enrollment.id },
      data: {
        status: 'PASSED',
        progress: 100,
        startedAt: enrollment.startedAt ?? new Date(),
        completedAt: new Date(),
        examScore: enrollment.examScore ?? enrollment.course.passingScore,
      },
    })

    return NextResponse.json({
      ok: true,
      source,
      entityId,
      taskId: task.id,
      message: 'Capacitación cerrada con evidencia externa.',
    })
  } catch (error) {
    console.error('[plan-accion PATCH]', error)
    return NextResponse.json({ error: 'Error al cerrar acción del plan' }, { status: 500 })
  }
})

async function ensurePlanEvidenceTask(
  ctx: AuthContext,
  input: {
    source: Source
    entityId: string
    title: string
    description: string
    area: string
    gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
    multaEvitable: number | null
    notes?: string | null
    evidence: PlanEvidenceInput
  },
) {
  const sourceId = `plan-action:${input.source}:${input.entityId}`
  const now = new Date()
  const existing = await prisma.complianceTask.findFirst({
    where: { orgId: ctx.orgId, sourceId },
    select: { id: true, evidenceUrl: true },
  })

  const task = existing
    ? await prisma.complianceTask.update({
        where: { id: existing.id },
        data: {
          status: 'IN_PROGRESS',
          notes: trimOrNull(input.notes, 4000),
          assignedTo: 'Plan anti-multas',
          dueDate: now,
          updatedAt: now,
        } as Prisma.ComplianceTaskUpdateInput,
        select: { id: true, evidenceUrl: true },
      })
    : await prisma.complianceTask.create({
        data: {
          orgId: ctx.orgId,
          sourceId,
          area: input.area.slice(0, 80),
          priority: input.gravedad === 'MUY_GRAVE' ? 1 : input.gravedad === 'GRAVE' ? 5 : 20,
          title: input.title.slice(0, 255),
          description: input.description,
          baseLegal: null,
          gravedad: input.gravedad,
          multaEvitable: input.multaEvitable,
          plazoSugerido: 'Cierre desde Plan anti-multas',
          dueDate: now,
          assignedTo: 'Plan anti-multas',
          notes: trimOrNull(input.notes, 4000),
        },
        select: { id: true, evidenceUrl: true },
      })

  const evidence = await prisma.complianceTaskEvidence.create({
    data: {
      orgId: ctx.orgId,
      taskId: task.id,
      sourceId,
      title: trimOrNull(input.evidence.title, 180) ?? input.title.slice(0, 180),
      fileName: trimOrNull(input.evidence.fileName, 220),
      fileUrl: input.evidence.fileUrl!.trim(),
      storagePath: trimOrNull(input.evidence.storagePath, 500),
      bucket: trimOrNull(input.evidence.bucket, 80),
      mimeType: trimOrNull(input.evidence.mimeType, 120),
      sizeBytes: Number.isFinite(input.evidence.sizeBytes) ? Math.max(0, Math.round(input.evidence.sizeBytes ?? 0)) : null,
      hashSha256: trimOrNull(input.evidence.hashSha256, 80),
      notes: trimOrNull(input.notes, 4000),
      uploadedBy: ctx.userId,
    },
  })

  await prisma.complianceTask.update({
    where: { id: task.id },
    data: {
      status: 'COMPLETED',
      evidenceUrl: task.evidenceUrl ?? evidence.fileUrl,
      completedAt: now,
      completedBy: ctx.userId,
      notes: trimOrNull(input.notes, 4000),
    },
  })

  return task
}

function trimOrNull(value: string | null | undefined, max: number) {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}
