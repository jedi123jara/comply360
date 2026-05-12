'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Check, Loader2, X } from 'lucide-react'

/**
 * EnableNotifications — CTA opt-in para activar push.
 *
 * Flow:
 *  1. Check Notification.permission — si es "granted", verifica la subscription actual
 *  2. Si no hay subscription o permission=default, muestra CTA discreto
 *  3. Click "Activar" → pide permission → subscribe vía pushManager → POST al backend
 *
 * Props:
 *  - variant='inline'  → tarjeta horizontal (settings, topbar dropdown)
 *  - variant='floating' → tarjeta flotante bottom-right (primera sesión)
 *
 * Oculto automáticamente si: push no soportado, permission=denied, ya subscrito
 * hace <7 días, o el usuario lo cerró (persistido en localStorage).
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
  onSubscribed?: () => void
}

const DISMISS_KEY = 'comply360.push.dismissed'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function EnableNotifications({
  variant = 'floating',
  onSubscribed,
}: EnableNotificationsProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      return false
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (dismissed) return

    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      queueMicrotask(() => setStatus('unsupported'))
      return
    }
    if (Notification.permission === 'denied') {
      queueMicrotask(() => setStatus('denied'))
      return
    }

    // Check server has VAPID configured
    fetch('/api/notifications/vapid-key')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`status=${r.status}`))))
      .then(async () => {
        // Check current subscription
        try {
          const reg = await navigator.serviceWorker.ready
          const sub = await reg.pushManager.getSubscription()
          if (sub) {
            setStatus('subscribed')
          } else {
            setStatus('not_subscribed')
          }
        } catch {
          setStatus('not_subscribed')
        }
      })
      .catch(() => {
        setStatus('push_disabled_server')
      })
  }, [dismissed])

  async function subscribe() {
    setStatus('subscribing')
    setError(null)
    try {
      // 1. Request permission
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'not_subscribed')
        return
      }

      // 2. Fetch VAPID public key
      const keyRes = await fetch('/api/notifications/vapid-key')
      if (!keyRes.ok) throw new Error('No pudimos obtener la clave VAPID')
      const { publicKey } = (await keyRes.json()) as { publicKey: string }
      if (!publicKey) throw new Error('Clave VAPID vacía')

      // 3. Subscribe via pushManager
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })

      // 4. Persist to backend
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
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  // Hide states
  if (dismissed) return null
  if (status === 'loading') return null
  if (status === 'unsupported' || status === 'push_disabled_server') return null
  if (status === 'subscribed' && variant === 'floating') return null

  const containerStyle: React.CSSProperties =
    variant === 'floating'
      ? {
          position: 'fixed',
          bottom: 16,
          right: 16,
          zIndex: 60,
          maxWidth: 360,
        }
      : {}

  return (
    <div style={containerStyle} role="dialog" aria-live="polite">
      <div
        className={variant === 'floating' ? 'motion-fade-in-up' : ''}
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 12,
          padding: 16,
          boxShadow:
            variant === 'floating'
              ? '0 24px 64px rgba(2,6,23,0.48), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(148,163,184,0.16)'
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
          >
            {status === 'subscribed' ? (
              <Check className="h-4 w-4" />
            ) : status === 'denied' ? (
              <BellOff className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-[color:var(--text-primary)]">
              {status === 'subscribed'
                ? 'Notificaciones activas'
                : status === 'denied'
                  ? 'Notificaciones bloqueadas'
                  : status === 'error'
                    ? 'No se pudieron activar'
                    : 'Alertas SUNAFIL en tu celular'}
            </p>
            <p className="mt-0.5 text-xs text-[color:var(--text-secondary)] leading-relaxed">
              {status === 'subscribed'
                ? 'Recibirás push en el navegador cuando haya alertas críticas.'
                : status === 'denied'
                  ? 'Para reactivar: configuración del navegador → Notificaciones → Permitir.'
                  : status === 'error'
                    ? error ?? 'Intenta nuevamente en unos segundos.'
                    : 'Activá las notificaciones push y enterate al instante de contratos por vencer, alertas críticas y vencimientos CTS.'}
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
                  <Bell className="h-3 w-3" />
                  Activar push
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
                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                Suscribiendo…
              </div>
            )}
          </div>
          {variant === 'floating' && (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Cerrar"
              className="flex-shrink-0 rounded-md p-1 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
