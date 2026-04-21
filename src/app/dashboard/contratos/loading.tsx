export default function ContratosLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* PageHeader editorial skeleton */}
      <div className="flex items-end justify-between gap-4 pb-4" style={{ borderBottom: '0.5px solid var(--border-default)' }}>
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded bg-emerald-100" />
          <div className="h-9 w-[420px] rounded-lg bg-gray-200" />
          <div className="h-4 w-[520px] rounded bg-[color:var(--neutral-100)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 rounded-lg bg-[color:var(--neutral-100)]" />
          <div className="h-9 w-36 rounded-lg bg-amber-100" />
          <div className="h-9 w-36 rounded-lg bg-emerald-100" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="h-10 flex-1 max-w-md rounded-xl bg-[color:var(--neutral-100)]" />
        <div className="h-10 w-24 rounded-xl bg-[color:var(--neutral-100)]" />
        <div className="h-10 w-32 rounded-xl bg-[color:var(--neutral-100)]" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white overflow-hidden">
        <div className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)] px-6 py-3 grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-3 rounded bg-[color:var(--neutral-200)]" />
          ))}
        </div>
        <div className="divide-y divide-[color:var(--border-subtle)]">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="px-6 py-4 grid grid-cols-7 gap-4 items-center">
              <div className="space-y-1.5">
                <div className="h-3 w-32 rounded bg-gray-200" />
                <div className="h-2.5 w-20 rounded bg-[color:var(--neutral-100)]" />
              </div>
              <div className="h-3 rounded bg-[color:var(--neutral-100)]" />
              <div className="h-5 w-24 rounded-md bg-[color:var(--neutral-100)]" />
              <div className="h-5 w-20 rounded-full bg-emerald-100" />
              <div className="h-3 rounded bg-[color:var(--neutral-100)]" />
              <div className="h-3 rounded bg-[color:var(--neutral-100)]" />
              <div className="h-3 w-8 rounded bg-[color:var(--neutral-100)] ml-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
