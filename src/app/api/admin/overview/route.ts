import { NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { computeFounderMetrics } from '@/lib/metrics/founder-metrics'

/**
 * GET /api/admin/overview
 *
 * Snapshot completo para el Founder Console.
 * Mantiene backwards-compat con el shape legacy (`totals`, `mrr`, `growth`,
 * `planDistribution`, `recentSignups`, `alerts`) Y agrega el snapshot profundo
 * de `computeFounderMetrics()` bajo la key `metrics`.
 *
 * La UI puede leer solo lo legacy (compat) o todo lo nuevo (founder-grade).
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export const GET = withSuperAdmin(async () => {
  const [metrics, recentSignups, planGrouping] = await Promise.all([
    computeFounderMetrics(),
    prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: { id: true, name: true, plan: true, createdAt: true, sizeRange: true },
    }),
    prisma.organization.groupBy({
      by: ['plan'],
      _count: { _all: true },
    }),
  ])

  const [totalUsers, totalWorkers] = await Promise.all([
    prisma.user.count(),
    prisma.worker.count(),
  ])

  return NextResponse.json({
    // ─── Legacy shape (compat con UI existente) ─────────────────────────────
    totals: {
      organizations: metrics.growth.totalOrgs,
      users: totalUsers,
      workers: totalWorkers,
      activeSubscriptions: metrics.business.activeSubscriptions,
    },
    mrr: metrics.business.mrr,
    growth: {
      organizationsLast30: metrics.growth.newOrgs30d,
      usersLast30: 0, // calculable si hace falta; no crítico para founder view
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
      pastDueSubscriptions: metrics.business.pastDueCount,
      inactiveOrgs30d: metrics.health.churnRiskOrgs,
      failedPayments: 0, // placeholder — billing provider webhook
    },

    // ─── NUEVO: Founder Console deep metrics ────────────────────────────────
    metrics,
  })
})
