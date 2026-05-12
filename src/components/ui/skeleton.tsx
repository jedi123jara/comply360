import { cn } from '@/lib/utils'

/**
 * Skeleton — shimmer placeholder for loading states.
 *
 * Uses the `.shimmer-bg` utility from tokens.css (pure CSS animation, zero JS).
 * Composable helpers (SkeletonText, SkeletonCard, SkeletonTable, SkeletonStats,
 * SkeletonRow) match common layouts.
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'shimmer-bg rounded-lg border border-[color:var(--border-subtle)]',
        className
      )}
      {...props}
    />
  )
}

/* ── SkeletonText ──────────────────────────────────────────────────────── */

const lineWidths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3']

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number
  className?: string
}) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5 border-0', lineWidths[i % lineWidths.length])}
        />
      ))}
    </div>
  )
}

/* ── SkeletonRow ───────────────────────────────────────────────────────── */

export function SkeletonRow({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex items-center gap-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4 border-0',
            i === 0 ? 'w-1/3' : i === columns - 1 ? 'w-16' : 'flex-1'
          )}
        />
      ))}
    </div>
  )
}

/* ── SkeletonCard ──────────────────────────────────────────────────────── */

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-[var(--elevation-1)] p-5 space-y-4',
        className
      )}
    >
      <Skeleton className="h-36 w-full rounded-xl border-0" />
      <Skeleton className="h-4 w-3/4 border-0" />
      <SkeletonText lines={2} />
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="h-8 w-8 rounded-full border-0" />
        <Skeleton className="h-3 w-24 border-0" />
      </div>
    </div>
  )
}

/* ── SkeletonTable ─────────────────────────────────────────────────────── */

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number
  columns?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-[var(--elevation-1)] overflow-hidden',
        className
      )}
    >
      <div className="flex gap-4 border-b border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`h-${i}`} className="h-3.5 flex-1 border-0" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          className="flex gap-4 border-b border-[color:var(--border-subtle)] px-5 py-3.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`c-${rowIdx}-${colIdx}`}
              className={cn(
                'h-3.5 flex-1 border-0',
                colIdx === 0 && 'max-w-[40%]'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/* ── SkeletonStats ─────────────────────────────────────────────────────── */

export function SkeletonStats({
  count = 4,
  className,
}: {
  count?: number
  className?: string
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] shadow-[var(--elevation-1)] p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24 border-0" />
            <Skeleton className="h-9 w-9 rounded-xl border-0" />
          </div>
          <Skeleton className="h-7 w-20 border-0" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12 border-0" />
            <Skeleton className="h-3 w-20 border-0" />
          </div>
        </div>
      ))}
    </div>
  )
}
