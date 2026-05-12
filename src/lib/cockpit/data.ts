/**
 * Cockpit data layer — funciones server-side reutilizables.
 *
 * Extraídas del route handler `/api/dashboard` para que el Server Component
 * del cockpit (`/dashboard/page.tsx`) las pueda consumir directo sin pasar
 * por HTTP. El route handler sigue funcionando para clientes externos
 * (Chrome extension, mobile app futura) y delega aquí.
 *
 * Cada función es independiente: Server Components pueden envolver una sola
 * en `<Suspense>` para streaming progresivo. Errores se propagan — el caller
 * decide si los captura con ErrorBoundary o no.
 */

import { prisma } from '@/lib/prisma'
import { calculateComplianceScore } from '@/lib/compliance/score-calculator'
import type { Prisma } from '@/generated/prisma/client'

const DAY_MS = 1000 * 60 * 60 * 24

// ─────────────────────────────────────────────────────────────────────────────
// Types públicos consumidos por componentes del cockpit
// ─────────────────────────────────────────────────────────────────────────────

export interface CockpitStats {
  totalContracts: number
  totalWorkers: number
  activeContracts: number
  draftContracts: number
  inReviewContracts: number
  expiredContracts: number
  expiringCount: number
  calculationsThisMonth: number
  criticalAlerts: number
  templatesAvailable: number
  complianceScore: number | null
  multaPotencial: number | null
  avgLegajoScore: number | null
  totalPlanilla: number
  workersAtRisk: number
  workersProtected: number
  daysSinceOrgCreated: number
  ownerFirstName: string | null
  orgName: string | null
  plan: string
  totalWorkersDeclared: number | null
  subdeclarationGap: number | null
}

export interface CockpitOrgMeta {
  id: string
  name: string | null
  plan: string
  planExpiresAt: Date | null
}

export interface RiskWorkerItem {
  id: string
  fullName: string
  role?: string
  regimen?: string
  score: number
  openAlerts: number
}

export interface UpcomingDeadlineItem {
  id: string
  label: string
  dueIn: number
  category: 'contract' | 'cts' | 'grat' | 'sst' | 'afp' | 'document' | 'other'
  amount?: number
  href: string
}

export interface HeatmapDayItem {
  date: string
  value: number
  count: number
}

export interface SectorRadarItem {
  area: string
  org: number
  sector: number
}

export interface ComplianceTaskTeaser {
  id: string
  title: string
  area: string
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  priority: number
  multaEvitable: number | null
  dueDate: string | null
  overdue: boolean
}

export interface ComplianceTasksSummary {
  open: number
  pending: number
  inProgress: number
  completed: number
  dismissed: number
  overdue: number
  multaEvitable: number
  multaEvitada: number
  top: ComplianceTaskTeaser[]
}

export interface RecentCriticalAlert {
  id: string
  type: string
  severity: string
  title: string
  dueDate: string | null
  multaEstimada: number | null
  createdAt: string
  workerId: string
  workerName: string
}

export interface RecentContract {
  id: string
  title: string
  type: string
  status: string
  updatedAt: string
}

export interface ScoreSnapshot {
  scoreGlobal: number | null
  delta: number
  history: Array<{ month: string; score: number }>
  breakdown: Array<{ label: string; score: number; weight?: number }>
  topRisk: { label: string; impact: number } | null
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. OrgMeta + Stats (combinados — comparten queries)
// ─────────────────────────────────────────────────────────────────────────────

interface OrgMetaInternal {
  meta: CockpitOrgMeta
  ownerFirstName: string | null
  totalWorkersDeclared: number | null
  createdAt: Date
}

async function getOrgMetaInternal(orgId: string): Promise<OrgMetaInternal | null> {
  const orgMeta = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      name: true,
      plan: true,
      planExpiresAt: true,
      createdAt: true,
      totalWorkersDeclared: true,
      users: {
        where: { role: 'OWNER' },
        select: { firstName: true, lastName: true },
        take: 1,
      },
    },
  })
  if (!orgMeta) return null
  return {
    meta: {
      id: orgMeta.id,
      name: orgMeta.name ?? null,
      plan: orgMeta.plan ?? 'FREE',
      planExpiresAt: orgMeta.planExpiresAt ?? null,
    },
    ownerFirstName: orgMeta.users?.[0]?.firstName ?? null,
    totalWorkersDeclared: orgMeta.totalWorkersDeclared ?? null,
    createdAt: orgMeta.createdAt ?? new Date(),
  }
}

