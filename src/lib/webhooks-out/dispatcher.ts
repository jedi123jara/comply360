/**
 * Dispatcher de webhooks salientes (API pública v1).
 *
 * Diseño: 2 etapas.
 *   1. Encolado — `enqueueWebhookDelivery(subscription, event)` crea filas
 *      en `WebhookDelivery` con status PENDING. Esto se llama desde el event
 *      bus al emitir un DomainEvent. NO hace HTTP — solo persiste.
 *   2. Procesamiento — `processWebhookDelivery(delivery)` hace el POST con
 *      HMAC + actualiza el row con resultado. Lo llama el cron `webhook-retry`.
 *
 * Esta separación garantiza que un evento del usuario NUNCA bloquee por un
 * cliente B2B con webhook lento o caído. Adicionalmente permite retry sin
 * perder el evento original.
 *
 * Headers que recibe el cliente:
 *   - `Content-Type: application/json`
 *   - `X-Comply360-Event: <event-name>`
 *   - `X-Comply360-Delivery-Id: <delivery-id>`
 *   - `X-Comply360-Timestamp: <unix-seconds>`
 *   - `X-Comply360-Signature: sha256=<hex>`
 *
 * Para verificar la firma, el cliente reconstruye:
 *   `<timestamp>.<raw-body>` → HMAC-SHA256 con su `secret` → comparar con
 *   el header. Esto previene replay (timestamp viejo) y manipulación.
 */

import { createHmac, randomBytes } from 'crypto'
import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import type { DomainEvent, EventName } from '@/lib/events/catalog'

const MAX_ATTEMPTS = 5
const RETRY_BACKOFF_SEC = [60, 300, 1800, 7200, 43_200] // 1m, 5m, 30m, 2h, 12h
const MAX_RESPONSE_BODY_BYTES = 2000
const REPLAY_WINDOW_SEC = 300 // referencial — el cliente decide

/**
 * Genera un secret nuevo para una suscripción. Se exhibe UNA vez al crearla.
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Calcula la firma HMAC-SHA256 que el receptor debe verificar.
 * Formato: `sha256=<hex>` sobre `${timestamp}.${rawBody}`.
 */
export function signWebhookBody(secret: string, rawBody: string, timestampSec: number): string {
  const payload = `${timestampSec}.${rawBody}`
  const hmac = createHmac('sha256', secret).update(payload).digest('hex')
  return `sha256=${hmac}`
}

/**
 * Encola una delivery por cada subscription que matchea el evento.
 * Se llama desde el handler del event bus.
 *
 * Idempotente por accidente: si el handler corre 2× para el mismo eventId
 * + subscription, se crean 2 deliveries. Eso es OK porque el cron las
 * procesa por separado y el cliente puede deduplicar con eventId. Si quieres
 * evitarlo, agrega un unique([subscriptionId, eventId]) en el schema.
 */
export async function enqueueDeliveriesForEvent<K extends EventName>(
  event: DomainEvent<K>,
): Promise<{ enqueued: number }> {
  const orgId = (event.payload as { orgId?: string }).orgId
  if (!orgId) return { enqueued: 0 }

  // Buscar subs activas suscritas a este evento.
  // Postgres array containment: events @> ARRAY['<name>']
  const subs = await prisma.webhookSubscription.findMany({
    where: {
      orgId,
      active: true,
      events: { has: event.name },
    },
    select: { id: true },
  })

  if (subs.length === 0) return { enqueued: 0 }

  await prisma.webhookDelivery.createMany({
    data: subs.map((s) => ({
      subscriptionId: s.id,
      orgId,
      eventName: event.name,
      eventId: event.id,
      payload: event.payload as Prisma.InputJsonValue,
      status: 'PENDING',
      nextRetryAt: new Date(),
    })),
  })

  return { enqueued: subs.length }
}

export interface DeliveryResult {
  status: 'SUCCESS' | 'FAILED' | 'DEAD_LETTER'
  responseStatus?: number
  responseBody?: string
  error?: string
}

/**
 * Procesa una delivery PENDING/FAILED. Hace el POST con HMAC + actualiza
 * el row. Si falla y excede MAX_ATTEMPTS, queda DEAD_LETTER.
 *
 * Si la sub acumula 5 fallos consecutivos, se desactiva (`active=false`).
 */
