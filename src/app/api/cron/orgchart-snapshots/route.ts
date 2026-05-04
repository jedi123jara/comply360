import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { takeSnapshot } from '@/lib/orgchart/snapshot-service'

/**
 * Cron semanal: snapshot automático del organigrama para cada org en plan
 * EMPRESA o superior (las que tienen `organigrama_completo`). Cada lunes a las
 * 13:00 UTC (≈ 08:00 hora Lima).
 *
 * Esto le da a Time Machine data densa para morph cinemático y narrativa IA.
 * Sin estos snapshots, el módulo Time Machine v2 queda vacío.
 *
 * Protegido por CRON_SECRET en Authorization header.
 * Errores por org se aíslan: si una org falla, las demás siguen.
 */

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET no configurado — cron orgchart-snapshots deshabilitado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Orgs con plan que incluye organigrama_completo (EMPRESA, BUSINESS, ENTERPRISE)
  const orgs = await prisma.organization.findMany({
    where: { plan: { in: ['EMPRESA', 'BUSINESS', 'ENTERPRISE'] } },
    select: { id: true, name: true },
  })

  // Etiqueta tipo "Sem 18 · 5 may 2026" — útil en el Time Machine track.
  const now = new Date()
  const oneJan = new Date(now.getFullYear(), 0, 1)
  const weekNumber = Math.ceil(((now.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7)
  const dateLabel = now.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
  const snapshotLabel = `Sem ${weekNumber} · ${dateLabel}`

  let success = 0
  let skipped = 0
  const errors: { orgId: string; error: string }[] = []

  for (const org of orgs) {
    try {
      // Sólo si la org tiene al menos 1 unidad — saltarse vacías
      const hasUnits = await prisma.orgUnit.count({
        where: { orgId: org.id, isActive: true },
      })
      if (hasUnits === 0) {
        skipped++
        continue
      }

      // Saltarse si ya hay un snapshot esta semana (evita duplicados si el
      // cron se reintenta o si alguien tomó snapshot manual).
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recent = await prisma.orgChartSnapshot.findFirst({
        where: { orgId: org.id, isAuto: true, createdAt: { gte: sevenDaysAgo } },
        select: { id: true },
      })
      if (recent) {
        skipped++
        continue
      }

      await takeSnapshot(org.id, {
        label: snapshotLabel,
        reason: 'Cron semanal automático',
        isAuto: true,
      })
      success++
    } catch (err) {
      errors.push({
        orgId: org.id,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    totalOrgs: orgs.length,
    snapshotsTaken: success,
    snapshotsSkipped: skipped,
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
  })
}
