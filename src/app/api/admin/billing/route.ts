import { NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const PLAN_PRICE: Record<string, number> = {
  FREE: 0,
  STARTER: 99,
  EMPRESA: 299,
  PRO: 799,
}

export const GET = withSuperAdmin(async () => {
  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const next30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [activeSubs, pastDue, cancelledLast30, newLast30, byPlanGroup, recent] = await Promise.all([
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    prisma.subscription.count({ where: { status: 'CANCELLED', cancelledAt: { gte: last30 } } }),
    prisma.subscription.count({ where: { createdAt: { gte: last30 } } }),
    prisma.subscription.groupBy({
      by: ['plan'],
      _count: { _all: true },
      where: { status: 'ACTIVE' },
    }),
    prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { lte: next30 },
      },
      orderBy: { currentPeriodEnd: 'asc' },
      take: 15,
      include: { organization: { select: { name: true } } },
    }),
  ])

  const byPlan = byPlanGroup.map((g) => ({
    plan: g.plan,
    count: g._count._all,
    mrr: (PLAN_PRICE[g.plan] || 0) * g._count._all,
  }))

  const mrr = byPlan.reduce((sum, p) => sum + p.mrr, 0)
  const arr = mrr * 12

  return NextResponse.json({
    mrr,
    arr,
    activeSubscriptions: activeSubs,
    pastDue,
    cancelledLast30,
    newLast30,
    byPlan,
    recentSubscriptions: recent.map((s) => ({
      id: s.id,
      orgName: s.organization.name,
      plan: s.plan,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd.toISOString(),
    })),
  })
})
