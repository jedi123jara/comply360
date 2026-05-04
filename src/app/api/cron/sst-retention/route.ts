import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runRetentionJob } from '@/lib/sst/retention'

/**
 * GET /api/cron/sst-retention
 *
 * Vercel Cron mensual — corre el día 1 a las 03:00 PET (08:00 UTC).
 *
 * Aplica las reglas de retención de datos personales de Ley 29733 + D.S.
 * 016-2024-JUS:
 *   - Borra/redacta datos médicos de Workers cesados hace > 5 años.
 *   - Borra Consentimientos vinculados a esos Workers.
 *   - Redacta detalleCifrado de SolicitudesARCO respondidas hace > 5 años.
 *
 * Idempotente: si todos los datos ya fueron redactados, el job es no-op.
 *
 * Auth: header `Authorization: Bearer ${CRON_SECRET}`.
 */

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('CRON_SECRET no configurado — sst-retention deshabilitado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Soporte de modo dry-run vía query param para preview manual
  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dry-run') === 'true'

  const start = Date.now()
  const result = await runRetentionJob(prisma, { dryRun })
  const durationMs = Date.now() - start

  return NextResponse.json({
    ok: true,
    dryRun,
    durationMs,
    ...result,
  })
}
