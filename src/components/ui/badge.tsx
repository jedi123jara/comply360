import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge v5 — legible en tema claro y oscuro.
 *
 * Variantes tintadas: fondo `-500/12` + borde `-500/30` + tinta 600/700 de la
 * rampa. Las rampas cambian de orden según el tema (dashboard-light.css las
 * redefine para fondo claro), así que la misma clase da tinta oscura sobre
 * blanco y tinta clara sobre fondo oscuro. Las tintadas dan ≥ 4,5:1 en ambos temas.
 *
 * - `text-crimson-700` usa la rampa vía @theme; amber/gold/success-green van
 *   con `var(--…)` porque su 700 en Tailwind no sigue la rampa del tema.
 * - `success` es VERDE (success-green). `emerald`/`default` es el acento de
 *   marca (azul en el dashboard claro). `info`/`low` es cian/azul.
 * - Sólidos con texto blanco usan tonos que no cambian con el tema
 *   (rose-700) o tinta oscura sobre ámbar, para no depender del orden de la rampa.
 *
 * Canonical severity (AlertSeverity enum):
 *   critical (rojo) · high (ámbar) · medium (dorado) · low (cian/azul)
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
        critical: 'bg-crimson-500/12 text-crimson-700 border-crimson-500/30',
        high: 'bg-amber-500/12 text-[color:var(--amber-700)] border-amber-500/30',
        medium: 'bg-gold-500/12 text-[color:var(--gold-700)] border-gold-500/30',
        low: 'bg-cyan-500/12 text-cyan-200 border-cyan-400/25',

        // Semantic
        success:
          'bg-[color:var(--success-green-500)]/12 text-[color:var(--success-green-700)] border-[color:var(--success-green-500)]/30',
        warning: 'bg-amber-500/12 text-[color:var(--amber-700)] border-amber-500/30',
        danger: 'bg-crimson-500/12 text-crimson-700 border-crimson-500/30',
        info: 'bg-cyan-500/12 text-cyan-200 border-cyan-400/25',
        neutral: 'bg-[color:var(--bg-inset)] text-[color:var(--text-secondary)] border-[color:var(--border-default)]',
        emerald: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30',
        gold: 'bg-gold-500/15 text-[color:var(--gold-700)] border-gold-500/40',

        default: 'bg-emerald-500/12 text-emerald-700 border-emerald-500/30',

        // Solid counters
        'solid-emerald': 'bg-emerald-600 text-white border-transparent',
        'solid-crimson': 'bg-rose-700 text-white border-transparent',
        'solid-amber': 'bg-amber-500 text-amber-950 border-transparent',
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
