/**
 * GET /api/attendance/attempts — auditoría de intentos de fichado.
 *
 * Devuelve los registros de AttendanceAttempt (Fase 4) para el dashboard de
 * seguridad. Filtros: rango de fechas, result, workerId.
 *
 * Sin paginación tradicional — limit hardcoded a 500 (suficiente para el
 * dashboard del día/semana). Si crece, agregar paginación cursor-based.
 *
 * Auth: ADMIN+. Los workers no deben ver intentos de otros.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { AttendanceAttemptResult } from '@/generated/prisma/client'

const VALID_RESULTS: AttendanceAttemptResult[] = [
  'SUCCESS', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'ORG_MISMATCH',
  'GEOFENCE_OUT', 'GEOLOCATION_REQUIRED', 'PIN_WRONG', 'RATE_LIMITED',
  'ALREADY_CLOCKED', 'WORKER_NOT_FOUND', 'ERROR',
]

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const startDate = searchParams.get('startDate') // YYYY-MM-DD
  const endDate = searchParams.get('endDate')
  const resultFilter = searchParams.get('result')
  const workerId = searchParams.get('workerId')

  // Default: últimos 7 días
  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setDate(defaultStart.getDate() - 7)
  const start = startDate ? new Date(`${startDate}T00:00:00.000Z`) : defaultStart
  const end = endDate ? new Date(`${endDate}T23:59:59.999Z`) : now

  const where: Record<string, unknown> = {
    orgId: ctx.orgId,
    createdAt: { gte: start, lte: end },
  }
  if (resultFilter && VALID_RESULTS.includes(resultFilter as AttendanceAttemptResult)) {
    where.result = resultFilter
  }
  if (workerId) {
    where.workerId = workerId
  }

  const [attempts, totalCount, resultCounts] = await Promise.all([
    prisma.attendanceAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        workerId: true,
        result: true,
        reason: true,
        via: true,
        geoLat: true,
        geoLng: true,
        geoAccuracy: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
    prisma.attendanceAttempt.count({ where }),
    prisma.attendanceAttempt.groupBy({
      by: ['result'],
      where: { orgId: ctx.orgId, createdAt: { gte: start, lte: end } },
      _count: true,
    }),
  ])

  // Resolver nombres de workers (para no exponer IDs crudos en UI)
  const workerIds = Array.from(new Set(attempts.map(a => a.workerId).filter((id): id is string => !!id)))
  const workers = workerIds.length > 0
    ? await prisma.worker.findMany({
        where: { id: { in: workerIds }, orgId: ctx.orgId },
        select: { id: true, firstName: true, lastName: true, dni: true },
      })
    : []
  const workersById = new Map(workers.map(w => [w.id, w]))

  // Heatmap: distribución por hora del día (0-23) × result
  const heatmap: Record<string, Record<string, number>> = {}
  attempts.forEach(a => {
    const hour = a.createdAt.getHours().toString()
    if (!heatmap[hour]) heatmap[hour] = {}
    heatmap[hour][a.result] = (heatmap[hour][a.result] ?? 0) + 1
  })

  // Resumen
  const summary = {
    total: totalCount,
    byResult: resultCounts.reduce((acc, r) => {
      acc[r.result] = r._count
      return acc
    }, {} as Record<string, number>),
  }

  return NextResponse.json({
    range: { start: start.toISOString(), end: end.toISOString() },
    summary,
    heatmap,
    attempts: attempts.map(a => ({
      id: a.id,
      workerId: a.workerId,
      worker: a.workerId ? workersById.get(a.workerId) ?? null : null,
      result: a.result,
      reason: a.reason,
      via: a.via,
      geo: a.geoLat != null && a.geoLng != null
        ? {
            lat: Number(a.geoLat.toString()),
            lng: Number(a.geoLng.toString()),
            accuracy: a.geoAccuracy != null ? Number(a.geoAccuracy.toString()) : null,
          }
        : null,
      ipAddress: a.ipAddress,
      userAgent: a.userAgent,
      createdAt: a.createdAt.toISOString(),
    })),
  })
})
