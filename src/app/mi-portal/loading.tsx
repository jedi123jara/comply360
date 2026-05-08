/**
 * Skeleton para /mi-portal/* — matchea el layout mobile-first del portal
 * del trabajador. Mientras carga, el usuario ve la estructura (avatar,
 * saludo, cards de acciones pendientes) en vez de una pantalla blanca.
 */
export default function MiPortalLoading() {
  return (
    <div className="space-y-5  p-4">
      {/* Saludo */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-slate-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-3 w-28 bg-slate-100 rounded" />
        </div>
      </div>

      {/* Card grande de acción pendiente */}
      <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-amber-100 rounded-full" />
          <div className="h-3 w-24 bg-slate-200 rounded" />
        </div>
        <div className="h-5 w-3/4 bg-slate-300 rounded" />
        <div className="h-3 w-full bg-slate-100 rounded" />
        <div className="h-3 w-5/6 bg-slate-100 rounded" />
        <div className="h-9 w-32 bg-emerald-200 rounded-xl mt-2" />
      </div>

      {/* Quick actions grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-white ring-1 ring-slate-200 p-4">
            <div className="w-8 h-8 bg-slate-200 rounded-lg mb-2" />
            <div className="h-3 w-3/4 bg-slate-200 rounded mb-1.5" />
            <div className="h-2 w-1/2 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Lista de boletas / docs */}
      <div className="rounded-xl bg-white ring-1 ring-slate-200 divide-y divide-slate-100">
        <div className="p-4">
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-100 rounded-lg" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200 rounded" style={{ width: `${70 - i * 8}%` }} />
              <div className="h-2 bg-slate-100 rounded w-1/3" />
            </div>
            <div className="w-4 h-4 bg-slate-100 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
