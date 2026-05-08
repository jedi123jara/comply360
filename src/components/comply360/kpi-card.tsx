'use client'

import type { LucideIcon } from 'lucide-react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Sparkline, useCountUp } from './animated-shield'

/**
 * KpiCard — tarjeta KPI premium del sistema "Emerald Light".
 *
 * Variants:
 *  - default (emerald): buena métrica, trend alcista
 *  - crimson: alerta crítica
 *  - amber: atención moderada
 *  - accent: destaque sutil (gradient emerald tenue + borde)
 *
 * Features:
 *  - accent bar superior animada en hover (via CSS)
 *  - valor en Instrument Serif 34px con countUp animado
 *  - dot pulsante en el label tomando color de variant
 *  - sparkline opcional (12 puntos típicos de trend mensual)
 *  - delta badge (+/- % con flecha direccional)
 *
 * Uso:
 * ```tsx
 * <KpiCard
 *   icon={ShieldCheck}
 *   label="Score Compliance"
 *   value={86}
 *   unit="/100"
 *   delta={{ value: 5, period: 'vs mes pasado' }}
 *   sparkline={[78, 80, 79, 82, 84, 83, 85, 86]}
 * />
 * ```
 */
export interface KpiCardProps {
  /** Icono Lucide opcional (puede ir al lado del label). */
  icon?: LucideIcon
  /** Label del KPI (eyebrow uppercase, 11.5px). */
  label: string
  /** Valor numérico principal. */
  value: number
  /** Sufijo opcional (ej: "/100", "%", "S/"). */
  unit?: string
  /** Variant semántica (default = emerald). */
  variant?: 'default' | 'crimson' | 'amber' | 'accent'
  /** Delta vs período previo (+/- %). */
  delta?: {
    value: number
    period?: string
  }
  /** Serie temporal para sparkline (al menos 2 puntos). */
  sparkline?: number[]
  /** Texto footer (reemplaza delta si no hay delta). */
  footer?: string
  /** Duración del countUp en ms (default 1200). */
  countUpMs?: number
  /** Prefijo del valor (ej: "S/ "). */
  prefix?: string
  /** Formateador custom del valor (toma el número animado). */
  formatValue?: (n: number) => string
}

export function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  variant = 'default',
  delta,
  sparkline,
  footer,
  countUpMs = 1200,
  prefix,
  formatValue,
}: KpiCardProps) {
  const animated = useCountUp(value, countUpMs)
  const rounded = Math.round(animated)
  const displayValue = formatValue ? formatValue(animated) : rounded.toLocaleString('es-PE')

  const variantClass = variant === 'default' ? '' : ` ${variant}`

  // Sparkline color coincide con variant
  const sparkColor =
    variant === 'crimson'
      ? 'var(--crimson-500, #ef4444)'
      : variant === 'amber'
        ? 'var(--amber-500, #f59e0b)'
        : 'var(--emerald-500, #2563eb)'

  return (
    <div className={`c360-kpi c360-hover-lift${variantClass}`}>
      <div className="c360-kpi-head">
        <span className="dot" aria-hidden="true" />
        {Icon ? <Icon size={12} strokeWidth={2.2} aria-hidden="true" /> : null}
        <span>{label}</span>
      </div>

      <div className="c360-kpi-value">
        {prefix ? <span style={{ fontSize: '0.58em', marginRight: 2, opacity: 0.7 }}>{prefix}</span> : null}
        {displayValue}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>

      <div className="c360-kpi-foot">
        {delta ? <DeltaBadge value={delta.value} /> : null}
        {delta ? (
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11.5 }}>
            {delta.period ?? 'vs período previo'}
          </span>
        ) : footer ? (
          <span>{footer}</span>
        ) : null}
        {sparkline && sparkline.length >= 2 ? (
          <div style={{ marginLeft: 'auto' }}>
            <Sparkline data={sparkline} width={72} height={22} color={sparkColor} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DeltaBadge({ value }: { value: number }) {
  const isUp = value > 0
  const isFlat = value === 0
  const color = isFlat
    ? 'var(--text-tertiary)'
    : isUp
      ? 'var(--emerald-700, #1e40af)'
      : 'var(--crimson-600, #dc2626)'
  const bg = isFlat
    ? 'rgba(15,23,42,0.04)'
    : isUp
      ? 'rgba(16,185,129,0.1)'
      : 'rgba(239,68,68,0.1)'
  const Icon = isFlat ? Minus : isUp ? ArrowUp : ArrowDown
  const sign = isFlat ? '' : isUp ? '+' : ''
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 6px',
        borderRadius: 6,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1,
      }}
    >
      <Icon size={10} strokeWidth={2.8} />
      {sign}
      {value}%
    </span>
  )
}

/**
 * KpiGrid — grid responsive de 1/2/4 columnas para filas de KPIs.
 * Mantiene gap y comportamiento breakpoints consistentes.
 */
export function KpiGrid({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}
    >
      {children}
    </section>
  )
}
