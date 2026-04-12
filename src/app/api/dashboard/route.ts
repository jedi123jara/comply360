import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateComplianceScore } from '@/lib/compliance/score-calculator'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/dashboard - Dashboard stats from DB
// =============================================
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const orgId = ctx.orgId

    const [
      contractCounts,
      totalContracts,
      calculationCount,
      alertCount,
      recentCalculations,
      recentContracts,
      templateCount,
    ] = await Promise.all([
      // Contract counts by status — filtered by orgId
      prisma.contract.groupBy({
        by: ['status'],
        where: { orgId },
        _count: true,
      }),
      prisma.contract.count({ where: { orgId } }),
      // Calculations this month — filtered by orgId
      prisma.calculation.count({
        where: {
          orgId,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
      // Unresolved worker alerts (org-scoped)
      prisma.workerAlert.count({
        where: { orgId, resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } },
      }),
      // Recent calculations (last 5) — filtered by orgId
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
      // Recent contracts (last 5) — filtered by orgId
      prisma.contract.findMany({
        where: { orgId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          updatedAt: true,
        },
      }),
      // Templates available
      prisma.contractTemplate.count({ where: { isActive: true } }),
    ])

    // Parse contract counts
    const statusMap: Record<string, number> = {}
    for (const c of contractCounts) {
      statusMap[c.status] = c._count
    }

    // Worker count and compliance score
    const totalWorkers = await prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } })
    let complianceScore = null
    try {
      complianceScore = await calculateComplianceScore(orgId)
    } catch { /* score is optional */ }

    // Weekly calculation activity (last 7 days) — filtered by orgId
    const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab']
    const weeklyActivityPromises = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date()
      dayStart.setDate(dayStart.getDate() - (6 - i))
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart)
      dayEnd.setHours(23, 59, 59, 999)
      return prisma.calculation.count({
        where: { orgId, createdAt: { gte: dayStart, lte: dayEnd } },
      }).then(count => ({ label: DAY_LABELS[dayStart.getDay()], value: count }))
    })
    const weeklyActivity = await Promise.all(weeklyActivityPromises)

    // Expiring contracts (next 30 days) — filtered by orgId
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    const expiringContracts = await prisma.contract.findMany({
      where: {
        orgId,
        expiresAt: {
          lte: thirtyDaysFromNow,
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
    })

    return NextResponse.json({
      stats: {
        totalContracts,
        totalWorkers,
        activeContracts: statusMap['SIGNED'] || 0,
        draftContracts: statusMap['DRAFT'] || 0,
        inReviewContracts: statusMap['IN_REVIEW'] || 0,
        expiredContracts: statusMap['EXPIRED'] || 0,
        expiringCount: expiringContracts.length,
        calculationsThisMonth: calculationCount,
        criticalAlerts: alertCount,
        templatesAvailable: templateCount,
        complianceScore: complianceScore?.scoreGlobal ?? null,
        multaPotencial: complianceScore?.multaPotencial ?? null,
      },
      complianceBreakdown: complianceScore?.breakdown ?? [],
      contractSegments: [
        { label: 'Firmados', value: statusMap['SIGNED'] || 0, color: '#22c55e' },
        { label: 'En Revision', value: statusMap['IN_REVIEW'] || 0, color: '#f59e0b' },
        { label: 'Borradores', value: statusMap['DRAFT'] || 0, color: '#94a3b8' },
        { label: 'Vencidos', value: statusMap['EXPIRED'] || 0, color: '#ef4444' },
      ],
      recentCalculations: recentCalculations.map(c => ({
        id: c.id,
        type: c.type,
        totalAmount: c.totalAmount ? Number(c.totalAmount) : null,
        createdAt: c.createdAt.toISOString(),
      })),
      weeklyActivity,
      recentContracts,
      expiringContracts: expiringContracts.map(c => ({
        ...c,
        expiresAt: c.expiresAt?.toISOString(),
        daysLeft: c.expiresAt ? Math.ceil((c.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      })),
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
})
