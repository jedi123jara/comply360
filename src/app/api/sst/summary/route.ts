import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { calcularScoreSst } from '@/lib/sst/scoring'
import { loadSstScoreSnapshot } from '@/lib/sst/score-snapshot'

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
    scoreSnapshot,
    workersActivos,
    politicaRecordVigente,
    politicaDocVigente,
    ipercCount,
    ipercPendiente,
    capacitacionesRecordsEsteAnio,
    capacitacionesModernasEsteAnio,
    accidentesUlt30d,
    examenesVencidos,
    eppEntregadosUlt12m,
  ] = await Promise.all([
    loadSstScoreSnapshot(orgId, now),
    prisma.worker.count({ where: { orgId, status: { not: 'TERMINATED' } } }),
    prisma.sstRecord.count({ where: { orgId, type: 'POLITICA_SST', status: 'COMPLETED' } }),
    prisma.orgDocument.findFirst({
      where: {
        orgId,
        type: { in: ['POLITICA_SST', 'REGLAMENTO_SST'] },
        fileUrl: { not: null },
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
      select: { id: true },
    }),
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
    prisma.workerCapacitacionSST.findMany({
      where: { orgId, fechaCapacitacion: { gte: yearStart }, tipo: { not: 'HOSTIGAMIENTO' } },
      select: { tipo: true, temario: true, fechaCapacitacion: true },
    }),
    prisma.accidente.count({ where: { orgId, fechaHora: { gte: last30Days } } }),
    prisma.eMO.count({
      where: {
        orgId,
        proximoExamenAntes: { lt: now },
      },
    }),
    prisma.workerEPP.findMany({
      where: {
        orgId,
        fechaEntrega: { gte: last12Months },
        OR: [{ fechaVencimiento: null }, { fechaVencimiento: { gte: now } }],
      },
      select: { workerId: true },
    }),
  ])
  const score = calcularScoreSst(scoreSnapshot.snapshot, now)
  const capacitacionesModernas = new Set(
    capacitacionesModernasEsteAnio.map((cap) =>
      `${cap.fechaCapacitacion.toISOString().slice(0, 10)}|${cap.tipo}|${cap.temario}`,
    ),
  ).size
  const eppWorkers = new Set(eppEntregadosUlt12m.map((epp) => epp.workerId)).size

  const data = {
    politicaVigente: politicaRecordVigente > 0 || Boolean(politicaDocVigente),
    ipercCount,
    ipercPendiente,
    capacitacionesEsteAnio: Math.max(capacitacionesRecordsEsteAnio, capacitacionesModernas),
    accidentesUlt30d,
    examenesVencidos,
    eppPendientes: Math.max(0, workersActivos - eppWorkers),
    scoreSst: score.scoreGlobal,
  }

  return NextResponse.json({ data })
})
