/**
 * Loading skeleton editorial para /dashboard/trabajadores.
 *
 * Se renderiza instantáneamente (sin compilación Turbopack) mientras el bundle
 * real se descarga. Imita el layout final (PageHeader + KpiGrid + tabla) para
 * que el usuario perciba velocidad sin ver saltos de layout (CLS = 0).
 */
export default function TrabajadoresLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* PageHeader editorial skeleton */}
      <div className="flex items-end justify-between gap-4 pb-4" style={{ borderBottom: '0.5px solid var(--border-default)' }}>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-emerald-100" />
          <div className="h-9 w-96 rounded-lg bg-gray-200" />
          <div className="h-4 w-[500px] rounded bg-[color:var(--neutral-100)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-[color:var(--neutral-100)]" />
          <div className="h-9 w-40 rounded-lg bg-emerald-100" />
        </div>
      </div>

      {/* KpiGrid skeleton (6 cards) */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 space-y-2"
            style={{
              background: 'white',
              border: '0.5px solid var(--border-default)',
              boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
              <div className="h-3 w-24 rounded bg-[color:var(--neutral-100)]" />
            </div>
            <div className="h-8 w-20 rounded bg-gray-200" />
            <div className="h-3 w-32 rounded bg-[color:var(--neutral-100)]" />
          </div>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-3">
        <div className="h-10 flex-1 max-w-md rounded-lg bg-[color:var(--neutral-100)]" />
        <div className="h-10 w-24 rounded-lg bg-[color:var(--neutral-100)]" />
      </div>

      {/* Table skeleton (5 rows) */}
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white overflow-hidden">
        <div className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)] px-6 py-3 grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-[color:var(--neutral-200)]" />
          ))}
        </div>
        <div className="divide-y divide-[color:var(--border-subtle)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-6 py-4 grid grid-cols-7 gap-4 items-center">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-emerald-100" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-2.5 w-16 rounded bg-[color:var(--neutral-100)]" />
                </div>
              </div>
              <div className="h-3 rounded bg-[color:var(--neutral-100)]" />
              <div className="h-3 rounded bg-[color:var(--neutral-100)]" />
              <div className="h-3 rounded bg-[color:var(--neutral-100)]" />
              <div className="h-3 rounded bg-[color:var(--neutral-100)]" />
              <div className="h-5 w-14 rounded-full bg-emerald-100" />
              <div className="h-3 w-12 rounded bg-[color:var(--neutral-100)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