export async function processWebhookDelivery(deliveryId: string): Promise<DeliveryResult> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { subscription: true },
  })
  if (!delivery) {
    return { status: 'FAILED', error: 'delivery not found' }
  }
  if (delivery.status === 'SUCCESS' || delivery.status === 'DEAD_LETTER') {
    return { status: delivery.status, error: 'already final' }
  }
  if (!delivery.subscription.active) {
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: 'DEAD_LETTER', error: 'subscription disabled', completedAt: new Date() },
    })
    return { status: 'DEAD_LETTER', error: 'subscription disabled' }
  }

  const attempts = delivery.attempts + 1
  const timestamp = Math.floor(Date.now() / 1000)
  const body = JSON.stringify({
    id: delivery.id,
    event: delivery.eventName,
    eventId: delivery.eventId,
    createdAt: delivery.createdAt.toISOString(),
    payload: delivery.payload,
  })
  const signature = signWebhookBody(delivery.subscription.secret, body, timestamp)

  let responseStatus: number | undefined
  let responseBody: string | undefined
  let error: string | undefined
  let success = false

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)

    const res = await fetch(delivery.subscription.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Comply360-Event': delivery.eventName,
        'X-Comply360-Delivery-Id': delivery.id,
        'X-Comply360-Timestamp': String(timestamp),
        'X-Comply360-Signature': signature,
        'X-Comply360-Replay-Window-Sec': String(REPLAY_WINDOW_SEC),
        'User-Agent': 'Comply360-Webhooks/1',
      },
      body,
      signal: controller.signal,
    }).finally(() => clearTimeout(timer))

    responseStatus = res.status
    const rawText = await res.text().catch(() => '')
    responseBody = rawText.slice(0, MAX_RESPONSE_BODY_BYTES)

    // 2xx = OK; 5xx + 408/429 = retry; otros 4xx = dead-letter (cliente debe corregir)
    if (res.ok) {
      success = true
    } else if (res.status >= 500 || res.status === 408 || res.status === 429) {
      error = `retryable HTTP ${res.status}`
    } else {
      error = `non-retryable HTTP ${res.status}`
    }
  } catch (err) {
    error = err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200)
  }

  // Determinar próximo estado
  let newStatus: 'SUCCESS' | 'FAILED' | 'DEAD_LETTER'
  let nextRetryAt: Date | null = null

  if (success) {
    newStatus = 'SUCCESS'
  } else if (
    error?.startsWith('non-retryable') ||
    attempts >= MAX_ATTEMPTS
  ) {
    newStatus = 'DEAD_LETTER'
  } else {
    newStatus = 'FAILED'
    const backoffSec = RETRY_BACKOFF_SEC[Math.min(attempts - 1, RETRY_BACKOFF_SEC.length - 1)]
    nextRetryAt = new Date(Date.now() + backoffSec * 1000)
  }

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: newStatus,
      attempts,
      lastAttemptAt: new Date(),
      nextRetryAt,
      responseStatus: responseStatus ?? null,
      responseBody: responseBody ?? null,
      error: error ?? null,
      completedAt: newStatus === 'SUCCESS' || newStatus === 'DEAD_LETTER' ? new Date() : null,
    },
  })

  // Actualizar sub: lastDelivery + consecutiveFailures
  if (success) {
    await prisma.webhookSubscription.update({
      where: { id: delivery.subscription.id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: 'SUCCESS',
        consecutiveFailures: 0,
      },
    })
  } else if (newStatus === 'DEAD_LETTER') {
    const updated = await prisma.webhookSubscription.update({
      where: { id: delivery.subscription.id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: 'FAILED',
        consecutiveFailures: { increment: 1 },
      },
      select: { consecutiveFailures: true },
    })
    // Auto-desactivar tras N dead-letters consecutivos
    if (updated.consecutiveFailures >= 5) {
      await prisma.webhookSubscription.update({
        where: { id: delivery.subscription.id },
        data: { active: false },
      })
    }
  } else {
    // FAILED retryable — solo actualiza timestamps
    await prisma.webhookSubscription.update({
      where: { id: delivery.subscription.id },
      data: { lastDeliveryAt: new Date(), lastDeliveryStatus: 'FAILED' },
    })
  }

  return {
    status: newStatus,
    responseStatus,
    responseBody,
    error,
  }
}

/**
 * Procesa todas las deliveries pendientes (status PENDING o FAILED con
 * nextRetryAt vencido). Llamado por el cron `webhook-retry`.
 */
export async function processPendingDeliveries(maxBatch = 50): Promise<{
  processed: number
  successes: number
  failures: number
  deadLetters: number
}> {
  const due = await prisma.webhookDelivery.findMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    orderBy: { createdAt: 'asc' },
    take: maxBatch,
    select: { id: true },
  })

  let successes = 0
  let failures = 0
  let deadLetters = 0

  for (const d of due) {
    const r = await processWebhookDelivery(d.id)
    if (r.status === 'SUCCESS') successes += 1
    else if (r.status === 'DEAD_LETTER') deadLetters += 1
    else failures += 1
  }

  return { processed: due.length, successes, failures, deadLetters }
}
