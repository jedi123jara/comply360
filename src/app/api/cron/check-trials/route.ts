import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// =============================================
// GET /api/cron/check-trials
// Cron diario: downgrade orgs con trial PRO expirado
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
        const upgradeUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://comply360.pe'}/dashboard/planes`
        await sendEmail({
          to: org.alertEmail,
          subject: 'Tu prueba gratuita de COMPLY360 ha terminado',
          html: `<p>Hola ${orgName},</p><p>Tu periodo de prueba gratuita ha finalizado. Para continuar usando todas las funcionalidades de COMPLY360, actualiza tu plan.</p><p><a href="${upgradeUrl}">Actualizar plan</a></p>`,
        }).catch(() => { /* best-effort */ })
      }

      downgraded++
    }

    return NextResponse.json({
      checked: expiredTrials.length,
      downgraded,
      timestamp: now.toISOString(),
    })
  } catch (error) {
    console.error('[check-trials] Error:', error)
    return NextResponse.json({ error: 'Failed to check trials' }, { status: 500 })
  }
}
