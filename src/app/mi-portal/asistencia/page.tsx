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
  MessageSquare,
  X,
  Send,
  Camera,
  MapPin,
} from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'
import { track } from '@/lib/analytics'
import { QrScanner } from '@/components/attendance/qr-scanner'
import { SelfieCaptureModal } from '@/components/attendance/selfie-capture-modal'
import type { SelfieCapture } from '@/lib/attendance/selfie-capture'

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
  const [scannerOpen, setScannerOpen] = useState(false)
  const processedTokenRef = useRef<string | null>(null)

  // Modal para que el worker reporte justificación de su tardanza/ausencia de hoy
  const [justifyOpen, setJustifyOpen] = useState(false)
  const [justifyReason, setJustifyReason] = useState('')
  const [justifySubmitting, setJustifySubmitting] = useState(false)

  // Fase 2 — flujo en cadena: botón Entrada/Salida → (selfie opcional) → scanner → submit
  const [pendingAction, setPendingAction] = useState<'in' | 'out' | null>(null)
  const [selfieOpen, setSelfieOpen] = useState(false)
  const [pendingSelfie, setPendingSelfie] = useState<SelfieCapture | null>(null)
  // Foto OPT-IN — por default OFF (más rápido). Persistido en localStorage
  // para que cada worker recuerde su preferencia entre sesiones.
  const [selfieEnabled, setSelfieEnabled] = useState(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('comply360.selfieEnabled')
      if (saved === '1') setSelfieEnabled(true)
    } catch {/* localStorage no disponible */}
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('comply360.selfieEnabled', selfieEnabled ? '1' : '0')
    } catch {/* ignore */}
  }, [selfieEnabled])
  // Modal de "fuera de zona" cuando geofence falla; permite reportar motivo
  // y reintentar con la justificación ya incluida.
  const [oobModal, setOobModal] = useState<{
    distanceMeters: number
    nearestFence?: string
    token: string
    action?: 'in' | 'out'
    selfieHash?: string
    geo?: { lat: number; lng: number; accuracy?: number }
  } | null>(null)
  const [oobReason, setOobReason] = useState('')

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

  // Submit clock — acepta selfieHash y outOfBoundsReason como overrides opcionales
  const submitClock = useCallback(
    async (
      token: string,
      action?: 'in' | 'out',
      opts?: { selfieHash?: string; outOfBoundsReason?: string; geo?: { lat: number; lng: number; accuracy?: number } },
    ) => {
      setState('submitting')
      setError(null)
      setResultMessage(null)
      setResultStatus(null)
      track('biometric_ceremony_started', { feature: 'attendance' })

      // Si el caller no pasó geo, lo capturamos here (fallback)
      let geo = opts?.geo ?? null
      if (!geo && typeof navigator !== 'undefined' && navigator.geolocation) {
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
            ...(opts?.selfieHash ? { selfieHash: opts.selfieHash } : {}),
            ...(opts?.outOfBoundsReason ? { outOfBoundsReason: opts.outOfBoundsReason } : {}),
          }),
        })
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean
          action?: string
          status?: 'PRESENT' | 'LATE'
          message?: string
          error?: string
          code?: string
          distanceMeters?: number
          nearestFence?: string
        }

        if (!res.ok) {
          // Caso especial Fase 2: fuera de zona pero el worker puede justificar.
          // En lugar de mostrar error, abrimos modal de fuera-de-zona con
          // textarea. Reintentamos con outOfBoundsReason.
          if (body.code === 'GEOFENCE_OUT_NEEDS_REASON') {
            setOobModal({
              distanceMeters: body.distanceMeters ?? 0,
              nearestFence: body.nearestFence,
              token,
              action,
              selfieHash: opts?.selfieHash,
              geo: geo ?? undefined,
            })
            setOobReason('')
            setState('idle')
            return
          }
          setError(body.error ?? `HTTP ${res.status}`)
          setState('error')
          track('biometric_ceremony_failed', { feature: 'attendance', code: body.code })
          return
        }

        setResultMessage(body.message ?? '¡Marcado con éxito!')
        setResultStatus(body.status ?? null)
        setState('success')
        track('biometric_ceremony_succeeded', { feature: 'attendance', action: body.action })
        // Reset del flujo de selfie post-éxito
        setPendingSelfie(null)
        setPendingAction(null)
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
                  {/* Acceso rápido a justificación: solo cuando hay tardanza/ausencia hoy */}
                  {(today.status === 'LATE' || today.status === 'ABSENT') && (
                    <button
                      type="button"
                      onClick={() => { setJustifyReason(''); setJustifyOpen(true) }}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Reportar justificación
                    </button>
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

          {/* CTA Entrada/Salida — botones explícitos (simplificado 2026-04-29)
              Flujo directo: click → scanner → submit con action explícita.
              La foto es OPT-IN: el toggle "Tomar foto al fichar" la activa
              cuando la org la pide (anti-fraude PRO). Por defecto OFF — más
              rápido y menos fricción. Suficiente legal: token JWT firmado +
              sesión Clerk del worker + audit trail (IP, GPS, user-agent). */}
          <section className="rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/30 p-6 text-center">
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
              ¿Qué vas a marcar?
            </h2>
            <p className="text-sm text-[color:var(--text-secondary)] mb-4 max-w-sm mx-auto leading-relaxed">
              Pulsa el botón y apunta tu cámara al QR del supervisor.
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-4">
              <button
                type="button"
                onClick={() => {
                  setPendingAction('in')
                  if (selfieEnabled) {
                    setSelfieOpen(true)
                  } else {
                    setScannerOpen(true)
                  }
                }}
                disabled={Boolean(today && !today.clockOut)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-3 shadow-md transition-colors"
                title={today && !today.clockOut ? 'Ya marcaste entrada hoy' : 'Marcar entrada'}
              >
                <LogIn className="h-4 w-4" />
                Entrada
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingAction('out')
                  if (selfieEnabled) {
                    setSelfieOpen(true)
                  } else {
                    setScannerOpen(true)
                  }
                }}
                disabled={!today || Boolean(today.clockOut)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm px-4 py-3 shadow-md transition-colors"
                title={!today ? 'Primero debes marcar entrada' : today.clockOut ? 'Ya marcaste salida hoy' : 'Marcar salida'}
              >
                <LogOut className="h-4 w-4" />
                Salida
              </button>
            </div>

            {/* Toggle opcional para tomar foto (anti-fraude opt-in) */}
            <label className="inline-flex items-center gap-2 text-xs text-[color:var(--text-secondary)] cursor-pointer select-none mb-2">
              <input
                type="checkbox"
                checked={selfieEnabled}
                onChange={(e) => setSelfieEnabled(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
              />
              Tomar foto al fichar (extra anti-fraude)
            </label>

            <div className="flex items-center justify-center gap-2 text-[11px] text-[color:var(--text-tertiary)]">
              <Fingerprint className="h-3 w-3" />
              Marcación auditada con QR + sesión + GPS · R.M. 037-2024-TR
            </div>
          </section>

          {/* Modal: captura de selfie — solo si selfieEnabled */}
          <SelfieCaptureModal
            open={selfieOpen}
            onClose={() => {
              setSelfieOpen(false)
              setPendingAction(null)
            }}
            onCapture={(capture) => {
              setPendingSelfie(capture)
              setSelfieOpen(false)
              // Tras capturar selfie, abrimos el scanner para que escanee el QR del admin
              setScannerOpen(true)
            }}
            title={pendingAction === 'out' ? 'Foto de salida' : 'Foto de entrada'}
          />

          {/* Scanner overlay (fullscreen) — al scan llama submitClock con action explícita
              y selfieHash solo si la foto se tomó (selfieEnabled=true). */}
          {scannerOpen && (
            <QrScanner
              onScan={(token) => {
                setScannerOpen(false)
                void submitClock(token, pendingAction ?? undefined, {
                  selfieHash: pendingSelfie?.sha256 || undefined,
                })
              }}
              onClose={() => {
                setScannerOpen(false)
                setPendingAction(null)
                setPendingSelfie(null)
              }}
            />
          )}

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

      {/* Modal: Fuera de zona con motivo (Fase 2 — geofence justification) */}
      {oobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Estás fuera de la zona</h3>
                  <p className="text-[11px] text-gray-500">
                    {oobModal.distanceMeters > 0 ? `~${oobModal.distanceMeters}m de ${oobModal.nearestFence ?? 'la zona'}` : 'Sin ubicación detectada'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setOobModal(null); setOobReason('') }}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-slate-700 leading-relaxed">
                Si tienes un motivo válido (cita médica, reunión cliente, home office, visita a obra), repórtalo. Tu marcación queda registrada y tu admin la va a revisar.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Motivo
                </label>
                <textarea
                  value={oobReason}
                  onChange={(e) => setOobReason(e.target.value)}
                  placeholder="Ej: Visita programada al cliente Acme S.A.C. — coordinada con jefatura"
                  rows={4}
                  maxLength={480}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 text-sm resize-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">{oobReason.length}/480 caracteres.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                type="button"
                onClick={() => { setOobModal(null); setOobReason('') }}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar marcación
              </button>
              <button
                type="button"
                onClick={() => {
                  if (oobReason.trim().length < 3) {
                    toast.error('El motivo necesita al menos 3 caracteres')
                    return
                  }
                  const m = oobModal
                  setOobModal(null)
                  void submitClock(m.token, m.action, {
                    selfieHash: m.selfieHash,
                    outOfBoundsReason: oobReason.trim(),
                    geo: m.geo,
                  })
                  setOobReason('')
                }}
                disabled={oobReason.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                Marcar con justificación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reportar justificación */}
      {justifyOpen && today && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border-default)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reportar justificación</h3>
                  <p className="text-xs text-gray-500">
                    Tardanza del {new Date(today.clockIn).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setJustifyOpen(false)}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Cuéntanos qué pasó
                </label>
                <textarea
                  value={justifyReason}
                  onChange={(e) => setJustifyReason(e.target.value)}
                  placeholder="Ej: Llegué tarde por una cita médica de emergencia. Tengo constancia del centro de salud."
                  rows={5}
                  maxLength={500}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm resize-none"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {justifyReason.length}/500 caracteres. Tu admin va a revisar y aprobar.
                </p>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                <Fingerprint className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-900">
                  Tu justificación queda registrada con fecha y hora — sirve como evidencia ante SUNAFIL.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                type="button"
                onClick={() => setJustifyOpen(false)}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (justifyReason.trim().length < 3) {
                    toast.error('El motivo necesita al menos 3 caracteres')
                    return
                  }
                  setJustifySubmitting(true)
                  try {
                    const res = await fetch(`/api/attendance/${today.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ op: 'justify', reason: justifyReason.trim() }),
                    })
                    const data = await res.json().catch(() => ({}))
                    if (!res.ok) throw new Error(data.error || 'No se pudo enviar')
                    toast.success('¡Justificación enviada! Tu admin la va a revisar.')
                    setJustifyOpen(false)
                    setJustifyReason('')
                    void loadHistory()
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : 'Error al enviar')
                  } finally {
                    setJustifySubmitting(false)
                  }
                }}
                disabled={justifySubmitting || justifyReason.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {justifySubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Enviar justificación
              </button>
            </div>
          </div>
        </div>
      )}

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
