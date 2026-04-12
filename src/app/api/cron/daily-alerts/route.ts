import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/client'
import { alertEmail } from '@/lib/email/templates'

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

  try {
    const now = new Date()
    const in7Days = new Date(now)
    in7Days.setDate(in7Days.getDate() + 7)

    const in15Days = new Date(now)
    in15Days.setDate(in15Days.getDate() + 15)

    // ------------------------------------------------
    // 1. Contracts expiring within 7 days
    // ------------------------------------------------
    const expiringContracts = await prisma.contract.findMany({
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

    // ------------------------------------------------
    // 2. Overdue SST records
    // ------------------------------------------------
    const overdueSst = await prisma.sstRecord.findMany({
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

    // To get the org alertEmail for SST records (no direct relation),
    // collect unique orgIds and fetch orgs
    const sstOrgIds = [...new Set(overdueSst.map((r) => r.orgId))]
    const sstOrgs = sstOrgIds.length > 0
      ? await prisma.organization.findMany({
          where: { id: { in: sstOrgIds } },
          select: { id: true, name: true, alertEmail: true },
        })
      : []
    const sstOrgMap = new Map(sstOrgs.map((o) => [o.id, o]))

    // ------------------------------------------------
    // 3. Pending CTS deposits — within 15 days of May/Nov deadline
    //    CTS deadlines: May 15 and November 15 each year
    // ------------------------------------------------
    const currentMonth = now.getMonth() // 0-indexed
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
    }

    // ------------------------------------------------
    // 4. Complaint deadline alerts
    //    3 days: proteccion, 30 days: investigacion, 5 days: resolucion
    // ------------------------------------------------
    const openComplaints = await prisma.complaint.findMany({
      where: {
        status: { in: ['RECEIVED', 'UNDER_REVIEW', 'INVESTIGATING', 'PROTECTION_APPLIED'] },
      },
      include: {
        organization: { select: { id: true, name: true, alertEmail: true } },
      },
    })

    const complaintAlerts: { orgId: string; email: string | null; orgName: string; title: string; desc: string; due: string }[] = []
    for (const c of openComplaints) {
      const received = new Date(c.receivedAt)
      const daysSince = Math.floor((now.getTime() - received.getTime()) / 86400000)

      // 3 dias para medidas de proteccion (D.S. 014-2019-MIMP Art. 18)
      if (c.status === 'RECEIVED' && daysSince >= 2 && daysSince <= 4) {
        const deadline = new Date(received)
        deadline.setDate(deadline.getDate() + 3)
        complaintAlerts.push({
          orgId: c.organization.id,
          email: c.organization.alertEmail,
          orgName: c.organization.name,
          title: `Denuncia ${c.code}: plazo de proteccion vence pronto`,
          desc: `La denuncia ${c.code} requiere medidas de proteccion dentro de 3 dias habiles (Art. 18 D.S. 014-2019-MIMP). ${daysSince >= 3 ? 'PLAZO VENCIDO.' : `Quedan ${3 - daysSince} dia(s).`}`,
          due: deadline.toLocaleDateString('es-PE'),
        })
      }

      // 30 dias para investigacion (Art. 20)
      if (['INVESTIGATING', 'PROTECTION_APPLIED'].includes(c.status) && daysSince >= 25 && daysSince <= 32) {
        const deadline = new Date(received)
        deadline.setDate(deadline.getDate() + 30)
        complaintAlerts.push({
          orgId: c.organization.id,
          email: c.organization.alertEmail,
          orgName: c.organization.name,
          title: `Denuncia ${c.code}: plazo de investigacion vence pronto`,
          desc: `La investigacion de ${c.code} debe completarse en 30 dias calendario (Art. 20). ${daysSince >= 30 ? 'PLAZO VENCIDO.' : `Quedan ${30 - daysSince} dia(s).`}`,
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
    }

    return NextResponse.json({
      ok: true,
      summary: {
        expiringContracts: expiringContracts.length,
        overdueSst: overdueSst.length,
        ctsDeadlineActive: ctsDeadline !== null,
        complaintDeadlineAlerts: complaintAlerts.length,
        orgsNotified: orgAlerts.size,
        emailsSent,
        emailsFailed,
      },
    })
  } catch (error) {
    console.error('Daily alerts cron error:', error)
    return NextResponse.json({ error: 'Cron job failed' }, { status: 500 })
  }
}
