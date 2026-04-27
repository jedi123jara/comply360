import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'

// ==============================================
// GET /api/cron/weekly-digest
// Vercel Cron — lunes 8:00 AM Lima (UTC-5 → 13:00 UTC)
// Envía resumen semanal a cada org con alertEmail configurado
// Protegido por CRON_SECRET
// ==============================================

export const maxDuration = 60

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET no configurado — weekly-digest deshabilitado')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Todas las orgs activas con email configurado
  const orgs = await prisma.organization.findMany({
    where: { alertEmail: { not: null } },
    select: { id: true, razonSocial: true, name: true, alertEmail: true, plan: true },
  })

  let sent = 0
  let errors = 0

  for (const org of orgs) {
    try {
      const [
        complianceScore,
        openAlerts,
        criticalAlerts,
        expiringContracts,
        totalWorkers,
        newWorkers,
        openComplaints,
        expiringSindical,
      ] = await Promise.all([
        // Latest compliance score
        prisma.complianceScore.findFirst({
          where: { orgId: org.id },
          orderBy: { calculatedAt: 'desc' },
          select: { scoreGlobal: true },
        }),
        // Total open worker alerts
        prisma.workerAlert.count({ where: { orgId: org.id, resolvedAt: null } }),
        // Critical/High worker alerts (join with worker to get name)
        prisma.workerAlert.findMany({
          where: { orgId: org.id, resolvedAt: null, severity: { in: ['HIGH', 'CRITICAL'] } },
          take: 5,
          orderBy: { severity: 'asc' },
          select: {
            type: true,
            severity: true,
            dueDate: true,
            worker: { select: { firstName: true, lastName: true } },
          },
        }),
        // Contracts expiring in 30 days (not expired/archived)
        prisma.contract.findMany({
          where: {
            orgId: org.id,
            expiresAt: { gte: now, lte: in30Days },
            status: { notIn: ['EXPIRED', 'ARCHIVED'] },
          },
          take: 5,
          select: { title: true, expiresAt: true, type: true },
          orderBy: { expiresAt: 'asc' },
        }),
        // Active workers count
        prisma.worker.count({ where: { orgId: org.id, status: { not: 'TERMINATED' } } }),
        // New workers this week
        prisma.worker.count({ where: { orgId: org.id, createdAt: { gte: lastWeek } } }),
        // Open complaints (not resolved/dismissed)
        prisma.complaint.count({
          where: {
            orgId: org.id,
            status: { notIn: ['RESOLVED', 'DISMISSED'] },
          },
        }).catch(() => 0),
        // Sindical records expiring in 30 days
        prisma.sindicalRecord.findMany({
          where: { orgId: org.id, endDate: { gte: now, lte: in30Days }, status: 'ACTIVE' },
          take: 3,
          select: { title: true, type: true, endDate: true },
        }),
      ])

      const score = complianceScore?.scoreGlobal ?? 0
      const scoreColor = score >= 80 ? '#16a34a' : score >= 60 ? '#d97706' : '#dc2626'
      const orgName = org.razonSocial || org.name

      // Normalize alerts with worker names
      const workerAlerts = criticalAlerts.map(a => ({
        type: String(a.type),
        workerName: a.worker ? `${a.worker.firstName} ${a.worker.lastName}` : null,
        dueDate: a.dueDate,
        severity: String(a.severity),
      }))

      // Normalize contracts
      const contracts = expiringContracts.map(c => ({
        title: c.title,
        expiresAt: c.expiresAt,
      }))

      const html = buildDigestEmail({
        orgName,
        score,
        scoreColor,
        openAlerts,
        workerAlerts,
        expiringContracts: contracts,
        totalWorkers,
        newWorkers,
        openComplaints: openComplaints as number,
        expiringSindical,
        weekDate: now.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://comply360.pe',
      })

      const ok = await sendEmail({
        to: org.alertEmail!,
        subject: `📊 Resumen semanal COMPLY360 — ${orgName}`,
        html,
      })

      if (ok) sent++
      else errors++
    } catch (err) {
      console.error(`[weekly-digest] Error procesando org ${org.id}:`, err)
      errors++
    }
  }

  return NextResponse.json({
    ok: true,
    processed: orgs.length,
    sent,
    errors,
    timestamp: now.toISOString(),
  })
}

/* ============================
   Email builder
   ============================ */
interface DigestData {
  orgName: string
  score: number
  scoreColor: string
  openAlerts: number
  workerAlerts: { type: string; workerName: string | null; dueDate: Date | null; severity: string }[]
  expiringContracts: { title: string; expiresAt: Date | null }[]
  totalWorkers: number
  newWorkers: number
  openComplaints: number
  expiringSindical: { title: string; type: string; endDate: Date | null }[]
  weekDate: string
  appUrl: string
}

