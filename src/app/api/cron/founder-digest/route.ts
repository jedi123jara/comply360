import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'
import { founderDigestEmail } from '@/lib/email/templates'
import { computeFounderMetrics } from '@/lib/metrics/founder-metrics'
import { notifySlackRaw } from '@/lib/notifications/slack'
import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'

/**
 * GET /api/cron/founder-digest
 *
 * Vercel Cron — **todos los días 8:00 AM Lima (UTC-5 → 13:00 UTC)**.
 * Envía digest privado con métricas clave al email del founder.
 * También hace ping a Slack si SLACK_FOUNDER_WEBHOOK_URL está configurado.
 *
 * Config env:
 *  - CRON_SECRET (required): Bearer auth para el endpoint
 *  - FOUNDER_EMAIL (required): destinatario del digest
 *  - NEXT_PUBLIC_APP_URL (used): base URL para el CTA "Abrir Founder Console"
 *  - SLACK_FOUNDER_WEBHOOK_URL (optional): webhook para ping a Slack
 *
 * Si falta FOUNDER_EMAIL, el digest se loggea a consola en dev y se silencia
 * en prod (no rompe el cron).
 */
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('[founder-digest] CRON_SECRET no configurado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  // FIX #5.A: idempotencia bucket diario.
  // (auth check sigue antes — la firma protege el endpoint, idempotencia
  // protege contra retry de Vercel.)
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const founderEmail = process.env.FOUNDER_EMAIL
  if (!founderEmail) {
    console.warn('[founder-digest] FOUNDER_EMAIL no configurado — saltando envío')
    return NextResponse.json({ skipped: true, reason: 'FOUNDER_EMAIL missing' })
  }

  const claim = await claimCronRun('founder-digest', { bucketMinutes: 1440 })
  if (!claim.acquired) {
    return NextResponse.json({ ok: true, duplicate: true, bucket: claim.bucket })
  }

  try {
    const metrics = await computeFounderMetrics()

    // Formatear fecha en es-PE
    const date = new Date().toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe'

    const html = founderDigestEmail({
      date: date.charAt(0).toUpperCase() + date.slice(1),
      mrr: metrics.business.mrr,
      mrrDeltaVsPrev30d: metrics.business.mrrDeltaVsPrev30d,
      mrrDeltaPct: metrics.business.mrrDeltaPct,
      activeSubscriptions: metrics.business.activeSubscriptions,
      trialingCount: metrics.business.trialingCount,
      newOrgs7d: metrics.growth.newOrgs7d,
      activationRate7d: metrics.growth.activationRate7d,
      dau: metrics.engagement.dau,
      mau: metrics.engagement.mau,
      stickinessPct: metrics.engagement.stickinessPct,
      trialsExpiring7d: metrics.health.trialsExpiring7d,
      churnRiskOrgs: metrics.health.churnRiskOrgs,
      cancelledLast30d: metrics.business.cancelledLast30d,
      aiVerifyAutoVerified30d: metrics.aiOps.aiVerifyAutoVerified30d,
      copilotQueries30d: metrics.aiOps.copilotQueries30d,
      topEvents7d: metrics.topEvents7d,
      narrative: metrics.narrative,
      adminUrl: `${baseUrl}/admin`,
    })

    const ok = await sendEmail({
      to: founderEmail,
      subject: `[Comply360] Founder Digest · MRR ${metrics.business.mrr > 0 ? `S/ ${metrics.business.mrr}` : 'S/ 0'} · ${metrics.growth.newOrgs7d} nuevas 7d`,
      html,
    })

    // Resumen corto para Slack (complementa el email)
    const slackSummary = [
      `*🌅 Comply360 Digest · ${date}*`,
      `• MRR: *S/ ${metrics.business.mrr}* (${metrics.business.mrrDeltaVsPrev30d >= 0 ? '+' : ''}S/ ${metrics.business.mrrDeltaVsPrev30d} vs 30d)`,
      `• Nuevas: *${metrics.growth.newOrgs7d}* empresas · activación ${metrics.growth.activationRate7d ?? '—'}%`,
      `• DAU/MAU: *${metrics.engagement.dau}/${metrics.engagement.mau}* · stickiness ${metrics.engagement.stickinessPct ?? '—'}%`,
      metrics.health.trialsExpiring7d > 0
        ? `• ⏰ *${metrics.health.trialsExpiring7d} trials expiran 7d*`
        : null,
      metrics.health.churnRiskOrgs > 0 ? `• 🔥 *${metrics.health.churnRiskOrgs} orgs en churn risk*` : null,
    ]
      .filter(Boolean)
      .join('\n')
    await notifySlackRaw(slackSummary)

    const summary = {
      ok: true,
      emailSent: ok,
      to: founderEmail,
      generatedAt: metrics.generatedAt,
      mrr: metrics.business.mrr,
      newOrgs7d: metrics.growth.newOrgs7d,
    }
    await completeCronRun(claim.runId, summary)
    return NextResponse.json(summary)
  } catch (err) {
    console.error('[founder-digest] failed:', err)
    await failCronRun(claim.runId, err)
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'unknown',
      },
      { status: 500 }
    )
  }
}
