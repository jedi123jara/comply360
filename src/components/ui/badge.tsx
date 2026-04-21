import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge v3 — Emerald Light. Fondos tintados claros + texto saturado.
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
        critical: 'bg-crimson-50 text-crimson-700 border-crimson-200',
        high: 'bg-amber-50 text-amber-700 border-amber-200',
        medium: 'bg-amber-50 text-amber-600 border-amber-100',
        low: 'bg-cyan-50 text-cyan-700 border-cyan-100',

        // Semantic
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-crimson-50 text-crimson-700 border-crimson-200',
        info: 'bg-cyan-50 text-cyan-700 border-cyan-100',
        neutral: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] border-[color:var(--border-default)]',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        gold: 'bg-[color:var(--amber-50)] text-gold-600 border-[color:var(--amber-200,var(--gold-400))]',

        default: 'bg-emerald-50 text-emerald-700 border-emerald-200',

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