function buildDigestEmail(d: DigestData): string {
  const fmt = (date: Date | null) =>
    date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

  const alertSeverityColor = (s: string) =>
    s === 'CRITICAL' ? '#dc2626' : s === 'HIGH' ? '#d97706' : '#2563eb'

  const sindicalTypeLabel: Record<string, string> = {
    SINDICATO: 'Sindicato',
    CONVENIO_COLECTIVO: 'Convenio',
    NEGOCIACION: 'Negociación',
    PLIEGO_RECLAMOS: 'Pliego',
    FUERO_SINDICAL: 'Fuero',
    HUELGA: 'Huelga',
  }

  const BRAND_BLUE = '#1e3a6e'
  const BRAND_LIGHT = '#f0f4fa'
  const CTA_BLUE = '#2563eb'

  const workerAlertsHtml = d.workerAlerts.length > 0
    ? d.workerAlerts.map(a => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:#fff;background-color:${alertSeverityColor(a.severity)};margin-right:8px;">${a.severity}</span>
          <span style="color:#334155;font-size:13px;">${a.type.replace(/_/g, ' ')}</span>
          ${a.workerName ? `<span style="color:#64748b;font-size:12px;"> — ${a.workerName}</span>` : ''}
          ${a.dueDate ? `<span style="color:#94a3b8;font-size:11px;float:right;">Vence: ${fmt(a.dueDate)}</span>` : ''}
        </td>
      </tr>`).join('')
    : '<tr><td style="padding:12px 0;color:#64748b;font-size:13px;">✅ Sin alertas críticas esta semana</td></tr>'

  const contractsHtml = d.expiringContracts.length > 0
    ? d.expiringContracts.map(c => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <span style="color:#334155;font-size:13px;font-weight:600;">${c.title}</span>
          <span style="color:#d97706;font-size:12px;float:right;font-weight:600;">Vence: ${fmt(c.expiresAt)}</span>
        </td>
      </tr>`).join('')
    : '<tr><td style="padding:12px 0;color:#64748b;font-size:13px;">✅ Sin contratos venciendo este mes</td></tr>'

  const sindicalHtml = d.expiringSindical.length > 0
    ? d.expiringSindical.map(s => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <span style="color:#334155;font-size:13px;">${sindicalTypeLabel[s.type] ?? s.type}: <strong>${s.title}</strong></span>
          <span style="color:#d97706;font-size:12px;float:right;">Vence: ${fmt(s.endDate)}</span>
        </td>
      </tr>`).join('')
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Resumen Semanal COMPLY360</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">

<tr>
  <td style="background:linear-gradient(135deg,${BRAND_BLUE},#2a4d8f);padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">COMPLY360</h1>
    <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">Resumen Semanal de Cumplimiento Laboral</p>
    <p style="margin:8px 0 0;color:#cbd5e1;font-size:12px;">${d.weekDate}</p>
  </td>
</tr>

<tr>
  <td style="padding:28px 32px 0;">
    <h2 style="margin:0 0 8px;color:#1e293b;font-size:18px;">Hola, equipo de ${d.orgName} 👋</h2>
    <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
      Aquí tienes el resumen semanal de tu plataforma COMPLY360.
    </p>
  </td>
</tr>

<tr>
  <td style="padding:24px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND_LIGHT};border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:20px;text-align:center;width:25%;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:36px;font-weight:800;color:${d.scoreColor};">${d.score}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;font-weight:600;">Score Compliance</p>
        </td>
        <td style="padding:20px;text-align:center;width:25%;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:30px;font-weight:800;color:${d.openAlerts > 0 ? '#d97706' : '#16a34a'};">${d.openAlerts}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;font-weight:600;">Alertas abiertas</p>
        </td>
        <td style="padding:20px;text-align:center;width:25%;border-right:1px solid #e2e8f0;">
          <p style="margin:0;font-size:30px;font-weight:800;color:#1e3a6e;">${d.totalWorkers}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;font-weight:600;">Trabajadores activos</p>
        </td>
        <td style="padding:20px;text-align:center;width:25%;">
          <p style="margin:0;font-size:30px;font-weight:800;color:${d.openComplaints > 0 ? '#dc2626' : '#16a34a'};">${d.openComplaints}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#64748b;font-weight:600;">Denuncias activas</p>
        </td>
      </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:0 32px 24px;">
    <h3 style="margin:0 0 12px;color:#1e293b;font-size:15px;font-weight:700;border-left:4px solid #d97706;padding-left:10px;">
      ⚠️ Alertas críticas del trabajador
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${workerAlertsHtml}
    </table>
  </td>
</tr>

<tr>
  <td style="padding:0 32px 24px;">
    <h3 style="margin:0 0 12px;color:#1e293b;font-size:15px;font-weight:700;border-left:4px solid #2563eb;padding-left:10px;">
      📋 Contratos por vencer (próximos 30 días)
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${contractsHtml}
    </table>
  </td>
</tr>

${d.expiringSindical.length > 0 ? `
<tr>
  <td style="padding:0 32px 24px;">
    <h3 style="margin:0 0 12px;color:#1e293b;font-size:15px;font-weight:700;border-left:4px solid #7c3aed;padding-left:10px;">
      ⚖️ Registros sindicales próximos a vencer
    </h3>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${sindicalHtml}
    </table>
  </td>
</tr>` : ''}

${d.newWorkers > 0 ? `
<tr>
  <td style="padding:0 32px 24px;">
    <div style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;">
      <p style="margin:0;color:#166534;font-size:13px;">
        ✅ <strong>${d.newWorkers} nuevo${d.newWorkers > 1 ? 's' : ''} trabajador${d.newWorkers > 1 ? 'es' : ''}</strong> incorporado${d.newWorkers > 1 ? 's' : ''} esta semana.
      </p>
    </div>
  </td>
</tr>` : ''}

<tr>
  <td style="padding:0 32px 32px;text-align:center;">
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="background-color:${CTA_BLUE};border-radius:8px;">
          <a href="${d.appUrl}/dashboard" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
            Ir al Dashboard →
          </a>
        </td>
      </tr>
    </table>
  </td>
</tr>

<tr>
  <td style="padding:20px 32px;background-color:${BRAND_LIGHT};border-top:1px solid #e2e8f0;">
    <p style="margin:0;color:#64748b;font-size:11px;text-align:center;line-height:1.6;">
      Correo automático generado por COMPLY360 cada lunes.<br>
      &copy; ${new Date().getFullYear()} COMPLY360 — Cumplimiento laboral para Perú.
    </p>
  </td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`
}
