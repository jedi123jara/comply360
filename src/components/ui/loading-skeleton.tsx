'use client'

import { cn } from '@/lib/utils'

/* -------------------------------------------------------------------------- */
/*  Base Shimmer Block                                                        */
/* -------------------------------------------------------------------------- */

interface ShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

function Shimmer({ className, ...props }: ShimmerProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-gray-200 bg-white/[0.04]',
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonCard — card placeholder with image + text                         */
/* -------------------------------------------------------------------------- */

interface SkeletonCardProps {
  className?: string
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#141824] p-5 space-y-4',
        'border-white/[0.08] bg-[#141824]',
        className
      )}
    >
      <Shimmer className="h-36 w-full rounded-xl" />
      <Shimmer className="h-4 w-3/4" />
      <div className="space-y-2.5">
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-5/6" />
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Shimmer className="h-8 w-8 rounded-full" />
        <Shimmer className="h-3 w-24" />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonTable — table header + configurable rows                          */
/* -------------------------------------------------------------------------- */

interface SkeletonTableProps {
  rows?: number
  columns?: number
  className?: string
}

export function SkeletonTable({ rows = 5, columns = 4, className }: SkeletonTableProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#141824] overflow-hidden',
        'border-white/[0.08] bg-[#141824]',
        className
      )}
    >
      {/* Header */}
      <div className="flex gap-4 border-b border-white/[0.08] bg-white/[0.02] px-5 py-3 border-white/[0.08] bg-[#141824]/80">
        {Array.from({ length: columns }).map((_, i) => (
          <Shimmer key={`th-${i}`} className="h-3.5 flex-1" />
        ))}
      </div>

      {/* Body */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div
          key={`tr-${rowIdx}`}
          className="flex gap-4 border-b border-white/[0.06] px-5 py-3.5 last:border-b-0 border-white/[0.08]/50"
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Shimmer
              key={`td-${rowIdx}-${colIdx}`}
              className={cn('h-3.5 flex-1', colIdx === 0 && 'max-w-[40%]')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonStats — grid of stat cards                                        */
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
          className="rounded-2xl border border-white/[0.08] bg-[#141824] p-5 space-y-3 border-white/[0.08] bg-[#141824]"
        >
          <div className="flex items-center justify-between">
            <Shimmer className="h-3.5 w-24" />
            <Shimmer className="h-9 w-9 rounded-xl" />
          </div>
          <Shimmer className="h-7 w-20" />
          <div className="flex items-center gap-2">
            <Shimmer className="h-3 w-12" />
            <Shimmer className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonList — vertical list of items                                     */
/* -------------------------------------------------------------------------- */

interface SkeletonListProps {
  items?: number
  className?: string
}

export function SkeletonList({ items = 5, className }: SkeletonListProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#141824] divide-y divide-gray-100',
        'border-white/[0.08] bg-[#141824]/50',
        className
      )}
    >
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Shimmer className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shimmer className="h-3.5 w-3/5" />
            <Shimmer className="h-3 w-2/5" />
          </div>
          <Shimmer className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonText — configurable text lines                                    */
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
        <Shimmer
          key={i}
          className={cn('h-3.5', lineWidths[i % lineWidths.length])}
        />
      ))}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/*  SkeletonChart — chart area placeholder                                    */
/* -------------------------------------------------------------------------- */

interface SkeletonChartProps {
  className?: string
}

export function SkeletonChart({ className }: SkeletonChartProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/[0.08] bg-[#141824] p-5 space-y-4',
        'border-white/[0.08] bg-[#141824]',
        className
      )}
    >
      {/* Chart title */}
      <div className="flex items-center justify-between">
        <Shimmer className="h-4 w-32" />
        <Shimmer className="h-8 w-24 rounded-lg" />
      </div>

      {/* Chart area — bars */}
      <div className="flex items-end gap-3 pt-4 h-48">
        {[65, 40, 80, 55, 70, 45, 90, 60, 75, 50, 85, 35].map((h, i) => (
          <Shimmer
            key={i}
            className="flex-1 rounded-t-md"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <Shimmer key={i} className="h-2.5 flex-1" />
        ))}
      </div>
    </div>
  )
}
