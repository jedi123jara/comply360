/**
 * Founder Metrics — Agrega métricas clave del SaaS para el Founder Console y
 * el Daily Digest.
 *
 * Una sola función `computeFounderMetrics()` produce el snapshot completo.
 * Se consume desde:
 *  - `/admin/page.tsx` (server component, overview)
 *  - `/api/admin/metrics/overview` (endpoint protegido SUPER_ADMIN)
 *  - `/api/cron/founder-digest` (email diario a las 8am Lima)
 *
 * Convenciones:
 *  - Montos siempre en soles (PEN). Cliente decide si formatear con `S/`.
 *  - Deltas se calculan vs el mismo tamaño de ventana inmediatamente anterior.
 *    Ej: `newOrgs7d` delta compara [hoy - 7d, hoy] vs [hoy - 14d, hoy - 7d].
 *  - Todas las queries filtran SOLO lo que SUPER_ADMIN debe ver — no hay orgId
 *    scoping porque el founder ve la plataforma entera.
 *  - Nunca devolver PII (emails, nombres) al frontend salvo en listas explicitas.
 */

import { prisma } from '@/lib/prisma'
import type { Plan } from '@/generated/prisma/client'
import { PLANS } from '@/lib/constants'

// =============================================================================
// TYPES
// =============================================================================

export interface FounderMetrics {
  generatedAt: string // ISO
  range: {
    now: string
    last7d: string
    last30d: string
    prev7d: string
    prev30d: string
  }

  business: {
    mrr: number
    arr: number
    mrrDeltaVsPrev30d: number
    mrrDeltaPct: number | null
    activeSubscriptions: number
    activeSubsByPlan: Record<string, number>
    trialingCount: number
    pastDueCount: number
    cancelledLast30d: number
    churnRatePct: number | null // (cancelled last30d / active at start of window) × 100
  }

  growth: {
    totalOrgs: number
    newOrgs7d: number
    newOrgs30d: number
    newOrgsDeltaPct7d: number | null
    onboardingCompletedPct: number | null
    activations7d: number // orgs con 1er worker creado en los 7d del signup
    activationRate7d: number | null // % orgs creadas 7-14d atrás que activaron
    leadsCaptured30d: number // si existe LeadCapture via Lead model, sino 0
  }

  engagement: {
    dau: number // distinct users con actividad ayer (audit_logs)
    wau: number // distinct users últimos 7d
    mau: number // distinct users últimos 30d
    stickinessPct: number | null // (DAU / MAU) × 100
    workerLoginsLast7d: number
  }

  adoption: {
    // % de orgs que usaron cada feature en los últimos 30d
    diagnosticPct: number | null
    simulacroPct: number | null
    copilotPct: number | null
    contractGenPct: number | null
    aiVerifyPct: number | null
    workerPortalPct: number | null
  }

  health: {
    trialsExpiring7d: number
    churnRiskOrgs: number // orgs sin actividad en 14d
    openComplaints: number
    criticalAlertsOpen: number
  }

  aiOps: {
    aiVerifyAutoVerified30d: number
    aiVerifyNeedsReview30d: number
    aiVerifyMismatch30d: number
    copilotQueries30d: number
  }

  topEvents7d: Array<{ action: string; count: number }>

  // Narrativa lista para el email digest — corta, digerible
  narrative: string[]
}

export interface OrgHealthRow {
  id: string
  name: string
  razonSocial: string | null
  plan: Plan
  workers: number
  complianceScore: number | null
  lastActiveAt: Date | null
  mrrContribution: number
  trialEndsAt: Date | null
  healthBadge: 'healthy' | 'trial' | 'at-risk' | 'churning' | 'new'
  createdAt: Date
}

// =============================================================================
// HELPERS
// =============================================================================

const MS_DAY = 24 * 60 * 60 * 1000

