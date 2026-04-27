/**
 * POST /api/subscriptions/start-paid
 *
 * Activa una suscripción pagada DIRECTAMENTE (saltándose el trial) con
 * descuento del 20% en el primer mes. Para usuarios high-intent que
 * ya están listos para pagar.
 *
 * Body: {
 *   plan: 'STARTER' | 'EMPRESA' | 'PRO',
 *   culqiToken: string  // token de tarjeta generado en frontend con Culqi.js
 * }
 *
 * Comportamiento:
 *   1. Valida plan + token
 *   2. Cobra el primer mes con 20% off via Culqi
 *   3. Crea Subscription { status: 'ACTIVE', currentPeriodEnd: now + 30d }
 *   4. Si Culqi falla (tarjeta rechazada, etc.), devuelve el error sin cobrar
 *   5. Email de bienvenida + factura
 *   6. AuditLog
 *
 * IMPORTANTE: en dev mode (sin CULQI_SECRET_KEY) el cobro es mockeado y
 * la subscription queda creada igual. Solo prod hace cobro real.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { CulqiService, CulqiPaymentError, CULQI_PLANS } from '@/lib/payments/culqi'

const PAID_FIRST_MONTH_DISCOUNT = 0.2 // 20% off
const VALID_PLANS = new Set(['STARTER', 'EMPRESA', 'PRO'])

export const POST = withAuth(async (req, ctx) => {
  let body: { plan?: string; culqiToken?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const plan = body.plan?.toUpperCase()
  if (!plan || !VALID_PLANS.has(plan)) {
    return NextResponse.json(
      { error: 'Plan inválido', code: 'INVALID_PLAN' },
      { status: 400 },
    )
  }
  if (!body.culqiToken || typeof body.culqiToken !== 'string') {
    return NextResponse.json(
      { error: 'Token de tarjeta requerido', code: 'MISSING_TOKEN' },
      { status: 400 },
    )
  }

  // Verificar que no haya suscripción activa
  const existing = await prisma.subscription.findUnique({
    where: { orgId: ctx.orgId },
    select: { status: true, plan: true },
  })
  if (existing && existing.status === 'ACTIVE') {
    return NextResponse.json(
      { error: 'Ya tienes una suscripción activa.', code: 'SUBSCRIPTION_EXISTS' },
      { status: 409 },
    )
  }

  // Calcular monto con descuento (20% off del primer mes)
  const planConfig = CULQI_PLANS[plan as 'STARTER' | 'EMPRESA' | 'PRO']
  const fullPriceCentimos = planConfig.priceInCentimos
  const discountedCentimos = Math.round(fullPriceCentimos * (1 - PAID_FIRST_MONTH_DISCOUNT))

  // Resolver email del admin
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { name: true, alertEmail: true },
  })
  if (!org?.alertEmail) {
    return NextResponse.json(
      { error: 'Tu organización no tiene email registrado. Completa el wizard de empresa primero.', code: 'NO_EMAIL' },
      { status: 400 },
    )
  }

  // Cobro Culqi
  const culqi = new CulqiService()
  let chargeId: string
  try {
    const charge = await culqi.createCharge(
      discountedCentimos,
      'PEN',
      org.alertEmail,
      body.culqiToken,
      `Comply360 ${planConfig.name} — Primer mes (20% off)`,
      {
        orgId: ctx.orgId,
        plan,
        firstMonthDiscount: 'true',
      },
    )
    chargeId = charge.id
  } catch (err) {
    if (err instanceof CulqiPaymentError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          paymentError: true,
        },
        { status: err.statusCode },
      )
    }
    return NextResponse.json(
      { error: 'No pudimos procesar el pago. Inténtalo de nuevo.', code: 'PAYMENT_ERROR' },
      { status: 500 },
    )
  }

  // Crear/actualizar Subscription como ACTIVE
  const now = new Date()
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 días

  try {
    await prisma.subscription.upsert({
      where: { orgId: ctx.orgId },
      create: {
        orgId: ctx.orgId,
        plan: plan as 'STARTER' | 'EMPRESA' | 'PRO',
        status: 'ACTIVE',
        paymentProvider: 'culqi',
        externalSubscriptionId: chargeId, // primer cobro one-shot, no recurring todavía
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: plan as 'STARTER' | 'EMPRESA' | 'PRO',
        status: 'ACTIVE',
        paymentProvider: 'culqi',
        externalSubscriptionId: chargeId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelledAt: null,
      },
    })

    await prisma.organization.update({
      where: { id: ctx.orgId },
      data: {
        plan: plan as 'STARTER' | 'EMPRESA' | 'PRO',
        planExpiresAt: periodEnd,
        onboardingCompleted: true,
      },
    })

    // Email de confirmación + factura
    void sendEmail({
      to: org.alertEmail,
      subject: `✓ Pago confirmado — Comply360 ${plan}`,
      html: buildConfirmationEmailHtml(plan, org.name ?? 'tu empresa', discountedCentimos / 100, fullPriceCentimos / 100, periodEnd),
    }).catch(() => null)

    // AuditLog
    void prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'subscription.paid_started',
          entityType: 'Subscription',
          entityId: ctx.orgId,
          metadataJson: {
            plan,
            chargeId,
            amountCentimos: discountedCentimos,
            discountApplied: PAID_FIRST_MONTH_DISCOUNT,
            periodEndsAt: periodEnd.toISOString(),
          },
        },
      })
      .catch(() => null)

    return NextResponse.json({
      success: true,
      subscription: {
        plan,
        status: 'ACTIVE',
        chargedAmount: discountedCentimos / 100,
        currency: 'PEN',
        currentPeriodEnd: periodEnd.toISOString(),
        chargeId,
      },
      redirect: '/dashboard?welcome=paid',
    })
  } catch (err) {
    console.error('[start-paid] Error post-cobro:', err)
    // El cobro YA pasó pero la DB falló. Esto es un caso raro pero crítico —
    // logueamos para reconciliar manualmente. El cliente NO debe pagar dos veces.
    return NextResponse.json(
      {
        error: 'Tu pago se procesó pero hubo un error al activar tu cuenta. Soporte lo resolverá en minutos.',
        code: 'POST_CHARGE_ERROR',
        chargeId,
      },
      { status: 500 },
    )
  }
})

function buildConfirmationEmailHtml(
  plan: string,
  orgName: string,
  paidAmount: number,
  fullAmount: number,
  periodEnd: Date,
): string {
  const formatDate = periodEnd.toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return `
    <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #047857; font-size: 24px;">Bienvenido a Comply360 ${plan} ✓</h1>
      <p style="color: #374151; font-size: 16px; line-height: 1.6;">
        Pago confirmado. Tu plan está activo para <strong>${orgName}</strong>.
      </p>
      <table style="width: 100%; margin: 16px 0; border-collapse: collapse; background: #f9fafb; border-radius: 8px; padding: 12px;">
        <tr><td style="padding: 8px;">Plan</td><td style="padding: 8px; text-align: right;"><strong>${plan}</strong></td></tr>
        <tr><td style="padding: 8px;">Precio normal</td><td style="padding: 8px; text-align: right; color: #9ca3af; text-decoration: line-through;">S/ ${fullAmount.toFixed(2)}</td></tr>
        <tr><td style="padding: 8px;">Descuento primer mes (20%)</td><td style="padding: 8px; text-align: right; color: #047857;">-S/ ${(fullAmount - paidAmount).toFixed(2)}</td></tr>
        <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 8px;"><strong>Cobrado hoy</strong></td><td style="padding: 8px; text-align: right;"><strong>S/ ${paidAmount.toFixed(2)}</strong></td></tr>
        <tr><td style="padding: 8px;">Próxima renovación</td><td style="padding: 8px; text-align: right;">${formatDate} (S/ ${fullAmount.toFixed(2)})</td></tr>
      </table>
      <p style="color: #374151; font-size: 15px;">
        Recibirás tu factura electrónica formal en las próximas 24 horas.
      </p>
      <p style="margin-top: 24px;">
        <a href="https://comply360.pe/dashboard" style="background: #047857; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          Ir al dashboard
        </a>
      </p>
    </div>
  `
}
