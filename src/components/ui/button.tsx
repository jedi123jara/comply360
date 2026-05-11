'use client'

import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Button v4 — Dark Authority.
 *
 * Variants:
 * - `primary` (default): emerald sólido, texto blanco, hover más oscuro, sombra sutil
 * - `secondary`: outline, texto neutral, hover bg gris muy claro
 * - `ghost`: sin borde, hover background sutil
 * - `danger`: crimson sólido
 * - `gold`: acento premium (plan PRO, certificaciones)
 * - `emerald-soft`: fondo emerald-50 + texto emerald-700, muy sutil
 * - `link`: underline, emerald
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'font-medium transition-all duration-[var(--motion-micro)] ease-[var(--ease-standard)]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg-canvas)]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    'active:scale-[var(--scale-press)] active:transition-[transform] active:duration-[var(--motion-instant)]',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-emerald-600 text-white',
          'shadow-[0_1px_2px_rgba(16,185,129,0.25),0_1px_0_rgba(255,255,255,0.12)_inset]',
          'hover:bg-emerald-700',
          'hover:shadow-[0_4px_12px_rgba(16,185,129,0.25)]',
        ],
        secondary: [
          'bg-[color:var(--bg-surface)] text-[color:var(--text-primary)]',
          'border border-[color:var(--border-default)]',
          'shadow-[var(--elevation-1)]',
          'hover:border-[color:var(--border-strong)] hover:bg-[color:var(--bg-surface-hover)]',
        ],
        ghost: [
          'text-[color:var(--text-secondary)]',
          'hover:bg-[color:var(--bg-surface-hover)] hover:text-[color:var(--text-primary)]',
        ],
        danger: [
          'bg-crimson-600 text-white',
          'shadow-[0_1px_2px_rgba(239,68,68,0.25)]',
          'hover:bg-crimson-700 hover:shadow-[0_4px_12px_rgba(239,68,68,0.25)]',
        ],
        gold: [
          'bg-gold-500 text-white',
          'shadow-[0_1px_2px_rgba(212,168,83,0.25)]',
          'hover:bg-gold-600 hover:shadow-[0_4px_12px_rgba(212,168,83,0.30)]',
        ],
        'emerald-soft': [
          'bg-emerald-500/12 text-emerald-200 border border-emerald-400/30',
          'hover:bg-emerald-500/18 hover:border-emerald-300/55',
        ],
        link: [
          'text-emerald-600 hover:text-emerald-700 underline-offset-4 hover:underline',
          'p-0 h-auto',
        ],
      },
      size: {
        xs: 'h-7 px-2.5 text-xs rounded-md gap-1.5',
        sm: 'h-8 px-3 text-sm rounded-md gap-1.5',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-lg',
        xl: 'h-14 px-8 text-base rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
    compoundVariants: [
      { variant: 'link', className: '!h-auto !p-0' },
    ],
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      icon,
      iconRight,
      children,
      disabled,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : 'button'
    const isDisabled = disabled || loading

    const decorated = (
      <>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : icon ? (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        ) : null}
        {children}
        {!loading && iconRight ? (
          <span className="shrink-0" aria-hidden="true">
            {iconRight}
          </span>
        ) : null}
      </>
    )

    return (
      <Comp
        ref={ref as never}
        aria-busy={loading || undefined}
        data-loading={loading || undefined}
        className={cn(buttonVariants({ variant, size, fullWidth }), className)}
        disabled={isDisabled}
        {...props}
      >
        {asChild ? children : decorated}
      </Comp>
    )
  }
)

Button.displayName = 'Button'

export { buttonVariants }
