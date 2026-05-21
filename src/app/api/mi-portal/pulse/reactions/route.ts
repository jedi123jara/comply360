import { NextResponse, type NextRequest } from 'next/server'
import { withWorkerAuth, type WorkerAuthContext } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import {
  isPulseReactionType,
  type PulseReactionType,
} from '@/lib/mi-portal/pulse'

export const dynamic = 'force-dynamic'

const REACTION_TYPES = ['APPLAUSE', 'THANKS', 'CELEBRATE'] as const satisfies PulseReactionType[]

function reactionBuckets(reactions: Array<{ type: string; workerId: string }>, workerId: string) {
  const counts: Record<PulseReactionType, number> = {
    APPLAUSE: 0,
    THANKS: 0,
    CELEBRATE: 0,
  }
  const mine: PulseReactionType[] = []

  reactions.forEach((reaction) => {
    if (!REACTION_TYPES.includes(reaction.type as PulseReactionType)) return
    const type = reaction.type as PulseReactionType
    counts[type] += 1
    if (reaction.workerId === workerId) mine.push(type)
  })

  return { counts, mine }
}

async function handleReaction(req: NextRequest, ctx: WorkerAuthContext) {
  const body = await req.json().catch(() => null) as { eventId?: unknown; type?: unknown } | null
  const eventId = typeof body?.eventId === 'string' ? body.eventId : ''
  const type = body?.type

  if (!eventId || !isPulseReactionType(type)) {
    return NextResponse.json({ error: 'Reacción inválida.' }, { status: 400 })
  }

  if (eventId.startsWith('computed-')) {
    return NextResponse.json(
      { error: 'Este logro todavía no admite reacciones persistentes.' },
      { status: 409 },
    )
  }

  const event = await prisma.workerPulseEvent.findFirst({
    where: {
      id: eventId,
      orgId: ctx.orgId,
      OR: [{ visibility: 'ORG' }, { visibility: 'TEAM' }, { workerId: ctx.workerId }],
    },
    select: { id: true },
  })

  if (!event) {
    return NextResponse.json({ error: 'Logro no disponible.' }, { status: 404 })
  }

  const existing = await prisma.workerPulseReaction.findFirst({
    where: { eventId, workerId: ctx.workerId, type },
    select: { id: true },
  })

  let active = true
  if (existing) {
    await prisma.workerPulseReaction.delete({ where: { id: existing.id } })
    active = false
  } else {
    await prisma.workerPulseReaction.create({
      data: {
        eventId,
        workerId: ctx.workerId,
        orgId: ctx.orgId,
        type,
      },
    })
  }

  const reactions = await prisma.workerPulseReaction.findMany({
    where: { eventId },
    select: { type: true, workerId: true },
  })
  const buckets = reactionBuckets(reactions, ctx.workerId)

  return NextResponse.json({
    ok: true,
    active,
    reactions: buckets.counts,
    myReactions: buckets.mine,
  })
}

const postAuthenticatedReaction = withWorkerAuth(handleReaction)

export async function POST(req: NextRequest, routeCtx?: unknown) {
  if (process.env.NODE_ENV === 'development' && req.nextUrl.searchParams.get('__workerPreview') === '1') {
    return NextResponse.json({
      ok: true,
      active: true,
      reactions: { APPLAUSE: 1, THANKS: 0, CELEBRATE: 0 },
      myReactions: ['APPLAUSE'],
    })
  }

  return postAuthenticatedReaction(req, routeCtx)
}
