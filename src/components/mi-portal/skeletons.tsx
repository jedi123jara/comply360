/**
 * Skeletons estructurados para el portal worker.
 *
 * Cada skeleton refleja el layout real de su página para que el usuario vea
 * forma mientras carga. Reemplaza los div genéricos `bg-slate-100 animate-pulse`.
 */

interface SkeletonProps {
  className?: string
}

function Bar({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-slate-200 rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  )
}

/**
 * Skeleton de lista — N cards compactos verticalmente.
 */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando lista">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <Bar className="h-3 w-3/4" />
            <Bar className="h-3 w-1/2" />
          </div>
          <Bar className="h-7 w-20" />
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton de grid de cards — típico para documentos o capacitaciones.
 */
export function CardGridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-slate-200 animate-pulse" />
          <Bar className="h-4 w-2/3" />
          <Bar className="h-3 w-full" />
          <Bar className="h-3 w-4/5" />
          <div className="pt-2 flex items-center gap-2">
            <Bar className="h-6 w-16" />
            <Bar className="h-6 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Skeleton de detalle — para páginas "ver X" con header + secciones.
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar className="h-5 w-1/2" />
          <Bar className="h-3 w-1/3" />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <Bar className="h-3 w-2/3" />
            <Bar className="h-6 w-3/4" />
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <Bar className="h-4 w-1/3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton compacto — hero card con una sola barra.
 */
export function HeroSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3" aria-busy="true">
      <Bar className="h-6 w-2/3" />
      <Bar className="h-4 w-full" />
      <Bar className="h-4 w-5/6" />
    </div>
  )
}
