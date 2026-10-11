'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bell, BellOff, Check, Loader2, X } from 'lucide-react'
import { useActiveStimulus } from '@/components/cockpit/stimulus'

/**
 * EnableNotifications — pedido para activar los avisos del navegador (push).
 *
 * Flujo:
 *  1. Revisa Notification.permission y si ya hay una suscripción.
 *  2. Si falta, muestra una tarjeta discreta.
 *  3. "Activar avisos" → pide permiso → se suscribe con pushManager → POST al backend.
 *
 * Variantes:
 *  - 'inline'   → tarjeta dentro de una página (configuración, portal del trabajador).
 *                 Se muestra siempre que aplique: la persona fue a buscarla.
 *  - 'floating' → tarjeta flotante global del panel. Es un estímulo que
 *                 interrumpe, así que solo aparece si:
 *                   · no es la primera visita (la primera sesión es para conocer el panel),
 *                   · hay al menos una alerta real abierta (hay algo de qué avisar),
 *                   · no hay otro aviso en pantalla (prueba gratis, recorrido, celebración),
 *                   · y pasaron unos segundos desde que cargó la pantalla.
 *                 El aviso "bloqueaste los avisos" sale UNA sola vez en total y
 *                 se va al cambiar de pantalla.
 *
 * Se oculta si el navegador no soporta push, si el servidor no lo tiene
 * configurado o si la persona eligió "Ahora no" (se recuerda en localStorage).
 */

type Status =
  | 'loading'
  | 'unsupported'
  | 'denied'
  | 'push_disabled_server'
  | 'not_subscribed'
  | 'subscribed'
  | 'subscribing'
  | 'error'

interface EnableNotificationsProps {
  variant?: 'inline' | 'floating'
  context?: 'admin' | 'worker'
  onSubscribed?: () => void
}

const DISMISS_KEY = 'comply360.push.dismissed'
const DENIED_NOTICE_KEY = 'comply360.push.deniedNoticeShown'
const FIRST_VISIT_KEY = 'comply360.visit.firstAt'
const FIRST_SESSION_KEY = 'comply360.visit.firstSession'
/** Espera antes de mostrar la tarjeta flotante: primero la pantalla, luego el pedido. */
const FLOATING_DELAY_MS = 5000

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

/**
 * ¿Es la primera visita al panel en este navegador? La primera sesión completa
 * cuenta como primera visita (una recarga no la convierte en segunda).
 */
function isFirstVisit(): boolean {
  try {
    if (sessionStorage.getItem(FIRST_SESSION_KEY) === '1') return true
    if (localStorage.getItem(FIRST_VISIT_KEY)) return false
    localStorage.setItem(FIRST_VISIT_KEY, new Date().toISOString())
    sessionStorage.setItem(FIRST_SESSION_KEY, '1')
    return true
  } catch {
    // Sin almacenamiento no podemos saberlo: preferimos no insistir.
    return true
  }
}

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function writeFlag(key: string) {
  try {
    localStorage.setItem(key, '1')
  } catch {
    /* ignore */
  }
}

async function fetchOpenAlerts(): Promise<number> {
  try {
    const res = await fetch('/api/alerts/counts')
    if (!res.ok) return 0
    const data = (await res.json()) as { pendingAlerts?: unknown }
    return typeof data.pendingAlerts === 'number' ? data.pendingAlerts : 0
  } catch {
    return 0
  }
}

