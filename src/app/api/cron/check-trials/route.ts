import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// =============================================
// GET /api/cron/check-trials
// Cron diario:
//   1. Reminder día 11 (3 días antes de expirar) → email "Quedan 3 días"
//   2. Downgrade orgs con trial expirado → email "Trial terminó"
//
// Idempotencia: AuditLog `action='trial.reminder.day11'` o
// `action='trial.expired.downgrade'` por org. Se evita doble envío
// chequeando si hubo evento del mismo tipo en las últimas 24h.
// =============================================
export async function GET(req: NextRequest) {
  // Verify cron secret — must be set; if missing, refuse all requests
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://comply360.pe'

    // ── 1. REMINDER DÍA 11 ──────────────────────────────────────────────
    // Trial activo con planExpiresAt entre +2.5d y +3.5d (= ventana del día 11
    // si el trial son 14 días). No enviar si ya enviamos un reminder en últimas 24h.
    const day11WindowStart = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000)
    const day11WindowEnd = new Date(now.getTime() + 3.5 * 24 * 60 * 60 * 1000)

    const trialsExpiringSoon = await prisma.organization.findMany({
      where: {
        planExpiresAt: { gte: day11WindowStart, lte: day11WindowEnd },
        plan: { in: ['EMPRESA', 'PRO'] },
      },
      include: { subscription: true },
    })

    let remindersSent = 0
    for (const org of trialsExpiringSoon) {
      if (!org.subscription || org.subscription.status !== 'TRIALING') continue
      if (!org.alertEmail) continue

      // Idempotencia
      const recentReminder = await prisma.auditLog.findFirst({
        where: {
          orgId: org.id,
          action: 'trial.reminder.day11',
          createdAt: { gte: yesterday },
        },
      })
      if (recentReminder) continue

      const orgName = org.razonSocial || org.name
      const upgradeUrl = `${baseUrl}/dashboard/planes`
      const planName = org.plan === 'PRO' ? 'PRO' : 'EMPRESA'

      await sendEmail({
        to: org.alertEmail,
        subject: `Tu trial ${planName} expira en 3 días`,
        html: `
          <p>Hola ${orgName},</p>
          <p>Tu trial <b>${planName}</b> de Comply360 expira en <b>3 días</b>.</p>
          <p>Para no perder acceso a tu diagnóstico SUNAFIL, simulacro, asistente IA y portal del trabajador, activa tu plan ahora.</p>
          <p><a href="${upgradeUrl}" style="display:inline-block;background:#059669;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Activar plan ${planName} →</a></p>
          <p style="color:#666;font-size:13px;margin-top:20px;">¿Dudas? Responde a este email.</p>
        `,
      }).catch(() => { /* best-effort */ })

      await prisma.auditLog.create({
        data: {
          orgId: org.id,
          action: 'trial.reminder.day11',
          entityType: 'subscription',
          entityId: org.subscription.id,
          metadataJson: { plan: org.plan, daysRemaining: 3 },
        },
      }).catch(() => { /* best-effort — no debe romper el cron */ })

      remindersSent++
    }

    // ── 2. DOWNGRADE TRIAL EXPIRADO ─────────────────────────────────────
    // Find orgs with expired trial — only target paid/trial plans
    const expiredTrials = await prisma.organization.findMany({
      where: {
        planExpiresAt: { lt: now },
        plan: { in: ['EMPRESA', 'PRO'] },
      },
      include: {
        subscription: true,
      },
    })

    let downgraded = 0

    for (const org of expiredTrials) {
      // Only downgrade if subscription is still TRIALING (not paid)
      const trialSub = org.subscription
      if (!trialSub || trialSub.status !== 'TRIALING') continue

      // Downgrade org to FREE (not STARTER — STARTER has paid features)
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          plan: 'FREE',
          planExpiresAt: null,
        },
      })

      // Update subscription status
      await prisma.subscription.update({
        where: { id: trialSub.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: now,
        },
      })

      // Send email notification
      if (org.alertEmail) {
        const orgName = org.razonSocial || org.name
        const upgradeUrl = `${baseUrl}/dashboard/planes`
        await sendEmail({
          to: org.alertEmail,
          subject: 'Tu prueba gratuita de COMPLY360 ha terminado',
          html: `<p>Hola ${orgName},</p><p>Tu periodo de prueba gratuita ha finalizado. Para continuar usando todas las funcionalidades de COMPLY360, actualiza tu plan.</p><p><a href="${upgradeUrl}">Actualizar plan</a></p>`,
        }).catch(() => { /* best-effort */ })
      }

      downgraded++
    }

    return NextResponse.json({
      remindersSent,
      checked: expiredTrials.length,
      downgraded,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[check-trials] Error:', error)
    return NextResponse.json({ error: 'Failed to check trials' }, { status: 500 })
  }
}
