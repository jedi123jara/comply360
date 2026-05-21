/**
 * /api/compliance-tasks
 *
 * GET    — Lista tasks del org, con filtros opcionales (status, area, gravedad).
 * POST   — Crea task manual o idempotente desde un hallazgo con sourceId.
 * PATCH  — Actualiza una task: cambiar status, asignar, adjuntar evidencia.
 *
 * Las tasks se generan automáticamente al correr diagnostico/simulacro
 * (ver src/lib/compliance/task-spawner.ts).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import type {
  ComplianceTaskStatus,
  InfracGravedad,
  Prisma,
} from '@/generated/prisma/client'

export const runtime = 'nodejs'

const VALID_STATUS: ComplianceTaskStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED']
const VALID_GRAVEDAD: InfracGravedad[] = ['LEVE', 'GRAVE', 'MUY_GRAVE']
const TASK_INCLUDE = {
  evidences: {
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
}

type ComplianceTaskPayload = Prisma.ComplianceTaskGetPayload<{ include: typeof TASK_INCLUDE }>

function serializeTask(task: ComplianceTaskPayload) {
  return {
    ...task,
    multaEvitable: task.multaEvitable ? Number(task.multaEvitable) : null,
    evidences: task.evidences.map((evidence) => ({
      ...evidence,
      createdAt: evidence.createdAt,
      updatedAt: evidence.updatedAt,
    })),
  }
}

/* ── GET ───────────────────────────────────────────────────────────── */

export const GET = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const statusParam = searchParams.get('status') // CSV "PENDING,IN_PROGRESS" opcional
    const gravedad = searchParams.get('gravedad')
    const area = searchParams.get('area')
    const diagnosticId = searchParams.get('diagnosticId')

    const where: Prisma.ComplianceTaskWhereInput = { orgId: ctx.orgId }

    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is ComplianceTaskStatus => VALID_STATUS.includes(s as ComplianceTaskStatus))
      if (statuses.length > 0) where.status = { in: statuses }
    }
    if (gravedad && VALID_GRAVEDAD.includes(gravedad as InfracGravedad)) {
      where.gravedad = gravedad as InfracGravedad
    }
    if (area) where.area = area
    if (diagnosticId) where.diagnosticId = diagnosticId

    const tasks = await prisma.complianceTask.findMany({
      where,
      include: TASK_INCLUDE,
      orderBy: [
        { status: 'asc' },      // PENDING/IN_PROGRESS primero
        { priority: 'asc' },    // 1 = más urgente
        { dueDate: 'asc' },
      ],
      take: 200,
    })

    // Aggregate counts por status para badges en UI
    const counts = await prisma.complianceTask.groupBy({
      by: ['status'],
      where: { orgId: ctx.orgId },
      _count: true,
    })
    const countsByStatus = Object.fromEntries(
      VALID_STATUS.map((s) => [s, counts.find((c) => c.status === s)?._count ?? 0])
    )

    return NextResponse.json({
      tasks: tasks.map(serializeTask),
      countsByStatus,
    })
  } catch (error) {
    console.error('[compliance-tasks GET]', error)
    return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
  }
})

/* ── POST ──────────────────────────────────────────────────────────── */

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { title, area, description, baseLegal, gravedad, multaEvitable, dueDate, priority, sourceId, plazoSugerido } = body as {
      title?: string
      area?: string
      description?: string
      baseLegal?: string
      gravedad?: string
      multaEvitable?: number
      dueDate?: string
      priority?: number
      sourceId?: string
      plazoSugerido?: string
    }
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'title es requerido' }, { status: 400 })
    }
    if (!area || typeof area !== 'string') {
      return NextResponse.json({ error: 'area es requerido' }, { status: 400 })
    }

    const gravedadValue = gravedad && VALID_GRAVEDAD.includes(gravedad as InfracGravedad)
      ? (gravedad as InfracGravedad)
      : 'LEVE'

    const normalizedSourceId = typeof sourceId === 'string' && sourceId.trim().length > 0
      ? sourceId.trim().slice(0, 255)
      : null

    if (normalizedSourceId) {
      const existing = await prisma.complianceTask.findFirst({
        where: {
          orgId: ctx.orgId,
          sourceId: normalizedSourceId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
        include: TASK_INCLUDE,
      })
      if (existing) {
        return NextResponse.json({
          task: serializeTask(existing),
          deduped: true,
        })
      }
    }

    const task = await prisma.complianceTask.create({
      data: {
        orgId: ctx.orgId,
        sourceId: normalizedSourceId,
        area,
        title: title.slice(0, 255),
        description: description ?? null,
        baseLegal: baseLegal ?? null,
        gravedad: gravedadValue,
        multaEvitable: multaEvitable ?? null,
        priority: priority ?? 999,
        plazoSugerido: plazoSugerido ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
      include: TASK_INCLUDE,
    })
    return NextResponse.json({
      task: serializeTask(task),
    }, { status: 201 })
  } catch (error) {
    console.error('[compliance-tasks POST]', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
})

/* ── PATCH ─────────────────────────────────────────────────────────── */

export const PATCH = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const {
      id,
      status,
      evidenceUrl,
      notes,
      assignedTo,
      dueDate,
    } = body as {
      id?: string
      status?: string
      evidenceUrl?: string | null
      notes?: string | null
      assignedTo?: string | null
      dueDate?: string | null
    }

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    // Verifica ownership antes de editar (defense in depth).
    const existing = await prisma.complianceTask.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, status: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Task no encontrada' }, { status: 404 })
    }

    const data: Prisma.ComplianceTaskUpdateInput = {}
    if (status && VALID_STATUS.includes(status as ComplianceTaskStatus)) {
      data.status = status as ComplianceTaskStatus
      if (status === 'COMPLETED' && existing.status !== 'COMPLETED') {
        data.completedAt = new Date()
        data.completedBy = ctx.userId
      } else if (status !== 'COMPLETED') {
        data.completedAt = null
        data.completedBy = null
      }
    }
    if (evidenceUrl !== undefined) data.evidenceUrl = evidenceUrl
    if (notes !== undefined) data.notes = notes
    if (assignedTo !== undefined) data.assignedTo = assignedTo
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null

    const updated = await prisma.complianceTask.update({
      where: { id },
      data,
      include: TASK_INCLUDE,
    })
    return NextResponse.json({
      task: serializeTask(updated),
    })
  } catch (error) {
    console.error('[compliance-tasks PATCH]', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
})

