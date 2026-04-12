export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-48 rounded-lg bg-gray-200" />
        <div className="mt-2 h-4 w-72 rounded bg-white/[0.04]" />
      </div>

      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-[#141824] p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-white/[0.04]" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-16 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-white/[0.04]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-[#141824] p-5">
            <div className="h-5 w-32 rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-4 rounded bg-white/[0.04]" style={{ width: `${70 + j * 8}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
