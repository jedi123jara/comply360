/**
 * GET /api/vacaciones
 *
 * Resumen de vacaciones de todos los trabajadores activos de la org:
 * registros, días gozados/pendientes, alertas de doble período.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

const MYPE_REGIMENS = ['MYPE_MICRO', 'MYPE_PEQUENA']

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId

  const workers = await prisma.worker.findMany({
    where: { orgId, status: 'ACTIVE' },
    orderBy: [{ department: 'asc' }, { lastName: 'asc' }],
    include: {
      vacations: {
        orderBy: { periodoInicio: 'asc' },
      },
    },
  })

  const now = new Date()

  const result = workers.map(w => {
    const diasPorAnio = MYPE_REGIMENS.includes(w.regimenLaboral) ? 15 : 30
    const anosServicio = Math.floor(
      (now.getTime() - w.fechaIngreso.getTime()) / (365.25 * 24 * 3600 * 1000),
    )

    const records = w.vacations.map(r => ({
      id: r.id,
      periodoInicio: r.periodoInicio,
      periodoFin: r.periodoFin,
      diasCorresponden: r.diasCorresponden,
      diasGozados: r.diasGozados,
      diasPendientes: r.diasPendientes,
      fechaGoce: r.fechaGoce,
      esDoble: r.esDoble,
      createdAt: r.createdAt,
    }))

    const totalDiasPendientes = records.reduce((s, r) => s + r.diasPendientes, 0)
    const periodosSinGoce = records.filter(r => r.diasGozados === 0).length
    const periodsWithoutRecord = Math.max(0, anosServicio - records.length)

    return {
      worker: {
        id: w.id,
        firstName: w.firstName,
        lastName: w.lastName,
        position: w.position ?? '',
        department: w.department ?? '',
        fechaIngreso: w.fechaIngreso,
        regimenLaboral: w.regimenLaboral,
        anosServicio,
        diasPorAnio,
      },
      records,
      summary: {
        totalPeriodos: records.length,
        totalDiasPendientes,
        periodosSinGoce,
        tieneRiesgoDoble: periodosSinGoce >= 2,
        periodosEsperados: anosServicio,
        periodsWithoutRecord,
      },
    }
  })

  const totals = {
    totalWorkers: workers.length,
    conPendientes: result.filter(r => r.summary.totalDiasPendientes > 0).length,
    dobleRiesgo: result.filter(r => r.summary.tieneRiesgoDoble).length,
    sinRegistro: result.filter(r => r.summary.periodsWithoutRecord > 0).length,
    totalDiasPendientesOrg: result.reduce((s, r) => s + r.summary.totalDiasPendientes, 0),
  }

  return NextResponse.json({ workers: result, totals })
})