function planPrice(plan: Plan): number {
  // Lee de PLANS en constants.ts — fuente única de verdad de pricing
  switch (plan) {
    case 'STARTER':
      return PLANS.STARTER.price
    case 'EMPRESA':
      return PLANS.EMPRESA.price
    case 'PRO':
      return PLANS.PRO.price
    case 'ENTERPRISE':
      return PLANS.ENTERPRISE.price
    case 'FREE':
    default:
      return 0
  }
}

function pct(part: number, total: number): number | null {
  if (total <= 0) return null
  return Math.round((part / total) * 100 * 10) / 10 // 1 decimal
}

function deltaPct(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null
  return Math.round(((current - previous) / previous) * 100 * 10) / 10
}

// =============================================================================
// MAIN AGGREGATOR
// =============================================================================

export async function computeFounderMetrics(): Promise<FounderMetrics> {
  const now = new Date()
  const last7d = new Date(now.getTime() - 7 * MS_DAY)
  const last14d = new Date(now.getTime() - 14 * MS_DAY)
  const last30d = new Date(now.getTime() - 30 * MS_DAY)
  const last60d = new Date(now.getTime() - 60 * MS_DAY)
  const yesterdayStart = new Date(now.getTime() - MS_DAY)

  // ─── Suscripciones activas por plan (para MRR) ──────────────────────────────
  const activeSubs = await prisma.subscription.findMany({
    where: { status: { in: ['ACTIVE', 'TRIALING'] } },
    select: { plan: true, status: true, orgId: true, currentPeriodEnd: true, createdAt: true },
  })

  const activeSubsByPlan: Record<string, number> = {
    STARTER: 0, EMPRESA: 0, PRO: 0, ENTERPRISE: 0,
  }
  let mrr = 0
  let trialingCount = 0
  for (const sub of activeSubs) {
    if (sub.status === 'TRIALING') trialingCount += 1
    // Solo cuenta al MRR suscripciones con pagos reales — TRIALING no pagan aún
    if (sub.status === 'ACTIVE') {
      activeSubsByPlan[sub.plan] = (activeSubsByPlan[sub.plan] ?? 0) + 1
      mrr += planPrice(sub.plan)
    }
  }

  // MRR delta: suscripciones activas hace 30d para comparar
  const subsActive30dAgo = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      createdAt: { lte: last30d },
      OR: [{ cancelledAt: null }, { cancelledAt: { gt: last30d } }],
    },
    select: { plan: true },
  })
  const mrrPrev = subsActive30dAgo.reduce((acc, s) => acc + planPrice(s.plan), 0)
  const mrrDeltaVsPrev30d = mrr - mrrPrev
  const mrrDeltaPct = deltaPct(mrr, mrrPrev)

  // Churn: subs canceladas en últimos 30d
  const [pastDueCount, cancelledLast30d] = await Promise.all([
    prisma.subscription.count({ where: { status: 'PAST_DUE' } }),
    prisma.subscription.count({
      where: { status: 'CANCELLED', cancelledAt: { gte: last30d } },
    }),
  ])
  const churnRatePct = pct(cancelledLast30d, activeSubs.length + cancelledLast30d)

  // ─── Growth: signups + activaciones ─────────────────────────────────────────
  const [totalOrgs, newOrgs7d, newOrgs30d, newOrgsPrev7d, onboardedOrgs] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { createdAt: { gte: last7d } } }),
    prisma.organization.count({ where: { createdAt: { gte: last30d } } }),
    prisma.organization.count({
      where: { createdAt: { gte: last14d, lt: last7d } },
    }),
    prisma.organization.count({ where: { onboardingCompleted: true } }),
  ])

  // Activación: orgs creadas en últimos 7-14d que tienen ≥1 worker
  // Usamos 7-14d para tener ventana de "tiempo suficiente para activar"
  const recentCohortOrgs = await prisma.organization.findMany({
    where: { createdAt: { gte: last14d, lt: last7d } },
    select: { id: true },
  })
  const cohortIds = recentCohortOrgs.map((o) => o.id)
  let activations7d = 0
  if (cohortIds.length > 0) {
    activations7d = await prisma.organization.count({
      where: {
        id: { in: cohortIds },
        workers: { some: {} },
      },
    })
  }

  // Leads capturados (si existe modelo Lead; sino 0)
  let leadsCaptured30d = 0
  try {
    // Uso dynamic check en vez de import estático porque Lead puede no existir
    const leadModel = (prisma as unknown as { lead?: { count: (args: unknown) => Promise<number> } }).lead
    if (leadModel) {
      leadsCaptured30d = await leadModel.count({
        where: { createdAt: { gte: last30d } },
      })
    }
  } catch {
    leadsCaptured30d = 0
  }

  // ─── Engagement: DAU / WAU / MAU via AuditLog ──────────────────────────────
  const [dauRows, wauRows, mauRows] = await Promise.all([
    prisma.auditLog.findMany({
      where: { createdAt: { gte: yesterdayStart }, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: last7d }, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.auditLog.findMany({
      where: { createdAt: { gte: last30d }, userId: { not: null } },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])
  const dau = dauRows.length
  const wau = wauRows.length
  const mau = mauRows.length
  const stickinessPct = pct(dau, mau)

  // Worker portal logins (aproximado: audit logs con action que comience con worker.*)
  const workerLoginsLast7d = await prisma.auditLog.count({
    where: {
      createdAt: { gte: last7d },
      action: { startsWith: 'worker_portal.' },
    },
  })

  // ─── Adoption: % orgs usando cada feature en 30d ────────────────────────────
  const [diagnosticOrgs, simulacroOrgs, copilotOrgs, contractOrgs, aiVerifyOrgs, workerPortalOrgs] =
    await Promise.all([
      prisma.complianceDiagnostic.groupBy({
        by: ['orgId'],
        where: { createdAt: { gte: last30d }, type: { in: ['FULL', 'EXPRESS'] } },
      }),
      prisma.complianceDiagnostic.groupBy({
        by: ['orgId'],
        where: { createdAt: { gte: last30d }, type: 'SIMULATION' },
      }),
      prisma.auditLog.groupBy({
        by: ['orgId'],
        where: { createdAt: { gte: last30d }, action: { startsWith: 'copilot.' } },
      }),
      prisma.contract.groupBy({
        by: ['orgId'],
        where: { createdAt: { gte: last30d } },
      }),
      prisma.auditLog.groupBy({
        by: ['orgId'],
        where: { createdAt: { gte: last30d }, action: { startsWith: 'document.ai_' } },
      }),
      prisma.auditLog.groupBy({
        by: ['orgId'],
        where: { createdAt: { gte: last30d }, action: { startsWith: 'worker_portal.' } },
      }),
    ])

  const adoption = {
    diagnosticPct: pct(diagnosticOrgs.length, totalOrgs),
    simulacroPct: pct(simulacroOrgs.length, totalOrgs),
    copilotPct: pct(copilotOrgs.length, totalOrgs),
    contractGenPct: pct(contractOrgs.length, totalOrgs),
    aiVerifyPct: pct(aiVerifyOrgs.length, totalOrgs),
    workerPortalPct: pct(workerPortalOrgs.length, totalOrgs),
  }

  // ─── Health: riesgos ────────────────────────────────────────────────────────
  const [trialsExpiring7d, openComplaints, criticalAlertsOpen] = await Promise.all([
    prisma.organization.count({
      where: {
        planExpiresAt: { gte: now, lte: new Date(now.getTime() + 7 * MS_DAY) },
      },
    }),
    prisma.complaint.count({
      where: { status: { in: ['RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING'] } },
    }),
    prisma.workerAlert.count({
      where: { resolvedAt: null, severity: 'CRITICAL' },
    }).catch(() => 0),
  ])

  // Orgs en riesgo: crearon ≥14d atrás Y no tienen actividad en los últimos 14d
  const orgsWithRecentActivity = await prisma.auditLog.groupBy({
    by: ['orgId'],
    where: { createdAt: { gte: last14d } },
  })
  const activeOrgIds = new Set(orgsWithRecentActivity.map((r) => r.orgId))
  const allOldOrgs = await prisma.organization.findMany({
    where: { createdAt: { lt: last14d } },
    select: { id: true },
  })
  const churnRiskOrgs = allOldOrgs.filter((o) => !activeOrgIds.has(o.id)).length

  // ─── AI ops ─────────────────────────────────────────────────────────────────
  const [autoVerified, needsReview, mismatch, copilotQueries] = await Promise.all([
    prisma.auditLog.count({
      where: { createdAt: { gte: last30d }, action: 'document.ai_verified' },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: last30d }, action: 'document.ai_reviewed' },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: last30d }, action: 'document.ai_mismatch' },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: last30d }, action: { startsWith: 'copilot.' } },
    }),
  ])

  // ─── Top events últimos 7d ──────────────────────────────────────────────────
  const topEventsRaw = await prisma.auditLog.groupBy({
    by: ['action'],
    where: { createdAt: { gte: last7d } },
    _count: { action: true },
    orderBy: { _count: { action: 'desc' } },
    take: 10,
  })
  const topEvents7d = topEventsRaw.map((e) => ({
    action: e.action,
    count: e._count.action,
  }))

  // ─── Narrativa (lista de oraciones cortas para el email digest) ─────────────
  const narrative: string[] = []
  if (mrrDeltaVsPrev30d > 0) {
    narrative.push(`MRR subió S/ ${mrrDeltaVsPrev30d.toFixed(0)} en 30 días (${mrrDeltaPct}%).`)
  } else if (mrrDeltaVsPrev30d < 0) {
    narrative.push(`MRR bajó S/ ${Math.abs(mrrDeltaVsPrev30d).toFixed(0)} en 30 días.`)
  }
  if (newOrgs7d > 0) {
    narrative.push(`${newOrgs7d} empresa${newOrgs7d === 1 ? '' : 's'} nueva${newOrgs7d === 1 ? '' : 's'} esta semana.`)
  }
  if (trialsExpiring7d > 0) {
    narrative.push(`⚠️ ${trialsExpiring7d} trial${trialsExpiring7d === 1 ? '' : 's'} expira${trialsExpiring7d === 1 ? '' : 'n'} en 7 días.`)
  }
  if (churnRiskOrgs > 0) {
    narrative.push(`🔥 ${churnRiskOrgs} org${churnRiskOrgs === 1 ? '' : 's'} sin actividad en 14+ días.`)
  }
  if (autoVerified > 0) {
    narrative.push(`IA auto-verificó ${autoVerified} documentos este mes.`)
  }
  if (dau > 0 && mau > 0 && stickinessPct !== null) {
    narrative.push(`Stickiness: ${stickinessPct}% (DAU/MAU).`)
  }
  if (narrative.length === 0) {
    narrative.push('Sin eventos destacables hoy — buen momento para enfocarte en growth.')
  }

  return {
    generatedAt: now.toISOString(),
    range: {
      now: now.toISOString(),
      last7d: last7d.toISOString(),
      last30d: last30d.toISOString(),
      prev7d: last14d.toISOString(),
      prev30d: last60d.toISOString(),
    },

    business: {
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      mrrDeltaVsPrev30d: Math.round(mrrDeltaVsPrev30d),
      mrrDeltaPct,
      activeSubscriptions: activeSubs.length,
      activeSubsByPlan,
      trialingCount,
      pastDueCount,
      cancelledLast30d,
      churnRatePct,
    },

    growth: {
      totalOrgs,
      newOrgs7d,
      newOrgs30d,
      newOrgsDeltaPct7d: deltaPct(newOrgs7d, newOrgsPrev7d),
      onboardingCompletedPct: pct(onboardedOrgs, totalOrgs),
      activations7d,
      activationRate7d: pct(activations7d, cohortIds.length),
      leadsCaptured30d,
    },

    engagement: {
      dau,
      wau,
      mau,
      stickinessPct,
      workerLoginsLast7d,
    },

    adoption,

    health: {
      trialsExpiring7d,
      churnRiskOrgs,
      openComplaints,
      criticalAlertsOpen,
    },

    aiOps: {
      aiVerifyAutoVerified30d: autoVerified,
      aiVerifyNeedsReview30d: needsReview,
      aiVerifyMismatch30d: mismatch,
      copilotQueries30d: copilotQueries,
    },

    topEvents7d,
    narrative,
  }
}

