'use client'

/**
 * AnimatedShield — "Protector de multas" signature component.
 *
 * Escudo SVG animado (teal/cyan/blue gradient) con:
 *  - Float vertical sutil
 *  - Glow pulsante de fondo
 *  - Sweep de luz barriendo
 *  - Check blanco dibujándose (stroke-dasharray)
 *  - 4 sparks blancos saltando en diagonal
 *  - Órbita opcional (círculo dashed rotando)
 *
 * Proviene del prototipo de diseño /tmp/comply360-design (Variant A/D).
 * Los estilos viven en src/styles/comply360-design.css con prefijo `c360-`.
 */
export function AnimatedShield({
  size = 96,
  orbit = false,
  className,
}: {
  size?: number
  orbit?: boolean
  className?: string
}) {
  return (
    <div
      className={`c360-shield ${className ?? ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {orbit ? <span className="c360-shield-orbit" /> : null}
      <span className="c360-shield-glow" />
      <svg width={size} height={size} viewBox="0 0 64 64">
        <defs>
          <linearGradient id="c360ShieldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="48%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="c360ShieldSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <clipPath id="c360ShieldClip">
            <path d="M32 4 L54 12 V30 C54 44 44 54 32 60 C20 54 10 44 10 30 V12 Z" />
          </clipPath>
        </defs>
        <path
          className="c360-shield-body"
          d="M32 4 L54 12 V30 C54 44 44 54 32 60 C20 54 10 44 10 30 V12 Z"
        />
        <g clipPath="url(#c360ShieldClip)">
          <path
            fill="url(#c360ShieldSheen)"
            opacity="0.45"
            d="M32 4 L54 12 V22 C42 26 22 26 10 22 V12 Z"
          />
          <rect
            className="c360-shield-sweep"
            x="-20"
            y="0"
            width="30"
            height="64"
            style={{
              animation: 'c360-shieldSweep 3.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
              transformOrigin: 'center',
            }}
          />
        </g>
        <path
          className="c360-shield-inner"
          d="M32 10 L48 16 V30 C48 41 40 49 32 53 C24 49 16 41 16 30 V16 Z"
        />
        <path className="c360-shield-check" d="M23 32 L29 38 L42 24" />
        <g className="c360-shield-sparks">
          <circle cx="18" cy="18" r="1.4" style={{ ['--sx' as string]: '-4px', ['--sy' as string]: '-4px' }} />
          <circle cx="48" cy="20" r="1.2" style={{ ['--sx' as string]: '4px', ['--sy' as string]: '-4px' }} />
          <circle cx="50" cy="42" r="1.3" style={{ ['--sx' as string]: '4px', ['--sy' as string]: '4px' }} />
          <circle cx="16" cy="40" r="1.2" style={{ ['--sx' as string]: '-4px', ['--sy' as string]: '4px' }} />
        </g>
      </svg>
    </div>
  )
}

/**
 * RingPremium — score ring con gradiente emerald + glow.
 * Para uso en el hero panel del dashboard (tamaño default 220px).
 */
export function RingPremium({
  value,
  size = 200,
  stroke = 14,
}: {
  value: number
  size?: number
  stroke?: number
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (c * value) / 100
  return (
    <div className="c360-ring-premium" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="c360RingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="60%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
        </defs>
        <circle
          className="track"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          className="arc"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            ['--ring-total' as string]: c,
            ['--ring-offset' as string]: offset,
          }}
        />
      </svg>
    </div>
  )
}

/**
 * Sparkline — mini-gráfico de línea con fill sutil y dot final.
 * Usado en KPIs premium.
 */
export function Sparkline({
  data,
  width = 80,
  height = 24,
  color = 'var(--emerald-500)',
  fill = true,
  showTip = true,
}: {
  data: number[]
  width?: number
  height?: number
  color?: string
  fill?: boolean
  showTip?: boolean
}) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => [
    (i * width) / (data.length - 1),
    height - 2 - ((v - min) / range) * (height - 4),
  ] as const)
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = d + ` L ${width} ${height} L 0 ${height} Z`
  const last = pts[pts.length - 1]
  return (
    <svg className="c360-sparkline" width={width} height={height} style={{ color }}>
      {fill ? <path className="fill" d={area} fill="currentColor" /> : null}
      <path className="line" d={d} />
      {showTip ? <circle className="tip" cx={last[0]} cy={last[1]} r="2" /> : null}
    </svg>
  )
}

/**
 * useCountUp — anima un número desde 0 al target (cubic ease-out).
 */
import { useEffect, useState } from 'react'
export function useCountUp(target: number, duration = 1200, deps: unknown[] = []): number {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setV(target * eased)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, ...deps])
  return v
}
