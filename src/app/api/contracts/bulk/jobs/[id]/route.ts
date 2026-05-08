import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/contracts/bulk/jobs/[id]
// Devuelve el audit trail de una corrida bulk (estado, contadores, errores).
// =============================================
export const GET = withPlanGateParams<{ id: string }>('contratos', async (_req: NextRequest, ctx: AuthContext, params) => {
  const job = await prisma.bulkContractJob.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!job) return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })

  return NextResponse.json({
    data: {
      ...job,
      startedAt: job.startedAt?.toISOString() ?? null,
      finishedAt: job.finishedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    },
  })
})

