import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/alerts/counts - Lightweight badge counts
// =============================================
export const GET = withPlanGate('alertas_basicas', async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [pendingAlerts, criticalAlerts, expiringContracts] = await Promise.all([
    prisma.workerAlert.count({
      where: { orgId, resolvedAt: null },
    }),
    prisma.workerAlert.count({
      where: { orgId, resolvedAt: null, severity: 'CRITICAL' },
    }),
    prisma.contract.count({
      where: {
        orgId,
        status: { notIn: ['EXPIRED', 'ARCHIVED'] },
        expiresAt: { gte: now, lte: in30Days },
      },
    }),
  ])

  return NextResponse.json({
    pendingAlerts,
    criticalAlerts,
    expiringContracts,
  })
})

