/**
 * POST /api/subscriptions/start-free
 *
 * Finaliza el plan picker eligiendo el tier FREE. No crea Subscription,
 * solo marca Organization.plan = 'FREE' explícitamente para que
 * `/api/onboarding/progress` deje de devolver needsPlan=true.
 *
 * El plan FREE limita a 5 trabajadores + calculadoras. Si el usuario
 * intenta usar features paid, choca con plan-gate y aparece UpgradeModal.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const POST = withAuth(async (_req, ctx) => {
  try {
    await prisma.organization.update({
      where: { id: ctx.orgId },
      data: {
        plan: 'FREE',
        planExpiresAt: null, // FREE no expira
        onboardingCompleted: true,
      },
    })

    void prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'subscription.free_chosen',
          entityType: 'Organization',
          entityId: ctx.orgId,
        },
      })
      .catch(() => null)

    return NextResponse.json({
      success: true,
      plan: 'FREE',
      redirect: '/dashboard?welcome=free',
    })
  } catch (err) {
    console.error('[start-free] Error:', err)
    return NextResponse.json(
      { error: 'No pudimos guardar tu elección. Inténtalo de nuevo.' },
      { status: 500 },
    )
  }
})
