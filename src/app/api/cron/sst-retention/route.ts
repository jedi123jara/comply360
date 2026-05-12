import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runRetentionJob } from '@/lib/sst/retention'
import { withCronIdempotency } from '@/lib/cron/wrap'

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

// FIX #5.A: idempotencia mensual (43200 min = 30d). El cron corre día 1,
// si Vercel reintenta dentro del mes el claim falla.
export const GET = withCronIdempotency('sst-retention', 43200, async (request) => {
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
})
