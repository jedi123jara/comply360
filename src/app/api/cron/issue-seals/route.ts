/**
 * GET /api/cron/issue-seals
 *
 * Cron mensual (1° del mes 02:00 Lima = 07:00 UTC) que evalúa todas las orgs
 * y emite/renueva el sello "Compliance-Ready" a las que cualifican.
 *
 * Idempotente: si una org ya tiene sello no-revocado del mes en curso,
 * `issueSealForOrg` lo detecta y devuelve 'renewed' sin crear un duplicado.
 *
 * Protegido por CRON_SECRET. Devuelve resumen de la corrida.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runSealIssuance } from '@/lib/compliance/seal-issuer'
import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'

export const runtime = 'nodejs'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET no configurado' }, { status: 500 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Bucket diario porque el cron corre 1×/mes — un retry el mismo día se descarta
  const claim = await claimCronRun('issue-seals', { bucketMinutes: 60 * 24 })
  if (!claim.acquired) {
    return NextResponse.json({ ok: true, duplicate: true, reason: claim.reason, bucket: claim.bucket })
  }

  try {
    const summary = await runSealIssuance()
    await completeCronRun(claim.runId, { ...summary })
    console.log(`[issue-seals] ${JSON.stringify(summary)}`)
    return NextResponse.json({ ok: true, ...summary })
  } catch (err) {
    await failCronRun(claim.runId, err)
    throw err
  }
}
