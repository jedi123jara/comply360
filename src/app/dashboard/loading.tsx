export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <div className="c360-skeleton h-7 w-48" />
        <div className="c360-skeleton mt-2 h-4 w-72" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-5">
            <div className="flex items-center gap-4">
              <div className="c360-skeleton h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="c360-skeleton h-6 w-16" />
                <div className="c360-skeleton h-3 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-white p-5">
            <div className="c360-skeleton h-5 w-32" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="c360-skeleton h-4" style={{ width: `${70 + j * 8}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
