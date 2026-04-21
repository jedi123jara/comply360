'use client'

import { useEffect, useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { complianceScoreColor } from '@/lib/brand'

/**
 * ProgressRing — the hero component of the Cockpit.
 *
 * SVG-based "Apple Watch" style ring, driven by a single `value` (0-100).
 * Color adapts to compliance score thresholds (crimson < 60 < amber < 80 <
 * emerald < 90 < gold) via `complianceScoreColor`.
 *
 * Animates from 0 on mount so the ring "draws itself".
 *
 * Composition:
 *   <ProgressRing value={87} size={220}>
 *     <div className="text-center">
 *       <div className="text-5xl font-bold">87</div>
 *       <div className="text-xs text-tertiary">score</div>
 *     </div>
 *   </ProgressRing>
 */

interface ProgressRingProps {
  /** 0-100 */
  value: number
  /** Size in px. Default 180. */
  size?: number
  /** Stroke width in px. Default 14. */
  stroke?: number
  /** Override the automatic color from score thresholds. */
  color?: string
  /** Track (background ring) color. */
  trackColor?: string
  /** Animate from 0 on mount. Default true. */
  animate?: boolean
  /** Duration of the sweep animation in ms. */
  duration?: number
  /** Render in the center of the ring. */
  children?: React.ReactNode
  /** Show a subtle glow matching the ring color. Default true. */
  glow?: boolean
  /** Accessible label. */
  label?: string
  className?: string
}

export function ProgressRing({
  value,
  size = 180,
  stroke = 14,
  color,
  trackColor = 'rgba(15, 23, 42, 0.06)',
  animate = true,
  duration = 1200,
  children,
  glow = true,
  label,
  className,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference - (clamped / 100) * circumference
  const accent = color ?? complianceScoreColor(clamped)
  const gradId = useId().replace(/:/g, '')

  // Animate the dashoffset on mount (or when value changes)
  const [offset, setOffset] = useState(animate ? circumference : targetOffset)

  useEffect(() => {
    // Always schedule in a rAF so React flushes the initial render
    // before the stroke transitions — prevents jump-to-target on mount.
    const id = requestAnimationFrame(() => setOffset(targetOffset))
    return () => cancelAnimationFrame(id)
  }, [targetOffset])

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `Score ${clamped} de 100`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={cn('-rotate-90', glow && 'drop-shadow-[0_0_24px_var(--tw-shadow-color)]')}
        style={glow ? ({ ['--tw-shadow-color' as string]: `${accent}55` } as React.CSSProperties) : undefined}
      >
        <defs>
          <linearGradient id={`ring-grad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.95" />
            <stop offset="100%" stopColor={accent} stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />

        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#ring-grad-${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{
            transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.19, 1, 0.22, 1)`,
          }}
        />
      </svg>

      {children ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {children}
        </div>
      ) : null}
    </div>
  )
}
