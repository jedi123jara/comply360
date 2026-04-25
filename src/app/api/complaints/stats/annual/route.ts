/**
 * GET /api/complaints/stats/annual?year=2026
 *
 * Estadísticas anuales ANONIMIZADAS del canal de denuncias. Responde la
 * exigencia del art. 14 de la Ley 27942 de reportar al MIMP un resumen
 * anual del canal sin exponer PII de denunciantes ni denunciados.
 *
 * NO incluye:
 *  - Nombres, emails o teléfonos (ni de reporter ni de accused)
 *  - Descripciones textuales de las denuncias
 *  - Timelines con contenido
 *
 * Sí incluye:
 *  - Conteos por tipo, severidad (IA), estado final
 *  - Tiempo promedio de resolución (días calendario)
 *  - Top cargos denunciados (sólo el cargo, no el nombre)
 *  - Ratio anónimas / nominadas
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import type { AuthContext } from '@/lib/auth'

export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const yearParam = searchParams.get('year')
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  if (!Number.isFinite(year) || year < 2015 || year > 2100) {
    return NextResponse.json({ error: 'Año inválido' }, { status: 400 })
  }

  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year + 1, 0, 1)

  // Todas las queries en paralelo, SIN traer texto libre ni nombres.
  const [
    totalCount,
    byType,
    bySeverity,
    byUrgency,
    byStatus,
    anonymousCount,
    resolvedComplaints,
    byAccusedPosition,
  ] = await Promise.all([
    prisma.complaint.count({
      where: { orgId, receivedAt: { gte: yearStart, lt: yearEnd } },
    }),
    prisma.complaint.groupBy({
      by: ['type'],
      where: { orgId, receivedAt: { gte: yearStart, lt: yearEnd } },
      _count: true,
    }),
    prisma.complaint.groupBy({
      by: ['severityAi'],
      where: { orgId, receivedAt: { gte: yearStart, lt: yearEnd } },
      _count: true,
    }),
    prisma.complaint.groupBy({
      by: ['urgencyAi'],
      where: { orgId, receivedAt: { gte: yearStart, lt: yearEnd } },
      _count: true,
    }),
    prisma.complaint.groupBy({
      by: ['status'],
      where: { orgId, receivedAt: { gte: yearStart, lt: yearEnd } },
      _count: true,
    }),
    prisma.complaint.count({
      where: { orgId, receivedAt: { gte: yearStart, lt: yearEnd }, isAnonymous: true },
    }),
    prisma.complaint.findMany({
      where: {
        orgId,
        receivedAt: { gte: yearStart, lt: yearEnd },
        resolvedAt: { not: null },
      },
      select: { receivedAt: true, resolvedAt: true },
    }),
    // Top 5 cargos denunciados (solo position, no name)
    prisma.complaint.groupBy({
      by: ['accusedPosition'],
      where: {
        orgId,
        receivedAt: { gte: yearStart, lt: yearEnd },
        accusedPosition: { not: null },
      },
      _count: true,
      orderBy: { _count: { accusedPosition: 'desc' } },
      take: 5,
    }),
  ])

  // Tiempo promedio de resolución en días calendario
  let avgResolutionDays: number | null = null
  if (resolvedComplaints.length > 0) {
    const totalMs = resolvedComplaints.reduce((sum, c) => {
      if (!c.resolvedAt) return sum
      return sum + (c.resolvedAt.getTime() - c.receivedAt.getTime())
    }, 0)
    avgResolutionDays = Math.round(totalMs / resolvedComplaints.length / 86_400_000)
  }

  // Serializar groupBy a objetos { key: count }
  const toMap = <K extends string | null>(
    rows: Array<{ _count: number | { _all?: number } } & Record<string, K>>,
    field: string,
  ): Record<string, number> => {
    const out: Record<string, number> = {}
    for (const r of rows) {
      const key = (r[field] ?? 'SIN_CLASIFICAR') as string
      const count = typeof r._count === 'number' ? r._count : (r._count._all ?? 0)
      out[key] = count
    }
    return out
  }

  return NextResponse.json({
    orgId,
    year,
    total: totalCount,
    anonymous: anonymousCount,
    nominal: totalCount - anonymousCount,
    anonymousRatio: totalCount > 0 ? Math.round((anonymousCount / totalCount) * 100) : 0,
    byType: toMap(byType as never, 'type'),
    bySeverity: toMap(bySeverity as never, 'severityAi'),
    byUrgency: toMap(byUrgency as never, 'urgencyAi'),
    byStatus: toMap(byStatus as never, 'status'),
    avgResolutionDays,
    totalResolved: resolvedComplaints.length,
    topAccusedPositions: (byAccusedPosition as Array<{ accusedPosition: string | null; _count: number }>)
      .filter((r) => r.accusedPosition !== null)
      .map((r) => ({ position: r.accusedPosition as string, count: r._count })),
    generatedAt: new Date().toISOString(),
    disclaimer:
      'Datos agregados y anonimizados. No contiene nombres, emails, teléfonos ni textos libres de denunciantes o denunciados.',
  })
})
