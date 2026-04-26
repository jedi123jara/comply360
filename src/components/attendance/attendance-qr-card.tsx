'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, RefreshCw, Loader2, CheckCircle2, Smartphone, Maximize2, Minimize2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner-toaster'

/**
 * AttendanceQrCard — componente del admin para mostrar el QR de asistencia.
 *
 * Flujo:
 *  1. Al montar, pide un token a /api/attendance/qr-token
 *  2. Genera el QR usando la lib `qrcode` (SVG inline, zero-dep al render)
 *  3. Auto-rota cada N segundos (rotateAfterSeconds del backend, default 4min)
 *  4. Muestra short code abajo del QR por si el worker no tiene cámara
 *  5. Botón "Refrescar" manual + "Pantalla completa" para proyectar en TV
 *
 * Seguridad:
 *  - Token JWT firmado → el worker no puede inventarlo
 *  - Token expira a los 5min → foto del QR no sirve al día siguiente
 *  - orgId embebido en el token → no hay leaks cross-tenant
 */

interface TokenResponse {
  token: string
  shortCode: string
  deepLink: string
  mode: 'in' | 'out' | 'both'
  graceMinutes: number
  expiresAt: number
  rotateAfterSeconds: number
}

export function AttendanceQrCard() {
  const [token, setToken] = useState<TokenResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchToken = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/attendance/qr-token', { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const friendlyByStatus: Record<number, string> = {
          401: 'Tu sesión expiró. Recarga la página para volver a iniciar.',
          403: 'No tienes permisos para generar el QR de asistencia.',
          404: 'No pudimos generar el QR. Reintenta en un momento.',
          429: 'Estás generando QRs muy rápido. Espera unos segundos.',
        }
        throw new Error(err.error ?? friendlyByStatus[res.status] ?? 'No pudimos cargar el QR. Reintenta.')
      }
      const data = (await res.json()) as TokenResponse
      setToken(data)

      // Generar QR
      const qr = await QRCode.toDataURL(data.deepLink, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 10,
        color: {
          dark: '#065f46', // emerald-900
          light: '#ffffff',
        },
      })
      setQrDataUrl(qr)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar QR')
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + auto-rotation
  useEffect(() => {
    void fetchToken()
    return () => {
      if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current)
    }
  }, [fetchToken])

  useEffect(() => {
    if (!token) return
    if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current)
    rotationTimerRef.current = setTimeout(() => {
      void fetchToken()
    }, token.rotateAfterSeconds * 1000)
    return () => {
      if (rotationTimerRef.current) clearTimeout(rotationTimerRef.current)
    }
  }, [token, fetchToken])

  const countdownSeconds = useMemo(() => {
    if (!token) return 0
    return Math.max(0, Math.floor((token.expiresAt - Date.now()) / 1000))
  }, [token])

  const handleCopyCode = useCallback(() => {
    if (!token) return
    navigator.clipboard.writeText(token.shortCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
    toast.success('Código copiado')
  }, [token])

  return (
    <>
      <section
        className={`rounded-2xl border bg-white p-6 ${
          fullscreen
            ? 'fixed inset-0 z-[var(--z-modal)] border-0 rounded-none flex flex-col items-center justify-center'
            : 'border-[color:var(--border-default)]'
        }`}
      >
        <div
          className={`flex items-center justify-between w-full ${fullscreen ? 'max-w-4xl mb-6' : 'mb-4'}`}
        >
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              Asistencia del día
            </p>
            <h2
              className="text-2xl text-[color:var(--text-primary)]"
              style={{ fontFamily: 'var(--font-serif)', fontWeight: 500 }}
            >
              QR de check-in
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)] mt-0.5">
              {new Date().toLocaleDateString('es-PE', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchToken}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-400 transition-colors disabled:opacity-50"
              title="Refrescar QR (también rota automáticamente cada 4 min)"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Refrescar
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(!fullscreen)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-400 transition-colors"
              title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa (proyectar en TV)'}
            >
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {fullscreen ? 'Salir' : 'Proyectar'}
            </button>
          </div>
        </div>

        <div
          className={`${
            fullscreen ? 'flex flex-col items-center gap-6 max-w-4xl' : 'grid md:grid-cols-[auto_1fr] gap-6 items-center'
          }`}
        >
          {/* QR */}
          <div
            className={`${
              fullscreen ? 'w-[520px] h-[520px]' : 'w-[260px] h-[260px]'
            } relative rounded-2xl bg-white border-[0.5px] border-[color:var(--border-default)] p-3 flex items-center justify-center shrink-0`}
          >
            {loading && !qrDataUrl ? (
              <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            ) : error ? (
              <div className="text-center text-xs text-rose-600 px-4">
                {error}
                <br />
                <button onClick={fetchToken} className="underline mt-2">
                  Reintentar
                </button>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- data URL from QRCode.toDataURL
              <img src={qrDataUrl} alt="QR de asistencia" className="w-full h-full" />
            )}

            {/* Countdown pill */}
            {token && !loading ? (
              <span
                className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white shadow"
                title="El QR se regenera automáticamente"
              >
                {countdownSeconds > 60
                  ? `${Math.floor(countdownSeconds / 60)}m`
                  : `${countdownSeconds}s`}
              </span>
            ) : null}
          </div>

          {/* Instrucciones + short code */}
          <div className={`${fullscreen ? 'text-center' : ''}`}>
            <div
              className={`${fullscreen ? 'text-base max-w-lg mx-auto mb-6' : 'text-sm mb-4'} space-y-1.5 text-[color:var(--text-primary)]`}
            >
              <div className="flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Trabajador: abre la cámara de tu celular</p>
                  <p className="text-[color:var(--text-secondary)]">
                    Apunta al QR · Toca el link que aparece · Listo.
                  </p>
                </div>
              </div>
            </div>

            {/* Short code fallback */}
            {token ? (
              <div
                className={`${
                  fullscreen ? 'max-w-md mx-auto' : ''
                } rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-3`}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-1">
                  Código manual (backup)
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className={`${
                      fullscreen ? 'text-3xl' : 'text-xl'
                    } font-mono font-bold text-emerald-900 tracking-[0.2em]`}
                  >
                    {token.shortCode}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[color:var(--border-default)] bg-white px-2 py-1 text-[11px] font-medium hover:border-emerald-400"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
                <p className="text-[10px] text-[color:var(--text-tertiary)] mt-1.5 leading-relaxed">
                  Para usar este código, el trabajador debe abrir{' '}
                  <code className="text-emerald-700">/mi-portal/asistencia</code> y pegarlo.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
