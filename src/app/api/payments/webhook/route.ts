import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'
import { CULQI_PLANS } from '@/lib/payments/culqi'

// =============================================
// POST /api/payments/webhook
//
// Webhook receiver de Culqi (INBOUND). Procesa eventos de pago → activa planes.
//
// ⚠️ NO confundir con `/api/webhooks/subscriptions` que es CRUD de webhooks
// salientes (suscripciones de clientes PRO que quieren recibir eventos de Comply360).
//
// Dead letter queue: si un handler falla, registramos el evento en AuditLog
// con action='culqi.webhook.dlq' para permitir retry manual u inspección.
// =============================================

interface CulqiWebhookPayload {
  type: string
  data: {
    id: string
    object: string
    amount?: number
    currency?: string
    email?: string
    metadata?: Record<string, string>
    status?: string
  }
}

/**
 * Validate Culqi webhook signature using HMAC-SHA256.
 * Culqi sends the signature in the X-Culqi-Signature header.
 */
function validateWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  const secret = process.env.CULQI_WEBHOOK_SECRET
  if (!secret) {
    // En desarrollo sin secret configurado, aceptar todos los webhooks
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Webhook] Sin CULQI_WEBHOOK_SECRET - aceptando en modo desarrollo')
      return true
    }
    return false
  }

  if (!signature) return false

  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Comparacion segura contra timing attacks
  if (signature.length !== expectedSignature.length) return false
  let mismatch = 0
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i)
  }
  return mismatch === 0
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const receivedAt = new Date().toISOString()
  let rawBody = ''
  let payload: CulqiWebhookPayload | null = null

  try {
    rawBody = await req.text()
    const signature = req.headers.get('x-culqi-signature')

    // ---- Validar firma ----
    if (!validateWebhookSignature(rawBody, signature)) {
      console.error('[Culqi Webhook] Firma invalida', {
        signaturePresent: !!signature,
        bodyLength: rawBody.length,
      })
      // No DLQ en este caso — firma inválida = posible ataque, dropear silencioso
      return NextResponse.json(
        { error: 'Firma de webhook invalida' },
        { status: 401 }
      )
    }

    payload = JSON.parse(rawBody) as CulqiWebhookPayload
    const { type, data } = payload

    console.log(`[Culqi Webhook] Evento recibido: ${type}`, {
      chargeId: data.id,
      amount: data.amount,
      receivedAt,
    })

    // ---- Idempotencia: dedupe por (provider, externalId) ----
    // Culqi reenvía cuando recibimos timeout o respondemos 5xx. Sin esta
    // guardia, cada retry de `charge.success` extiende `currentPeriodEnd` un
    // mes adicional, regalando plan al cliente.
    if (!data.id) {
      console.warn('[Culqi Webhook] payload sin data.id — no se puede deduplicar')
      return NextResponse.json({ error: 'Payload sin id' }, { status: 400 })
    }

    const existing = await prisma.webhookEvent.findUnique({
      where: { provider_externalId: { provider: 'culqi', externalId: data.id } },
    })

    if (existing && existing.processedAt) {
      console.log(
        `[Culqi Webhook] Evento ${type} (id=${data.id}) ya procesado el ${existing.processedAt.toISOString()} — ignorando.`,
      )
      return NextResponse.json({
        received: true,
        duplicated: true,
        previouslyProcessedAt: existing.processedAt,
      })
    }

    // Crea (o reusa) el registro como RECEIVED. Solo procesamos hacia adelante.
    const webhookEvent = await prisma.webhookEvent.upsert({
      where: { provider_externalId: { provider: 'culqi', externalId: data.id } },
      create: {
        provider: 'culqi',
        externalId: data.id,
        eventType: type,
        payload: payload as object,
        status: 'RECEIVED',
      },
      update: { eventType: type, payload: payload as object },
    })

    // ---- Procesar eventos ----
    let handlerError: unknown = null
    try {
      switch (type) {
        case 'charge.success':
          await handleChargeSuccess(data)
          break

        case 'charge.failed':
          await handleChargeFailed(data)
          break

        case 'subscription.cancelled':
          await handleSubscriptionCancelled(data)
          break

        // FIX #3.C: handlers para refund y dispute.
        case 'charge.refunded':
          await handleChargeRefunded(data)
          break

        case 'charge.disputed':
          await handleChargeDisputed(data)
          break

        default:
          console.log(`[Culqi Webhook] Evento no manejado: ${type}`)
      }
    } catch (err) {
      handlerError = err
    }

    // ---- Marcar como procesado / fallido ----
    if (handlerError) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: {
          status: 'FAILED',
          error: handlerError instanceof Error ? handlerError.message.slice(0, 500) : String(handlerError).slice(0, 500),
        },
      })
      throw handlerError
    }

    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: { status: 'PROCESSED', processedAt: new Date() },
    })

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Culqi Webhook] Error procesando webhook:', error)

    // ── Dead Letter Queue ─────────────────────────────────────────────────
    // Persistimos el evento crudo en AuditLog para retry manual / investigación.
    // orgId en metadata del evento si está; si no, usamos 'system'.
    try {
      const orgIdFromMeta = payload?.data?.metadata?.orgId
      const orgId = typeof orgIdFromMeta === 'string' ? orgIdFromMeta : 'system'
      await prisma.auditLog.create({
        data: {
          orgId,
          action: 'culqi.webhook.dlq',
          entityType: 'CulqiWebhook',
          entityId: payload?.data?.id ?? 'unknown',
          metadataJson: {
            eventType: payload?.type ?? null,
            rawBodySnippet: rawBody.slice(0, 2000),
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack?.slice(0, 1000) : null,
            receivedAt,
          },
        },
      })
    } catch (dlqErr) {
      console.error('[Culqi Webhook] DLQ persist failed', dlqErr)
    }

    return NextResponse.json(
      { error: 'Error interno al procesar el webhook', dlq: true },
      { status: 500 }
    )
  }
}