export function EnableNotifications({
  variant = 'floating',
  context = 'admin',
  onSubscribed,
}: EnableNotificationsProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [openAlerts, setOpenAlerts] = useState(0)
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)
  /** Pantalla donde apareció el aviso de "bloqueados" (se va al salir de ella). */
  const [deniedShownOn, setDeniedShownOn] = useState<string | null>(null)
  const activeStimulus = useActiveStimulus()
  const isFloating = variant === 'floating'
  const dismissKey = context === 'worker' ? `${DISMISS_KEY}.worker` : DISMISS_KEY
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return readFlag(dismissKey)
  })

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (dismissed) return

    let cancelled = false
    const timers: number[] = []
    const startedAt = Date.now()
    /** En la flotante, nada aparece antes de FLOATING_DELAY_MS. */
    const show = (next: Status, onShow?: () => void) => {
      const wait = isFloating ? Math.max(0, startedAt + FLOATING_DELAY_MS - Date.now()) : 0
      timers.push(
        window.setTimeout(() => {
          if (cancelled) return
          onShow?.()
          setStatus(next)
        }, wait)
      )
    }

    async function check() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        show('unsupported')
        return
      }

      if (isFloating) {
        // La primera visita es para conocer el panel; y sin alertas reales no
        // hay de qué avisar todavía.
        if (isFirstVisit()) return
        const alerts = await fetchOpenAlerts()
        if (cancelled || alerts === 0) return
        setOpenAlerts(alerts)
      }

      if (Notification.permission === 'denied') {
        if (isFloating) {
          if (readFlag(DENIED_NOTICE_KEY)) return
          show('denied', () => {
            writeFlag(DENIED_NOTICE_KEY)
            setDeniedShownOn(pathnameRef.current)
          })
          return
        }
        show('denied')
        return
      }

      try {
        const res = await fetch('/api/notifications/vapid-key')
        if (!res.ok) throw new Error(`status=${res.status}`)
        await res.json()
      } catch {
        show('push_disabled_server')
        return
      }

      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        show(sub ? 'subscribed' : 'not_subscribed')
      } catch {
        show('not_subscribed')
      }
    }

    void check()
    return () => {
      cancelled = true
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [dismissed, isFloating])

  // El aviso de "bloqueados" se ve una sola vez: al cambiar de pantalla se va.
  if (isFloating && deniedShownOn !== null && deniedShownOn !== pathname) {
    setDeniedShownOn(null)
    setDismissed(true)
  }

  async function subscribe() {
    setStatus('subscribing')
    setError(null)
    try {
      // 1. Pedir permiso
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'not_subscribed')
        return
      }

      // 2. Clave pública del servidor
      const keyRes = await fetch('/api/notifications/vapid-key')
      if (!keyRes.ok) throw new Error('No pudimos preparar los avisos. Intenta de nuevo en unos minutos.')
      const { publicKey } = (await keyRes.json()) as { publicKey: string }
      if (!publicKey) throw new Error('No pudimos preparar los avisos. Intenta de nuevo en unos minutos.')

      // 3. Suscripción en el navegador
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      // 4. Guardar en el servidor
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string; hint?: string }
        throw new Error(data.hint || data.error || `Error ${res.status}`)
      }

      setStatus('subscribed')
      onSubscribed?.()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Ocurrió un error inesperado.')
    }
  }

  function dismiss() {
    writeFlag(dismissKey)
    setDismissed(true)
  }

  /** Cerrar el aviso de "bloqueados" no apaga el pedido para siempre: ese aviso ya no vuelve. */
  function close() {
    if (status === 'denied') {
      setDeniedShownOn(null)
      setDismissed(true)
      return
    }
    dismiss()
  }

  // Estados ocultos
  if (dismissed) return null
  if (status === 'loading') return null
  if (status === 'unsupported' || status === 'push_disabled_server') return null
  if (status === 'subscribed' && isFloating) return null
  // Un estímulo a la vez: si hay otro aviso en pantalla, la flotante espera.
  if (isFloating && activeStimulus !== null && status !== 'subscribing') return null

  const alertsLabel = `${openAlerts} ${openAlerts === 1 ? 'alerta abierta' : 'alertas abiertas'}`
  const copy =
    context === 'worker'
      ? {
          activeTitle: 'Avisos activados',
          activeBody: 'Te avisaremos solo cuando haya algo que debas hacer.',
          defaultTitle: 'Activa avisos útiles',
          defaultBody: 'Recibe boletas por firmar, retos Pulse, solicitudes y recordatorios importantes.',
          deniedBody:
            'Para recibirlos, haz clic en el candado junto a la dirección de la página, busca «Notificaciones» y elige «Permitir». Mientras tanto, todo sigue apareciendo en tu portal.',
        }
      : {
          activeTitle: 'Avisos activados',
          activeBody: 'Te avisaremos en este navegador cuando haya alertas críticas.',
          defaultTitle: 'Recibe tus alertas en este equipo',
          defaultBody:
            openAlerts > 0
              ? `Tienes ${alertsLabel}. Activa los avisos y te contaremos al momento cuando algo esté por vencer o pueda generarte una multa.`
              : 'Activa los avisos y te contaremos al momento cuando un contrato, la CTS u otra obligación esté por vencer.',
          deniedBody:
            'Para recibirlos, haz clic en el candado junto a la dirección de la página, busca «Notificaciones» y elige «Permitir». Mientras tanto, todo sigue apareciendo en Pendientes.',
        }

  // Flotante: abajo a la derecha, por encima del botón del asistente.
  const containerStyle: React.CSSProperties = isFloating
    ? {
        position: 'fixed',
        bottom: 84,
        right: 16,
        left: 16,
        marginLeft: 'auto',
        zIndex: 60,
        maxWidth: 360,
      }
    : {}

  return (
    <div style={containerStyle} role="region" aria-label="Avisos del navegador">
      <div
        className={`${isFloating ? 'motion-fade-in-up' : ''} ${
          context === 'worker' ? 'c360-worker-notification-optin' : ''
        }`}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: 16,
          boxShadow: isFloating
            ? '0 18px 48px rgba(15,23,42,0.16), 0 0 0 1px rgba(148,163,184,0.2)'
            : undefined,
          border: '0.5px solid var(--border-default)',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
            style={{
              background:
                status === 'subscribed'
                  ? 'rgba(20,184,166,0.14)'
                  : 'rgba(245,158,11,0.14)',
              color: status === 'subscribed' ? 'var(--emerald-700)' : 'var(--amber-700, #b45309)',
              border: '1px solid var(--border-default)',
            }}
            aria-hidden="true"
          >
            {status === 'subscribed' ? (
              <Check className="h-4 w-4" />
            ) : status === 'denied' ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1" aria-live="polite">
            <p className="text-sm font-bold text-[color:var(--text-primary)]">
              {status === 'subscribed'
                ? copy.activeTitle
                : status === 'denied'
                  ? 'Bloqueaste los avisos de Comply360'
                  : status === 'error'
                    ? 'No se pudieron activar los avisos'
                    : copy.defaultTitle}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)] leading-relaxed">
              {status === 'subscribed'
                ? copy.activeBody
                : status === 'denied'
                  ? copy.deniedBody
                  : status === 'error'
                    ? error ?? 'Intenta de nuevo en unos segundos.'
                    : copy.defaultBody}
            </p>
            {(status === 'not_subscribed' || status === 'error') && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={subscribe}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    boxShadow:
                      '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
                  }}
                >
                  <Bell className="h-3 w-3" aria-hidden="true" />
                  Activar avisos
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] font-medium"
                >
                  Ahora no
                </button>
              </div>
            )}
            {status === 'subscribing' && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[color:var(--text-secondary)]">
                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" aria-hidden="true" />
                Activando…
              </div>
            )}
          </div>
          {isFloating && (
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="flex-shrink-0 rounded-md p-1 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
