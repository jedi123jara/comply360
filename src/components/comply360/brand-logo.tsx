import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

type BrandLogoVariant = 'sidebar' | 'auth' | 'admin' | 'compact'

type BrandMarkProps = {
  size?: number
  animated?: boolean
  className?: string
}

type BrandLogoProps = {
  variant?: BrandLogoVariant
  markSize?: number
  meta?: string
  showMeta?: boolean
  animated?: boolean
  className?: string
  textClassName?: string
}

const DEFAULT_MARK_SIZE: Record<BrandLogoVariant, number> = {
  sidebar: 34,
  auth: 72,
  admin: 36,
  compact: 30,
}

export function BrandMark({ size = 34, animated = true, className }: BrandMarkProps) {
  return (
    <span
      className={cn('brand-mark c360-brand-mark', animated && 'is-animated', className)}
      style={{ width: size, height: size } as CSSProperties}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" role="img" focusable="false">
        <defs>
          <linearGradient id="c360LogoTile" x1="8" y1="4" x2="56" y2="60">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="42%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="c360LogoShield" x1="18" y1="11" x2="48" y2="54">
            <stop offset="0%" stopColor="#ecfeff" stopOpacity="0.96" />
            <stop offset="45%" stopColor="#a7f3d0" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.82" />
          </linearGradient>
          <linearGradient id="c360LogoSheen" x1="18" y1="10" x2="48" y2="48">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="c360LogoClip">
            <path d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z" />
          </clipPath>
        </defs>
        <rect className="c360-brand-tile" x="5" y="5" width="54" height="54" rx="15" />
        <path
          className="c360-brand-orbit"
          d="M15.5 45.5c8.5 8.5 23.5 9.2 32.8.8"
        />
        <g clipPath="url(#c360LogoClip)">
          <path
            className="c360-brand-shield"
            d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z"
          />
          <path
            className="c360-brand-facet"
            d="M32 10.5 48.5 16.5v8.2c-8.2 3.4-23.1 3.4-33 0v-8.2Z"
          />
          <rect className="c360-brand-sweep" x="-18" y="0" width="18" height="64" />
        </g>
        <path
          className="c360-brand-outline"
          d="M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z"
        />
        <path className="c360-brand-check" d="M23.5 32.2 29.6 38.1 41.2 25.3" />
        <circle className="c360-brand-node c360-brand-node-a" cx="46.5" cy="17.5" r="1.5" />
        <circle className="c360-brand-node c360-brand-node-b" cx="17.5" cy="43.5" r="1.35" />
      </svg>
    </span>
  )
}

export function BrandLogo({
  variant = 'sidebar',
  markSize,
  meta,
  showMeta = true,
  animated = true,
  className,
  textClassName,
}: BrandLogoProps) {
  const resolvedMeta = meta ?? (variant === 'admin' ? 'Command Center' : 'Compliance · Perú')
  const resolvedMarkSize = markSize ?? DEFAULT_MARK_SIZE[variant]

  return (
    <div
      className={cn('c360-brand-logo', `c360-brand-logo--${variant}`, className)}
      aria-label="Comply360"
    >
      <BrandMark size={resolvedMarkSize} animated={animated} />
      <div className={cn('c360-brand-wordmark', textClassName)}>
        <div className="brand-name c360-brand-name">
          Comply<span className="num-tag c360-brand-num">360</span>
        </div>
        {showMeta ? (
          <div className="brand-meta c360-brand-meta">
            <span className="dot" />
            {resolvedMeta}
          </div>
        ) : null}
      </div>
    </div>
  )
}
