import { NextResponse, type NextRequest } from 'next/server'
import { withWorkerAuth, type WorkerAuthContext } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  isPulseKudoType,
  kudoCopy,
} from '@/lib/mi-portal/pulse'

export const dynamic = 'force-dynamic'

function displayName(worker: { firstName: string; lastName: string }) {
  return `${worker.firstName} ${worker.lastName}`.trim()
}

async function handleKudo(req: NextRequest, ctx: WorkerAuthContext) {
  const body = await req.json().catch(() => null) as { targetWorkerId?: unknown; kudoType?: unknown } | null
  const targetWorkerId = typeof body?.targetWorkerId === 'string' ? body.targetWorkerId : ''
  const kudoType = body?.kudoType

  if (!targetWorkerId || !isPulseKudoType(kudoType)) {
    return NextResponse.json({ error: 'Kudo inválido.' }, { status: 400 })
  }

  if (targetWorkerId === ctx.workerId) {
    return NextResponse.json({ error: 'El reconocimiento debe ser para otro compañero.' }, { status: 400 })
  }

  const [sender, target] = await Promise.all([
    prisma.worker.findFirst({
      where: { id: ctx.workerId, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.worker.findFirst({
      where: { id: targetWorkerId, orgId: ctx.orgId, status: { not: 'TERMINATED' }, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, position: true },
    }),
  ])

  if (!sender || !target) {
    return NextResponse.json({ error: 'Compañero no disponible para kudos.' }, { status: 404 })
  }

  const copy = kudoCopy[kudoType]
  const title = `${displayName(target)} ${copy.title}`
  const duplicate = await prisma.workerPulseEvent.findFirst({
    where: {
      orgId: ctx.orgId,
      workerId: target.id,
      actorWorkerId: sender.id,
      type: 'KUDO',
      title,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    select: { id: true },
  })

  if (duplicate) {
    return NextResponse.json({ error: 'Ya enviaste este kudo hoy.' }, { status: 409 })
  }

  const event = await prisma.workerPulseEvent.create({
    data: {
      orgId: ctx.orgId,
      workerId: target.id,
      actorWorkerId: sender.id,
      type: 'KUDO',
      visibility: 'ORG',
      title,
      description: copy.description,
      icon: copy.icon,
      tone: copy.tone,
      metadata: { kudoType },
    },
    include: {
      worker: { select: { firstName: true, lastName: true } },
      actorWorker: { select: { firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({
    ok: true,
    event: {
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      workerName: event.worker ? displayName(event.worker) : displayName(target),
      actorName: event.actorWorker ? displayName(event.actorWorker) : displayName(sender),
      icon: event.icon,
      tone: event.tone,
      createdAt: event.createdAt.toISOString(),
      reactions: { APPLAUSE: 0, THANKS: 0, CELEBRATE: 0 },
      myReactions: [],
      isReactable: true,
    },
  })
}

const postAuthenticatedKudo = withWorkerAuth(handleKudo)

export async function POST(req: NextRequest, routeCtx?: unknown) {
  if (process.env.NODE_ENV === 'development' && req.nextUrl.searchParams.get('__workerPreview') === '1') {
    const body = await req.json().catch(() => null) as { kudoType?: unknown; targetWorkerId?: unknown } | null
    const kudoType = isPulseKudoType(body?.kudoType) ? body.kudoType : 'APOYO_EQUIPO'
    const copy = kudoCopy[kudoType]
    const targetName = body?.targetWorkerId === 'preview-worker-carlos'
      ? 'Carlos Rojas'
      : body?.targetWorkerId === 'preview-worker-ana'
        ? 'Ana Torres'
        : 'María Flores'
    const now = new Date().toISOString()
    return NextResponse.json({
      ok: true,
      event: {
        id: `preview-kudo-${Date.now()}`,
        type: 'KUDO',
        title: `${targetName} ${copy.title}`,
        description: copy.description,
        workerName: targetName,
        actorName: 'Ronald Pérez',
        icon: copy.icon,
        tone: copy.tone,
        createdAt: now,
        reactions: { APPLAUSE: 0, THANKS: 0, CELEBRATE: 0 },
        myReactions: [],
        isReactable: true,
      },
    })
  }

  return postAuthenticatedKudo(req, routeCtx)
}
