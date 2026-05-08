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

export const runtime = 'nodejs'

type Source = 'task' | 'alert' | 'training'
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface PlanItem {
  id: string
  source: Source
  sourceLabel: string
  severity: Severity
  area: string
  title: string
  description: string | null
  dueDate: string | null
  multaEvitable: number | null
  link: string
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

    // 1. ComplianceTask abiertas
    if (!sourceFilter || sourceFilter === 'task') {
      const tasks = await prisma.complianceTask.findMany({
        where: {
          orgId: ctx.orgId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
        take: limit,
      })
      for (const t of tasks) {
        items.push({
          id: `task:${t.id}`,
          source: 'task',
          sourceLabel: 'Tarea de compliance',
          severity: GRAVEDAD_TO_SEVERITY[t.gravedad] ?? 'MEDIUM',
          area: t.area,
          title: t.title,
          description: t.description,
          dueDate: t.dueDate?.toISOString() ?? null,
          multaEvitable: t.multaEvitable ? Number(t.multaEvitable) : null,
          link: `/dashboard/tareas?focus=${t.id}`,
        })
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
        items.push({
          id: `alert:${a.id}`,
          source: 'alert',
          sourceLabel: 'Alerta',
          severity: ALERT_SEVERITY[a.severity] ?? 'MEDIUM',
          area: a.type,
          title: a.title,
          description: a.description ?? null,
          dueDate: a.dueDate?.toISOString() ?? null,
          multaEvitable: a.multaEstimada ? Number(a.multaEstimada) : null,
          link: `/dashboard/alertas?focus=${a.id}`,
          workerName,
        })
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
        items.push({
          id: `training:${e.id}`,
          source: 'training',
          sourceLabel: 'Capacitación obligatoria',
          severity,
          area: e.course.category,
          title: `Capacitación pendiente: ${e.course.title}`,
          description: `${daysOverdue} días desde asignación · ${e.workerName ?? 'Sin trabajador'}`,
          dueDate: null,
          multaEvitable: null,
          link: `/dashboard/capacitaciones/${e.course.slug}`,
          workerName: e.workerName ?? undefined,
        })
      }
    }

    // Filtro adicional por severidad
    let filtered = items
    if (severityFilter) {
      filtered = items.filter((i) => i.severity === severityFilter)
    }

    // Stats agregadas (sobre el set completo, no sobre el filtrado)
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
