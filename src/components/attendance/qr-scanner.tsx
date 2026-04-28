'use client'

/**
 * QrScanner — escanea QR DENTRO de la PWA, sin abrir cámara externa.
 *
 * Antes el flujo era:
 *   1. Worker en /mi-portal/asistencia
 *   2. Tap "abre la cámara"
 *   3. Worker abría APP de cámara nativa de Android/iOS
 *   4. Apuntaba al QR
 *   5. Browser EXTERNO abría con el deep link
 *   6. Pero el browser externo NO tenía la sesión de Clerk → pedía login otra vez ❌
 *
 * Ahora con este componente:
 *   1. Worker en /mi-portal/asistencia
 *   2. Tap "Escanear QR"
 *   3. Cámara se abre DENTRO de la PWA (getUserMedia)
 *   4. Detecta QR → extrae token → callback al parent
 *   5. Parent hace POST con el token (sesión intacta) ✓
 *
 * Usa html5-qrcode para manejar cámara + decodificación. Auto-detecta si
 * el QR contiene un link completo (https://comply360.pe/...?t=TOKEN) o solo
 * el token corto. Extrae el token y lo pasa al onScan.
 */

import { useEffect, useRef, useState } from 'react'
import { Camera, X, AlertTriangle, Loader2 } from 'lucide-react'

interface QrScannerProps {
  onScan: (token: string) => void
  onClose: () => void
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const scannerRef = useRef<unknown>(null)

  useEffect(() => {
    let mounted = true
    let cleanup: (() => void) | null = null

    async function init() {
      try {
        // Import dinámico — html5-qrcode pesa ~80KB y no queremos
        // bloquear el bundle inicial. Solo se carga cuando worker abre scanner.
        const { Html5Qrcode } = await import('html5-qrcode')
        if (!mounted || !containerRef.current) return

        const containerId = 'qr-scanner-region'
        // Asegurar que el contenedor tenga el id que html5-qrcode espera
        containerRef.current.id = containerId

        const scanner = new Html5Qrcode(containerId, /* verbose */ false)
        scannerRef.current = scanner

        await scanner.start(
          { facingMode: 'environment' }, // cámara trasera (la del QR)
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Extraer token del QR — soporta 2 formatos:
            //   1. Link completo: https://comply360.pe/mi-portal/asistencia?t=TOKEN
            //   2. Token directo: TOKEN
            let token = decodedText
            try {
              const url = new URL(decodedText)
              const t = url.searchParams.get('t')
              if (t) token = t
            } catch {
              // Si no es URL válida, asumir que es token directo
            }
            // Detener scanner antes de llamar onScan (evita doble call)
            scanner.stop().catch(() => { /* best-effort */ })
            onScan(token)
          },
          () => { /* errores de decodificación silenciosos — son normales */ },
        )

        if (mounted) setLoading(false)

        cleanup = () => {
          scanner.stop().catch(() => { /* best-effort */ })
          scanner.clear()
        }
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        // Mensajes friendly para errores típicos
        if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
          setError('Necesitamos permiso para usar la cámara. Ve a Configuración → Permisos → Cámara.')
        } else if (msg.includes('NotFoundError') || msg.includes('No camera')) {
          setError('No detectamos cámara en este dispositivo.')
        } else {
          setError('No se pudo abrir la cámara. Reintenta o usa el código manual.')
        }
        setLoading(false)
      }
    }

    void init()

    return () => {
      mounted = false
      if (cleanup) cleanup()
    }
  }, [onScan])

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
      <div className="flex-1 flex items-center justify-center p-4">
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
            {/* Container donde html5-qrcode monta el video */}
            <div
              ref={containerRef}
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
