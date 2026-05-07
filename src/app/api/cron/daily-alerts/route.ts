import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import { alertEmail } from '@/lib/email/templates'
import { sendPushToOrg } from '@/lib/notifications/web-push-server'
import { diasLaborables } from '@/lib/legal-engine/feriados-peru'
import { claimCronRun, completeCronRun, failCronRun } from '@/lib/cron/idempotency'

// ==============================================
// GET /api/cron/daily-alerts
// Vercel Cron job — checks for upcoming compliance deadlines
// and sends alert emails to each org's alertEmail.
// Protected by CRON_SECRET env var (not withAuth).
// ==============================================

export async function GET(request: NextRequest) {
  // Verify cron secret — CRON_SECRET must be set; if missing, refuse all requests
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET env var is not configured — daily-alerts cron is disabled')
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // FIX #5.A: idempotencia. Vercel a veces reintenta crons por timeout,
  // redeploy mid-run, o disparo manual con curl. Sin esta guarda los
  // emails de alerta se mandan duplicados. Bucket diario (1440 minutos).
  const claim = await claimCronRun('daily-alerts', { bucketMinutes: 1440 })
  if (!claim.acquired) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      bucket: claim.bucket,
      reason: claim.reason,
    })
  }

  try {
    const now = new Date()
    const in7Days = new Date(now)
    in7Days.setDate(in7Days.getDate() + 7)

    const in15Days = new Date(now)
    in15Days.setDate(in15Days.getDate() + 15)

    // Errores por seccion — si una query falla, los contadores se quedan en 0
    // pero el resto del cron sigue corriendo. Evita que un fallo en SST tumbe
    // los emails de contratos (o viceversa).
    const sectionErrors: string[] = []

    // ------------------------------------------------
    // 0. Auto-mark contracts as EXPIRED when expiresAt < now
    //    Runs before emails so email counts are accurate.
    // ------------------------------------------------
    let expiredCount = 0
    try {
      const expiredResult = await prisma.contract.updateMany({
        where: {
          expiresAt: { lt: now },
          status: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED'] },
        },
        data: { status: 'EXPIRED' },
      })
      expiredCount = expiredResult.count
      if (expiredCount > 0) {
        console.log(`[daily-alerts] Auto-marked ${expiredCount} contracts as EXPIRED`)
      }
    } catch (err) {
      sectionErrors.push('autoExpire: ' + (err instanceof Error ? err.message : String(err)))
      console.error('[daily-alerts] auto-expire failed:', err)
    }

    // ------------------------------------------------
    // 1. Contracts expiring within 7 days
    // ------------------------------------------------
    type ExpiringContract = {
      id: string
      title: string
      expiresAt: Date | null
      orgId: string
      organization: { id: string; name: string; alertEmail: string | null }
    }
    let expiringContracts: ExpiringContract[] = []
    try {
      expiringContracts = await prisma.contract.findMany({
        where: {
          expiresAt: {
            gte: now,
            lte: in7Days,
          },
          status: { in: ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED'] },
        },
        select: {
          id: true,
          title: true,
          expiresAt: true,
          orgId: true,
          organization: {
            select: { id: true, name: true, alertEmail: true },
          },
        },
      })
    } catch (err) {
      sectionErrors.push('expiringContracts: ' + (err instanceof Error ? err.message : String(err)))
      console.error('[daily-alerts] expiring contracts query failed:', err)
    }

    // ------------------------------------------------
    // 2. Overdue SST records
    // ------------------------------------------------
    type OverdueSstRow = {
      id: string
      title: string
      type: string
      dueDate: Date | null
      orgId: string
    }
    let overdueSst: OverdueSstRow[] = []
    try {
      const rows = await prisma.sstRecord.findMany({
        where: {
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
        select: {
          id: true,
          title: true,
          type: true,
          dueDate: true,
          orgId: true,
        },
      })
      overdueSst = rows.map((r) => ({ ...r, type: String(r.type) }))
    } catch (err) {
      sectionErrors.push('overdueSst: ' + (err instanceof Error ? err.message : String(err)))
      console.error('[daily-alerts] overdue SST query failed:', err)
    }

    // To get the org alertEmail for SST records (no direct relation),
    // collect unique orgIds and fetch orgs
    const sstOrgIds = [...new Set(overdueSst.map((r) => r.orgId))]
    let sstOrgs: { id: string; name: string; alertEmail: string | null }[] = []
    if (sstOrgIds.length > 0) {
      try {
        sstOrgs = await prisma.organization.findMany({
          where: { id: { in: sstOrgIds } },
          select: { id: true, name: true, alertEmail: true },
        })
      } catch (err) {
        sectionErrors.push('sstOrgs: ' + (err instanceof Error ? err.message : String(err)))
        console.error('[daily-alerts] sst orgs query failed:', err)
      }
    }
    const sstOrgMap = new Map(sstOrgs.map((o) => [o.id, o]))

    // ------------------------------------------------
    // 3. Pending CTS deposits — within 15 days of May/Nov deadline
    //    CTS deadlines: May 15 and November 15 each year
    // ------------------------------------------------
    const currentYear = now.getFullYear()

    let ctsDeadline: Date | null = null

    // Check if we're within 15 days of May 15
    const may15 = new Date(currentYear, 4, 15) // month 4 = May
    const may15minus15 = new Date(may15)
    may15minus15.setDate(may15minus15.getDate() - 15)
    if (now >= may15minus15 && now <= may15) {
      ctsDeadline = may15
    }

    // Check if we're within 15 days of November 15
    const nov15 = new Date(currentYear, 10, 15) // month 10 = November
    const nov15minus15 = new Date(nov15)
    nov15minus15.setDate(nov15minus15.getDate() - 15)
    if (now >= nov15minus15 && now <= nov15) {
      ctsDeadline = nov15
    }

    // If a CTS deadline is approaching, find orgs with active workers
    // who haven't had CTS calculated yet
    let ctsOrgs: { id: string; name: string; alertEmail: string | null; workerCount: number }[] = []
    if (ctsDeadline) {
      try {
        const orgsWithWorkers = await prisma.organization.findMany({
          where: {
            workers: {
              some: { status: 'ACTIVE' },
            },
          },
          select: {
            id: true,
            name: true,
            alertEmail: true,
            _count: { select: { workers: { where: { status: 'ACTIVE' } } } },
          },
        })
        ctsOrgs = orgsWithWorkers.map((o) => ({
          id: o.id,
          name: o.name,
          alertEmail: o.alertEmail,
          workerCount: o._count.workers,
        }))
      } catch (err) {
        sectionErrors.push('ctsOrgs: ' + (err instanceof Error ? err.message : String(err)))
        console.error('[daily-alerts] cts orgs query failed:', err)
      }
    }

    // ------------------------------------------------
    // 4. Complaint deadline alerts
    //    3 days: proteccion, 30 days: investigacion, 5 days: resolucion
    // ------------------------------------------------
    type OpenComplaint = {
      id: string
      code: string
      status: string
      receivedAt: Date
      organization: { id: string; name: string; alertEmail: string | null }
    }
    let openComplaints: OpenComplaint[] = []
    try {
      const rows = await prisma.complaint.findMany({
        where: {
          status: { in: ['RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING', 'PROTECTION_APPLIED'] },
        },
        include: {
          organization: { select: { id: true, name: true, alertEmail: true } },
        },
      })
      openComplaints = rows.map((r) => ({
        id: r.id,
        code: r.code,
        status: String(r.status),
        receivedAt: r.receivedAt,
        organization: r.organization,
      }))
    } catch (err) {
      sectionErrors.push('openComplaints: ' + (err instanceof Error ? err.message : String(err)))
      console.error('[daily-alerts] complaints query failed:', err)
    }

    const complaintAlerts: { orgId: string; email: string | null; orgName: string; title: string; desc: string; due: string }[] = []
    for (const c of openComplaints) {
      const received = new Date(c.receivedAt)
      const calendarDaysSince = Math.floor((now.getTime() - received.getTime()) / 86400000)
      const businessDaysSince = diasLaborables(received, now)

      // 3 dias HABILES para medidas de proteccion (D.S. 014-2019-MIMP Art. 18)
      if (c.status === 'RECEIVED' && businessDaysSince >= 1 && businessDaysSince <= 4) {
        complaintAlerts.push({
          orgId: c.organization.id,
          email: c.organization.alertEmail,
          orgName: c.organization.name,
          title: `Denuncia ${c.code}: plazo de proteccion vence pronto`,
          desc: `La denuncia ${c.code} requiere medidas de proteccion dentro de 3 dias habiles (Art. 18 D.S. 014-2019-MIMP). ${businessDaysSince >= 3 ? 'PLAZO VENCIDO.' : `Quedan ${3 - businessDaysSince} dia(s) habil(es).`}`,
          due: new Date(received.getTime() + 5 * 86400000).toLocaleDateString('es-PE'), // ~5 calendar days ≈ 3 business days
        })
      }

      // 30 dias CALENDARIO para investigacion (Art. 20)
      if (['INVESTIGATING', 'PROTECTION_APPLIED'].includes(c.status) && calendarDaysSince >= 25 && calendarDaysSince <= 32) {
        const deadline = new Date(received)
        deadline.setDate(deadline.getDate() + 30)
        complaintAlerts.push({
          orgId: c.organization.id,
          email: c.organization.alertEmail,
          orgName: c.organization.name,
          title: `Denuncia ${c.code}: plazo de investigacion vence pronto`,
          desc: `La investigacion de ${c.code} debe completarse en 30 dias calendario (Art. 20). ${calendarDaysSince >= 30 ? 'PLAZO VENCIDO.' : `Quedan ${30 - calendarDaysSince} dia(s).`}`,
          due: deadline.toLocaleDateString('es-PE'),
        })
      }
    }

    // ------------------------------------------------
    // Aggregate alerts by org and send emails
    // ------------------------------------------------
    const orgAlerts = new Map<
      string,
      { email: string; orgName: string; alerts: { title: string; description: string; dueDate: string }[] }
    >()

    function addAlert(orgId: string, email: string | null, orgName: string, title: string, description: string, dueDate: string) {
      if (!email) return
      if (!orgAlerts.has(orgId)) {
        orgAlerts.set(orgId, { email, orgName, alerts: [] })
      }
      orgAlerts.get(orgId)!.alerts.push({ title, description, dueDate })
    }

    // Add contract expiry alerts
    for (const contract of expiringContracts) {
      const dueStr = contract.expiresAt
        ? contract.expiresAt.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Sin fecha'
      addAlert(
        contract.orgId,
        contract.organization.alertEmail,
        contract.organization.name,
        'Contrato por vencer',
        `El contrato "${contract.title}" esta por vencer.`,
        dueStr
      )
    }

    // Add overdue SST alerts
    for (const sst of overdueSst) {
      const org = sstOrgMap.get(sst.orgId)
      if (!org) continue
      const dueStr = sst.dueDate
        ? sst.dueDate.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })
        : 'Vencido'
      addAlert(
        sst.orgId,
        org.alertEmail,
        org.name,
        'Registro SST vencido',
        `El registro "${sst.title}" (${sst.type}) esta vencido y requiere atencion inmediata.`,
        dueStr
      )
    }

    // Add CTS deadline alerts
    if (ctsDeadline) {
      const ctsDateStr = ctsDeadline.toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })
      for (const org of ctsOrgs) {
        addAlert(
          org.id,
          org.alertEmail,
          org.name,
          'Deposito CTS pendiente',
          `Tiene ${org.workerCount} trabajador(es) activo(s). Verifique que el deposito de CTS se realice antes de la fecha limite.`,
          ctsDateStr
        )
      }
    }

    // Add complaint deadline alerts
    for (const ca of complaintAlerts) {
      addAlert(ca.orgId, ca.email, ca.orgName, ca.title, ca.desc, ca.due)
    }

    // ------------------------------------------------
    // Send one email per org (first alert as main, rest listed)
    // ------------------------------------------------
    let emailsSent = 0
    let emailsFailed = 0

    for (const [, orgData] of orgAlerts) {
      try {
        const firstAlert = orgData.alerts[0]
        const totalAlerts = orgData.alerts.length

        // Build description including all alerts if more than one
        let description = firstAlert.description
        if (totalAlerts > 1) {
          const extraLines = orgData.alerts
            .slice(1)
            .map((a) => `- ${a.title}: ${a.description}`)
            .join('<br>')
          description += `<br><br>Ademas tiene ${totalAlerts - 1} alerta(s) adicional(es):<br>${extraLines}`
        }

        const html = alertEmail(
          `${totalAlerts} Alerta(s) de Cumplimiento`,
          description,
          firstAlert.dueDate
        )

        const sent = await sendEmail({
          to: orgData.email,
          subject: `[COMPLY360] ${totalAlerts} alerta(s) de cumplimiento para ${orgData.orgName}`,
          html,
        })

        if (sent) emailsSent++
        else emailsFailed++
      } catch (err) {
        emailsFailed++
        console.error(`[daily-alerts] email to org failed (${orgData.email}):`, err)
      }
    }

    // ------------------------------------------------
    // Push notifications para alertas críticas (Fase D Sprint 5)
    // Solo se dispara para orgs con ≥ 1 alerta CRITICAL/HIGH y usuarios
    // con pushSubscription activa. No bloquea el return si falla.
    // ------------------------------------------------
    let pushesSent = 0
    let pushesFailed = 0
    for (const [orgId, orgData] of orgAlerts) {
      // Identifica la alerta más urgente para el payload
      const top = orgData.alerts[0]
      if (!top) continue
      try {
        const result = await sendPushToOrg(orgId, {
          title: `${orgData.alerts.length} alerta(s) críticas`,
          body: top.title,
          url: '/dashboard/alertas',
          tag: `daily-${orgId}`,
          severity: 'CRITICAL',
        })
        pushesSent += result.sent
        pushesFailed += result.failed
      } catch {
        pushesFailed += 1
      }
    }

    const summary = {
      contractsAutoExpired: expiredCount,
      expiringContracts: expiringContracts.length,
      overdueSst: overdueSst.length,
      ctsDeadlineActive: ctsDeadline !== null,
      complaintDeadlineAlerts: complaintAlerts.length,
      orgsNotified: orgAlerts.size,
      sectionErrors: sectionErrors.length > 0 ? sectionErrors : undefined,
      emailsSent,
      emailsFailed,
      pushesSent,
      pushesFailed,
    }

    await completeCronRun(claim.runId, summary)
    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    console.error('Daily alerts cron error:', error)
    await failCronRun(claim.runId, error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
