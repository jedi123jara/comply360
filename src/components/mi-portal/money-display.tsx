/**
 * MoneyDisplay — muestra montos en soles con tipografía consistente.
 *
 * Uso:
 *  <MoneyDisplay value={2350.55} />
 *  <MoneyDisplay value={2350.55} size="lg" emphasis />
 *  <MoneyDisplay value={-500} tone="bad" />   // rojo para descuentos
 */

import { formatSoles } from '@/lib/format/peruvian'
import { cn } from '@/lib/utils'

interface MoneyDisplayProps {
  value: number | string | null | undefined
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Si true, usa negrita y color más fuerte. */
  emphasis?: boolean
  /** Tono del monto (good=verde, bad=rojo, neutral=slate). */
  tone?: 'neutral' | 'good' | 'bad' | 'warning'
  className?: string
}

const SIZE_CLASSES: Record<NonNullable<MoneyDisplayProps['size']>, string> = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-xl',
  xl: 'text-3xl',
}

const TONE_CLASSES: Record<NonNullable<MoneyDisplayProps['tone']>, string> = {
  neutral: 'text-slate-900',
  good: 'text-emerald-700',
  bad: 'text-red-700',
  warning: 'text-amber-700',
}

export function MoneyDisplay({
  value,
  size = 'md',
  emphasis = false,
  tone = 'neutral',
  className,
}: MoneyDisplayProps) {
  return (
    <span
      className={cn(
        'tabular-nums',
        SIZE_CLASSES[size],
        TONE_CLASSES[tone],
        emphasis && 'font-bold',
        className,
      )}
    >
      {formatSoles(value)}
    </span>
  )
}
