'use client'

/**
 * QrScanner — escanea QR DENTRO de la PWA, sin abrir cámara externa.
 *
 * v2 (refactor 2026-04-28):
 *   - id del contenedor en el JSX (no asignado en runtime)
 *   - useRef para callback evita re-init en cada render del parent
 *   - flag `initStartedRef` previene doble inicialización (StrictMode + remount)
 *   - cleanup defensivo wrapped en try/catch — stop() puede fallar si scanner
 *     nunca llegó a start() exitoso
 */

import { useEffect, useRef, useState } from 'react'
import { Camera, X, AlertTriangle, Loader2 } from 'lucide-react'

interface QrScannerProps {
  onScan: (token: string) => void
  onClose: () => void
}

const SCANNER_ELEMENT_ID = 'comply360-qr-scanner-region'

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Callback ref — evita re-runs del useEffect cuando el parent re-renderiza
  const onScanRef = useRef(onScan)
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  // Refs para el scanner instance + flag anti-doble-init
  const scannerRef = useRef<{
    stop: () => Promise<void>
    clear: () => void
    isScanning?: boolean
  } | null>(null)
  const initStartedRef = useRef(false)

  useEffect(() => {
    // Anti doble-init: en React 19 StrictMode los useEffect corren 2 veces
    // intencionalmente. Sin guard, el segundo run intenta crear scanner cuando
    // el primero ya está activo → crash con "video element already in use".
    if (initStartedRef.current) return
    initStartedRef.current = true

    let mounted = true

    async function init() {
      try {
        // Verificar que el browser soporta getUserMedia
        if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
          if (mounted) {
            setError('Tu navegador no soporta acceso a la cámara. Usa el código manual.')
            setLoading(false)
          }
          return
        }

        // Verificar que el elemento existe en DOM
        const el = document.getElementById(SCANNER_ELEMENT_ID)
        if (!el) {
          if (mounted) {
            setError('Error interno: contenedor de cámara no encontrado.')
            setLoading(false)
          }
          return
        }

        // Dynamic import — html5-qrcode pesa ~80KB
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted) return

        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID, /* verbose */ false)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' }, // cámara trasera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Anti doble-call: detener scanner antes de invocar onScan
            const s = scannerRef.current
            if (s && s.isScanning !== false) {
              s.stop().catch(() => { /* best-effort */ })
            }
            // Extraer token del QR — soporta link completo o token directo
            let token = decodedText
            try {
              const url = new URL(decodedText)
              const t = url.searchParams.get('t')
              if (t) token = t
            } catch {
              // No es URL válida → asumir token directo
            }
            onScanRef.current(token)
          },
          () => { /* errores de decode silenciosos — son normales */ },
        )

        if (mounted) setLoading(false)
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : String(err)
        // Mensajes friendly según tipo de error
        if (msg.includes('NotAllowedError') || msg.includes('Permission') || msg.includes('denied')) {
          setError('Necesitamos permiso para usar la cámara. Toca el ícono de candado en la barra de URL → Permisos → Cámara → Permitir.')
        } else if (msg.includes('NotFoundError') || msg.includes('No camera') || msg.includes('Requested device not found')) {
          setError('No detectamos cámara en este dispositivo.')
        } else if (msg.includes('NotReadableError') || msg.includes('in use')) {
          setError('Tu cámara está siendo usada por otra app. Ciérrala e intenta de nuevo.')
        } else if (msg.includes('OverconstrainedError')) {
          setError('Tu cámara no soporta el modo solicitado. Usa el código manual.')
        } else {
          // Capturar el mensaje exacto para debug
          setError(`Error: ${msg.slice(0, 120)}. Usa el código manual o avisa a tu admin.`)
        }
        setLoading(false)
      }
    }

    void init()

    return () => {
      mounted = false
      const scanner = scannerRef.current
      if (scanner) {
        try {
          scanner.stop()
            .then(() => {
              try { scanner.clear() } catch { /* noop */ }
            })
            .catch(() => { /* best-effort */ })
        } catch {
          /* noop — scanner pudo nunca haber iniciado */
        }
      }
    }
  }, []) // empty deps — corre solo 1 vez (callback va por ref)

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/80 text-white">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <h2 className="font-semibold">Escanea el QR del día</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="rounded-full p-1.5 bg-white/10 hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex items-center justify-center p-4 relative">
        {error ? (
          <div className="rounded-2xl bg-white p-6 max-w-sm text-center">
            <AlertTriangle className="mx-auto h-10 w-10 text-rose-600 mb-3" />
            <h3 className="font-semibold text-slate-900 mb-2">No se pudo abrir la cámara</h3>
            <p className="text-sm text-slate-600 mb-4">{error}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-5 py-2.5"
            >
              Volver y usar código manual
            </button>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 pointer-events-none">
                <Loader2 className="h-10 w-10 animate-spin text-white" />
              </div>
            )}
            {/* Container con id fijo en el JSX (no asignado en runtime) */}
            <div
              id={SCANNER_ELEMENT_ID}
              className="w-full max-w-md aspect-square rounded-2xl overflow-hidden bg-black"
            />
          </>
        )}
      </div>

      {/* Footer hint */}
      {!error && !loading && (
        <div className="p-4 bg-black/80 text-white text-center text-sm">
          Apunta la cámara al QR del día — se marca automáticamente al detectar
        </div>
      )}
    </div>
  )
}
