/**
 * Web Push server — envío desde cron y backend.
 *
 * Uso:
 *   import { sendPushToUser } from '@/lib/notifications/web-push-server'
 *   await sendPushToUser(userId, { title, body, url, severity })
 *
 * Config requerida:
 *   - `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` en .env
 *   - `VAPID_SUBJECT` (mailto:ops@comply360.pe o similar)
 *   - `npm install web-push` (opcional — si falta, el módulo loguea lo que
 *     hubiera enviado y retorna false)
 *
 * El hacking dinámico del import evita que Next bundle `web-push` (que usa
 * node crypto) cuando no está instalado.
 */

import type { PushPayload } from './web-push'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

type PushSubscriptionJson = {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
  expirationTime?: number | null
}

interface WebPushModule {
  setVapidDetails: (subject: string, publicKey: string, privateKey: string) => void
  sendNotification: (
    sub: PushSubscriptionJson,
    payload: string,
    options?: { TTL?: number }
  ) => Promise<unknown>
}

let cachedModule: WebPushModule | null | undefined

async function getWebPush(): Promise<WebPushModule | null> {
  if (cachedModule !== undefined) return cachedModule
  try {
    // Dynamic import — evita romper el build si web-push no está instalado.
    // Con web-push instalado + @types/web-push, ya no se requiere @ts-expect-error.
    const mod = (await import('web-push').catch(() => null)) as
      | WebPushModule
      | { default: WebPushModule }
      | null
    const resolved = mod && 'default' in mod ? mod.default : (mod as WebPushModule | null)
    const subject = process.env.VAPID_SUBJECT
    const publicKey = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    const privateKey = process.env.VAPID_PRIVATE_KEY
    if (resolved && subject && publicKey && privateKey) {
      resolved.setVapidDetails(subject, publicKey, privateKey)
      cachedModule = resolved
      return resolved
    }
    cachedModule = null
    return null
  } catch {
    cachedModule = null
    return null
  }
}

/**
 * Envía push a un usuario específico. Retorna `false` si no se pudo
 * (usuario sin suscripción, VAPID mal configurado, etc.).
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushSubscription: true },
  })
  const sub = user?.pushSubscription as PushSubscriptionJson | null
  if (!sub?.endpoint) return false

  const wp = await getWebPush()
  if (!wp) {
    logger.info('[push] web-push no configurado — simulando envío', {
      userId,
      title: payload.title,
      severity: payload.severity,
    })
    return false
  }

  try {
    await wp.sendNotification(sub, JSON.stringify(payload), { TTL: 60 * 60 })
    return true
  } catch (err) {
    logger.warn('[push] envío fallido', {
      userId,
      endpoint: sub.endpoint,
      error: err instanceof Error ? err.message : String(err),
    })
    return false
  }
}

/**
 * Envía push a todos los usuarios de una org que tengan suscripción activa.
 * Útil para el cron `daily-alerts` en alertas CRITICAL.
 */
export async function sendPushToOrg(orgId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
  const users = await prisma.user.findMany({
    where: {
      orgId,
      pushSubscription: { not: {} as never }, // JSON != empty
    },
    select: { id: true, pushSubscription: true },
  }).catch(() => [] as Array<{ id: string; pushSubscription: unknown }>)

  let sent = 0
  let failed = 0
  for (const u of users) {
    const ok = await sendPushToUser(u.id, payload)
    if (ok) sent += 1
    else failed += 1
  }
  return { sent, failed }
}

/**
 * Clave VAPID pública — expuesta al browser para `pushManager.subscribe()`.
 * Prioriza `VAPID_PUBLIC_KEY` (server); fallback a `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
 */
export function getVapidPublicKey(): string | null {
  return (
    process.env.VAPID_PUBLIC_KEY ??
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ??
    null
  )
}

/** Indica si push notifications está operativo (VAPID keys presentes). */
export function isPushEnabled(): boolean {
  return Boolean(
    (process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
      process.env.VAPID_PRIVATE_KEY,
  )
}
