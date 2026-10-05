import Link from 'next/link'
import { ChevronLeft, CalendarClock } from 'lucide-react'
import { CALCULADORAS_POR_KEY, type CalculatorKey } from './catalogo'

/**
 * Encabezado común de las páginas de calculadora: volver a la lista,
 * nombre, para qué sirve y cuándo usarla (todo desde el catálogo único).
 */
export function EncabezadoCalculadora({
  calc,
  children,
}: {
  calc: CalculatorKey
  /** Acciones extra a la derecha (ej. selector individual/masivo). */
  children?: React.ReactNode
}) {
  const info = CALCULADORAS_POR_KEY[calc]
  const Icon = info.icon
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <Link
          href="/dashboard/calculadoras"
          className="inline-flex items-center gap-1 text-sm font-medium text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] transition-colors mb-2"
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          Todas las calculadoras
        </Link>
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </span>
          <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">{info.label}</h1>
        </div>
        <p className="mt-2 text-[color:var(--text-secondary)]">{info.paraQueSirve}</p>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-[color:var(--text-tertiary)]">
          <CalendarClock className="h-4 w-4" aria-hidden />
          Cuándo usarla: {info.cuando}
        </p>
      </div>
      {children}
    </div>
  )
}
