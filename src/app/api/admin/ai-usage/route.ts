/**
 * GET /api/admin/ai-usage
 *
 * Founder Console — telemetría de consumo IA agregado por org/feature/día.
 * Solo SUPER_ADMIN. Las queries son cross-org por diseño (vista consolidada
 * del SaaS), idéntico patrón a `/api/admin/overview`.
 *
 * Query params:
 *   - days: ventana en días (default 30)
 *   - orgId: filtrar a una org específica
 *
 * Devuelve:
 *   - totals: { calls, promptTokens, completionTokens, costUsd, avgLatencyMs }
 *   - byFeature: [{ feature, calls, costUsd }]
 *   - byOrg: [{ orgId, orgName, calls, costUsd }] (top 20 por costo)
 *   - byDay: [{ day, calls, costUsd }] serie para sparkline
 *   - byProvider: [{ provider, calls, costUsd }]
 */

import { NextRequest, NextResponse } from 'next/server'
import { withSuperAdmin } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export const GET = withSuperAdmin(async (req: NextRequest) => {
  const url = new URL(req.url)
  const days = Math.max(1, Math.min(180, Number(url.searchParams.get('days') ?? 30)))
  const orgIdFilter = url.searchParams.get('orgId') || undefined

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const baseWhere = {
    createdAt: { gte: since },
    ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
  }

  const [agg, byFeature, byOrgGroup, byProvider, byDayRows] = await Promise.all([
    prisma.aiUsage.aggregate({
      where: baseWhere,
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _avg: { latencyMs: true },
      _count: { _all: true },
    }),
    prisma.aiUsage.groupBy({
      by: ['feature'],
      where: baseWhere,
      _sum: { costUsd: true, totalTokens: true },
      _count: { _all: true },
      orderBy: { _sum: { costUsd: 'desc' } },
    }),
    prisma.aiUsage.groupBy({
      by: ['orgId'],
      where: { ...baseWhere, orgId: { not: null } },
      _sum: { costUsd: true, totalTokens: true },
      _count: { _all: true },
      orderBy: { _sum: { costUsd: 'desc' } },
      take: 20,
    }),
    prisma.aiUsage.groupBy({
      by: ['provider'],
      where: baseWhere,
      _sum: { costUsd: true, totalTokens: true },
      _count: { _all: true },
      orderBy: { _sum: { costUsd: 'desc' } },
    }),
    // Serie temporal por día — usamos $queryRaw porque Prisma no agrupa por DATE() directo
    prisma.$queryRaw<Array<{ day: Date; calls: bigint; cost_usd: number }>>`
      SELECT
        date_trunc('day', "created_at") AS day,
        COUNT(*)::bigint AS calls,
        SUM("cost_usd")::float AS cost_usd
      FROM "ai_usage"
      WHERE "created_at" >= ${since}
        ${orgIdFilter ? prisma.$queryRaw`AND "org_id" = ${orgIdFilter}` : prisma.$queryRaw``}
      GROUP BY 1
      ORDER BY 1 ASC
    `.catch(() => []),
  ])

  // Para byOrg necesitamos resolver razonSocial — query separada con orgIds
  const orgIds = byOrgGroup
    .map((g) => g.orgId)
    .filter((id): id is string => typeof id === 'string')

  const orgs =
    orgIds.length > 0
      ? await prisma.organization.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, razonSocial: true, name: true, plan: true },
        })
      : []
  const orgById = new Map(orgs.map((o) => [o.id, o]))

  const byOrg = byOrgGroup.map((g) => {
    const org = g.orgId ? orgById.get(g.orgId) : undefined
    return {
      orgId: g.orgId,
      orgName: org?.razonSocial ?? org?.name ?? '(desconocida)',
      plan: org?.plan ?? null,
      calls: g._count._all,
      costUsd: Number(g._sum.costUsd ?? 0),
      tokens: g._sum.totalTokens ?? 0,
    }
  })

  return NextResponse.json({
    windowDays: days,
    since: since.toISOString(),
    totals: {
      calls: agg._count._all,
      promptTokens: agg._sum.promptTokens ?? 0,
      completionTokens: agg._sum.completionTokens ?? 0,
      totalTokens: agg._sum.totalTokens ?? 0,
      costUsd: Number(agg._sum.costUsd ?? 0),
      avgLatencyMs: agg._avg.latencyMs ? Math.round(agg._avg.latencyMs) : 0,
    },
    byFeature: byFeature.map((g) => ({
      feature: g.feature,
      calls: g._count._all,
      costUsd: Number(g._sum.costUsd ?? 0),
      tokens: g._sum.totalTokens ?? 0,
    })),
    byOrg,
    byProvider: byProvider.map((g) => ({
      provider: g.provider,
      calls: g._count._all,
      costUsd: Number(g._sum.costUsd ?? 0),
      tokens: g._sum.totalTokens ?? 0,
    })),
    byDay: byDayRows.map((r) => ({
      day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10),
      calls: Number(r.calls),
      costUsd: Number(r.cost_usd ?? 0),
    })),
  })
})
