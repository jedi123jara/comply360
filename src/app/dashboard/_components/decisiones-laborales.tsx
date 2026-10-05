'use client'

import Link from 'next/link'
import { ArrowRight, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ASISTENTES_GUIADOS,
  ASISTENTE_ACCENT_CLASSES,
  type AsistenteGuiado,
} from '@/components/dashboard/que-quieres-hacer'

/**
 * DecisionesLaborales — sección destacada del cockpit.
 *
 * Organiza el producto por momento del usuario (contratar, renovar, cesar,
 * revisar la planilla, prepararse para SUNAFIL) en vez de por módulo. Cada
 * tarjeta abre un asistente guiado que reusa funciones existentes, sin
 * duplicar lógica.
 *
 * Los datos (títulos, descripciones, íconos y rutas) vienen de
 * `ASISTENTES_GUIADOS`, la misma lista que usan el botón "¿Qué quieres hacer?"
 * del menú lateral y el buscador. Si cambias un asistente, cámbialo allí.
 */

// Re-export para quien busque la lista desde esta sección.
export { ASISTENTES_GUIADOS }

export function DecisionesLaborales() {
  return (
    <section className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-5 md:p-6 shadow-[var(--elevation-2)]">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
              ¿Qué quieres hacer?
            </span>
          </div>
          <h2 className="text-lg font-bold text-[color:var(--text-primary)]">
            Te guiamos paso a paso
          </h2>
          <p className="mt-0.5 text-sm text-[color:var(--text-tertiary)] max-w-2xl">
            Elige la situación en la que estás. Cada asistente hace los cálculos, revisa lo que
            dice la ley y te deja listo el siguiente paso, para que decidas con seguridad.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {ASISTENTES_GUIADOS.map((asistente) => (
          <DecisionCardItem key={asistente.key} asistente={asistente} />
        ))}
      </div>
    </section>
  )
}

function DecisionCardItem({ asistente }: { asistente: AsistenteGuiado }) {
  const Icon = asistente.icon

  return (
    <Link
      href={asistente.href}
      className="group rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] p-3 transition-colors hover:border-emerald-400/45 hover:bg-[color:var(--bg-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
    >
      <div className="mb-2">
        <div
          aria-hidden="true"
          className={cn('inline-flex rounded-lg p-2', ASISTENTE_ACCENT_CLASSES[asistente.accent])}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3 className="text-sm font-bold text-[color:var(--text-primary)] leading-tight">
        {asistente.title}
      </h3>
      <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)] leading-relaxed line-clamp-3">
        {asistente.description}
      </p>
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
        Empezar
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  )
}
