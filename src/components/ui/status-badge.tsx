import { forwardRef, type ReactNode } from 'react'
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Info,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge, type BadgeProps } from '@/components/ui/badge'

/**
 * StatusBadge — insignia de estado accesible.
 *
 * SIEMPRE muestra ícono + texto: el color nunca es la única señal (WCAG 1.4.1).
 * Cada tono tiene un ícono de forma distinta (círculo con check, triángulo,
 * octágono, círculo con "i", círculo vacío) para que se distingan también sin
 * color. Reutiliza los colores de `Badge`, que ya tienen contraste AA en el
 * tema claro y en el oscuro.
 *
 *   <StatusBadge tone="success" label="Cumple" />
 *   <StatusBadge tone={scoreTone(score)} label={scoreLabel(score)} />
 *   <StatusBadge tone="warning" label="Por vencer" icon={Clock} size="sm" />
 */

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const STATUS_TONE_ICONS: Record<StatusTone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertOctagon,
  info: Info,
  neutral: Circle,
}

/** Texto de respaldo si llega un `label` vacío: la insignia nunca queda sin texto. */
const DEFAULT_TONE_LABEL: Record<StatusTone, string> = {
  success: 'Correcto',
  warning: 'Atención',
  danger: 'En riesgo',
  info: 'Información',
  neutral: 'Sin estado',
}

const ICON_SIZE: Record<NonNullable<BadgeProps['size']>, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
  pill: 'h-3.5 w-3.5',
}

export interface StatusBadgeProps
  extends Omit<BadgeProps, 'variant' | 'dot' | 'icon' | 'children'> {
  tone: StatusTone
  /** Texto visible del estado. Obligatorio: es lo que leen los lectores de pantalla. */
  label: ReactNode
  /** Ícono propio (componente de lucide-react). Si no se pasa, se usa el del tono. */
  icon?: LucideIcon
}

function isEmptyLabel(label: ReactNode): boolean {
  return (
    label === null ||
    label === undefined ||
    typeof label === 'boolean' ||
    (typeof label === 'string' && label.trim() === '')
  )
}

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ tone, label, icon, size, className, ...props }, ref) => {
    const Icon = icon ?? STATUS_TONE_ICONS[tone]
    const text = isEmptyLabel(label) ? DEFAULT_TONE_LABEL[tone] : label

    return (
      <Badge
        ref={ref}
        variant={tone}
        size={size}
        data-tone={tone}
        className={className}
        icon={<Icon className={cn('shrink-0', ICON_SIZE[size ?? 'md'])} aria-hidden="true" />}
        {...props}
      >
        {text}
      </Badge>
    )
  }
)
StatusBadge.displayName = 'StatusBadge'

// ─── Semáforo del score de cumplimiento ─────────────────────────────────

/**
 * Tono del semáforo para un score 0–100: ≥ 80 bien, 60–79 a mejorar,
 * < 60 en riesgo. Un valor no numérico (NaN, Infinity) devuelve `neutral`.
 */
export function scoreTone(score: number): StatusTone {
  if (!Number.isFinite(score)) return 'neutral'
  if (score >= 80) return 'success'
  if (score >= 60) return 'warning'
  return 'danger'
}

export type ScoreLabel = 'Bien' | 'A mejorar' | 'En riesgo' | 'Sin datos'

/** Etiqueta del semáforo: "Bien" (≥ 80), "A mejorar" (60–79), "En riesgo" (< 60). */
export function scoreLabel(score: number): ScoreLabel {
  switch (scoreTone(score)) {
    case 'success':
      return 'Bien'
    case 'warning':
      return 'A mejorar'
    case 'danger':
      return 'En riesgo'
    default:
      return 'Sin datos'
  }
}
