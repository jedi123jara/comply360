/**
 * GET  /api/compliance/score — Current + historical compliance score
 * POST /api/compliance/score — Force recalculate and persist snapshot
 *
 * Used by:
 *  - Dashboard trend chart
 *  - Certification evaluation (criterion: scoreGlobal >= 90)
 *  - Gamification system (score milestones)
 *  - Reports module
 */

import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateComplianceScore } from '@/lib/compliance/score-calculator'

// ─── GET — latest score + history ────────────────────────────────────────────

export const GET = withPlanGate('alertas_basicas', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const months = Math.min(parseInt(searchParams.get('months') || '6'), 24)

  // Cutoff date for history
  const since = new Date()
  since.setMonth(since.getMonth() - months)

  const [current, history] = await Promise.all([
    // Latest persisted score
    prisma.complianceScore.findFirst({
      where: { orgId: ctx.orgId },
      orderBy: { calculatedAt: 'desc' },
      select: {
        scoreGlobal: true,
        scoreContratos: true,
        scoreSst: true,
        scoreDocumentos: true,
        scoreVencimientos: true,
        calculatedAt: true,
      },
    }),

    // Monthly history — one snapshot per month (first of each month)
    prisma.$queryRaw<Array<{
      month: string
      score_global: number
      score_contratos: number
      score_sst: number
    }>>`
      SELECT
        TO_CHAR(DATE_TRUNC('month', calculated_at), 'YYYY-MM') AS month,
        ROUND(AVG(score_global))    AS score_global,
        ROUND(AVG(score_contratos)) AS score_contratos,
        ROUND(AVG(score_sst))       AS score_sst
      FROM compliance_scores
      WHERE org_id = ${ctx.orgId}
        AND calculated_at >= ${since}
      GROUP BY DATE_TRUNC('month', calculated_at)
      ORDER BY month ASC
    `.catch(() => []), // Fall back to empty if not on PostgreSQL
  ])

  const historyMapped = (history as Array<{ month: string; score_global: number; score_contratos: number; score_sst: number }>).map(h => ({
    month: h.month,
    scoreGlobal: h.score_global,
    scoreContratos: h.score_contratos,
    scoreSst: h.score_sst,
  }))

  // Delta = current score - average del mes anterior al ultimo mes con data
  let delta: number | null = null
  if (current && historyMapped.length >= 2) {
    const prev = historyMapped[historyMapped.length - 2]?.scoreGlobal
    if (typeof prev === 'number') {
      delta = current.scoreGlobal - prev
    }
  }

  return NextResponse.json({
    // Top-level fields consumidos por el Cockpit v2 (src/app/dashboard/page.tsx)
    scoreGlobal: current?.scoreGlobal ?? null,
    delta,
    calculatedAt: current?.calculatedAt ?? null,
    // Compat con consumidores existentes
    current: current ?? null,
    history: historyMapped,
  })
})

// ─── POST — force recalculate + persist ──────────────────────────────────────

export const POST = withPlanGate('alertas_basicas', async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const result = await calculateComplianceScore(ctx.orgId)

    // Log to audit trail
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'COMPLIANCE_SCORE_RECALCULATED',
        entityType: 'Organization',
        entityId: ctx.orgId,
        metadataJson: {
          scoreGlobal: result.scoreGlobal,
          scoreContratos: result.scoreContratos,
          scoreSst: result.scoreSst,
          totalWorkers: result.totalWorkers,
          multaPotencial: result.multaPotencial,
        },
      },
    })

    return NextResponse.json({
      success: true,
      score: result,
      message: `Score recalculado: ${result.scoreGlobal}/100`,
    })
  } catch (error) {
    console.error('[Compliance Score] Recalculation error:', error)
    return NextResponse.json(
      { error: 'Error al recalcular el score de compliance' },
      { status: 500 }
    )
  }
})

