import { forwardRef, type ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Badge v6 — legible en tema claro y oscuro.
 *
 * Estados (success/warning/danger/info/neutral + critical/high/low): usan los
 * colores por función `--status-*` (ver `statusToneClasses`), la misma fuente
 * que StatusBadge, Field, ConfirmDialog y los avisos.
 *
 * Resto de variantes tintadas: fondo `-500/12` + borde `-500/30` + tinta 600/700
 * de la rampa. Las rampas cambian de orden según el tema (dashboard-light.css las
 * redefine para fondo claro), así que la misma clase da tinta oscura sobre
 * blanco y tinta clara sobre fondo oscuro.
 *
 * - `success` es VERDE. `emerald`/`default` es el acento de marca (azul en el
 *   dashboard claro). `info`/`low` es azul en claro y cian en oscuro.
 * - Sólidos con texto blanco usan tonos que no cambian con el tema
 *   (rose-700) o tinta oscura sobre ámbar, para no depender del orden de la rampa.
 *
 * Canonical severity (AlertSeverity enum):
 *   critical (rojo) · high (ámbar) · medium (dorado) · low (cian/azul)
 *
 * Para estados (Cumple / Por vencer / Vencido…) usa `StatusBadge`
 * (`@/components/ui/status-badge`): siempre muestra ícono + texto, así el
 * color nunca es la única señal.
 */

/**
 * Colores por tono de estado (fondo + borde + tinta). Fuente única para Badge
 * (success/warning/danger/info/neutral y las severidades critical/high/low),
 * StatusBadge y cualquier pieza que pinte un estado (p. ej. ConfirmDialog).
 *
 * Usan los colores por función `--status-{tono}-{fg,bg,border}` de tokens.css,
 * que cada tema redefine (oscuro en :root y en la isla navy del sidebar, claro
 * en dashboard-light.css) con fg ≥ 4,5:1 sobre su bg. El valor tras la coma es
 * el respaldo del tema claro por si la variable no existiera.
 */
export const statusToneClasses = {
  success:
    'bg-[color:var(--status-success-bg,#ecfdf3)] text-[color:var(--status-success-fg,#166534)] border-[color:var(--status-success-border,#bbf7d0)]',
  warning:
    'bg-[color:var(--status-warning-bg,#fff8e7)] text-[color:var(--status-warning-fg,#92400e)] border-[color:var(--status-warning-border,#fde68a)]',
  danger:
    'bg-[color:var(--status-danger-bg,#fff1f2)] text-[color:var(--status-danger-fg,#9f1239)] border-[color:var(--status-danger-border,#fecdd3)]',
  info: 'bg-[color:var(--status-info-bg,#eff6ff)] text-[color:var(--status-info-fg,#1d4ed8)] border-[color:var(--status-info-border,#bfdbfe)]',
  neutral:
    'bg-[color:var(--status-neutral-bg,#f1f5f9)] text-[color:var(--status-neutral-fg,#405576)] border-[color:var(--status-neutral-border,#d8e2f0)]',
} as const

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
        critical: statusToneClasses.danger,
        high: statusToneClasses.warning,
        medium: 'bg-gold-500/12 text-[color:var(--gold-700)] border-gold-500/30',
        low: statusToneClasses.info,

        // Semantic
        success: statusToneClasses.success,
        warning: statusToneClasses.warning,
        danger: statusToneClasses.danger,
        info: statusToneClasses.info,
        neutral: statusToneClasses.neutral,
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
  /** Ícono decorativo antes del texto (se oculta a lectores de pantalla). Reemplaza al `dot`. */
  icon?: ReactNode
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, pulse, dot, icon, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ variant, size, pulse }), className)}
      {...props}
    >
      {icon ? (
        <span className="inline-flex shrink-0" aria-hidden="true">
          {icon}
        </span>
      ) : dot ? (
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
