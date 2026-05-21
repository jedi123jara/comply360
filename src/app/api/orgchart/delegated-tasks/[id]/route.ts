import { NextRequest, NextResponse } from 'next/server'
import { withPermissionParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const TASK_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'] as const
type TaskStatus = (typeof TASK_STATUSES)[number]

function isStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus)
}

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, max) : null
}

function parseDueAt(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  if (typeof value !== 'string') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export const PATCH = withPermissionParams<{ id: string }>('ORGCHART_EDIT', async (
  req: NextRequest,
  ctx,
  params,
) => {
  const existing = await prisma.orgDelegatedTask.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Tarea delegada no encontrada' }, { status: 404 })

  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })

  const data: {
    assigneeWorkerId?: string
    sourcePositionId?: string | null
    title?: string
    description?: string | null
    dueAt?: Date | null
    status?: TaskStatus
    evidenceUrl?: string | null
  } = {}

  const title = optionalText(body.title, 160)
  const description = optionalText(body.description, 4000)
  const assigneeWorkerId = optionalText(body.assigneeWorkerId, 120)
  const sourcePositionId = optionalText(body.sourcePositionId, 120)
  const evidenceUrl = optionalText(body.evidenceUrl, 2048)
  const dueAt = parseDueAt(body.dueAt)

  if (body.title !== undefined) {
    if (!title) return NextResponse.json({ error: 'title no puede estar vacío' }, { status: 400 })
    data.title = title
  }
  if (body.description !== undefined) data.description = description ?? null
  if (body.evidenceUrl !== undefined) data.evidenceUrl = evidenceUrl ?? null
  if (body.dueAt !== undefined) {
    if (dueAt === undefined) return NextResponse.json({ error: 'dueAt inválido' }, { status: 400 })
    data.dueAt = dueAt
  }
  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return NextResponse.json({ error: `status inválido. Use: ${TASK_STATUSES.join(', ')}` }, { status: 400 })
    }
    data.status = body.status
  }

  if (body.assigneeWorkerId !== undefined) {
    if (!assigneeWorkerId) return NextResponse.json({ error: 'assigneeWorkerId no puede estar vacío' }, { status: 400 })
    const worker = await prisma.worker.findFirst({
      where: { id: assigneeWorkerId, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!worker) return NextResponse.json({ error: 'Trabajador asignado no existe' }, { status: 400 })
    data.assigneeWorkerId = assigneeWorkerId
  }

  if (body.sourcePositionId !== undefined) {
    if (sourcePositionId) {
      const position = await prisma.orgPosition.findFirst({
        where: { id: sourcePositionId, orgId: ctx.orgId },
        select: { id: true },
      })
      if (!position) return NextResponse.json({ error: 'Cargo origen no existe' }, { status: 400 })
      data.sourcePositionId = sourcePositionId
    } else {
      data.sourcePositionId = null
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No hay cambios válidos' }, { status: 400 })
  }

  const task = await prisma.orgDelegatedTask.update({
    where: { id: params.id },
    data,
  })

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.delegated_task.updated',
      entityType: 'OrgDelegatedTask',
      entityId: task.id,
      metadataJson: data as object,
    },
  }).catch(() => null)

  return NextResponse.json({ task })
})

export const DELETE = withPermissionParams<{ id: string }>('ORGCHART_EDIT', async (
  _req: NextRequest,
  ctx,
  params,
) => {
  const existing = await prisma.orgDelegatedTask.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!existing) return NextResponse.json({ error: 'Tarea delegada no encontrada' }, { status: 404 })

  const task = await prisma.orgDelegatedTask.update({
    where: { id: params.id },
    data: { status: 'CANCELLED' },
  })

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.delegated_task.cancelled',
      entityType: 'OrgDelegatedTask',
      entityId: task.id,
      metadataJson: { status: task.status } as object,
    },
  }).catch(() => null)

  return NextResponse.json({ task })
})
