import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Card v4 — Emerald Light con jerarquía visual premium.
 *
 * Principio de diseño: sombras multi-layer (Stripe-style) que separan la
 * card del fondo sin saturar; hover lift con ring emerald sutil; accent-bar
 * superior opcional para cards "destacadas".
 *
 * Variants:
 * - `default`: white + elevation-2 + hover elevation-hover
 * - `elevated`: white + elevation-3 (hero/KPIs principales)
 * - `flat`: white + border only (para listas anidadas)
 * - `emerald`: tinte emerald-50 con accent left + elevation-2
 * - `crimson`: tinte crimson-50 con accent left + elevation-2
 * - `amber`: tinte amber-50 con accent left + elevation-2
 * - `outline`: solo borde, sin sombra
 * - `ghost`: transparente
 *
 * `accentBar`: agrega una barra superior 3px con color emerald / amber / crimson.
 */
const cardVariants = cva(
  [
    'relative rounded-xl border transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-white border-[color:var(--border-default)]',
          'shadow-[var(--elevation-2)]',
        ],
        elevated: [
          'bg-white border-[color:var(--border-default)]',
          'shadow-[var(--elevation-3)]',
        ],
        flat: [
          'bg-white border-[color:var(--border-default)]',
          'shadow-[var(--elevation-1)]',
        ],
        emerald: [
          'bg-gradient-to-br from-emerald-50/80 to-white',
          'border-emerald-200',
          'shadow-[var(--elevation-2)]',
          'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-l-xl before:bg-emerald-500',
        ],
        crimson: [
          'bg-gradient-to-br from-crimson-50/80 to-white',
          'border-crimson-200',
          'shadow-[var(--elevation-2)]',
          'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-l-xl before:bg-crimson-500',
        ],
        amber: [
          'bg-gradient-to-br from-amber-50/80 to-white',
          'border-amber-200',
          'shadow-[var(--elevation-2)]',
          'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:rounded-l-xl before:bg-amber-500',
        ],
        outline: [
          'bg-transparent border-[color:var(--border-subtle)]',
          'hover:border-[color:var(--border-default)]',
        ],
        solid: [
          'bg-[color:var(--neutral-50)] border-[color:var(--border-default)]',
        ],
        ghost: [
          'bg-transparent border-transparent',
        ],
      },
      interactive: {
        true: [
          'cursor-pointer',
          'transition-[transform,box-shadow,border-color]',
          'duration-[var(--motion-short)]',
          'ease-[var(--ease-standard)]',
          'will-change-transform',
          'hover:-translate-y-0.5',
          'hover:shadow-[var(--elevation-hover)]',
          'hover:border-emerald-200',
          'active:translate-y-0 active:scale-[0.998]',
          'active:transition-[transform] active:duration-[var(--motion-instant)]',
        ],
      },
      accentBar: {
        emerald: 'before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:rounded-t-xl before:bg-[image:var(--accent-bar-emerald)] before:content-[\'\']',
        amber: 'before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:rounded-t-xl before:bg-[image:var(--accent-bar-amber)] before:content-[\'\']',
        crimson: 'before:absolute before:inset-x-0 before:top-0 before:h-[4px] before:rounded-t-xl before:bg-[image:var(--accent-bar-crimson)] before:content-[\'\']',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-5',
        lg: 'p-6',
        xl: 'p-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'none',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive, accentBar, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive, accentBar, padding }), className)}
      {...props}
    />
  )
)
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-6 py-4 border-b border-[color:var(--border-subtle)]',
        'flex items-start justify-between gap-3',
        className
      )}
      {...props}
    />
  )
)
CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-base font-semibold tracking-tight text-[color:var(--text-primary)]',
        className
      )}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-[color:var(--text-secondary)] leading-relaxed', className)}
    {...props}
  />
))
CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-5', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'px-6 py-4 border-t border-[color:var(--border-subtle)]',
        'flex items-center justify-end gap-3',
        className
      )}
      {...props}
    />
  )
)
CardFooter.displayName = 'CardFooter'

export { cardVariants }
