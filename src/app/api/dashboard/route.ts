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

    // Worker count, compliance score, and payroll stats
    const [totalWorkers, workerAgg, recentCriticalAlerts] = await Promise.all([
      prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
      prisma.worker.aggregate({
        where: { orgId, status: 'ACTIVE' },
        _avg: { sueldoBruto: true, legajoScore: true },
        _sum: { sueldoBruto: true },
      }),
      prisma.workerAlert.findMany({
        where: { orgId, resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } },
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          type: true,
          severity: true,
          title: true,
          dueDate: true,
          multaEstimada: true,
          createdAt: true,
          worker: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
    ])

    let complianceScore = null
    try {
      complianceScore = await calculateComplianceScore(orgId)
    } catch { /* score is optional */ }

    // Weekly calculation activity (last 7 days) — single groupBy instead of 7 counts
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 6)
    weekAgo.setHours(0, 0, 0, 0)

    const rawActivity = await prisma.calculation.groupBy({
      by: ['createdAt'],
      where: { orgId, createdAt: { gte: weekAgo } },
      _count: true,
    })

    // Map to 7-day array
    const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAgo)
      d.setDate(d.getDate() + i)
      const dayStr = d.toLocaleDateString('es-PE', { weekday: 'short' })
      const count = rawActivity.filter(r => {
        const rd = new Date(r.createdAt)
        return rd.getFullYear() === d.getFullYear() && rd.getMonth() === d.getMonth() && rd.getDate() === d.getDate()
      }).reduce((sum, r) => sum + r._count, 0)
      return { label: dayStr, value: count }
    })

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

    // ── COCKPIT v2 (Fase C) — datos para los componentes narrativos ──

    // Top 5 workers en riesgo: legajoScore bajo o alertas criticas abiertas
    const riskWorkersRaw = await prisma.worker.findMany({
      where: {
        orgId,
        status: { not: 'TERMINATED' },
      },
      orderBy: [
        { legajoScore: 'asc' },
        { updatedAt: 'desc' },
      ],
      take: 20, // traemos 20 y rankeamos en memoria por combinacion de score + alerts
      select: {
        id: true,
        firstName: true,
        lastName: true,
        position: true,
        regimenLaboral: true,
        legajoScore: true,
        alerts: {
          where: { resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } },
          select: { id: true },
        },
      },
    })
    const riskWorkers = riskWorkersRaw
      .map((w) => ({
        id: w.id,
        fullName: `${w.firstName ?? ''} ${w.lastName ?? ''}`.trim() || 'Trabajador',
        role: w.position ?? undefined,
        regimen: w.regimenLaboral ?? undefined,
        score: w.legajoScore ?? 0,
        openAlerts: w.alerts.length,
        riskRank: (100 - (w.legajoScore ?? 0)) + w.alerts.length * 8,
      }))
      .sort((a, b) => b.riskRank - a.riskRank)
      .slice(0, 5)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(({ riskRank: _r, ...rest }) => rest)

    // Upcoming deadlines: fusion de alertas activas con contratos por vencer
    const alertDeadlines = await prisma.workerAlert.findMany({
      where: {
        orgId,
        resolvedAt: null,
        dueDate: { not: null },
      },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        dueDate: true,
        multaEstimada: true,
      },
    })
    const nowMs = Date.now()
    const DAY_MS = 1000 * 60 * 60 * 24
    const toDays = (d: Date | null) =>
      d ? Math.ceil((d.getTime() - nowMs) / DAY_MS) : 99

    function mapType(raw: string): 'contract' | 'cts' | 'grat' | 'sst' | 'afp' | 'document' | 'other' {
      const t = raw.toLowerCase()
      if (t.includes('contrato')) return 'contract'
      if (t.includes('cts')) return 'cts'
      if (t.includes('grat')) return 'grat'
      if (t.includes('sst') || t.includes('exam') || t.includes('epp')) return 'sst'
      if (t.includes('afp')) return 'afp'
      if (t.includes('doc')) return 'document'
      return 'other'
    }

    const upcomingDeadlines = [
      ...alertDeadlines.map((a) => ({
        id: `alert-${a.id}`,
        label: a.title,
        dueIn: toDays(a.dueDate),
        category: mapType(a.type),
        amount: a.multaEstimada ? Number(a.multaEstimada) : undefined,
        href: '/dashboard/alertas',
      })),
      ...expiringContracts.map((c) => ({
        id: `contract-${c.id}`,
        label: c.title,
        dueIn: toDays(c.expiresAt),
        category: 'contract' as const,
        href: `/dashboard/contratos/${c.id}`,
      })),
    ]
      .sort((a, b) => a.dueIn - b.dueIn)
      .slice(0, 5)

    // Activity heatmap: 12 semanas desde AuditLog (si existen) + calculations
    const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * DAY_MS)
    twelveWeeksAgo.setHours(0, 0, 0, 0)
    const [auditActivity, calcActivity] = await Promise.all([
      prisma.auditLog.findMany({
        where: { orgId, createdAt: { gte: twelveWeeksAgo } },
        select: { createdAt: true },
        take: 2000,
      }).catch(() => []),
      prisma.calculation.findMany({
        where: { orgId, createdAt: { gte: twelveWeeksAgo } },
        select: { createdAt: true },
        take: 2000,
      }),
    ])

    const byDay = new Map<string, number>()
    for (const e of [...auditActivity, ...calcActivity]) {
      const iso = e.createdAt.toISOString().slice(0, 10)
      byDay.set(iso, (byDay.get(iso) ?? 0) + 1)
    }
    const activityHeatmap: Array<{ date: string; value: number; count: number }> = []
    for (let i = 0; i < 12 * 7; i++) {
      const d = new Date(twelveWeeksAgo)
      d.setDate(twelveWeeksAgo.getDate() + i)
      const iso = d.toISOString().slice(0, 10)
      const count = byDay.get(iso) ?? 0
      // Map raw count to 0-4 intensity
      const intensity = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4
      activityHeatmap.push({ date: iso, value: intensity, count })
    }

    // Top risk: peor area del breakdown
    const breakdown = complianceScore?.breakdown ?? []
    const worst = breakdown.length
      ? [...breakdown].sort((a, b) => a.score - b.score)[0]
      : null
    const topRisk = worst
      ? {
          label: worst.label,
          // Impact estimado = cuanto subiria el score si esta area llega a 90
          impact: Math.max(0, Math.round((90 - worst.score) * ((worst.weight ?? 15) / 100))),
        }
      : null

    // Sector radar: org vs promedio sector (si hay mas de 1 org en el mismo sector)
    let sectorRadar: Array<{ area: string; org: number; sector: number }> = []
    if (breakdown.length) {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { sector: true },
      })
      if (org?.sector) {
        // Orgs del mismo sector (excluyendo la actual)
        const peers = await prisma.organization.findMany({
          where: { sector: org.sector, id: { not: orgId } },
          select: { id: true },
          take: 200,
        })
        const peerIds = peers.map((p) => p.id)
        const sectorBench = peerIds.length > 0
          ? await prisma.complianceScore.findMany({
              where: { orgId: { in: peerIds } },
              orderBy: { calculatedAt: 'desc' },
              take: 50,
              select: {
                scoreContratos: true,
                scoreSst: true,
                scoreDocumentos: true,
                scoreVencimientos: true,
                scorePlanilla: true,
                scoreGlobal: true,
              },
            })
          : []
        if (sectorBench.length > 0) {
          const avg = (xs: number[]) =>
            Math.round(xs.reduce((a, b) => a + b, 0) / xs.length)
          const avgOf = (key: 'scoreContratos' | 'scoreSst' | 'scoreDocumentos' | 'scoreVencimientos' | 'scorePlanilla') =>
            avg(sectorBench.map((r) => r[key] ?? 0).filter((v) => v > 0))

          const byLabel = Object.fromEntries(breakdown.map((b) => [b.label, b.score]))
          sectorRadar = [
            { area: 'Contratos', org: byLabel['Contratos'] ?? 0, sector: avgOf('scoreContratos') },
            { area: 'SST', org: byLabel['SST'] ?? 0, sector: avgOf('scoreSst') },
            { area: 'Documentos', org: byLabel['Documentos'] ?? 0, sector: avgOf('scoreDocumentos') },
            { area: 'Vencimientos', org: byLabel['Vencimientos'] ?? 0, sector: avgOf('scoreVencimientos') },
            { area: 'Planilla', org: byLabel['Planilla'] ?? 0, sector: avgOf('scorePlanilla') },
          ].filter((r) => r.sector > 0)
        }
      }
    }

    // ── Compliance tasks stats (Opción B del plan — retention loop) ──
    // Un usuario ve aquí cuántas brechas tiene abiertas, cuánto ha evitado en
    // multas al resolverlas, y cuántas están vencidas. Los counts impulsan el
    // loop de regreso a la app.
    //
    // Wrap en try/catch defensive: en entornos con schema desactualizado
    // (tabla compliance_tasks sin migrar) el dashboard seguía rompiendo todo.
    // Preferimos degradar a zeros y que el widget muestre el empty state.
    let taskCountsMap: Record<string, number> = {}
    let tasksMultaEvitable = 0
    let tasksMultaEvitada = 0
    let overdueTaskCount = 0
    let topOpenTasks: Array<{
      id: string
      title: string
      area: string
      gravedad: string
      multaEvitable: import('@/generated/prisma/client').Prisma.Decimal | null
      priority: number
      status: string
      dueDate: Date | null
    }> = []
    try {
      const [taskCountsRaw, openTaskMultaAgg, completedTaskMultaAgg, overdueCount, topTasks] = await Promise.all([
        prisma.complianceTask.groupBy({
          by: ['status'],
          where: { orgId },
          _count: true,
        }),
        prisma.complianceTask.aggregate({
          where: { orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
          _sum: { multaEvitable: true },
        }),
        prisma.complianceTask.aggregate({
          where: { orgId, status: 'COMPLETED' },
          _sum: { multaEvitable: true },
        }),
        prisma.complianceTask.count({
          where: {
            orgId,
            status: { in: ['PENDING', 'IN_PROGRESS'] },
            dueDate: { not: null, lt: new Date() },
          },
        }),
        prisma.complianceTask.findMany({
          where: { orgId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
          take: 3,
          select: {
            id: true,
            title: true,
            area: true,
            gravedad: true,
            multaEvitable: true,
            priority: true,
            status: true,
            dueDate: true,
          },
        }),
      ])
      taskCountsMap = Object.fromEntries(taskCountsRaw.map((c) => [c.status, c._count]))
      tasksMultaEvitable = Number(openTaskMultaAgg._sum.multaEvitable ?? 0)
      tasksMultaEvitada = Number(completedTaskMultaAgg._sum.multaEvitable ?? 0)
      overdueTaskCount = overdueCount
      topOpenTasks = topTasks
    } catch (err) {
      // Log + continue: endpoint queda healthy aunque falte la tabla.
      console.warn('[dashboard] complianceTask queries failed:', err instanceof Error ? err.message : err)
    }
    const tasksOpen = (taskCountsMap['PENDING'] ?? 0) + (taskCountsMap['IN_PROGRESS'] ?? 0)
    const tasksCompleted = taskCountsMap['COMPLETED'] ?? 0

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
        avgLegajoScore: workerAgg._avg.legajoScore ? Math.round(Number(workerAgg._avg.legajoScore)) : null,
        totalPlanilla: workerAgg._sum.sueldoBruto ? Number(workerAgg._sum.sueldoBruto) : 0,
      },
      complianceTasks: {
        open: tasksOpen,
        pending: taskCountsMap['PENDING'] ?? 0,
        inProgress: taskCountsMap['IN_PROGRESS'] ?? 0,
        completed: tasksCompleted,
        dismissed: taskCountsMap['DISMISSED'] ?? 0,
        overdue: overdueTaskCount,
        multaEvitable: tasksMultaEvitable,
        multaEvitada: tasksMultaEvitada,
        top: topOpenTasks.map((t) => ({
          id: t.id,
          title: t.title,
          area: t.area,
          gravedad: t.gravedad,
          priority: t.priority,
          multaEvitable: t.multaEvitable ? Number(t.multaEvitable) : null,
          dueDate: t.dueDate?.toISOString() ?? null,
          overdue: t.dueDate !== null && t.dueDate < new Date(),
        })),
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
      recentContracts: recentContracts.map(c => ({
        ...c,
        updatedAt: c.updatedAt.toISOString(),
      })),
      recentCriticalAlerts: recentCriticalAlerts.map(a => ({
        id: a.id,
        type: a.type,
        severity: a.severity,
        title: a.title,
        dueDate: a.dueDate?.toISOString() ?? null,
        multaEstimada: a.multaEstimada ? Number(a.multaEstimada) : null,
        createdAt: a.createdAt.toISOString(),
        workerId: a.worker.id,
        workerName: `${a.worker.firstName} ${a.worker.lastName}`,
      })),
      expiringContracts: expiringContracts.map(c => ({
        ...c,
        expiresAt: c.expiresAt?.toISOString(),
        daysLeft: c.expiresAt ? Math.ceil((c.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null,
      })),
      // ── Cockpit v2 outputs ──
      riskWorkers,
      upcomingDeadlines,
      activityHeatmap,
      topRisk,
      sectorRadar,
    })
  } catch (error) {
    console.error('Dashboard error:', error)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
})
