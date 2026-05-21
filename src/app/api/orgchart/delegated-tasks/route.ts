import { NextRequest, NextResponse } from 'next/server'
import { withPermission } from '@/lib/api-auth'
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

export const GET = withPermission('ORGCHART_VIEW', async (req: NextRequest, ctx) => {
  const status = req.nextUrl.searchParams.get('status')
  const assigneeWorkerId = req.nextUrl.searchParams.get('assigneeWorkerId')

  if (status && !isStatus(status)) {
    return NextResponse.json({ error: `status inválido. Use: ${TASK_STATUSES.join(', ')}` }, { status: 400 })
  }

  const tasks = await prisma.orgDelegatedTask.findMany({
    where: {
      orgId: ctx.orgId,
      ...(status ? { status } : {}),
      ...(assigneeWorkerId ? { assigneeWorkerId } : {}),
    },
    orderBy: [{ status: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  })

  return NextResponse.json({ tasks })
})

export const POST = withPermission('ORGCHART_EDIT', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })

  const title = optionalText(body.title, 160)
  const description = optionalText(body.description, 4000)
  const assigneeWorkerId = optionalText(body.assigneeWorkerId, 120)
  const sourcePositionId = optionalText(body.sourcePositionId, 120)
  const evidenceUrl = optionalText(body.evidenceUrl, 2048)
  const dueAt = parseDueAt(body.dueAt)
  const status = body.status === undefined ? 'OPEN' : body.status

  if (!title) return NextResponse.json({ error: 'title es requerido' }, { status: 400 })
  if (!assigneeWorkerId) return NextResponse.json({ error: 'assigneeWorkerId es requerido' }, { status: 400 })
  if (dueAt === undefined) return NextResponse.json({ error: 'dueAt inválido' }, { status: 400 })
  if (!isStatus(status)) {
    return NextResponse.json({ error: `status inválido. Use: ${TASK_STATUSES.join(', ')}` }, { status: 400 })
  }

  const [assignee, sourcePosition] = await Promise.all([
    prisma.worker.findFirst({ where: { id: assigneeWorkerId, orgId: ctx.orgId }, select: { id: true } }),
    sourcePositionId
      ? prisma.orgPosition.findFirst({ where: { id: sourcePositionId, orgId: ctx.orgId }, select: { id: true } })
      : Promise.resolve(null),
  ])

  if (!assignee) return NextResponse.json({ error: 'Trabajador asignado no existe' }, { status: 400 })
  if (sourcePositionId && !sourcePosition) {
    return NextResponse.json({ error: 'Cargo origen no existe' }, { status: 400 })
  }

  const task = await prisma.orgDelegatedTask.create({
    data: {
      orgId: ctx.orgId,
      creatorUserId: ctx.userId,
      assigneeWorkerId,
      sourcePositionId,
      title,
      description,
      dueAt,
      status,
      evidenceUrl,
    },
  })

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.delegated_task.created',
      entityType: 'OrgDelegatedTask',
      entityId: task.id,
      metadataJson: { assigneeWorkerId, sourcePositionId, status } as object,
    },
  }).catch(() => null)

  return NextResponse.json({ task }, { status: 201 })
})
