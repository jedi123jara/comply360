import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import {
  buildComplaintDeadlines,
  COMPLAINT_REGIMES,
  getRegimeLabel,
  type ComplaintRegimeValue,
  type ComplaintTypeValue,
} from '@/lib/complaints/regime-rules'

interface ComplaintDeadlines {
  complaintId: string
  code: string
  type: string
  regime: ComplaintRegimeValue
  regimeLabel: string
  receivedAt: string
  occurredAt: string | null
  currentStatus: string
  deadlines: ReturnType<typeof buildComplaintDeadlines>
  requiresDeadlineTracking: boolean
}

// =============================================
// GET /api/complaints/deadlines
// Motor de plazos para HSL, SST y MPD.
// =============================================
export const GET = withPlanGate('denuncias', async (_req, ctx: AuthContext) => {
  const orgId = ctx.orgId

  const complaints = await prisma.complaint.findMany({
    where: {
      orgId,
      status: { notIn: ['RESOLVED', 'DISMISSED'] },
    },
    orderBy: { receivedAt: 'desc' },
    select: {
      id: true,
      code: true,
      regime: true,
      type: true,
      status: true,
      receivedAt: true,
      occurredAt: true,
    },
  })

  const results: ComplaintDeadlines[] = complaints.map((c) => {
    const regime = c.regime as ComplaintRegimeValue
    return {
      complaintId: c.id,
      code: c.code,
      type: c.type,
      regime,
      regimeLabel: getRegimeLabel(regime),
      receivedAt: c.receivedAt.toISOString(),
      occurredAt: c.occurredAt?.toISOString() ?? null,
      currentStatus: c.status,
      deadlines: buildComplaintDeadlines({
        regime,
        type: c.type as ComplaintTypeValue,
        receivedAt: c.receivedAt,
        occurredAt: c.occurredAt,
      }),
      requiresDeadlineTracking: true,
    }
  })

  const overdueCount = results.reduce((sum, r) =>
    sum + r.deadlines.filter(d => d.status === 'OVERDUE').length, 0)
  const expiringSoonCount = results.reduce((sum, r) =>
    sum + r.deadlines.filter(d => d.status === 'EXPIRING_SOON').length, 0)
  const byRegime = results.reduce((acc, r) => {
    acc[r.regime] = (acc[r.regime] ?? 0) + 1
    return acc
  }, {} as Record<ComplaintRegimeValue, number>)

  return NextResponse.json({
    data: {
      complaints: results,
      summary: {
        total: results.length,
        overdueDeadlines: overdueCount,
        expiringSoonDeadlines: expiringSoonCount,
        compliant: overdueCount === 0,
        byRegime,
      },
      baseLegal: {
        HSL: COMPLAINT_REGIMES.HSL.description,
        SST: COMPLAINT_REGIMES.SST.description,
        MPD: COMPLAINT_REGIMES.MPD.description,
      },
    },
  })
})
