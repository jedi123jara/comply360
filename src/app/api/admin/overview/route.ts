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

  const [
    totalOrgs,
    totalUsers,
    totalWorkers,
    activeSubs,
    newOrgsLast30,
    newUsersLast30,
    planGrouping,
    recentSignups,
    pastDueSubs,
    failedPayments,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count(),
    prisma.worker.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.organization.count({ where: { createdAt: { gte: last30 } } }),
    prisma.user.count({ where: { createdAt: { gte: last30 } } }),
    prisma.organization.groupBy({
      by: ['plan'],
      _count: { _all: true },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, plan: true, createdAt: true, sizeRange: true },
    }),
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    0, // placeholder — failed payments would come from billing provider
  ])

  // Calculate MRR
  const subsByPlan = await prisma.subscription.groupBy({
    by: ['plan'],
    _count: { _all: true },
    where: { status: 'ACTIVE' },
  })
  const mrr = subsByPlan.reduce((sum, g) => sum + (PLAN_PRICE[g.plan] || 0) * g._count._all, 0)

  return NextResponse.json({
    totals: {
      organizations: totalOrgs,
      users: totalUsers,
      workers: totalWorkers,
      activeSubscriptions: activeSubs,
    },
    mrr,
    growth: {
      organizationsLast30: newOrgsLast30,
      usersLast30: newUsersLast30,
    },
    planDistribution: planGrouping.map((g) => ({
      plan: g.plan,
      count: g._count._all,
    })),
    recentSignups: recentSignups.map((o) => ({
      id: o.id,
      name: o.name,
      plan: o.plan,
      createdAt: o.createdAt.toISOString(),
      sizeRange: o.sizeRange,
    })),
    alerts: {
      pastDueSubscriptions: pastDueSubs,
      inactiveOrgs30d: 0,
      failedPayments,
    },
  })
})