export async function getCockpitOrgMeta(orgId: string): Promise<CockpitOrgMeta | null> {
  const i = await getOrgMetaInternal(orgId)
  return i?.meta ?? null
}

export async function getCockpitStats(orgId: string): Promise<CockpitStats> {
  const [
    contractCounts,
    totalContracts,
    calculationCount,
    alertCount,
    templateCount,
    totalWorkers,
    workerAgg,
    workersAtRiskIds,
    expiringContracts,
    orgMetaInternal,
    complianceScoreResult,
  ] = await Promise.all([
    prisma.contract.groupBy({ by: ['status'], where: { orgId }, _count: true }),
    prisma.contract.count({ where: { orgId } }),
    prisma.calculation.count({
      where: {
        orgId,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
    }),
    prisma.workerAlert.count({
      where: { orgId, resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } },
    }),
    prisma.contractTemplate.count({ where: { isActive: true } }),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.worker.aggregate({
      where: { orgId, status: 'ACTIVE' },
      _avg: { sueldoBruto: true, legajoScore: true },
      _sum: { sueldoBruto: true },
    }),
    prisma.worker.findMany({
      where: {
        orgId,
        status: { not: 'TERMINATED' },
        OR: [
          { legajoScore: { lt: 60 } },
          { alerts: { some: { resolvedAt: null, severity: { in: ['CRITICAL', 'HIGH'] } } } },
        ],
      },
      select: { id: true },
    }),
    prisma.contract.findMany({
      where: {
        orgId,
        expiresAt: { lte: new Date(Date.now() + 30 * DAY_MS), gte: new Date() },
        status: { notIn: ['EXPIRED', 'ARCHIVED'] },
      },
      select: { id: true },
    }),
    getOrgMetaInternal(orgId),
    calculateComplianceScore(orgId).catch(() => null),
  ])

  const statusMap: Record<string, number> = {}
  for (const c of contractCounts) statusMap[c.status] = c._count

  const workersAtRiskCount = workersAtRiskIds.length
  const workersBlindados = Math.max(0, totalWorkers - workersAtRiskCount)
  const orgCreatedAt = orgMetaInternal?.createdAt ?? new Date()
  const diasDesdeCreacion = Math.max(
    0,
    Math.floor((Date.now() - orgCreatedAt.getTime()) / DAY_MS),
  )
  const totalWorkersDeclared = orgMetaInternal?.totalWorkersDeclared ?? null
  const subdeclarationGap =
    totalWorkersDeclared !== null
      ? Math.max(0, totalWorkersDeclared - totalWorkers)
      : null

  return {
    totalContracts,
    totalWorkers,
    activeContracts: statusMap['SIGNED'] ?? 0,
    draftContracts: statusMap['DRAFT'] ?? 0,
    inReviewContracts: statusMap['IN_REVIEW'] ?? 0,
    expiredContracts: statusMap['EXPIRED'] ?? 0,
    expiringCount: expiringContracts.length,
    calculationsThisMonth: calculationCount,
    criticalAlerts: alertCount,
    templatesAvailable: templateCount,
    complianceScore: complianceScoreResult?.scoreGlobal ?? null,
    multaPotencial: complianceScoreResult?.multaPotencial ?? null,
    avgLegajoScore: workerAgg._avg.legajoScore
      ? Math.round(Number(workerAgg._avg.legajoScore))
      : null,
    totalPlanilla: workerAgg._sum.sueldoBruto ? Number(workerAgg._sum.sueldoBruto) : 0,
    workersAtRisk: workersAtRiskCount,
    workersProtected: workersBlindados,
    daysSinceOrgCreated: diasDesdeCreacion,
    ownerFirstName: orgMetaInternal?.ownerFirstName ?? null,
    orgName: orgMetaInternal?.meta.name ?? null,
    plan: orgMetaInternal?.meta.plan ?? 'FREE',
    totalWorkersDeclared,
    subdeclarationGap,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Risk workers
// ─────────────────────────────────────────────────────────────────────────────

export async function getRiskWorkers(orgId: string): Promise<RiskWorkerItem[]> {
  const raw = await prisma.worker.findMany({
    where: { orgId, status: { not: 'TERMINATED' } },
    orderBy: [{ legajoScore: 'asc' }, { updatedAt: 'desc' }],
    take: 20,
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
  return raw
    .map((w) => ({
      id: w.id,
      fullName: `${w.firstName ?? ''} ${w.lastName ?? ''}`.trim() || 'Trabajador',
      role: w.position ?? undefined,
      regimen: w.regimenLaboral ?? undefined,
      score: w.legajoScore ?? 0,
      openAlerts: w.alerts.length,
      riskRank: 100 - (w.legajoScore ?? 0) + w.alerts.length * 8,
    }))
    .sort((a, b) => b.riskRank - a.riskRank)
    .slice(0, 5)
    .map(({ riskRank, ...rest }) => {
      void riskRank
      return rest
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Upcoming deadlines
// ─────────────────────────────────────────────────────────────────────────────

function categorizeAlertType(raw: string): UpcomingDeadlineItem['category'] {
  const t = raw.toLowerCase()
  if (t.includes('contrato')) return 'contract'
  if (t.includes('cts')) return 'cts'
  if (t.includes('grat')) return 'grat'
  if (t.includes('sst') || t.includes('exam') || t.includes('epp')) return 'sst'
  if (t.includes('afp')) return 'afp'
  if (t.includes('doc')) return 'document'
  return 'other'
}

export async function getUpcomingDeadlines(orgId: string): Promise<UpcomingDeadlineItem[]> {
  const nowMs = Date.now()
  const toDays = (d: Date | null) =>
    d ? Math.ceil((d.getTime() - nowMs) / DAY_MS) : 99

  const [alertDeadlines, expiringContracts] = await Promise.all([
    prisma.workerAlert.findMany({
      where: { orgId, resolvedAt: null, dueDate: { not: null } },
      orderBy: { dueDate: 'asc' },
      take: 10,
      select: {
        id: true,
        type: true,
        title: true,
        dueDate: true,
        multaEstimada: true,
      },
    }),
    prisma.contract.findMany({
      where: {
        orgId,
        expiresAt: { lte: new Date(nowMs + 30 * DAY_MS), gte: new Date() },
        status: { notIn: ['EXPIRED', 'ARCHIVED'] },
      },
      orderBy: { expiresAt: 'asc' },
      take: 5,
      select: { id: true, title: true, expiresAt: true },
    }),
  ])

  const merged: UpcomingDeadlineItem[] = [
    ...alertDeadlines.map((a) => ({
      id: `alert-${a.id}`,
      label: a.title,
      dueIn: toDays(a.dueDate),
      category: categorizeAlertType(a.type),
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

  return merged.sort((a, b) => a.dueIn - b.dueIn).slice(0, 5)
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Activity heatmap
// ─────────────────────────────────────────────────────────────────────────────

export async function getActivityHeatmap(orgId: string): Promise<HeatmapDayItem[]> {
  const twelveWeeksAgo = new Date(Date.now() - 12 * 7 * DAY_MS)
  twelveWeeksAgo.setHours(0, 0, 0, 0)

  const [auditActivity, calcActivity] = await Promise.all([
    prisma.auditLog
      .findMany({
        where: { orgId, createdAt: { gte: twelveWeeksAgo } },
        select: { createdAt: true },
        take: 2000,
      })
      .catch(() => []),
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

  const heatmap: HeatmapDayItem[] = []
  for (let i = 0; i < 12 * 7; i++) {
    const d = new Date(twelveWeeksAgo)
    d.setDate(twelveWeeksAgo.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const count = byDay.get(iso) ?? 0
    const intensity = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4
    heatmap.push({ date: iso, value: intensity, count })
  }
  return heatmap
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Compliance score snapshot (current + history + delta + topRisk)
// ─────────────────────────────────────────────────────────────────────────────

export async function getComplianceScoreSnapshot(orgId: string): Promise<ScoreSnapshot> {
  const result = await calculateComplianceScore(orgId).catch(() => null)
  const breakdown = result?.breakdown ?? []

  // Historial de los últimos 6 meses (snapshots persistidos)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  sixMonthsAgo.setHours(0, 0, 0, 0)

  const snapshots = await prisma.complianceScore
    .findMany({
      where: { orgId, calculatedAt: { gte: sixMonthsAgo } },
      orderBy: { calculatedAt: 'asc' },
      select: { scoreGlobal: true, calculatedAt: true },
    })
    .catch(() => [])

  // Agrupar por mes (último snapshot del mes gana)
  const byMonth = new Map<string, number>()
  for (const s of snapshots) {
    const month = s.calculatedAt.toISOString().slice(0, 7) // YYYY-MM
    byMonth.set(month, s.scoreGlobal)
  }
  const history = Array.from(byMonth.entries())
    .map(([month, score]) => ({ month, score }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Delta: score actual vs último mes anterior
  const delta =
    result && history.length >= 2
      ? result.scoreGlobal - history[history.length - 2].score
      : 0

  // Top risk: peor área del breakdown
  const worst = breakdown.length
    ? [...breakdown].sort((a, b) => a.score - b.score)[0]
    : null
  const topRisk = worst
    ? {
        label: worst.label,
        impact: Math.max(
          0,
          Math.round((90 - worst.score) * ((worst.weight ?? 15) / 100)),
        ),
      }
    : null

  return {
    scoreGlobal: result?.scoreGlobal ?? null,
    delta,
    history,
    breakdown,
    topRisk,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Sector radar
// ─────────────────────────────────────────────────────────────────────────────

export async function getSectorRadar(
  orgId: string,
  breakdown: Array<{ label: string; score: number; weight?: number }>,
): Promise<SectorRadarItem[]> {
  if (!breakdown.length) return []

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { sector: true },
  })
  if (!org?.sector) return []

  const peers = await prisma.organization.findMany({
    where: { sector: org.sector, id: { not: orgId } },
    select: { id: true },
    take: 200,
  })
  if (peers.length === 0) return []

  const sectorBench = await prisma.complianceScore.findMany({
    where: { orgId: { in: peers.map((p) => p.id) } },
    orderBy: { calculatedAt: 'desc' },
    take: 50,
    select: {
      scoreContratos: true,
      scoreSst: true,
      scoreDocumentos: true,
      scoreVencimientos: true,
      scorePlanilla: true,
    },
  })
  if (sectorBench.length === 0) return []

  const avg = (xs: number[]) =>
    xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0
  const avgOf = (
    key:
      | 'scoreContratos'
      | 'scoreSst'
      | 'scoreDocumentos'
      | 'scoreVencimientos'
      | 'scorePlanilla',
  ) => avg(sectorBench.map((r) => r[key] ?? 0).filter((v) => v > 0))

  const byLabel = Object.fromEntries(breakdown.map((b) => [b.label, b.score]))
  return [
    { area: 'Contratos', org: byLabel['Contratos'] ?? 0, sector: avgOf('scoreContratos') },
    { area: 'SST', org: byLabel['SST'] ?? 0, sector: avgOf('scoreSst') },
    { area: 'Documentos', org: byLabel['Documentos'] ?? 0, sector: avgOf('scoreDocumentos') },
    { area: 'Vencimientos', org: byLabel['Vencimientos'] ?? 0, sector: avgOf('scoreVencimientos') },
    { area: 'Planilla', org: byLabel['Planilla'] ?? 0, sector: avgOf('scorePlanilla') },
  ].filter((r) => r.sector > 0)
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Compliance task stats (degrada con try/catch a zeros si la tabla no existe)
// ─────────────────────────────────────────────────────────────────────────────

export async function getComplianceTaskStats(orgId: string): Promise<ComplianceTasksSummary> {
  const empty: ComplianceTasksSummary = {
    open: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    dismissed: 0,
    overdue: 0,
    multaEvitable: 0,
    multaEvitada: 0,
    top: [],
  }

  try {
    const [taskCountsRaw, openMultaAgg, completedMultaAgg, overdueCount, topTasks] =
      await Promise.all([
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

    const taskCountsMap = Object.fromEntries(
      taskCountsRaw.map((c) => [c.status, c._count]),
    ) as Record<string, number>

    return {
      open: (taskCountsMap['PENDING'] ?? 0) + (taskCountsMap['IN_PROGRESS'] ?? 0),
      pending: taskCountsMap['PENDING'] ?? 0,
      inProgress: taskCountsMap['IN_PROGRESS'] ?? 0,
      completed: taskCountsMap['COMPLETED'] ?? 0,
      dismissed: taskCountsMap['DISMISSED'] ?? 0,
      overdue: overdueCount,
      multaEvitable: Number(openMultaAgg._sum.multaEvitable ?? 0),
      multaEvitada: Number(completedMultaAgg._sum.multaEvitable ?? 0),
      top: topTasks.map((t) => ({
        id: t.id,
        title: t.title,
        area: t.area,
        gravedad: t.gravedad as 'LEVE' | 'GRAVE' | 'MUY_GRAVE',
        priority: t.priority,
        multaEvitable: t.multaEvitable ? Number(t.multaEvitable) : null,
        dueDate: t.dueDate?.toISOString() ?? null,
        overdue: t.dueDate !== null && t.dueDate < new Date(),
      })),
    }
  } catch (err) {
    console.warn(
      '[cockpit/data] complianceTask queries failed:',
      err instanceof Error ? err.message : err,
    )
    return empty
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Recent critical alerts + recent contracts (para banners y MomentCards)
// ─────────────────────────────────────────────────────────────────────────────

export async function getRecentCriticalAlerts(orgId: string): Promise<RecentCriticalAlert[]> {
  const alerts = await prisma.workerAlert.findMany({
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
  })
  return alerts.map((a) => ({
    id: a.id,
    type: a.type,
    severity: a.severity,
    title: a.title,
    dueDate: a.dueDate?.toISOString() ?? null,
    multaEstimada: a.multaEstimada ? Number(a.multaEstimada) : null,
    createdAt: a.createdAt.toISOString(),
    workerId: a.worker.id,
    workerName: `${a.worker.firstName} ${a.worker.lastName}`,
  }))
}

export async function getRecentContracts(orgId: string): Promise<RecentContract[]> {
  const recent = await prisma.contract.findMany({
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
  })
  return recent.map((c) => ({
    id: c.id,
    title: c.title,
    type: c.type,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
  }))
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Agregadora — usada por el route handler para no romper API contract
// ─────────────────────────────────────────────────────────────────────────────

export interface CockpitFullPayload {
  org: CockpitOrgMeta | null
  stats: CockpitStats
  riskWorkers: RiskWorkerItem[]
  upcomingDeadlines: UpcomingDeadlineItem[]
  activityHeatmap: HeatmapDayItem[]
  sectorRadar: SectorRadarItem[]
  complianceTasks: ComplianceTasksSummary
  recentCriticalAlerts: RecentCriticalAlert[]
  recentContracts: RecentContract[]
  topRisk: { label: string; impact: number } | null
  scoreSnapshot: ScoreSnapshot
  complianceBreakdown: Array<{ label: string; score: number; weight?: number }>
}

export async function getCockpitFullPayload(orgId: string): Promise<CockpitFullPayload> {
  // Score se calcula primero porque sectorRadar depende de su breakdown.
  const scoreSnapshot = await getComplianceScoreSnapshot(orgId)

  const [
    orgMeta,
    stats,
    riskWorkers,
    upcomingDeadlines,
    activityHeatmap,
    sectorRadar,
    complianceTasks,
    recentCriticalAlerts,
    recentContracts,
  ] = await Promise.all([
    getCockpitOrgMeta(orgId),
    getCockpitStats(orgId),
    getRiskWorkers(orgId),
    getUpcomingDeadlines(orgId),
    getActivityHeatmap(orgId),
    getSectorRadar(orgId, scoreSnapshot.breakdown),
    getComplianceTaskStats(orgId),
    getRecentCriticalAlerts(orgId),
    getRecentContracts(orgId),
  ])

  return {
    org: orgMeta,
    stats,
    riskWorkers,
    upcomingDeadlines,
    activityHeatmap,
    sectorRadar,
    complianceTasks,
    recentCriticalAlerts,
    recentContracts,
    topRisk: scoreSnapshot.topRisk,
    scoreSnapshot,
    complianceBreakdown: scoreSnapshot.breakdown,
  }
}

// Tipo helper para imports cuando se necesite el Prisma Decimal
export type { Prisma }
