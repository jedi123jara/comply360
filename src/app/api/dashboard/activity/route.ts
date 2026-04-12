import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/dashboard/activity - Activity counts per day (last 84 days)
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const daysBack = 84 // 12 weeks

  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  since.setHours(0, 0, 0, 0)

  const logs = await prisma.auditLog.groupBy({
    by: ['createdAt'],
    where: {
      orgId,
      createdAt: { gte: since },
    },
    _count: true,
  })

  // Build a date → count map
  const countMap = new Map<string, number>()
  for (const log of logs) {
    const dateStr = log.createdAt.toISOString().split('T')[0]
    countMap.set(dateStr, (countMap.get(dateStr) ?? 0) + log._count)
  }

  // Generate array for all days
  const days: { date: string; count: number; dayOfWeek: number }[] = []
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      count: countMap.get(dateStr) ?? 0,
      dayOfWeek: d.getDay(),
    })
  }

  return NextResponse.json({ data: days })
})
