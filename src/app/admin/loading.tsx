/**
 * Skeleton para cualquier página de /admin/* que esté cargando.
 * Matchea el layout del admin (sidebar 256px + main) así el loading es
 * "invisible" — el usuario ve la estructura mientras el contenido viene.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title block */}
      <div>
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="mt-2 h-4 w-96 bg-slate-200 rounded" />
      </div>

      {/* Narrative / headline card */}
      <div className="rounded-xl bg-slate-800/80 p-5 space-y-2">
        <div className="h-3 w-28 bg-emerald-700/40 rounded" />
        <div className="h-4 w-full bg-slate-700 rounded" />
        <div className="h-4 w-5/6 bg-slate-700 rounded" />
        <div className="h-4 w-4/6 bg-slate-700 rounded" />
      </div>

      {/* KPI row */}
      <div>
        <div className="h-3 w-16 bg-slate-200 rounded mb-3" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white ring-1 ring-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-slate-200 rounded-lg" />
                <div className="h-3 w-20 bg-slate-200 rounded" />
              </div>
              <div className="h-7 w-24 bg-slate-300 rounded mb-1" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Dual content cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white ring-1 ring-slate-200 rounded-xl p-5">
            <div className="h-4 w-40 bg-slate-200 rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-slate-200 rounded" style={{ width: `${60 + j * 6}%` }} />
                    <div className="h-2 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