// =============================================
// Event handlers
// =============================================

async function handleChargeSuccess(data: CulqiWebhookPayload['data']): Promise<void> {
  const orgId = data.metadata?.orgId
  const planId = data.metadata?.planId

  if (!orgId || !planId) {
    console.warn('[Webhook] charge.success sin orgId o planId en metadata')
    return
  }

  // FIX #0.8: validar que el monto cobrado coincida con el precio del plan.
  // Defense-in-depth aún con HMAC OK: si la metadata se manipula (o el
  // secret se filtra), un atacante podría pagar S/1 y activar PRO. La
  // validación amount === priceInCentimos cierra ese vector.
  const planConfig = CULQI_PLANS[planId as keyof typeof CULQI_PLANS]
  if (!planConfig) {
    throw new Error(`[Webhook] Plan desconocido en metadata: ${planId}`)
  }
  if (typeof data.amount !== 'number' || data.amount !== planConfig.priceInCentimos) {
    throw new Error(
      `[Webhook] Monto inconsistente para plan ${planId}: ` +
      `recibido=${data.amount} esperado=${planConfig.priceInCentimos}. Charge ${data.id} rechazado.`
    )
  }

  // FIX #3.D: race condition checkout↔webhook.
  // El checkout endpoint ya activa el plan + crea Subscription ACTIVE para
  // dar UX inmediato al cliente. Cuando el webhook llega luego (1-30s),
  // antes hacía un segundo upsert que extendía `currentPeriodEnd` un mes
  // adicional (regalando tiempo). Ahora chequeamos:
  //   - Si ya existe Subscription con este externalSubscriptionId y está
  //     ACTIVE → NO-OP idempotente (el checkout ya hizo el trabajo).
  //   - Si NO existe (caso flow webhook puro sin checkout previo) → crear.
  const existingSub = await prisma.subscription.findFirst({
    where: { externalSubscriptionId: data.id, status: 'ACTIVE' },
    select: { id: true, orgId: true, currentPeriodEnd: true },
  })
  if (existingSub) {
    console.log(
      `[Webhook] charge.success ${data.id} ya activado por checkout (sub ${existingSub.id}). No-op idempotente.`
    )
    return
  }

  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  try {
    await prisma.$transaction([
      prisma.organization.update({
        where: { id: orgId },
        data: {
          plan: planId as 'STARTER' | 'EMPRESA' | 'PRO',
          planExpiresAt: periodEnd,
        },
      }),
      prisma.subscription.upsert({
        where: { orgId },
        create: {
          orgId,
          plan: planId as 'STARTER' | 'EMPRESA' | 'PRO',
          status: 'ACTIVE',
          paymentProvider: 'culqi',
          externalSubscriptionId: data.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          plan: planId as 'STARTER' | 'EMPRESA' | 'PRO',
          status: 'ACTIVE',
          externalSubscriptionId: data.id,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
      }),
    ])

    console.log(`[Webhook] charge.success procesado para org ${orgId}, plan ${planId}`)
  } catch (err) {
    console.error('[Webhook] Error actualizando suscripcion en charge.success:', err)
    throw err
  }
}

async function handleChargeFailed(data: CulqiWebhookPayload['data']): Promise<void> {
  const orgId = data.metadata?.orgId

  if (!orgId) {
    console.warn('[Webhook] charge.failed sin orgId en metadata')
    return
  }

  try {
    // Registrar el fallo en el audit log
    await prisma.auditLog.create({
      data: {
        orgId,
        userId: data.metadata?.userId ?? 'system',
        action: 'payment.failed',
        entityType: 'Subscription',
        entityId: data.id,
        metadataJson: {
          chargeId: data.id,
          amount: data.amount,
          currency: data.currency,
          email: data.email,
          status: data.status,
        },
      },
    })

    console.log(`[Webhook] charge.failed registrado para org ${orgId}`)
  } catch (err) {
    console.error('[Webhook] Error registrando charge.failed:', err)
    throw err
  }
}

/**
 * FIX #3.C: charge.refunded
 *
 * Cliente pidió reembolso (Culqi lo procesó). Bajamos el plan a FREE y
 * registramos en AuditLog. La org pierde acceso al plan pago hasta que
 * pague de nuevo.
 */
async function handleChargeRefunded(data: CulqiWebhookPayload['data']): Promise<void> {
  // Resolver org desde la subscription que matchea charge.id
  const subscription = await prisma.subscription.findFirst({
    where: { externalSubscriptionId: data.id },
    select: { id: true, orgId: true, plan: true },
  })

  if (!subscription) {
    console.warn(`[Webhook] charge.refunded sin subscription para ${data.id}`)
    return
  }

  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    }),
    prisma.organization.update({
      where: { id: subscription.orgId },
      data: { plan: 'FREE', planExpiresAt: null },
    }),
  ])

  await prisma.auditLog
    .create({
      data: {
        orgId: subscription.orgId,
        userId: 'system',
        action: 'payment.refunded',
        entityType: 'Subscription',
        entityId: data.id,
        metadataJson: {
          chargeId: data.id,
          previousPlan: subscription.plan,
          amount: data.amount ?? null,
        },
      },
    })
    .catch((err) => console.error('[Webhook] audit refund failed:', err))

  console.log(`[Webhook] charge.refunded → org ${subscription.orgId} downgraded to FREE`)
}

