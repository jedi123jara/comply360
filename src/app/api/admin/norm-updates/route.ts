/**
 * GET /api/admin/norm-updates
 *
 * List norm updates filtered by status.
 * Protected by SUPER_ADMIN role.
 *
 * Query params:
 *   ?status=PENDING_REVIEW | APPROVED | REJECTED  (default: PENDING_REVIEW)
 *   ?limit=50
 */

import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { NormStatus } from '@/generated/prisma/client'

const VALID_STATUSES: NormStatus[] = ['PENDING_REVIEW', 'APPROVED', 'REJECTED']

export const GET = withSuperAdmin(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const status = (searchParams.get('status') || 'PENDING_REVIEW') as NormStatus
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const [norms, counts] = await Promise.all([
    prisma.normUpdate.findMany({
      where: { status },
      orderBy: [{ impactLevel: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
    }),
    Promise.all(
      VALID_STATUSES.map(s =>
        prisma.normUpdate.count({ where: { status: s } }).then(count => ({ status: s, count }))
      )
    ),
  ])

  return NextResponse.json({
    data: norms,
    counts: Object.fromEntries(counts.map(c => [c.status, c.count])),
    total: norms.length,
  })
})
