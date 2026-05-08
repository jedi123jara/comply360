/**
 * `withCronIdempotency` — wrapper para handlers de Vercel Cron que aplica
 * el patrón completo: auth check (CRON_SECRET) + claimCronRun + try/catch.
 *
 * Uso:
 *   export const GET = withCronIdempotency('my-cron', 1440, async (req) => {
 *     // tu lógica
 *     return NextResponse.json({ ok: true, ... })
 *   })
 *
 * Reemplaza el patrón verboso de:
 *   - chequear CRON_SECRET
 *   - chequear Authorization: Bearer
 *   - claim + duplicate check
 *   - try/catch con complete/fail
 */

import { NextRequest, NextResponse } from 'next/server'
import { claimCronRun, completeCronRun, failCronRun } from './idempotency'
import { recordCronStart, recordCronSuccess, recordCronFailure } from '@/lib/observability/metrics'

type CronHandler = (req: NextRequest) => Promise<NextResponse> | NextResponse

export function withCronIdempotency(
  cronName: string,
  bucketMinutes: number,
  handler: CronHandler,
): CronHandler {
  return async (req: NextRequest): Promise<NextResponse> => {
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      console.error(`[${cronName}] CRON_SECRET no configurado`)
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const claim = await claimCronRun(cronName, { bucketMinutes })
    if (!claim.acquired) {
      return NextResponse.json({ ok: true, duplicate: true, bucket: claim.bucket })
    }

    const startedAt = Date.now()
    recordCronStart({ name: cronName, bucketKey: claim.bucket })

    try {
      const result = await handler(req)
      const durationMs = Date.now() - startedAt
      // Best-effort: marca completado tras éxito. Si falla el update, no
      // afecta el resultado del cron (la corrida ya terminó OK).
      await completeCronRun(claim.runId).catch(() => undefined)
      recordCronSuccess({ name: cronName, durationMs, bucketKey: claim.bucket })
      return result
    } catch (err) {
      const durationMs = Date.now() - startedAt
      console.error(`[${cronName}] cron error`, err)
      await failCronRun(claim.runId, err).catch(() => undefined)
      recordCronFailure({ name: cronName, error: err, durationMs, bucketKey: claim.bucket })
      return NextResponse.json(
        {
          error: 'Cron job failed',
          detail: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200),
        },
        { status: 500 },
      )
    }
  }
}
