'use client'

import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { ASISTENTES_GUIADOS } from '@/components/dashboard/que-quieres-hacer'

/**
 * Encabezado común de los asistentes de /dashboard/decisiones/*.
 *
 * El título y la descripción salen de `ASISTENTES_GUIADOS` (la misma fuente
 * que usa el botón "¿Qué quieres hacer?" del menú), para que el nombre que el
 * usuario elige en el menú sea exactamente el que ve al entrar.
 */
export function AsistenteHeader({ asistenteKey }: { asistenteKey: string }) {
  const asistente = ASISTENTES_GUIADOS.find((a) => a.key === asistenteKey)

  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-emerald-700 mb-2"
      >
        <ArrowLeft className="h-3 w-3" /> Volver al panel
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-emerald-700" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          Asistente guiado
        </span>
      </div>
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">
        {asistente?.title ?? 'Asistente guiado'}
      </h1>
      {asistente?.description && (
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">{asistente.description}</p>
      )}
    </div>
  )
}
