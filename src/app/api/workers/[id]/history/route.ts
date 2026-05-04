/**
 * GET /api/workers/[id]/history
 *
 * Devuelve el timeline de eventos del trabajador combinando:
 *   - WorkerHistoryEvent (Ola 2 — estructurado, before/after por campo)
 *   - AuditLog legacy (entityType=Worker) — eventos previos a Ola 2
 *
 * Plan gating (Ola 1+2 decisión 2026-05-04):
 *   - STARTER: últimos 90 días
 *   - EMPRESA: últimos 12 meses (feature `historial_extendido_12m`)
 *   - PRO+:    sin límite (feature `historial_infinito`)
 *
 * El response incluye `truncated: boolean` para que la UI muestre banner de
 * upgrade cuando hay eventos ocultos por el plan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { planHasFeature } from '@/lib/plan-features'

interface UnifiedEvent {
  id: string
  source: 'history' | 'audit'
  type: string
  action?: string
  before?: unknown
  after?: unknown
  reason?: string | null
  evidenceUrl?: string | null
  userId: string | null
  userName: string | null
  metadata: unknown
  createdAt: string
}

export const GET = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const { id: workerId } = params
  const orgId = ctx.orgId

  // Verifica que el worker pertenece a la org (incluye soft-deleted para auditoría)
  const worker = await prisma.worker.findFirst({
    where: { id: workerId, orgId },
    select: { id: true },
  })
  if (!worker) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get('pageSize') ?? '20', 10)))
  const skip = (page - 1) * pageSize

  // ── Plan gate: ventana visible según el plan ─────────────────────────────
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { plan: true },
  })
  const plan = org?.plan ?? 'STARTER'
  const hasInfinito = planHasFeature(plan, 'historial_infinito')
  const hasExtendido = planHasFeature(plan, 'historial_extendido_12m')

  let windowDays: number | null
  let windowLabel: string
  if (hasInfinito) {
    windowDays = null
    windowLabel = 'Sin límite'
  } else if (hasExtendido) {
    windowDays = 365
    windowLabel = 'Últimos 12 meses'
  } else {
    windowDays = 90
    windowLabel = 'Últimos 90 días'
  }

  const sinceDate = windowDays === null
    ? null
    : new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
  const dateFilter = sinceDate ? { createdAt: { gte: sinceDate } } : {}

  // ── Queries paralelas ────────────────────────────────────────────────────
  const [historyEvents, auditEntries, totalHistoryAll, totalHistoryWindow] = await Promise.all([
    prisma.workerHistoryEvent.findMany({
      where: { workerId, orgId, ...dateFilter },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.auditLog.findMany({
      where: { orgId, entityType: 'Worker', entityId: workerId, ...dateFilter },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadataJson: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    }),
    // Total absoluto de eventos (para banner "hay X ocultos por plan")
    prisma.workerHistoryEvent.count({ where: { workerId, orgId } }),
    prisma.workerHistoryEvent.count({ where: { workerId, orgId, ...dateFilter } }),
  ])

  // ── Merge unificado ───────────────────────────────────────────────────────
  const unified: UnifiedEvent[] = [
    ...historyEvents.map((e): UnifiedEvent => ({
      id: e.id,
      source: 'history',
      type: e.type,
      before: e.before,
      after: e.after,
      reason: e.reason,
      evidenceUrl: e.evidenceUrl,
      userId: e.triggeredBy,
      userName: null, // se resuelve más abajo si es necesario
      metadata: null,
      createdAt: e.createdAt.toISOString(),
    })),
    ...auditEntries.map((e): UnifiedEvent => ({
      id: e.id,
      source: 'audit',
      type: 'AUDIT_LOG',
      action: e.action,
      userId: e.userId,
      userName: e.user
        ? [e.user.firstName, e.user.lastName].filter(Boolean).join(' ') || e.user.email
        : null,
      metadata: e.metadataJson,
      createdAt: e.createdAt.toISOString(),
    })),
  ]

  // Ordenar por createdAt DESC y paginar
  unified.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const total = unified.length
  const paged = unified.slice(skip, skip + pageSize)

  // ── Response ──────────────────────────────────────────────────────────────
  const truncated = totalHistoryAll > totalHistoryWindow
  return NextResponse.json({
    data: paged,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    plan: {
      current: plan,
      windowLabel,
      windowDays,
      truncated,
      hiddenByPlan: Math.max(0, totalHistoryAll - totalHistoryWindow),
      upgradeHint: truncated
        ? hasExtendido
          ? 'Actualiza a PRO para ver el historial completo sin límite.'
          : 'Actualiza a EMPRESA para ver hasta 12 meses, o a PRO para sin límite.'
        : null,
    },
  })
})
