import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { Plan } from '@/generated/prisma/client'
import {
  createCharge,
  CULQI_PLANS,
  isValidPaidPlan,
  CulqiPaymentError,
} from '@/lib/payments/culqi'

// =============================================
// POST /api/payments/checkout - Process payment
// =============================================

export const POST = withRole('OWNER', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const { planId, token } = body as { planId: string; token: string }

    // ---- Validation ----
    if (!planId || !token) {
      return NextResponse.json(
        { error: 'Se requiere planId y token de pago' },
        { status: 400 }
      )
    }

    if (!isValidPaidPlan(planId)) {
      return NextResponse.json(
        { error: 'Plan invalido. Planes disponibles: STARTER, EMPRESA, PRO' },
        { status: 400 }
      )
    }

    const plan = CULQI_PLANS[planId]

    // ---- Get organization ----
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: { id: true, name: true, plan: true },
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organizacion no encontrada' },
        { status: 404 }
      )
    }

    // ---- Prevent downgrade to same plan ----
    if (org.plan === planId) {
      return NextResponse.json(
        { error: 'Ya tienes este plan activo' },
        { status: 400 }
      )
    }

    // ---- Create charge via Culqi ----
    const charge = await createCharge(
      token,
      plan.priceInCentimos,
      ctx.email,
      `COMPLY360 - Plan ${plan.name} - ${org.name}`,
      {
        orgId: ctx.orgId,
        planId: planId,
        userId: ctx.userId,
      }
    )

    // ---- Calculate subscription period ----
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    // ---- Update org plan and create/update subscription ----
    const planEnum = planId as Plan

    await prisma.$transaction([
      // Update organization plan
      prisma.organization.update({
        where: { id: ctx.orgId },
        data: {
          plan: planEnum,
          planExpiresAt: periodEnd,
        },
      }),

      // Upsert subscription record
      prisma.subscription.upsert({
        where: { orgId: ctx.orgId },
        create: {
          orgId: ctx.orgId,
          plan: planEnum,
          status: 'ACTIVE',
          paymentProvider: 'culqi',
          externalSubscriptionId: charge.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          plan: planEnum,
          status: 'ACTIVE',
          paymentProvider: 'culqi',
          externalSubscriptionId: charge.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
      }),
    ])

    // ---- Log the transaction (audit) ----
    try {
      await prisma.auditLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'payment.processed',
          entityType: 'Subscription',
          entityId: charge.id,
          metadataJson: {
            plan: planId,
            amount: plan.priceInCentimos,
            currency: 'PEN',
            chargeId: charge.id,
            previousPlan: org.plan,
          },
        },
      })
    } catch {
      // Audit log failure should not block the payment response
      console.error('Error logging payment audit')
    }

    return NextResponse.json({
      success: true,
      data: {
        chargeId: charge.id,
        plan: planId,
        planName: plan.name,
        amount: plan.priceDisplay,
        currency: plan.currency,
        periodStart: now.toISOString(),
        periodEnd: periodEnd.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof CulqiPaymentError) {
      console.error('Culqi payment error:', error.message, error.code)
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 422 }
      )
    }

    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Error interno al procesar el pago. Intente nuevamente.' },
      { status: 500 }
    )
  }
})
