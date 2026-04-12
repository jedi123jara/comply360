/**
 * GET /api/workers/[id]/history
 *
 * Returns the audit-log trail for a specific worker (entityType = 'Worker', entityId = workerId).
 * Protected by withAuthParams — org isolation is enforced.
 *
 * Query params:
 *   page     — page number (default 1)
 *   pageSize — items per page (default 20, max 50)
 *
 * Response:
 *   { data: HistoryEntry[], total: number, page: number, pageSize: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

export const GET = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const { id: workerId } = params
  const orgId = ctx.orgId

  // Verify the worker belongs to the org
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId },
    select: { id: true },
  })
  if (!worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') ?? '20', 10)))
  const skip = (page - 1) * pageSize

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { orgId, entityType: 'Worker', entityId: workerId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadataJson: true,
        ipAddress: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    prisma.auditLog.count({
      where: { orgId, entityType: 'Worker', entityId: workerId },
    }),
  ])

  return NextResponse.json({
    data: entries.map(e => ({
      id: e.id,
      action: e.action,
      userId: e.userId,
      userName: e.user
        ? [e.user.firstName, e.user.lastName].filter(Boolean).join(' ') || e.user.email
        : null,
      metadata: e.metadataJson,
      createdAt: e.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  })
})
