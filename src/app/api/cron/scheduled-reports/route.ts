/**
 * GET /api/cron/scheduled-reports
 *
 * Cron que corre cada 5 min. Lista los ScheduledReport activos, para cada uno
 * evalúa si su cronExpression coincide con el "ahora" en timezone Lima, y
 * si coincide dispara la generación + envío por email.
 *
 * Protegido por `Authorization: Bearer CRON_SECRET` (patrón idéntico a
 * /api/cron/norm-updates).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import { getLimaParts } from '@/lib/time/lima'

// Matcher cron timezone-aware (Lima). Expone el mismo comportamiento que
// `matchesCron` original pero evalúa con parts Lima, no UTC.
function matchesCronLima(cron: string, date: Date): boolean {
  const parts = cron.split(/\s+/)
  if (parts.length !== 5) return false
  const lima = getLimaParts(date)
  const checks: Array<[string, number]> = [
    [parts[0], lima.minute],
    [parts[1], lima.hour],
    [parts[2], lima.day],
    [parts[3], lima.month],
    [parts[4], lima.weekday],
  ]
  return checks.every(([pattern, value]) => matchCronField(pattern, value))
}

function matchCronField(pattern: string, value: number): boolean {
  if (pattern === '*') return true
  if (pattern.includes(',')) return pattern.split(',').some((p) => matchCronField(p.trim(), value))
  if (pattern.includes('-')) {
    const [minStr, maxStr] = pattern.split('-')
    return value >= parseInt(minStr, 10) && value <= parseInt(maxStr, 10)
  }
  if (pattern.startsWith('*/')) {
    const step = parseInt(pattern.slice(2), 10)
    return value % step === 0
  }
  return parseInt(pattern, 10) === value
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[scheduled-reports cron] CRON_SECRET no configurado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date()
  const active = await prisma.scheduledReport.findMany({ where: { active: true } })

  const matches = active.filter((r) => matchesCronLima(r.cronExpression, startedAt))
  if (matches.length === 0) {
    return NextResponse.json({
      matched: 0,
      total: active.length,
      durationMs: Date.now() - startedAt.getTime(),
    })
  }

  console.log(`[scheduled-reports cron] ${matches.length} reportes matchean`)

  // Fire-and-forget por reporte — un fallo no detiene a los demás.
  await Promise.all(matches.map((r) => runAndSendReport(r.id).catch((err) => {
    console.error(`[scheduled-reports cron] reporte ${r.id} falló`, err)
  })))

  return NextResponse.json({
    matched: matches.length,
    total: active.length,
    durationMs: Date.now() - startedAt.getTime(),
  })
}

async function runAndSendReport(reportId: string): Promise<void> {
  const report = await prisma.scheduledReport.findUnique({ where: { id: reportId } })
  if (!report || !report.active) return

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://comply360.pe').replace(/\/$/, '')

  try {
    // Por ahora armamos un email con link a generar el reporte on-demand vs
    // attachment. La generación server-side completa + storage del buffer
    // queda en el roadmap (requiere worker dedicado o edge function más
    // potente). Para reportes grandes esto es más robusto que attachments.
    const reportUrl = buildReportUrl(appUrl, report.reportType, report.params)

    const subject = `[COMPLY360] ${reportLabel(report.reportType)} — ${new Date().toLocaleDateString('es-PE')}`
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;">
        <div style="background:#1e3a6e;color:#fff;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:18px;">${reportLabel(report.reportType)}</h1>
          <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Reporte programado automático</p>
        </div>
        <div style="padding:20px 24px;border:1px solid #e2e8f0;border-top:none;">
          <p>Tu reporte programado está listo. Descargalo desde el siguiente enlace (solo accesible con tu sesión):</p>
          <p style="margin:20px 0;">
            <a href="${reportUrl}" style="display:inline-block;background:#1e3a6e;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
              Descargar ${report.format}
            </a>
          </p>
          <p style="color:#64748b;font-size:12px;">
            Si no deseas recibir más estos reportes, ingresa a /dashboard/reportes → Programados y desactiva este cronograma.
          </p>
        </div>
      </div>`

    for (const recipient of report.recipients) {
      try {
        await sendEmail({ to: recipient, subject, html })
      } catch (err) {
        console.error(`[scheduled-reports] email a ${recipient} falló`, err)
      }
    }

    await prisma.scheduledReport.update({
      where: { id: reportId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: 'SUCCESS',
        lastRunError: null,
      },
    })
  } catch (err) {
    await prisma.scheduledReport.update({
      where: { id: reportId },
      data: {
        lastRunAt: new Date(),
        lastRunStatus: 'FAILED',
        lastRunError: err instanceof Error ? err.message : String(err),
      },
    }).catch(() => null)
    throw err
  }
}

function reportLabel(type: string): string {
  switch (type) {
    case 'compliance-ejecutivo': return 'Reporte Ejecutivo de Compliance'
    case 'sst-anual': return 'Informe Anual de SST'
    case 'workers': return 'Reporte de Trabajadores'
    case 'contracts': return 'Reporte de Contratos'
    case 'alerts': return 'Reporte de Alertas'
    default: return type
  }
}

function buildReportUrl(appUrl: string, type: string, params: unknown): string {
  const qs = new URLSearchParams()
  if (params && typeof params === 'object') {
    for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
      if (v !== null && v !== undefined) qs.set(k, String(v))
    }
  }
  switch (type) {
    case 'compliance-ejecutivo': return `${appUrl}/api/reports/compliance-pdf${qs.toString() ? `?${qs}` : ''}`
    case 'sst-anual': return `${appUrl}/api/reports/sst-anual${qs.toString() ? `?${qs}` : ''}`
    default: return `${appUrl}/api/reports/pdf?type=${type}${qs.toString() ? `&${qs}` : ''}`
  }
}
