/**
 * POST /api/payments/cancel — FIX #3.C
 *
 * Endpoint cliente-facing para cancelar la suscripción Culqi de la org.
 * Antes el método existía en `lib/payments/culqi.ts:374` pero no estaba
 * expuesto vía API → el cliente solo podía cancelar contactando soporte
 * (riesgo INDECOPI por desafiliación obligatoria inmediata).
 *
 * Reglas:
 *   - Solo OWNER puede cancelar (es decisión administrativa).
 *   - Cancela en Culqi remoto + actualiza Subscription local.
 *   - NO baja el plan inmediatamente — el plan sigue ACTIVE hasta
 *     `currentPeriodEnd` (el cliente ya pagó por el periodo). Al expirar,
 *     `withPlanGate` lo degrada a FREE (FIX #0.4).
 *   - Loguea en AuditLog con `userId` del actor.
 */

import { NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { cancelSubscription } from '@/lib/payments/culqi'

export const POST = withRole('OWNER', async (_req, ctx) => {
  const subscription = await prisma.subscription.findFirst({
    where: { orgId: ctx.orgId, status: 'ACTIVE' },
    select: { id: true, externalSubscriptionId: true, plan: true, currentPeriodEnd: true },
  })

  if (!subscription) {
    return NextResponse.json(
      { error: 'No hay suscripción activa para cancelar' },
      { status: 404 },
    )
  }

  // Cancelar en Culqi (best-effort — si Culqi falla, igual marcamos local
  // como CANCELLED para que la org pueda reactivar más adelante)
  let culqiResult: { id: string; status: string } | null = null
  let culqiError: string | null = null
  if (subscription.externalSubscriptionId) {
    try {
      culqiResult = await cancelSubscription(subscription.externalSubscriptionId)
    } catch (err) {
      culqiError = err instanceof Error ? err.message : 'unknown'
      console.error('[payments/cancel] Culqi cancel failed:', err)
    }
  } else {
    culqiError = 'sin externalSubscriptionId — solo cancelación local'
  }

  // Marcar local como CANCELLED (mantenemos plan + planExpiresAt;
  // la org sigue usando el plan hasta el fin del periodo pagado).
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'subscription.cancelled.by_user',
        entityType: 'Subscription',
        entityId: subscription.id,
        metadataJson: {
          plan: subscription.plan,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          culqi: culqiResult,
          culqiError,
        },
      },
    })
    .catch((err) => console.error('[payments/cancel] audit failed:', err))

  return NextResponse.json({
    cancelled: true,
    accessUntil: subscription.currentPeriodEnd?.toISOString() ?? null,
    plan: subscription.plan,
    culqiError, // expone el error para que el cliente sepa si tiene que llamar a soporte
  })
})
