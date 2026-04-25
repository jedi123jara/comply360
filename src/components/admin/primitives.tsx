/**
 * Admin primitives — Sparkline, Ring, Monogram, formatters.
 * Light theme, emerald accents.
 * Usado en el Command Center (/admin/*).
 */

import React from 'react'

// ──────────────────────────────────────────────────────────────────────
// Formatters
// ──────────────────────────────────────────────────────────────────────

export function fmtPEN(
  n: number,
  opts: { decimals?: number; compact?: boolean } = {},
): string {
  const { decimals = 0, compact = false } = opts
  if (compact && n >= 1_000_000) return `S/ ${(n / 1_000_000).toFixed(1)}M`
  if (compact && n >= 1_000) return `S/ ${(n / 1_000).toFixed(1)}k`
  return `S/ ${n.toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

export function fmtN(n: number, decimals = 0): string {
  return n.toLocaleString('es-PE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function fmtPct(n: number | null | undefined, decimals = 0): string {
  if (n === null || n === undefined) return '—'
  return `${n.toFixed(decimals)}%`
}

// Seed a hue pair from any string for the Monogram (deterministic colors).
const PALETTE: Array<[string, string]> = [
  ['#fb923c', '#ea580c'],
  ['#60a5fa', '#1d4ed8'],
  ['#c084fc', '#7e22ce'],
  ['#34d399', '#047857'],
  ['#f472b6', '#be185d'],
  ['#fbbf24', '#b45309'],
  ['#22d3ee', '#0e7490'],
  ['#f87171', '#b91c1c'],
  ['#a3e635', '#4d7c0f'],
]

export function seedHue(str: string): [string, string] {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0
  }
  return PALETTE[Math.abs(h) % PALETTE.length]
}

// ──────────────────────────────────────────────────────────────────────
// Monogram — avatar de iniciales con gradiente sembrado
// ──────────────────────────────────────────────────────────────────────

export function Monogram({ name, size = 28 }: { name: string; size?: number }) {
  const parts = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  const [a, b] = seedHue(name)
  return (
    <div
      className="a-avatar"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${a}, ${b})`,
        fontSize: size * 0.38,
      }}
      aria-hidden="true"
    >
      {parts}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Sparkline — línea + área mínima para KPIs
// ──────────────────────────────────────────────────────────────────────

export function Sparkline({
  data,
  width = 80,
  height = 28,
  color = '#10b981',
  fill = true,
  dots = false,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  fill?: boolean
  dots?: boolean
}) {
  if (!data || data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = Math.max(1e-9, max - min)
  const step = width / (data.length - 1)
  const pts: Array<[number, number]> = data.map((v, i) => [
    i * step,
    height - ((v - min) / range) * height,
  ])
  const path = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')
  const area = `${path} L${width},${height} L0,${height} Z`
  const gradId = `sp-${color.replace('#', '')}`

  return (
    <svg width={width} height={height} className="a-graph" aria-hidden="true">
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
        </>
      )}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dots &&
        pts.map(
          ([x, y], i) =>
            i === pts.length - 1 && (
              <circle key={i} cx={x} cy={y} r="2.4" fill={color} />
            ),
        )}
    </svg>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Ring — anillo de progreso con gradiente esmeralda
// ──────────────────────────────────────────────────────────────────────

export function Ring({
  value = 72,
  max = 100,
  size = 180,
  stroke = 14,
  label,
  sublabel,
}: {
  value?: number
  max?: number
  size?: number
  stroke?: number
  label?: React.ReactNode
  sublabel?: React.ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value / max))
  const dash = c * pct
  const gradId = `ring-grad-${size}-${stroke}`

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(15,23,42,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: 'stroke-dasharray 1.2s var(--ease-out)' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: size * 0.26,
            fontWeight: 400,
            lineHeight: 1,
            color: 'var(--text-primary)',
            fontStyle: 'italic',
          }}
        >
          {label}
        </div>
        {sublabel && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-tertiary)',
              marginTop: 6,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600,
            }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Health bar (horizontal)
// ──────────────────────────────────────────────────────────────────────

export function HealthBar({ value }: { value: number }) {
  const color = value >= 85 ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444'
  return (
    <div className="hbar">
      <div className="hbar-fill" style={{ width: `${value}%`, background: color }} />
    </div>
  )
}
