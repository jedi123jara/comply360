import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { monitorOrgAlerts } from '@/lib/orgchart/alert-monitor'
import { withCronIdempotency } from '@/lib/cron/wrap'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cron diario: revisa alertas criticas/altas del organigrama y crea tareas
 * compliance idempotentes para cada organizacion con organigrama activo.
 *
 * FIX #5.A: idempotencia diaria.
 */
export const GET = withCronIdempotency('orgchart-alerts', 1440, async () => {
  const orgs = await prisma.organization.findMany({
    where: {
      plan: { in: ['EMPRESA', 'BUSINESS', 'ENTERPRISE'] },
      orgUnits: { some: { isActive: true } },
    },
    select: { id: true, name: true },
  })

  let created = 0
  let skipped = 0
  let considered = 0
  const errors: { orgId: string; orgName: string; error: string }[] = []

  for (const org of orgs) {
    try {
      const result = await monitorOrgAlerts(org.id)
      created += result.created
      skipped += result.skipped
      considered += result.considered
    } catch (err) {
      errors.push({
        orgId: org.id,
        orgName: org.name,
        error: err instanceof Error ? err.message : 'unknown',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    runAt: new Date().toISOString(),
    totalOrgs: orgs.length,
    considered,
    tasksCreated: created,
    tasksSkipped: skipped,
    errors: errors.length,
    errorDetails: errors.slice(0, 10),
  })
})
