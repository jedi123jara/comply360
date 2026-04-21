export default function AlertasLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* PageHeader skeleton */}
      <div className="flex items-end justify-between gap-4 pb-4" style={{ borderBottom: '0.5px solid var(--border-default)' }}>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-emerald-100" />
          <div className="h-9 w-[440px] rounded-lg bg-gray-200" />
          <div className="h-4 w-[540px] rounded bg-[color:var(--neutral-100)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-lg bg-[color:var(--neutral-100)]" />
          <div className="h-9 w-32 rounded-lg bg-emerald-100" />
        </div>
      </div>

      {/* KpiGrid (5 cards) */}
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-5 space-y-2"
            style={{
              background: 'white',
              border: '0.5px solid var(--border-default)',
            }}
          >
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
              <div className="h-3 w-24 rounded bg-[color:var(--neutral-100)]" />
            </div>
            <div className="h-8 w-16 rounded bg-gray-200" />
            <div className="h-3 w-32 rounded bg-[color:var(--neutral-100)]" />
          </div>
        ))}
      </div>

      {/* Alert cards list */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-l-4 bg-white p-5 border-l-amber-400 border-[color:var(--border-subtle)]"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-80 rounded bg-gray-200" />
                <div className="h-3 w-full max-w-xl rounded bg-[color:var(--neutral-100)]" />
                <div className="flex gap-2 mt-2">
                  <div className="h-5 w-20 rounded-full bg-emerald-100" />
                  <div className="h-5 w-24 rounded-full bg-[color:var(--neutral-100)]" />
                </div>
              </div>
              <div className="h-8 w-24 rounded-lg bg-emerald-100 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
