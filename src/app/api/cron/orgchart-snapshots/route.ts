import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { takeSnapshot } from '@/lib/orgchart/snapshot-service'

/**
 * Cron mensual: snapshot automático del organigrama para cada org en plan
 * EMPRESA o superior (las que tienen `organigrama_completo`). Day 1 cada mes
 * a las 03:00 UTC (≈ 22:00 hora Lima día anterior).
 *
 * Protegido por CRON_SECRET en Authorization header.
 *
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

  const monthLabel = new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long' })
  let success = 0
  const errors: { orgId: string; error: string }[] = []

  for (const org of orgs) {
    try {
      // Sólo si la org tiene al menos 1 unidad — saltarse vacías
      const hasUnits = await prisma.orgUnit.count({ where: { orgId: org.id } })
      if (hasUnits === 0) continue

      await takeSnapshot(org.id, {
        label: `Snapshot mensual ${monthLabel}`,
        reason: 'Cron mensual automático',
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
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
  })
}
