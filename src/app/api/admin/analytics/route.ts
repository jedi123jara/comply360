import { NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withSuperAdmin(async () => {
  const last30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [topActions, topOrgs, totalEvents] = await Promise.all([
    prisma.auditLog.groupBy({
      by: ['action'],
      _count: { _all: true },
      where: { createdAt: { gte: last30 } },
      orderBy: { _count: { action: 'desc' } },
      take: 15,
    }),
    prisma.auditLog.groupBy({
      by: ['orgId'],
      _count: { _all: true },
      where: { createdAt: { gte: last30 } },
      orderBy: { _count: { orgId: 'desc' } },
      take: 15,
    }),
    prisma.auditLog.count({ where: { createdAt: { gte: last30 } } }),
  ])

  // Resolve org names
  const orgIds = topOrgs.map((o) => o.orgId)
  const orgs = await prisma.organization.findMany({
    where: { id: { in: orgIds } },
    select: { id: true, name: true },
  })
  const orgMap = new Map(orgs.map((o) => [o.id, o.name]))

  return NextResponse.json({
    signupsTrend: [], // futuro: agrupar por dia
    topActions: topActions.map((a) => ({ action: a.action, count: a._count._all })),
    topOrgs: topOrgs.map((o) => ({
      orgName: orgMap.get(o.orgId) || 'Desconocida',
      events: o._count._all,
    })),
    totalEvents,
  })
})
