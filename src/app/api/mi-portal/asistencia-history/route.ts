/**
 * GET /api/mi-portal/asistencia-history
 *
 * Últimas 30 marcaciones del worker autenticado. Usado por /mi-portal/asistencia
 * para mostrar el historial.
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const rows = await prisma.attendance.findMany({
    where: { workerId: ctx.workerId },
    orderBy: { clockIn: 'desc' },
    take: 30,
    select: {
      id: true,
      clockIn: true,
      clockOut: true,
      status: true,
      hoursWorked: true,
    },
  })

  return NextResponse.json({
    history: rows.map((r) => ({
      id: r.id,
      clockIn: r.clockIn.toISOString(),
      clockOut: r.clockOut?.toISOString() ?? null,
      status: String(r.status),
      hoursWorked: r.hoursWorked ? Number(r.hoursWorked.toString()) : null,
    })),
  })
})