// =============================================================================
// ORG HEALTH LIST — para /admin/orgs
// =============================================================================

export async function listOrgHealth(opts?: {
  search?: string
  plan?: Plan
  limit?: number
  offset?: number
}): Promise<{ rows: OrgHealthRow[]; total: number }> {
  const now = new Date()
  const last14d = new Date(now.getTime() - 14 * MS_DAY)
  const last7d = new Date(now.getTime() - 7 * MS_DAY)

  const where: {
    plan?: Plan
    OR?: Array<
      | { name: { contains: string; mode: 'insensitive' } }
      | { razonSocial: { contains: string; mode: 'insensitive' } }
      | { ruc: { contains: string } }
    >
  } = {}
  if (opts?.plan) where.plan = opts.plan
  if (opts?.search) {
    where.OR = [
      { name: { contains: opts.search, mode: 'insensitive' } },
      { razonSocial: { contains: opts.search, mode: 'insensitive' } },
      { ruc: { contains: opts.search } },
    ]
  }

  const [total, orgs] = await Promise.all([
    prisma.organization.count({ where }),
    prisma.organization.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
      skip: opts?.offset ?? 0,
      select: {
        id: true,
        name: true,
        razonSocial: true,
        plan: true,
        planExpiresAt: true,
        createdAt: true,
        _count: { select: { workers: true } },
      },
    }),
  ])

  // Last activity por org (max createdAt de auditLog)
  const lastActivity = await prisma.auditLog.groupBy({
    by: ['orgId'],
    where: { orgId: { in: orgs.map((o) => o.id) } },
    _max: { createdAt: true },
  })
  const lastActivityMap = new Map(lastActivity.map((a) => [a.orgId, a._max.createdAt]))

  // Score de compliance más reciente por org
  const scores = await prisma.complianceScore.findMany({
    where: { orgId: { in: orgs.map((o) => o.id) } },
    orderBy: { calculatedAt: 'desc' },
    select: { orgId: true, scoreGlobal: true, calculatedAt: true },
  })
  const scoreMap = new Map<string, number>()
  for (const s of scores) {
    if (!scoreMap.has(s.orgId)) scoreMap.set(s.orgId, s.scoreGlobal)
  }

  const rows: OrgHealthRow[] = orgs.map((o) => {
    const lastActive = lastActivityMap.get(o.id) ?? null
    let healthBadge: OrgHealthRow['healthBadge'] = 'healthy'
    if (o.createdAt > last7d) healthBadge = 'new'
    else if (o.planExpiresAt && o.planExpiresAt > now && o.plan === 'STARTER') healthBadge = 'trial'
    else if (!lastActive || lastActive < last14d) healthBadge = 'at-risk'
    else if (o.planExpiresAt && o.planExpiresAt < now) healthBadge = 'churning'

    return {
      id: o.id,
      name: o.name,
      razonSocial: o.razonSocial,
      plan: o.plan,
      workers: o._count.workers,
      complianceScore: scoreMap.get(o.id) ?? null,
      lastActiveAt: lastActive,
      mrrContribution: planPrice(o.plan),
      trialEndsAt: o.planExpiresAt,
      healthBadge,
      createdAt: o.createdAt,
    }
  })

  return { rows, total }
}
