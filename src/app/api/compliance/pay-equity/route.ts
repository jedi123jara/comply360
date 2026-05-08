import { NextRequest, NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzePayEquity, type PayEquityWorker } from '@/lib/compliance/pay-equity'

export const runtime = 'nodejs'

export const GET = withPlanGate('reportes_pdf', async (_req: NextRequest, ctx: AuthContext) => {
  const rows = await prisma.worker.findMany({
    where: { orgId: ctx.orgId, status: 'ACTIVE' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      gender: true,
      position: true,
      sueldoBruto: true,
    },
  })

  const workers: PayEquityWorker[] = rows.map(r => ({
    id: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    gender: r.gender,
    position: r.position,
    sueldoBruto: r.sueldoBruto != null ? Number(r.sueldoBruto) : 0,
  }))

  const report = analyzePayEquity(workers)
  return NextResponse.json(report)
})

