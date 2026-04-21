import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'

export const GET = withAuth(async (req, ctx) => {
  const orgId = ctx.orgId

  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Parallel queries for dashboard stats
    const [
      totalWorkers,
      activeWorkers,
      totalCalculations,
      recentCalculations,
      previousPeriodCalculations,
      totalContracts,
      recentContracts,
      previousPeriodContracts,
      contractsByStatus,
      contractsByType,
      calculationsByType,
      openAlerts,
      alertsBySeverity,
      latestDiagnostic,
      diagnosticHistory,
      sstStats,
      complaintStats,
      recentActivity,
    ] = await Promise.all([
      // Workers
      prisma.worker.count({ where: { orgId } }),
      prisma.worker.count({ where: { orgId, status: 'ACTIVE' } }),

      // Calculations - total
      prisma.calculation.count({ where: { orgId } }),
      // Calculations - last 30 days
      prisma.calculation.count({ where: { orgId, createdAt: { gte: thirtyDaysAgo } } }),
      // Calculations - previous 30 days (for trend)
      prisma.calculation.count({ where: { orgId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),

      // Contracts - total
      prisma.contract.count({ where: { orgId } }),
      // Contracts - last 30 days
      prisma.contract.count({ where: { orgId, createdAt: { gte: thirtyDaysAgo } } }),
      // Contracts - previous 30 days
      prisma.contract.count({ where: { orgId, createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } }),

      // Contracts by status
      prisma.contract.groupBy({ by: ['status'], where: { orgId }, _count: true }),
      // Contracts by type
      prisma.contract.groupBy({ by: ['type'], where: { orgId }, _count: true }),

      // Calculations by type
      prisma.calculation.groupBy({ by: ['type'], where: { orgId }, _count: true }),

      // Open alerts
      prisma.workerAlert.count({ where: { orgId, resolvedAt: null } }),
      // Alerts by severity
      prisma.workerAlert.groupBy({ by: ['severity'], where: { orgId, resolvedAt: null }, _count: true }),

      // Latest diagnostic
      prisma.complianceDiagnostic.findFirst({ where: { orgId }, orderBy: { createdAt: 'desc' } }),

      // Diagnostic history (last 6)
      prisma.complianceDiagnostic.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, type: true, scoreGlobal: true, totalMultaRiesgo: true, createdAt: true },
      }),

      // SST stats
      Promise.all([
        prisma.sstRecord.count({ where: { orgId } }),
        prisma.sstRecord.count({ where: { orgId, status: 'COMPLETED' } }),
        prisma.sstRecord.count({ where: { orgId, status: 'OVERDUE' } }),
      ]),

      // Complaint stats
      Promise.all([
        prisma.complaint.count({ where: { orgId } }),
        prisma.complaint.count({ where: { orgId, status: 'RESOLVED' } }),
        prisma.complaint.count({ where: { orgId, status: { in: ['RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING'] } } }),
      ]),

      // Recent activity (last 10 calculations + contracts)
      Promise.all([
        prisma.calculation.findMany({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, type: true, totalAmount: true, createdAt: true },
        }),
        prisma.contract.findMany({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, type: true, title: true, status: true, createdAt: true },
        }),
      ]),
    ])

    // Compute trends
    const calcTrend = previousPeriodCalculations > 0
      ? Math.round(((recentCalculations - previousPeriodCalculations) / previousPeriodCalculations) * 100)
      : recentCalculations > 0 ? 100 : 0

    const contractTrend = previousPeriodContracts > 0
      ? Math.round(((recentContracts - previousPeriodContracts) / previousPeriodContracts) * 100)
      : recentContracts > 0 ? 100 : 0

    // Find top calculator type
    const topCalcType = calculationsByType.sort((a, b) => b._count - a._count)[0]

    // SST completion rate
    const [sstTotal, sstCompleted, sstOverdue] = sstStats
    const sstCompletionRate = sstTotal > 0 ? Math.round((sstCompleted / sstTotal) * 100) : 0

    // Complaints
    const [complaintsTotal, complaintsResolved, complaintsPending] = complaintStats

    // Merge and sort recent activity
    const [recentCalcs, recentConts] = recentActivity
    const activityFeed = [
      ...recentCalcs.map(c => ({
        id: c.id,
        type: 'calculation' as const,
        label: c.type.replace(/_/g, ' '),
        detail: c.totalAmount ? `S/ ${Number(c.totalAmount).toFixed(2)}` : null,
        createdAt: c.createdAt,
      })),
      ...recentConts.map(c => ({
        id: c.id,
        type: 'contract' as const,
        label: c.title,
        detail: c.status,
        createdAt: c.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10)

    // Alerts map
    const alertsMap: Record<string, number> = {}
    alertsBySeverity.forEach(a => { alertsMap[a.severity] = a._count })

    // Contracts status map
    const contractsStatusMap: Record<string, number> = {}
    contractsByStatus.forEach(c => { contractsStatusMap[c.status] = c._count })

    // Contracts type map
    const contractsTypeMap: Record<string, number> = {}
    contractsByType.forEach(c => { contractsTypeMap[c.type] = c._count })

    // Calculations type map
    const calcsTypeMap: Record<string, number> = {}
    calculationsByType.forEach(c => { calcsTypeMap[c.type] = c._count })

    return NextResponse.json({
      summary: {
        totalWorkers,
        activeWorkers,
        totalCalculations,
        recentCalculations,
        calcTrend,
        totalContracts,
        recentContracts,
        contractTrend,
        topCalculatorType: topCalcType?.type || null,
        topCalculatorCount: topCalcType?._count || 0,
        openAlerts,
        alertsBySeverity: alertsMap,
      },
      compliance: {
        latestScore: latestDiagnostic?.scoreGlobal ?? null,
        latestMulta: latestDiagnostic ? Number(latestDiagnostic.totalMultaRiesgo) : null,
        diagnosticHistory: diagnosticHistory.map(d => ({
          id: d.id,
          type: d.type,
          score: d.scoreGlobal,
          multa: Number(d.totalMultaRiesgo),
          date: d.createdAt,
        })),
      },
      contracts: {
        byStatus: contractsStatusMap,
        byType: contractsTypeMap,
      },
      calculations: {
        byType: calcsTypeMap,
      },
      sst: {
        total: sstTotal,
        completed: sstCompleted,
        overdue: sstOverdue,
        completionRate: sstCompletionRate,
      },
      complaints: {
        total: complaintsTotal,
        resolved: complaintsResolved,
        pending: complaintsPending,
      },
      activityFeed,
    })
  } catch (error) {
    console.error('Reports API error:', error)
    return NextResponse.json({ error: 'Error al generar datos de reportes' }, { status: 500 })
  }
})
