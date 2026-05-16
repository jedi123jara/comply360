'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, RotateCcw, Check, X, AlertTriangle, Loader2 } from 'lucide-react'
import {
  captureSelfieFromVideo,
  requestFrontCamera,
  stopMediaStream,
  type SelfieCapture,
} from '@/lib/attendance/selfie-capture'

/**
 * Modal de captura de selfie para fichado anti-fraude (Fase 2).
 *
 * Flujo:
 *   1. Solicita acceso a cámara frontal (puede fallar si el worker rechaza)
 *   2. Muestra video stream live + botón "Tomar foto"
 *   3. Al snap, freeze del frame con preview + botones "Reintentar" / "Usar foto"
 *   4. Al confirmar, llama onCapture(capture) — el caller es responsable de
 *      enviar el sha256 al backend en el siguiente paso del fichado
 *
 * El caller controla la apertura/cierre. El modal limpia el MediaStream al
 * desmontarse.
 */
export function SelfieCaptureModal({
  open,
  onClose,
  onCapture,
  title = 'Tomate una foto',
  description = 'La foto sirve como evidencia de presencia. No se almacena la imagen — solo un hash criptográfico para que tu admin pueda verificar que tú marcaste.',
}: {
  open: boolean
  onClose: () => void
  onCapture: (capture: SelfieCapture) => void
  title?: string
  description?: string
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<'init' | 'live' | 'preview' | 'error'>('init')
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<SelfieCapture | null>(null)
  const [snapping, setSnapping] = useState(false)

  // Solicitar cámara cuando se abre el modal
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void Promise.resolve().then(async () => {
      if (cancelled) return
      setPhase('init')
      setError(null)
      setPreview(null)
      try {
        const stream = await requestFrontCamera()
        if (cancelled) {
          stopMediaStream(stream)
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => {/* iOS suele resolver bien */})
        }
        setPhase('live')
      } catch (err) {
        if (cancelled) return
        const msg = err instanceof Error ? err.message : 'No se pudo acceder a la cámara'
        // Mensajes amigables según error
        if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
          setError('Necesitas permitir el acceso a la cámara para fichar con foto. Habilítalo en los ajustes del navegador.')
        } else if (msg.includes('NotFound')) {
          setError('No detectamos una cámara en este dispositivo.')
        } else {
          setError(msg)
        }
        setPhase('error')
      }
    })
    return () => {
      cancelled = true
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [open])

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  if (!open) return null

  const snap = async () => {
    if (!videoRef.current) return
    setSnapping(true)
    try {
      const capture = await captureSelfieFromVideo(videoRef.current)
      setPreview(capture)
      setPhase('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo capturar la foto')
      setPhase('error')
    } finally {
      setSnapping(false)
    }
  }

  const retake = () => {
    setPreview(null)
    setPhase('live')
  }

  const confirm = () => {
    if (!preview) return
    onCapture(preview)
    // Caller cierra el modal después de procesar
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border-default)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Camera className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-gray-500">Anti-fraude · R.M. 037-2024-TR</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {phase === 'init' && (
            <div className="aspect-square rounded-xl bg-slate-100 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-xs">Pidiendo acceso a la cámara...</p>
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="aspect-square rounded-xl bg-red-50 border-2 border-red-200 flex items-center justify-center p-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <AlertTriangle className="w-10 h-10 text-red-600" />
                <p className="text-sm text-red-900 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Video live */}
          <div className={phase === 'live' ? 'block' : 'hidden'}>
            <div className="aspect-square rounded-xl overflow-hidden bg-slate-900 relative">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' /* mirror para que se vea natural */ }}
              />
              <div className="absolute inset-0 ring-4 ring-white/20 rounded-xl pointer-events-none" />
              {/* Overlay de marco facial */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-3/5 aspect-[3/4] border-2 border-emerald-400/70 rounded-full" />
              </div>
            </div>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              Centra tu rostro en el círculo y pulsa la cámara.
            </p>
          </div>

          {/* Preview de foto tomada */}
          {phase === 'preview' && preview && (
            <div>
              <div className="aspect-square rounded-xl overflow-hidden bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.dataUrl}
                  alt="Tu selfie"
                  className="w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
              </div>
              <p className="text-[11px] text-slate-500 text-center mt-2 font-mono">
                Hash: {preview.sha256.slice(0, 16)}…
              </p>
            </div>
          )}

          {description && phase !== 'error' && (
            <p className="text-[11px] text-slate-600 leading-relaxed">{description}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)]">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
          >
            Cancelar
          </button>
          {phase === 'live' && (
            <button
              type="button"
              onClick={snap}
              disabled={snapping}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {snapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Tomar foto
            </button>
          )}
          {phase === 'preview' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={retake}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reintentar
              </button>
              <button
                type="button"
                onClick={confirm}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold transition-colors"
              >
                <Check className="w-4 h-4" />
                Usar esta foto
              </button>
            </div>
          )}
          {phase === 'error' && (
            <button
              type="button"
              onClick={() => onCapture({ dataUrl: '', sha256: '', width: 0, height: 0 })}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              title="Continuar sin foto — quedará registrado que no se tomó"
            >
              Continuar sin foto
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
