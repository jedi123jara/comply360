'use client'

import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Base Skeleton                                                             */
/* -------------------------------------------------------------------------- */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg bg-gray-200 animate-[shimmer_1.5s_ease-in-out_infinite] bg-[length:200%_100%]',
        'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200',
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonText — multiple lines with varying widths                         */
/* -------------------------------------------------------------------------- */

interface SkeletonTextProps {
  lines?: number
  className?: string
}

const lineWidths = ['w-full', 'w-5/6', 'w-4/6', 'w-3/4', 'w-2/3']

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3.5', lineWidths[i % lineWidths.length])}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonCard — card with image area + text lines                          */
/* -------------------------------------------------------------------------- */

interface SkeletonCardProps {
  className?: string
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#141824] p-5 space-y-4',
        className
      )}
    >
      {/* Image area */}
      <Skeleton className="h-36 w-full rounded-xl" />

      {/* Title */}
      <Skeleton className="h-4 w-3/4" />

      {/* Text lines */}
      <SkeletonText lines={2} />

      {/* Footer / action */}
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonTable — table header + 5 body rows                               */
/* -------------------------------------------------------------------------- */

interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#141824] overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="flex gap-4 border-b border-white/[0.08] bg-white/[0.02] px-5 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`h-${i}`}
            className="h-3.5 flex-1"
          />
        ))}
      </div>

      {/* Body rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`r-${rowIdx}`}
          className="flex gap-4 border-b border-white/[0.06] px-5 py-3.5 last:border-b-0"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={`c-${rowIdx}-${colIdx}`}
              className={cn(
                'h-3.5 flex-1',
                colIdx === 0 && 'max-w-[40%]'
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonStats — 4 stat card skeletons matching dashboard layout           */
/* -------------------------------------------------------------------------- */

interface SkeletonStatsProps {
  count?: number
  className?: string
}

export function SkeletonStats({ count = 4, className }: SkeletonStatsProps) {
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
          className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 space-y-3"
        >
          {/* Icon + label row */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>

          {/* Big number */}
          <Skeleton className="h-7 w-20" />

          {/* Trend */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}
