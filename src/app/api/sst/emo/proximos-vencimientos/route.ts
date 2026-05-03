import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/sst/emo/proximos-vencimientos
// Lista trabajadores con EMO próximo a vencer + trabajadores sin EMO
// activo. Sirve como fuente para alertas IPERC en el calendarizador.
//
// Query:
//   diasUmbral=N    — default 60 días
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const diasUmbral = Math.max(
    1,
    Math.min(365, parseInt(searchParams.get('diasUmbral') || '60', 10) || 60),
  )

  const now = new Date()
  const limit = new Date()
  limit.setDate(now.getDate() + diasUmbral)

  // EMO con proximoExamenAntes próximo a vencer
  const proximos = await prisma.eMO.findMany({
    where: {
      orgId: ctx.orgId,
      proximoExamenAntes: { gte: now, lte: limit },
    },
    orderBy: { proximoExamenAntes: 'asc' },
    select: {
      id: true,
      workerId: true,
      tipoExamen: true,
      aptitud: true,
      fechaExamen: true,
      proximoExamenAntes: true,
      worker: {
        select: { id: true, firstName: true, lastName: true, dni: true, position: true },
      },
    },
  })

  // EMO ya vencidos (proximoExamenAntes < now)
  const vencidos = await prisma.eMO.findMany({
    where: {
      orgId: ctx.orgId,
      proximoExamenAntes: { lt: now },
    },
    orderBy: { proximoExamenAntes: 'desc' },
    select: {
      id: true,
      workerId: true,
      tipoExamen: true,
      aptitud: true,
      fechaExamen: true,
      proximoExamenAntes: true,
      worker: {
        select: { id: true, firstName: true, lastName: true, dni: true, position: true },
      },
    },
  })

  // Trabajadores activos sin EMO registrado
  const workersConEmo = await prisma.eMO.findMany({
    where: { orgId: ctx.orgId },
    select: { workerId: true },
    distinct: ['workerId'],
  })
  const idsConEmo = new Set(workersConEmo.map((e) => e.workerId))

  const sinEmo = await prisma.worker.findMany({
    where: {
      orgId: ctx.orgId,
      status: 'ACTIVE',
      id: { notIn: Array.from(idsConEmo) },
    },
    select: { id: true, firstName: true, lastName: true, dni: true, position: true, fechaIngreso: true },
  })

  return NextResponse.json({
    diasUmbral,
    proximos,
    vencidos,
    sinEmo,
    counts: {
      proximos: proximos.length,
      vencidos: vencidos.length,
      sinEmo: sinEmo.length,
    },
  })
})
