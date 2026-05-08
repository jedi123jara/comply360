/**
 * POST /api/subscriptions/start-trial
 *
 * Activa un trial de 14 días en el plan elegido. Sin tarjeta de crédito.
 *
 * Body: { plan: 'STARTER' | 'EMPRESA' | 'PRO' }
 *
 * Comportamiento:
 *   - Si la org ya tiene Subscription activa → 409 (no permitir doble trial)
 *   - Crea Subscription { status: 'TRIALING', currentPeriodEnd: now + 14d }
 *   - Actualiza Organization.plan + Organization.planExpiresAt
 *   - Marca onboardingCompleted: true (sale del wizard)
 *   - Dispara email de bienvenida
 *   - Logs en AuditLog
 *
 * Plan FREE no requiere endpoint — el guard del dashboard solo verifica
 * que onboardingCompleted=true. Para FREE se usa /api/onboarding/finish-free.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

const TRIAL_DAYS = 14
const VALID_PLANS = new Set(['STARTER', 'EMPRESA', 'PRO'])

export const POST = withAuth(async (req, ctx) => {
  let body: { plan?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const plan = body.plan?.toUpperCase()
  if (!plan || !VALID_PLANS.has(plan)) {
    return NextResponse.json(
      { error: 'Plan inválido. Debe ser STARTER, EMPRESA o PRO.', code: 'INVALID_PLAN' },
      { status: 400 },
    )
  }

  // Verificar que no haya subscription activa
  const existing = await prisma.subscription.findUnique({
    where: { orgId: ctx.orgId },
    select: { status: true, plan: true, currentPeriodEnd: true },
  })

  if (existing) {
    if (existing.status === 'ACTIVE') {
      return NextResponse.json(
        {
          error: 'Ya tienes una suscripción activa. No puedes iniciar otro trial.',
          code: 'SUBSCRIPTION_EXISTS',
          currentPlan: existing.plan,
        },
        { status: 409 },
      )
    }
    // Si está en TRIALING o expirada, permitimos cambiar (caso "elegí mal el plan")
  }

  const now = new Date()
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  try {
    // Upsert subscription (crea o actualiza si ya existía con status no-ACTIVE)
    await prisma.subscription.upsert({
      where: { orgId: ctx.orgId },
      create: {
        orgId: ctx.orgId,
        plan: plan as 'STARTER' | 'EMPRESA' | 'PRO',
        status: 'TRIALING',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
      update: {
        plan: plan as 'STARTER' | 'EMPRESA' | 'PRO',
        status: 'TRIALING',
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
        cancelledAt: null,
      },
    })

    // Sincronizar plan + planExpiresAt en Organization
    const updated = await prisma.organization.update({
      where: { id: ctx.orgId },
      data: {
        plan: plan as 'STARTER' | 'EMPRESA' | 'PRO',
        planExpiresAt: trialEnd,
        onboardingCompleted: true,
      },
      select: { name: true, alertEmail: true },
    })

    // Email de bienvenida (best-effort)
    if (updated.alertEmail) {
      void sendEmail({
        to: updated.alertEmail,
        subject: `🚀 Tu trial ${plan} arrancó — 14 días gratis`,
        html: buildWelcomeEmailHtml(plan, updated.name ?? 'tu empresa', trialEnd),
      }).catch(() => null)
    }

    // AuditLog
    void prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'subscription.trial_started',
          entityType: 'Subscription',
          entityId: ctx.orgId,
          metadataJson: {
            plan,
            trialDays: TRIAL_DAYS,
            trialEndsAt: trialEnd.toISOString(),
          },
        },
      })
      .catch(() => null)

    return NextResponse.json({
      success: true,
      subscription: {
        plan,
        status: 'TRIALING',
        currentPeriodEnd: trialEnd.toISOString(),
        trialDaysRemaining: TRIAL_DAYS,
      },
      redirect: '/dashboard?welcome=trial',
    })
  } catch (err) {
    console.error('[start-trial] Error:', err)
    return NextResponse.json(
      {
        error: 'No pudimos activar tu trial. Inténtalo de nuevo.',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
})

function buildWelcomeEmailHtml(plan: string, orgName: string, trialEnd: Date): string {
  const formatDate = trialEnd.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #1e40af; font-size: 24px;">¡Tu trial ${plan} arrancó! 🚀</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Hola, gracias por activar Comply360 para <strong>${orgName}</strong>.
      </p>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Tu trial gratis de <strong>14 días</strong> está activo y vence el <strong>${formatDate}</strong>.
        Sin tarjeta. Cancela cuando quieras desde tu dashboard.
      </p>
      <h2 style="color: #111827; font-size: 18px; margin-top: 24px;">Próximos pasos sugeridos</h2>
      <ol style="color: #374151; font-size: 15px; line-height: 1.8;">
        <li>Sube tus primeros trabajadores (Excel o uno por uno)</li>
        <li>Corre tu diagnóstico SUNAFIL gratis (10 minutos)</li>
        <li>Genera tu primer contrato desde plantilla</li>
      </ol>
      <p style="margin-top: 32px;">
        <a href="https://comply360.pe/dashboard" style="background: #1e40af; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ir al dashboard
        </a>
      </p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        Te enviaremos un recordatorio 3 días antes del fin de trial. Si quieres adelantarte y
        ahorrar 20% en tu primer mes, puedes pagar ahora desde
        <a href="https://comply360.pe/dashboard/planes" style="color: #1e40af;">tu panel de planes</a>.
      </p>
    </div>
  `
}
