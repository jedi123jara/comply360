/**
 * GET /api/cron/attendance-absences
 *
 * Genera registros ABSENT para trabajadores activos que no marcaron el dia
 * laboral anterior. Corre de madrugada hora Lima, cuando la jornada ya cerró.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateAbsencesForOrg, previousLocalDateKey } from '@/lib/attendance/absence'
import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET no configurado — attendance-absences cron deshabilitado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const dateKey = new URL(request.url).searchParams.get('date') ?? previousLocalDateKey()
  const claim = await claimCronRun(`attendance-absences:${dateKey}`, { bucketMinutes: 60 * 24 })
  if (!claim.acquired) {
    return NextResponse.json({ ok: true, duplicate: true, date: dateKey, bucket: claim.bucket })
  }

  try {
    const orgs = await prisma.organization.findMany({
      where: { onboardingCompleted: true },
      select: { id: true },
    })

    const results = []
    for (const org of orgs) {
      results.push(await generateAbsencesForOrg({ orgId: org.id, dateKey }))
    }

    const summary = {
      date: dateKey,
      orgsScanned: orgs.length,
      workersScanned: results.reduce((sum, r) => sum + r.workersScanned, 0),
      absencesCreated: results.reduce((sum, r) => sum + r.absencesCreated, 0),
      skippedExisting: results.reduce((sum, r) => sum + r.skippedExisting, 0),
      skippedNonBusinessDay: results.every((r) => r.skippedNonBusinessDay),
    }

    await completeCronRun(claim.runId, summary)
    return NextResponse.json({ ok: true, summary, results })
  } catch (err) {
    await failCronRun(claim.runId, err)
    console.error('[cron/attendance-absences] failed', err)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
