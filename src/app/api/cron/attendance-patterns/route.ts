/**
 * GET /api/cron/attendance-patterns
 *
 * Cron diario que escanea todas las orgs y crea WorkerAlert por patrones
 * críticos de asistencia (TARDANZAS_CRONICAS, AUSENTISMO_CRONICO).
 *
 * Schedule: 0 13 * * * (07:00 hora Lima — antes de que abra RRHH).
 * Authentication: Bearer CRON_SECRET (mismo patrón que daily-alerts).
 *
 * Idempotencia: el helper scanAttendancePatterns ya evita crear duplicados
 * si ya existe una alerta abierta del mismo tipo para el worker.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { scanAttendancePatterns } from '@/lib/alerts/attendance-patterns'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET no configurado — attendance-patterns cron deshabilitado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const orgs = await prisma.organization.findMany({
    where: { onboardingCompleted: true },
    select: { id: true, name: true },
  })

  const results: { orgId: string; orgName: string; workersScanned: number; alertsCreated: number; error?: string }[] = []
  let totalAlerts = 0

  for (const org of orgs) {
    try {
      const r = await scanAttendancePatterns(org.id)
      results.push({
        orgId: org.id,
        orgName: org.name,
        workersScanned: r.workersScanned,
        alertsCreated: r.alertsCreated,
      })
      totalAlerts += r.alertsCreated
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      console.error(`[cron/attendance-patterns] org ${org.id} failed`, msg)
      results.push({
        orgId: org.id,
        orgName: org.name,
        workersScanned: 0,
        alertsCreated: 0,
        error: msg,
      })
    }
  }

  const elapsed = Date.now() - startedAt.getTime()
  console.log(`[cron/attendance-patterns] Completed in ${elapsed}ms — ${orgs.length} orgs, ${totalAlerts} alerts created`)

  return NextResponse.json({
    ok: true,
    orgsScanned: orgs.length,
    totalAlertsCreated: totalAlerts,
    elapsedMs: elapsed,
    results,
  })
}
