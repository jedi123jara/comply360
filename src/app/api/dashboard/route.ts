import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { getCockpitFullPayload } from '@/lib/cockpit/data'

const DAY_MS = 1000 * 60 * 60 * 24

// =============================================
// GET /api/dashboard - Dashboard stats from DB
// =============================================
//
// Implementación delgada: delega en `src/lib/cockpit/data.ts` para todas las
// queries del cockpit y agrega aquí solo los campos legacy que consumen
// integraciones externas (Chrome extension, API pública futura).
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const orgId = ctx.orgId

    // Payload principal del cockpit (queries paralelas internas)
    const payloadPromise = getCockpitFullPayload(orgId)

    // Campos legacy que el cockpit no usa pero el API expone públicamente
    const legacyPromise = Promise.all([
      // Contract counts by status — para `contractSegments`
      prisma.contract.groupBy({
        by: ['status'],
        where: { orgId },
        _count: true,
      }),
      // Recent calculations (last 5)
      prisma.calculation.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          totalAmount: true,
          createdAt: true,
        },
      }),
      // Weekly calculation activity (last 7 days)
      prisma.calculation.groupBy({
        by: ['createdAt'],
        where: {
          orgId,
          createdAt: {
            gte: (() => {
              const d = new Date()
              d.setDate(d.getDate() - 6)
              d.setHours(0, 0, 0, 0)
              return d
            })(),
          },
        },
        _count: true,
      }),
      // Expiring contracts (next 30 days) — full shape para legacy consumers
      prisma.contract.findMany({
        where: {
          orgId,
          expiresAt: {
            lte: new Date(Date.now() + 30 * DAY_MS),
            gte: new Date(),
          },
          status: { notIn: ['EXPIRED', 'ARCHIVED'] },
        },
        orderBy: { expiresAt: 'asc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          expiresAt: true,
        },
      }),
    ])

    const [payload, [contractCounts, recentCalculations, rawWeekly, expiringContracts]] =
      await Promise.all([payloadPromise, legacyPromise])

    const statusMap: Record<string, number> = {}
    for (const c of contractCounts) statusMap[c.status] = c._count

    // Map weekly activity to 7-day array
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    weekAgo.setHours(0, 0, 0, 0)
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAgo)
      d.setDate(d.getDate() + i)
      const dayStr = d.toLocaleDateString('es-PE', { weekday: 'short' })
      const count = rawWeekly
        .filter((r) => {
          const rd = new Date(r.createdAt)
          return (
            rd.getFullYear() === d.getFullYear() &&
            rd.getMonth() === d.getMonth() &&
            rd.getDate() === d.getDate()
          )
        })
        .reduce((sum, r) => sum + r._count, 0)
      return { label: dayStr, value: count }
    })

    return NextResponse.json({
      org: payload.org,
      stats: payload.stats,
      complianceTasks: payload.complianceTasks,
      complianceBreakdown: payload.complianceBreakdown,
      contractSegments: [
        { label: 'Firmados', value: statusMap['SIGNED'] ?? 0, color: '#22c55e' },
        { label: 'En Revision', value: statusMap['IN_REVIEW'] ?? 0, color: '#f59e0b' },
        { label: 'Borradores', value: statusMap['DRAFT'] ?? 0, color: '#94a3b8' },
        { label: 'Vencidos', value: statusMap['EXPIRED'] ?? 0, color: '#ef4444' },
      ],
      recentCalculations: recentCalculations.map((c) => ({
        id: c.id,
        type: c.type,
        totalAmount: c.totalAmount ? Number(c.totalAmount) : null,
        createdAt: c.createdAt.toISOString(),
      })),
      weeklyActivity,
      recentContracts: payload.recentContracts,
      recentCriticalAlerts: payload.recentCriticalAlerts,
      expiringContracts: expiringContracts.map((c) => ({
        ...c,
        expiresAt: c.expiresAt?.toISOString(),
        daysLeft: c.expiresAt
          ? Math.ceil((c.expiresAt.getTime() - Date.now()) / DAY_MS)
          : null,
      })),
      // Cockpit v2 outputs
      riskWorkers: payload.riskWorkers,
      upcomingDeadlines: payload.upcomingDeadlines,
      activityHeatmap: payload.activityHeatmap,
      topRisk: payload.topRisk,
      sectorRadar: payload.sectorRadar,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
})
