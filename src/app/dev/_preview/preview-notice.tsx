import type { ReactNode } from 'react'
import { FlaskConical } from 'lucide-react'

/**
 * Aviso superior de cada vista previa. Deja claro que los datos son de
 * ejemplo y explica qué se está viendo. Sin hooks: sirve tanto en Server
 * como en Client Components.
 */
export function PreviewNotice({
  title,
  children,
  actions,
}: {
  title: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section
      aria-label="Aviso de vista previa"
      className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 sm:px-5"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-white text-amber-700">
          <FlaskConical className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-amber-950">{title}</p>
            <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
              Datos de ejemplo
            </span>
          </div>
          <div className="mt-1 text-sm leading-relaxed text-amber-900">{children}</div>
          {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </section>
  )
}

/** Clases compartidas para chips/enlaces de escenario dentro del aviso. */
export function scenarioChipClass(active: boolean): string {
  return active
    ? 'inline-flex items-center rounded-full border border-amber-400 bg-amber-200/70 px-3 py-1 text-xs font-semibold text-amber-950'
    : 'inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-900 transition-colors hover:border-amber-400 hover:bg-amber-100'
}
