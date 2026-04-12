import { NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withSuperAdmin(async (req) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200)
  const cursor = url.searchParams.get('cursor')

  const events = await prisma.auditLog.findMany({
    take: limit,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    orderBy: { createdAt: 'desc' },
    include: {
      organization: { select: { name: true } },
      user: { select: { email: true, firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId,
      ipAddress: e.ipAddress,
      createdAt: e.createdAt.toISOString(),
      organization: e.organization,
      user: e.user,
    })),
    nextCursor: events.length === limit ? events[events.length - 1].id : null,
  })
})
