import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calculateSstScore } from '@/lib/compliance/sst-score'

// GET /api/sst/summary
// Snapshot liviano para el hub SST. Mantiene la UI del dashboard libre de 404s
// y reutiliza el score SST ya existente como fuente de verdad.
export const GET = withPlanGate('sst_completo', async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const last12Months = new Date(now)
  last12Months.setMonth(last12Months.getMonth() - 12)

  const [
    score,
    workersActivos,
    politicaVigente,
    ipercCount,
    ipercPendiente,
    capacitacionesEsteAnio,
    accidentesUlt30d,
    examenesVencidos,
    eppEntregadosUlt12m,
  ] = await Promise.all([
    calculateSstScore(orgId),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.sstRecord.count({ where: { orgId, type: 'POLITICA_SST', status: 'COMPLETED' } }),
    prisma.iPERCBase.count({ where: { orgId } }),
    prisma.iPERCBase.count({ where: { orgId, estado: { not: 'VIGENTE' } } }),
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'CAPACITACION',
        status: 'COMPLETED',
        completedAt: { gte: yearStart },
      },
    }),
    prisma.accidente.count({ where: { orgId, fechaHora: { gte: last30Days } } }),
    prisma.eMO.count({
      where: {
        orgId,
        proximoExamenAntes: { lt: now },
      },
    }),
    prisma.sstRecord.count({
      where: {
        orgId,
        type: 'ENTREGA_EPP',
        status: 'COMPLETED',
        completedAt: { gte: last12Months },
      },
    }),
  ])

  const data = {
    politicaVigente: politicaVigente > 0,
    ipercCount,
    ipercPendiente,
    capacitacionesEsteAnio,
    accidentesUlt30d,
    examenesVencidos,
    eppPendientes: Math.max(0, workersActivos - eppEntregadosUlt12m),
    scoreSst: score.scoreGlobal,
  }

  return NextResponse.json({ data })
})
