/**
 * GET /api/mi-portal/boletas/serie?months=12
 *
 * Devuelve la serie temporal de boletas del trabajador para graficar
 * ingresos/descuentos/neto de los últimos N meses.
 *
 * Shape:
 * {
 *   serie: [
 *     { periodo: '2025-05', ingresos: 2350, descuentos: 350, neto: 2000, netoAceptado: true },
 *     ...
 *   ],
 *   promedio: { ingresos, descuentos, neto },
 * }
 *
 * Ordenado ascendente por periodo (más viejo primero) para que el chart
 * muestre la evolución de izquierda a derecha.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withWorkerAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const monthsParam = parseInt(searchParams.get('months') ?? '12', 10)
  const months = Math.max(3, Math.min(24, Number.isFinite(monthsParam) ? monthsParam : 12))

  const boletas = await prisma.payslip.findMany({
    where: { workerId: ctx.workerId, orgId: ctx.orgId, status: { not: 'ANULADA' } },
    orderBy: { periodo: 'desc' },
    take: months,
    select: {
      periodo: true,
      totalIngresos: true,
      totalDescuentos: true,
      netoPagar: true,
      acceptedAt: true,
    },
  })

  // Revertimos para que el chart vaya del más viejo al más reciente
  const serie = boletas
    .map((b) => ({
      periodo: b.periodo,
      ingresos: Number(b.totalIngresos),
      descuentos: Number(b.totalDescuentos),
      neto: Number(b.netoPagar),
      aceptado: b.acceptedAt !== null,
    }))
    .reverse()

  // Promedios del período
  const n = serie.length
  const promedio =
    n > 0
      ? {
          ingresos: Math.round((serie.reduce((s, b) => s + b.ingresos, 0) / n) * 100) / 100,
          descuentos: Math.round((serie.reduce((s, b) => s + b.descuentos, 0) / n) * 100) / 100,
          neto: Math.round((serie.reduce((s, b) => s + b.neto, 0) / n) * 100) / 100,
        }
      : { ingresos: 0, descuentos: 0, neto: 0 }

  return NextResponse.json({ serie, promedio, months })
})
