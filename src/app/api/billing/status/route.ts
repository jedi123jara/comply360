/**
 * GET /api/billing/status
 *
 * Devuelve el estado de facturación de la organización actual:
 *  - plan actual (FREE | STARTER | EMPRESA | PRO)
 *  - planExpiresAt (trial end o subscription end)
 *  - trialDaysRemaining (>0 si está en trial, 0 si ya expiró)
 *  - isTrialActive (true si plan != STARTER y planExpiresAt está en el futuro)
 *  - isPastDue (true si subscription.status === PAST_DUE)
 *  - nextCharge (monto + fecha si hay subscription activa)
 *
 * Usado por `<TrialBanner />` y UI de upgrade.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { PLANS } from '@/lib/constants'

export const runtime = 'nodejs'

export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        plan: true,
        planExpiresAt: true,
        subscription: {
          select: {
            status: true,
            currentPeriodEnd: true,
            plan: true,
          },
        },
      },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 })
    }

    const now = new Date()
    const expires = org.planExpiresAt ?? org.subscription?.currentPeriodEnd ?? null
    const expiresMs = expires ? new Date(expires).getTime() - now.getTime() : null
    const msDay = 86400000
    const trialDaysRemaining =
      expiresMs !== null ? Math.max(0, Math.ceil(expiresMs / msDay)) : null

    // Considera "trial activo" si plan != STARTER/FREE y hay planExpiresAt futuro
    const isTrialActive =
      org.plan !== 'STARTER' &&
      org.plan !== 'FREE' &&
      !org.subscription &&
      expires !== null &&
      new Date(expires) > now

    const isPastDue = org.subscription?.status === 'PAST_DUE'

    // Calcular próximo cargo si hay suscripción
    let nextCharge: { amount: number; currency: string; at: string } | null = null
    if (
      org.subscription &&
      org.subscription.status === 'ACTIVE' &&
      org.subscription.currentPeriodEnd
    ) {
      const planKey = org.subscription.plan as keyof typeof PLANS
      const planData = PLANS[planKey]
      if (planData) {
        nextCharge = {
          amount: planData.price,
          currency: planData.currency,
          at: org.subscription.currentPeriodEnd.toISOString(),
        }
      }
    }

    return NextResponse.json({
      plan: org.plan,
      planExpiresAt: expires ? new Date(expires).toISOString() : null,
      trialDaysRemaining,
      isTrialActive,
      isPastDue,
      hasSubscription: Boolean(org.subscription),
      subscriptionStatus: org.subscription?.status ?? null,
      nextCharge,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ error: 'internal_error', detail: msg }, { status: 500 })
  }
})
