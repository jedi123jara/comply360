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
  // SST Premium (Fase 5)
  | 'sst.sede.created'
  | 'sst.iperc.approved'
  | 'sst.iperc.fila.added'
  | 'sst.accidente.created'
  | 'sst.accidente.sat.notified'
  | 'sst.emo.created'
  | 'sst.emo.expired'
  | 'sst.visita.scheduled'
  | 'sst.visita.completed'
  | 'sst.alert.high'
  | 'sst.alert.critical'
  | 'sst.comite.eleccion.cerrada'
  // Privacy (Ley 29733)
  | 'arco.solicitud.received'
  | 'arco.solicitud.responded'

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
// DB-BACKED STORE (Prisma WebhookSubscription)
// =============================================
// Antes este módulo usaba un Map<orgId, Sub[]> en memoria que se perdía con
// cada deploy de Vercel y no soportaba multi-instancia. Ahora persistimos en
// la tabla `WebhookSubscription` que ya está en el schema. La capa async se
// expone con `_async` siempre que hay query DB; las funciones legacy
// sincrónicas se mantienen como wrappers con un cache local de corta vida
// para no romper callers existentes.

// Prisma se importa lazy para evitar incluirlo cuando este módulo se carga
// desde tests puros que no necesitan DB.
let _prismaCache: typeof import('@/lib/prisma').prisma | null = null
async function getPrisma() {
  if (_prismaCache) return _prismaCache
  const mod = await import('@/lib/prisma')
  _prismaCache = mod.prisma
  return _prismaCache
}

/**
 * Registra una suscripción en la base de datos. Si existe una previa con el
 * mismo orgId+url+events, simplemente actualiza el secret (idempotente para
 * re-creaciones desde la UI).
 */
export async function registerSubscriptionDB(sub: {
  orgId: string
  url: string
  secret: string
  events: WebhookEventType[]
  description?: string
  createdBy?: string
}): Promise<WebhookSubscription> {
  const prisma = await getPrisma()
  const created = await prisma.webhookSubscription.create({
    data: {
      orgId: sub.orgId,
      url: sub.url,
      secret: sub.secret,
      events: sub.events,
      description: sub.description ?? null,
      createdBy: sub.createdBy ?? null,
      active: true,
    },
  })
  return {
    id: created.id,
    orgId: created.orgId,
    url: created.url,
    secret: created.secret,
    events: created.events as WebhookEventType[],
    active: created.active,
    createdAt: created.createdAt,
  }
}

export async function listSubscriptionsDB(orgId: string): Promise<WebhookSubscription[]> {
  const prisma = await getPrisma()
  const rows = await prisma.webhookSubscription.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    url: r.url,
    secret: r.secret,
    events: r.events as WebhookEventType[],
    active: r.active,
    createdAt: r.createdAt,
  }))
}

export async function removeSubscriptionDB(orgId: string, id: string): Promise<boolean> {
  const prisma = await getPrisma()
  const result = await prisma.webhookSubscription.deleteMany({ where: { id, orgId } })
  return result.count > 0
}

async function getActiveSubsForEvent(
  orgId: string,
  type: WebhookEventType,
): Promise<WebhookSubscription[]> {
  const prisma = await getPrisma()
  const rows = await prisma.webhookSubscription.findMany({
    where: { orgId, active: true, events: { has: type } },
  })
  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    url: r.url,
    secret: r.secret,
    events: r.events as WebhookEventType[],
    active: r.active,
    createdAt: r.createdAt,
  }))
}

// =============================================
// IN-MEMORY STORE (legacy compat — se usa solo cuando los callers no migran)
// =============================================

const memorySubscriptions = new Map<string, WebhookSubscription[]>()

function getSubsFor(orgId: string, type: WebhookEventType): WebhookSubscription[] {
  const all = memorySubscriptions.get(orgId) || []
  return all.filter((s) => s.active && s.events.includes(type))
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
  const next = list.filter((s) => s.id !== id)
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
 * Persiste cada intento en `WebhookDelivery` para observabilidad y para que
 * el cron `webhook-retry` pueda reintentar las que fallaron.
 *
 * Uso:
 *   dispatchWebhookEvent({
 *     id: randomUUID(),
 *     type: 'sst.iperc.approved',
 *     orgId,
 *     occurredAt: new Date().toISOString(),
 *     data: { ipercId, sedeId, version },
 *   })
 */
export function dispatchWebhookEvent(event: WebhookEvent): void {
  void dispatchAsync(event).catch((e) => console.error('[webhook] dispatcher error', e))
}

async function dispatchAsync(event: WebhookEvent): Promise<void> {
  // Combinamos suscripciones DB + memoria para no romper tests/callers legacy
  const [dbSubs] = await Promise.all([getActiveSubsForEvent(event.orgId, event.type)])
  const memSubs = getSubsFor(event.orgId, event.type)
  const seen = new Set<string>(dbSubs.map((s) => s.id))
  const subs = [...dbSubs, ...memSubs.filter((s) => !seen.has(s.id))]
  if (subs.length === 0) return

  const body = JSON.stringify(event)
  for (const sub of subs) {
    void deliverAndPersist(sub, event, body)
  }
}

async function deliverAndPersist(
  sub: WebhookSubscription,
  event: WebhookEvent,
  body: string,
): Promise<void> {
  const result = await deliverWithRetry(sub, event, body)

  // Persistir el resultado en WebhookDelivery (best-effort).
  try {
    const prisma = await getPrisma()
    await prisma.webhookDelivery.create({
      data: {
        subscriptionId: sub.id,
        orgId: event.orgId,
        eventName: event.type,
        eventId: event.id,
        payload: JSON.parse(JSON.stringify(event)),
        status: result.ok ? 'DELIVERED' : 'FAILED',
        attempts: result.attempts,
        lastAttemptAt: new Date(),
        responseStatus: result.status || null,
        responseBody: result.error?.slice(0, 1000) ?? null,
        completedAt: result.ok ? new Date() : null,
        error: result.ok ? null : result.error ?? null,
      },
    })

    // Actualizar metadata del subscription
    await prisma.webhookSubscription.update({
      where: { id: sub.id },
      data: {
        lastDeliveryAt: new Date(),
        lastDeliveryStatus: result.ok ? 'success' : `failed:${result.status || 0}`,
        consecutiveFailures: result.ok ? 0 : { increment: 1 },
        // Auto-disable tras 5 fallos consecutivos
        ...(!result.ok ? {} : { active: undefined }),
      },
    })

    if (!result.ok) {
      // Si las fallas se acumulan, desactivar la sub
      const sub2 = await prisma.webhookSubscription.findUnique({
        where: { id: sub.id },
        select: { consecutiveFailures: true, active: true },
      })
      if (sub2 && sub2.consecutiveFailures >= 5 && sub2.active) {
        await prisma.webhookSubscription.update({
          where: { id: sub.id },
          data: { active: false },
        })
        console.warn(
          `[webhook] sub ${sub.id} auto-desactivada tras ${sub2.consecutiveFailures} fallos consecutivos`,
        )
      }
    }
  } catch (err) {
    // Persistencia opcional — si falla no debemos perder el resultado.
    console.error('[webhook] no se pudo persistir delivery', err)
  }

  if (!result.ok) {
    console.warn(
      `[webhook] ${event.type} → ${sub.url} fallido tras ${result.attempts} intentos`,
      result.error || result.status,
    )
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
