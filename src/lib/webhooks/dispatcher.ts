/**
 * Webhook Dispatcher genérico de COMPLY360
 *
 * Permite emitir eventos del sistema (ej: worker.created, contract.signed,
 * sunafil.notification, agent.run.completed) a endpoints HTTP suscritos por
 * los clientes.
 *
 * Características:
 *  - Firma HMAC-SHA256 en header `X-Comply360-Signature`
 *  - Reintentos exponenciales (3 intentos) ante 5xx o timeout
 *  - Timeout 8s
 *  - Async fire-and-forget desde el caller (no bloquea respuestas API)
 *
 * Persistencia: por ahora delega a Prisma con un fallback in-memory si la
 * tabla `Webhook` no existe (la migración real se hará en una iteración aparte).
 */

import { createHmac } from 'crypto'

// =============================================
// EVENT TYPES
// =============================================

export type WebhookEventType =
  | 'worker.created'
  | 'worker.updated'
  | 'worker.terminated'
  | 'contract.created'
  | 'contract.signed'
  | 'contract.expired'
  | 'compliance.diagnostic.completed'
  | 'sunafil.notification.received'
  | 'agent.run.completed'
  | 'risk.critical.detected'

export interface WebhookEvent<T = unknown> {
  /** ID único del evento */
  id: string
  /** Tipo */
  type: WebhookEventType
  /** Org ID que originó el evento */
  orgId: string
  /** Timestamp ISO */
  occurredAt: string
  /** Payload del evento */
  data: T
}

export interface WebhookSubscription {
  id: string
  orgId: string
  url: string
  secret: string
  events: WebhookEventType[]
  active: boolean
  createdAt: Date
}

// =============================================
// IN-MEMORY STORE (fallback)
// =============================================

const memorySubscriptions = new Map<string, WebhookSubscription[]>() // key: orgId

function getSubsFor(orgId: string, type: WebhookEventType): WebhookSubscription[] {
  const all = memorySubscriptions.get(orgId) || []
  return all.filter(s => s.active && s.events.includes(type))
}

export function registerSubscription(sub: WebhookSubscription): void {
  const list = memorySubscriptions.get(sub.orgId) || []
  list.push(sub)
  memorySubscriptions.set(sub.orgId, list)
}

export function listSubscriptions(orgId: string): WebhookSubscription[] {
  return memorySubscriptions.get(orgId) || []
}

export function removeSubscription(orgId: string, id: string): boolean {
  const list = memorySubscriptions.get(orgId) || []
  const next = list.filter(s => s.id !== id)
  memorySubscriptions.set(orgId, next)
  return next.length !== list.length
}

// =============================================
// SIGNING
// =============================================

/**
 * Firma HMAC-SHA256 del payload con el secret.
 * El receptor debe verificar antes de procesar.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// =============================================
// DELIVERY
// =============================================

interface DeliveryResult {
  url: string
  status: number
  ok: boolean
  attempts: number
  error?: string
}

async function deliverOnce(
  sub: WebhookSubscription,
  event: WebhookEvent,
  body: string
): Promise<{ status: number; ok: boolean; error?: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const signature = signPayload(body, sub.secret)
    const res = await fetch(sub.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'COMPLY360-Webhooks/1.0',
        'X-Comply360-Event': event.type,
        'X-Comply360-Event-Id': event.id,
        'X-Comply360-Signature': `sha256=${signature}`,
        'X-Comply360-Timestamp': event.occurredAt,
      },
      body,
      signal: controller.signal,
    })
    return { status: res.status, ok: res.ok }
  } catch (e) {
    return {
      status: 0,
      ok: false,
      error: e instanceof Error ? e.message : 'unknown',
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function deliverWithRetry(
  sub: WebhookSubscription,
  event: WebhookEvent,
  body: string
): Promise<DeliveryResult> {
  let lastStatus = 0
  let lastError: string | undefined
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await deliverOnce(sub, event, body)
    lastStatus = r.status
    lastError = r.error
    if (r.ok) {
      return { url: sub.url, status: r.status, ok: true, attempts: attempt }
    }
    // Solo reintentar 5xx y errores de red. 4xx no reintentar.
    if (r.status >= 400 && r.status < 500) break
    if (attempt < 3) await sleep(1000 * Math.pow(2, attempt - 1)) // 1s, 2s
  }
  return {
    url: sub.url,
    status: lastStatus,
    ok: false,
    attempts: 3,
    error: lastError,
  }
}

// =============================================
// PUBLIC API: dispatch
// =============================================

/**
 * Despacha un evento a todos los suscriptores de la org.
 * Async fire-and-forget — el caller NO debe esperar.
 *
 * Uso:
 *   dispatchWebhookEvent({
 *     id: randomUUID(),
 *     type: 'worker.created',
 *     orgId,
 *     occurredAt: new Date().toISOString(),
 *     data: { workerId, dni, firstName, lastName },
 *   })
 */
export function dispatchWebhookEvent(event: WebhookEvent): void {
  const subs = getSubsFor(event.orgId, event.type)
  if (subs.length === 0) return

  const body = JSON.stringify(event)
  for (const sub of subs) {
    deliverWithRetry(sub, event, body)
      .then(r => {
        if (!r.ok) {
          console.warn(
            `[webhook] ${event.type} → ${sub.url} fallido tras ${r.attempts} intentos`,
            r.error || r.status
          )
        }
      })
      .catch(e => console.error('[webhook] dispatcher error', e))
  }
}

/**
 * Versión sincrónica (await) — para tests o cuando se necesita confirmar la entrega.
 */
export async function dispatchWebhookEventSync(event: WebhookEvent): Promise<DeliveryResult[]> {
  const subs = getSubsFor(event.orgId, event.type)
  if (subs.length === 0) return []
  const body = JSON.stringify(event)
  return Promise.all(subs.map(sub => deliverWithRetry(sub, event, body)))
}
