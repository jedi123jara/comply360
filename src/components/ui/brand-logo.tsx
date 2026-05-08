import { cn } from '@/lib/utils'

/**
 * BrandLogo — escudo Comply360 con check ✓ animado.
 *
 * Sistema visual: Vault Pro.
 * - Gradiente emerald (top brillo → bottom profundo)
 * - Check ✓ se "dibuja" trazo a trazo (~850ms al cargar)
 * - El escudo entra con un rebote sutil (~750ms shield-rise)
 * - Hover (cuando el componente está dentro de <a>/<button>): glow + check redibuja
 *
 * Uso:
 *   <BrandLogo size={36} />                  // sidebar
 *   <BrandLogo size={64} animate={false} />  // OG image
 *   <BrandLogo size={28} className="..." />  // mobile
 */
export interface BrandLogoProps {
  size?: number
  className?: string
  animate?: boolean
  /** Mostrar texto "Comply360" al lado. */
  withName?: boolean
}

export function BrandLogo({
  size = 36,
  className,
  animate = true,
  withName = false,
}: BrandLogoProps) {
  // IDs únicos para evitar colisiones cuando el logo aparece varias veces.
  const uid = `brand-${Math.random().toString(36).slice(2, 9)}`
  const gradId = `${uid}-grad`
  const innerGlowId = `${uid}-inner-glow`

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2.5',
        animate && 'brand-mark',
        className,
      )}
    >
      <svg
        width={size}
        height={size * (38 / 36)}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Comply360"
        role="img"
        style={{
          filter:
            'drop-shadow(0 6px 16px var(--accent-glow)) drop-shadow(0 0 24px color-mix(in srgb, var(--accent) 22%, transparent))',
          overflow: 'visible',
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--emerald-500, #00e5a0)" />
            <stop offset="1" stopColor="var(--emerald-700, #008f5d)" />
          </linearGradient>
          <radialGradient id={innerGlowId} cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.4)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        {/* Sombra dura del shield (silueta) */}
        <path
          d="M32 4 L56 12 V30 C56 44 46 54 32 60 C18 54 8 44 8 30 V12 Z"
          fill={`url(#${gradId})`}
          className="shield-fill"
        />
        {/* Brillo interior */}
        <path
          d="M32 4 L56 12 V30 C56 44 46 54 32 60 C18 54 8 44 8 30 V12 Z"
          fill={`url(#${innerGlowId})`}
          className="shield-inner-glow"
        />
        {/* Borde oscuro */}
        <path
          d="M32 4 L56 12 V30 C56 44 46 54 32 60 C18 54 8 44 8 30 V12 Z"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="1.2"
          fill="none"
          className="shield-stroke"
        />
        {/* Bevel claro */}
        <path
          d="M32 6 L54 13 V30 C54 43 45 52 32 58"
          stroke="rgba(255,255,255,0.18)"
          strokeWidth="1"
          fill="none"
          className="shield-bevel"
        />
        {/* Check ✓ — animado */}
        <path
          d="M22 32 L29 39 L43 25"
          fill="none"
          stroke="#04150f"
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shield-check"
          style={{
            filter: 'drop-shadow(0 1px 0 rgba(255,255,255,0.25))',
          }}
        />
      </svg>
      {withName ? (
        <span
          className="brand-name"
          style={{
            fontSize: 17,
            fontWeight: 600,
            letterSpacing: '-0.018em',
            background:
              'linear-gradient(180deg, var(--text) 35%, color-mix(in srgb, var(--accent) 60%, var(--text)) 130%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Comply
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 14,
              letterSpacing: 0,
              marginLeft: 1,
              color: 'var(--accent)',
              WebkitTextFillColor: 'var(--accent)',
            }}
          >
            360
          </span>
        </span>
      ) : null}
    </span>
  )
}
