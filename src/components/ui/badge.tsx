import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge v4 — Dark Authority. Fondos translúcidos + texto luminoso.
 *
 * Canonical severity (AlertSeverity enum):
 *   critical · high · medium · low
 */
const badgeVariants = cva(
  [
    'inline-flex items-center gap-1.5 font-medium',
    'transition-colors duration-150',
    'border',
  ],
  {
    variants: {
      variant: {
        // Severity
        critical: 'bg-crimson-500/12 text-crimson-300 border-crimson-500/30',
        high: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
        medium: 'bg-amber-500/10 text-amber-200 border-amber-500/24',
        low: 'bg-cyan-500/12 text-cyan-200 border-cyan-400/25',

        // Semantic
        success: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/30',
        warning: 'bg-amber-500/12 text-amber-300 border-amber-500/30',
        danger: 'bg-crimson-500/12 text-crimson-300 border-crimson-500/30',
        info: 'bg-cyan-500/12 text-cyan-200 border-cyan-400/25',
        neutral: 'bg-[color:var(--bg-inset)] text-[color:var(--text-secondary)] border-[color:var(--border-default)]',
        emerald: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/30',
        gold: 'bg-amber-500/12 text-amber-200 border-amber-400/30',

        default: 'bg-emerald-500/12 text-emerald-200 border-emerald-400/30',

        // Solid counters
        'solid-emerald': 'bg-emerald-600 text-white border-transparent',
        'solid-crimson': 'bg-crimson-600 text-white border-transparent',
        'solid-amber': 'bg-amber-500 text-white border-transparent',
      },
      size: {
        xs: 'text-[10px] px-1.5 py-0.5 rounded-md',
        sm: 'text-[11px] px-2 py-0.5 rounded-md',
        md: 'text-xs px-2.5 py-1 rounded-md',
        lg: 'text-sm px-3 py-1.5 rounded-lg',
        pill: 'text-xs px-2.5 py-0.5 rounded-full',
      },
      pulse: {
        true: 'motion-pulse-emerald',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
    compoundVariants: [
      { variant: 'critical', pulse: true, className: 'motion-pulse-crimson' },
    ],
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, pulse, dot, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, pulse }), className)}
      {...props}
    >
      {dot ? (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-current"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </span>
  )
)
Badge.displayName = 'Badge'

export { badgeVariants }