/**
 * FIX #3.C: charge.disputed
 *
 * El cliente disputó el cargo (chargeback). NO bajamos el plan
 * automáticamente porque la disputa puede resolverse a favor de Comply360.
 * En su lugar marcamos `Subscription.status='DISPUTED'` y notificamos via
 * AuditLog (admin debe revisar manualmente).
 */
async function handleChargeDisputed(data: CulqiWebhookPayload['data']): Promise<void> {
  const subscription = await prisma.subscription.findFirst({
    where: { externalSubscriptionId: data.id },
    select: { id: true, orgId: true, plan: true },
  })

  if (!subscription) {
    console.warn(`[Webhook] charge.disputed sin subscription para ${data.id}`)
    return
  }

  // Marcamos como PAST_DUE para alertar al admin sin perder data del plan.
  // Cuando se resuelva la disputa, admin debe restaurar a ACTIVE manualmente
  // (vía endpoint de cancelación o resolución manual en DB).
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE' },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: subscription.orgId,
        userId: 'system',
        action: 'payment.disputed',
        entityType: 'Subscription',
        entityId: data.id,
        metadataJson: {
          chargeId: data.id,
          plan: subscription.plan,
          amount: data.amount ?? null,
          requiresManualReview: true,
        },
      },
    })
    .catch((err) => console.error('[Webhook] audit dispute failed:', err))

  console.warn(`[Webhook] ⚠️  charge.disputed → org ${subscription.orgId} marcada PAST_DUE — REVIEW MANUAL`)
}

async function handleSubscriptionCancelled(data: CulqiWebhookPayload['data']): Promise<void> {
  try {
    // Buscar suscripcion por ID externo
    const subscription = await prisma.subscription.findFirst({
      where: { externalSubscriptionId: data.id },
    })

    if (!subscription) {
      console.warn(`[Webhook] Suscripcion no encontrada para ID externo: ${data.id}`)
      return
    }

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      }),
      // Downgrade al plan FREE cuando se cancela la suscripcion
      prisma.organization.update({
        where: { id: subscription.orgId },
        data: {
          plan: 'FREE',
          planExpiresAt: null,
        },
      }),
    ])

    // Registrar en audit log
    try {
      await prisma.auditLog.create({
        data: {
          orgId: subscription.orgId,
          userId: 'system',
          action: 'subscription.cancelled',
          entityType: 'Subscription',
          entityId: data.id,
          metadataJson: {
            subscriptionId: data.id,
            previousPlan: subscription.plan,
          },
        },
      })
    } catch {
      // No bloquear si falla el audit log
    }

    console.log(`[Webhook] subscription.cancelled procesado para org ${subscription.orgId}`)
  } catch (err) {
    console.error('[Webhook] Error procesando subscription.cancelled:', err)
    throw err
  }
}
