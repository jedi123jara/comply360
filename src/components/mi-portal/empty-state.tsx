/**
 * EmptyState — estado vacío consistente para listas del portal.
 *
 * Diseñado para mobile-first con ilustración opcional, mensaje claro y CTA.
 */

import type { ReactNode } from 'react'

interface EmptyStateProps {
  /** Icono o ilustración lucide-react. */
  icon?: ReactNode
  /** Título principal ej: "No hay boletas todavía". */
  title: string
  /** Descripción secundaria ej: "Tu próxima boleta se emite el 30 de abril". */
  description?: string
  /** Call-to-action opcional (botón o link). */
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
      {icon && (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm text-slate-400">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-slate-500 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
