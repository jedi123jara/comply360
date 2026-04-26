'use client'

/**
 * Modo Kiosko — pantalla fullscreen con QR de asistencia auto-rotante.
 *
 * Pensado para tablet/monitor en recepción: el admin entra una vez con su
 * sesión, deja la pestaña abierta, y todos los trabajadores escanean el QR
 * con su celular para marcar asistencia.
 *
 * Características:
 *   - Layout fullscreen sin sidebar/topbar (override del layout dashboard)
 *   - Auto-rotación del QR cada 4 min (delegada al AttendanceQrCard)
 *   - Reloj grande visible para confirmar timestamp
 *   - Botón discreto "Salir del modo kiosko" para volver al dashboard
 *
 * Sprint 4 (futuro): ruta pública /kiosko/[orgSlug] sin auth con PIN admin
 * para que la tablet no necesite mantener sesión Clerk activa.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock } from 'lucide-react'
import { AttendanceQrCard } from '@/components/attendance/attendance-qr-card'

export default function KioskoPage() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Intento auto-fullscreen al primer click del usuario (browsers requieren gesto)
  useEffect(() => {
    function tryFullscreen() {
      if (
        document.documentElement.requestFullscreen &&
        !document.fullscreenElement
      ) {
        document.documentElement.requestFullscreen().catch(() => {
          /* ignore — el navegador puede rechazar */
        })
      }
      window.removeEventListener('click', tryFullscreen)
    }
    window.addEventListener('click', tryFullscreen, { once: true })
    return () => window.removeEventListener('click', tryFullscreen)
  }, [])

  const timeStr = now.toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const dateStr = now.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="fixed inset-0 z-50 bg-[color:var(--neutral-50)] flex flex-col">
      {/* Botón salir discreto */}
      <Link
        href="/dashboard/asistencia"
        className="absolute top-4 left-4 z-10 inline-flex items-center gap-1.5 rounded-lg bg-white/90 backdrop-blur px-3 py-2 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-white transition-colors shadow-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Salir del modo kiosko
      </Link>

      {/* Reloj gigante en esquina superior derecha */}
      <div className="absolute top-4 right-6 z-10 text-right">
        <div className="font-mono text-3xl font-bold text-[color:var(--text-primary)] tabular-nums tracking-tight">
          {timeStr}
        </div>
        <div className="text-xs text-[color:var(--text-tertiary)] capitalize mt-0.5">
          {dateStr}
        </div>
      </div>

      {/* QR centrado con instrucciones */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest mb-3">
            <Clock className="w-3 h-3" />
            Marca de Asistencia
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[color:var(--text-primary)] tracking-tight">
            Escanea el QR con tu celular
          </h1>
          <p className="mt-2 text-base text-[color:var(--text-secondary)] max-w-xl">
            Apunta la cámara, toca el link que aparece, listo. El QR se renueva cada 4 minutos.
          </p>
        </div>

        {/* AttendanceQrCard ya soporta fullscreen={true} pero acá lo usamos en
            tamaño normal porque ya estamos en pantalla dedicada */}
        <div className="w-full max-w-3xl">
          <AttendanceQrCard />
        </div>

        <p className="mt-6 text-xs text-[color:var(--text-tertiary)] text-center max-w-md">
          ¿Sin cámara? Pídele a tu supervisor el código corto y entra a{' '}
          <span className="font-mono">comply360.pe/mi-portal/asistencia</span>
        </p>
      </div>

      {/* Footer con branding sutil */}
      <div className="text-center pb-3 text-[10px] text-[color:var(--text-tertiary)] uppercase tracking-widest">
        Comply360 · Modo Kiosko
      </div>
    </div>
  )
}
