import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createHmac } from 'crypto'

// =============================================
// POST /api/payments/webhook - Culqi webhook handler
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
  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-culqi-signature')

    // ---- Validar firma ----
    if (!validateWebhookSignature(rawBody, signature)) {
      console.error('[Webhook] Firma invalida')
      return NextResponse.json(
        { error: 'Firma de webhook invalida' },
        { status: 401 }
      )
    }

    const payload = JSON.parse(rawBody) as CulqiWebhookPayload
    const { type, data } = payload

    console.log(`[Webhook] Evento recibido: ${type}`, { chargeId: data.id })

    // ---- Procesar eventos ----
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

      default:
        console.log(`[Webhook] Evento no manejado: ${type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Error procesando webhook:', error)
    return NextResponse.json(
      { error: 'Error interno al procesar el webhook' },
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
