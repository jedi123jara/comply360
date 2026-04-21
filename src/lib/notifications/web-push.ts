/**
 * Web Push — helpers compartidos client + server.
 *
 * NOTA: para enviar push reales desde el servidor hay que:
 *   1. `npm install web-push`
 *   2. Configurar `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` en `.env`
 *   3. Persistir la suscripción por usuario en la DB
 *
 * Este módulo expone utilidades cliente (subscribirse desde el browser) +
 * el shape de payload que espera el service worker en `public/sw.js`.
 */

export interface PushPayload {
  /** Título visible de la notificación. */
  title: string
  /** Cuerpo corto (≤ 140 chars). */
  body?: string
  /** Ruta que se abrirá al hacer clic. */
  url?: string
  /** Grupo de la notificación — mismas tags se reemplazan entre sí. */
  tag?: string
  /** Severidad — `CRITICAL` fuerza `requireInteraction: true`. */
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
}

export const VAPID_PUBLIC_KEY: string | undefined =
  typeof process !== 'undefined'
    ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    : undefined

/**
 * Suscripción a push desde el browser. Requiere:
 *   - Service worker registrado (ya lo hace `RegisterServiceWorker`)
 *   - VAPID_PUBLIC_KEY configurada
 *   - Usuario autorizó notificaciones
 *
 * Devuelve `null` si no se pudo suscribir (permiso denegado, no hay SW, etc).
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (typeof window === 'undefined') return null
  if (!('serviceWorker' in navigator)) return null
  if (!('PushManager' in window)) return null
  if (!VAPID_PUBLIC_KEY) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  if (existing) return existing

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  })
  return sub
}

/**
 * Registra la suscripción en el backend. El endpoint persiste por usuario
 * (ver `src/app/api/notifications/subscribe/route.ts`).
 */
export async function registerPushWithServer(sub: PushSubscription): Promise<boolean> {
  try {
    const res = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(sub.toJSON()),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Utilidad estándar: convierte VAPID base64 URL a Uint8Array para el
 * `applicationServerKey` de `PushManager.subscribe`.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}
