/**
 * GET /api/cron/webhook-retry
 *
 * Cron cada 1 minuto que procesa el queue de WebhookDelivery (status PENDING
 * o FAILED con nextRetryAt vencido). Hace POST con HMAC al endpoint del
 * cliente; reintenta con backoff (1m, 5m, 30m, 2h, 12h).
 *
 * Idempotencia con bucket de 1 min — Vercel reintentos en el mismo minuto
 * se descartan.
 */

import { NextRequest, NextResponse } from 'next/server'
import { processPendingDeliveries } from '@/lib/webhooks-out/dispatcher'
import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const claim = await claimCronRun('webhook-retry', { bucketMinutes: 1 })
  if (!claim.acquired) {
    return NextResponse.json({ ok: true, duplicate: true, reason: claim.reason })
  }

  try {
    const result = await processPendingDeliveries(50)
    await completeCronRun(claim.runId, { ...result })
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    await failCronRun(claim.runId, err)
    throw err
  }
}
