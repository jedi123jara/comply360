'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ScanLine,
  RotateCw,
  Fingerprint,
  History,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { track } from '@/lib/analytics'

/**
 * /mi-portal/asistencia — vista del trabajador.
 *
 * 2 flujos:
 *  A) Deep link (cámara nativa): el worker abre la cámara de su celular, apunta al QR
 *     del admin, y el celular detecta el link → abre este page con ?t=TOKEN.
 *     Este page detecta el token, hace POST /api/attendance/clock automáticamente.
 *  B) Manual: el worker ya está en la PWA, va a Asistencia, y puede ingresar el
 *     short code manualmente si no tiene cámara.
 *
 * Historia: muestra las últimas 7 marcaciones para contexto.
 */

interface AttendanceHistory {
  id: string
  clockIn: string
  clockOut: string | null
  status: string
  hoursWorked: number | null
}

type ClockState = 'idle' | 'submitting' | 'success' | 'error'

export default function MiPortalAsistenciaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tokenFromUrl = searchParams?.get('t') ?? null

  const [state, setState] = useState<ClockState>('idle')
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [resultStatus, setResultStatus] = useState<'PRESENT' | 'LATE' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualToken, setManualToken] = useState('')
  const [history, setHistory] = useState<AttendanceHistory[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const processedTokenRef = useRef<string | null>(null)

  // Reloj en vivo
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Historial
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/mi-portal/asistencia-history', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { history: AttendanceHistory[] }
      setHistory(data.history ?? [])
    } catch {
      /* silent */
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch helper, no synchronous state update
    void loadHistory()
  }, [loadHistory])

  // Submit clock (con token proveniente del deep link o manual input)
  const submitClock = useCallback(
    async (token: string, action?: 'in' | 'out') => {
      setState('submitting')
      setError(null)
      setResultMessage(null)
      setResultStatus(null)
      track('biometric_ceremony_started', { feature: 'attendance' })

      // Capturar geolocalización (best-effort): si la org tiene geofences
      // configuradas, el server requerirá lat/lng. Si el worker rechaza
      // permisos o falla GPS, mandamos sin coords y el server decidirá.
      let geo: { lat: number; lng: number; accuracy?: number } | null = null
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 5000,
              maximumAge: 0,
            })
          })
          geo = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          }
        } catch {
          // permisos denegados / timeout / sin GPS — seguimos sin coords
        }
      }

      try {
        const res = await fetch('/api/attendance/clock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token,
            action,
            ...(geo ? { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy } : {}),
          }),
        })
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean
          action?: string
          status?: 'PRESENT' | 'LATE'
          message?: string
          error?: string
          code?: string
        }

        if (!res.ok) {
          setError(body.error ?? `HTTP ${res.status}`)
          setState('error')
          track('biometric_ceremony_failed', { feature: 'attendance', code: body.code })
          return
        }

        setResultMessage(body.message ?? '¡Marcado con éxito!')
        setResultStatus(body.status ?? null)
        setState('success')
        track('biometric_ceremony_succeeded', { feature: 'attendance', action: body.action })
        void loadHistory()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de conexión')
        setState('error')
      }
    },
    [loadHistory],
  )

  // Deep link handler: si llega con ?t=TOKEN, disparar auto
  useEffect(() => {
    if (!tokenFromUrl) return
    if (processedTokenRef.current === tokenFromUrl) return // idempotencia: no procesar 2× el mismo token
    processedTokenRef.current = tokenFromUrl
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async submission helper, no synchronous state update
    void submitClock(tokenFromUrl)
    // Limpiar el query param para que no se re-dispare al refrescar
    setTimeout(() => {
      router.replace('/mi-portal/asistencia')
    }, 100)
  }, [tokenFromUrl, submitClock, router])

  // Manual submit
  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = manualToken.trim()
      if (!trimmed) {
        toast.error('Pega el token del QR o pídele al admin el QR')
        return
      }
      void submitClock(trimmed)
      setManualToken('')
    },
    [manualToken, submitClock],
  )

  const reset = () => {
    setState('idle')
    setError(null)
    setResultMessage(null)
    setResultStatus(null)
    processedTokenRef.current = null
  }

  const clockHHMM = currentTime.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const today = history.find((h) => {
    const d = new Date(h.clockIn)
    const now = new Date()
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    )
  })

  return (
    <div className="space-y-5 pb-24">
      {/* Reloj hero */}
      <header className="relative overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-white p-6 text-center">
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 h-40 w-40 rounded-full blur-3xl opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.35), transparent 70%)' }}
        />
        <div className="relative">
          <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-2">
            Control de asistencia
          </p>
          <p
            className="text-6xl lg:text-7xl text-[color:var(--text-primary)]"
            style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1 }}
          >
            {clockHHMM}
          </p>
          <p className="text-xs text-[color:var(--text-secondary)] mt-2">
            {currentTime.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      {/* Estado principal */}
      {state === 'submitting' ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-emerald-600 mb-3" />
          <p className="text-sm font-semibold text-emerald-900">Registrando tu marcación…</p>
        </div>
      ) : null}

      {state === 'success' ? (
        <div
          className="rounded-2xl border-2 p-8 text-center relative overflow-hidden"
          style={{
            background:
              resultStatus === 'LATE'
                ? 'linear-gradient(135deg, #fef3c7 0%, #ffffff 100%)'
                : 'linear-gradient(135deg, #d1fae5 0%, #ffffff 100%)',
            borderColor: resultStatus === 'LATE' ? '#fbbf24' : '#10b981',
          }}
        >
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-[0_8px_24px_rgba(4,120,87,0.3)]"
            style={{
              background:
                resultStatus === 'LATE'
                  ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                  : 'linear-gradient(135deg, #10b981, #047857)',
            }}
          >
            {resultStatus === 'LATE' ? (
              <AlertTriangle className="h-8 w-8" />
            ) : (
              <CheckCircle2 className="h-8 w-8" />
            )}
          </div>
          <h2
            className="text-2xl mb-1"
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 500,
              color: resultStatus === 'LATE' ? '#78350f' : '#064e3b',
            }}
          >
            {resultStatus === 'LATE' ? '¡Marcaste tardanza!' : '¡Marcaste a tiempo!'}
          </h2>
          <p className="text-sm text-[color:var(--text-primary)] mb-4">{resultMessage}</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-800 hover:border-emerald-500"
          >
            Volver
          </button>
        </div>
      ) : null}

      {state === 'error' ? (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-rose-600 mb-3" />
          <h2 className="text-lg font-semibold text-rose-900 mb-1">No se pudo marcar</h2>
          <p className="text-sm text-rose-800 mb-4">{error}</p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700"
          >
            <RotateCw className="h-3.5 w-3.5" /> Reintentar
          </button>
        </div>
      ) : null}

      {/* Idle: instrucciones + input manual */}
      {state === 'idle' ? (
        <>
          {/* Hoy */}
          {today ? (
            <section className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-2">
                Tu día hoy
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <LogIn className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs text-[color:var(--text-secondary)]">Entrada</span>
                  </div>
                  <p className="text-2xl font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>
                    {new Date(today.clockIn).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {today.status === 'LATE' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                      <AlertTriangle className="h-3 w-3" /> Tardanza
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 className="h-3 w-3" /> A tiempo
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <LogOut className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                    <span className="text-xs text-[color:var(--text-secondary)]">Salida</span>
                  </div>
                  {today.clockOut ? (
                    <>
                      <p className="text-2xl font-semibold text-[color:var(--text-primary)]" style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}>
                        {new Date(today.clockOut).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className="text-[10px] text-[color:var(--text-tertiary)]">
                        {today.hoursWorked ? `${today.hoursWorked.toFixed(1)}h trabajadas` : ''}
                      </span>
                    </>
                  ) : (
                    <p className="text-sm text-[color:var(--text-tertiary)] italic">Aún no marcada</p>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {/* CTA escanear */}
          <section
            className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-6 text-center"
          >
            <div
              className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-white"
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' }}
            >
              <ScanLine className="h-7 w-7" />
            </div>
            <h2
              className="text-xl text-[color:var(--text-primary)] mb-1"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
            >
              Escanea el QR del día
            </h2>
            <p className="text-sm text-[color:var(--text-secondary)] mb-4 max-w-sm mx-auto leading-relaxed">
              Tu supervisor tiene un QR en el dashboard. Abre la cámara de tu celular, apunta al QR, y toca el link que aparece.
            </p>
            <div className="inline-flex items-center gap-2 text-[11px] text-[color:var(--text-tertiary)]">
              <Fingerprint className="h-3 w-3" />
              Todas las marcaciones quedan auditadas con fecha, hora e IP.
            </div>
          </section>

          {/* Input manual fallback */}
          <details className="rounded-2xl border border-[color:var(--border-default)] bg-white">
            <summary className="cursor-pointer p-4 font-semibold text-sm text-[color:var(--text-primary)]">
              ¿No tienes cámara? Ingresa el código manual
            </summary>
            <form onSubmit={handleManualSubmit} className="px-4 pb-4 space-y-3">
              <p className="text-xs text-[color:var(--text-secondary)]">
                Pídele a tu supervisor el <strong>link completo</strong> del QR (aparece debajo del código). Pégalo aquí:
              </p>
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Pega el link completo del QR aquí"
                className="w-full rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2.5 text-xs outline-none focus:border-emerald-400 font-mono"
              />
              <p className="text-[11px] text-[color:var(--text-tertiary)]">
                El código corto de 6 caracteres por sí solo NO sirve — necesitas el link completo. Pídele al admin que te comparta por WhatsApp.
              </p>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-700"
              >
                Marcar asistencia
              </button>
            </form>
          </details>
        </>
      ) : null}

      {/* Historial últimas 7 */}
      {history.length > 0 && state === 'idle' ? (
        <section className="rounded-2xl border border-[color:var(--border-default)] bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-[color:var(--text-tertiary)]" />
            <h3 className="text-sm font-semibold text-[color:var(--text-primary)]">Tus últimas marcaciones</h3>
          </div>
          <ul className="space-y-2">
            {history.slice(0, 7).map((h) => {
              const d = new Date(h.clockIn)
              return (
                <li key={h.id} className="flex items-center justify-between text-xs border-t border-[color:var(--border-subtle)] pt-2 first:border-t-0 first:pt-0">
                  <span className="text-[color:var(--text-secondary)]">
                    {d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                    {' · '}
                    <span className="text-[color:var(--text-primary)] font-medium">
                      {d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {h.clockOut ? (
                      <>
                        {' → '}
                        <span className="text-[color:var(--text-primary)] font-medium">
                          {new Date(h.clockOut).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      h.status === 'LATE'
                        ? 'bg-amber-100 text-amber-800'
                        : h.status === 'PRESENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]'
                    }`}
                  >
                    {h.status === 'LATE' ? 'Tardanza' : h.status === 'PRESENT' ? 'A tiempo' : h.status}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
