import Link from 'next/link'
import { cn } from '@/lib/utils'
import { PUBLIC_COLORS } from './public-theme'

const SHIELD_PATH =
  'M32 10.5 48.5 16.5v12.2c0 11-6.9 19.2-16.5 24.6-9.6-5.4-16.5-13.6-16.5-24.6V16.5Z'

/**
 * Isotipo de Comply360 (mismo escudo con check de la landing) con la paleta
 * pública: baldosa azul #2563EB, escudo blanco y check azul marino.
 * Colores sólidos: sin IDs de gradiente que se dupliquen entre header y footer.
 */
export function PublicBrandMark({ size = 30, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-grid shrink-0 place-items-center', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 64 64" width={size} height={size} focusable="false">
        <rect x="5" y="5" width="54" height="54" rx="15" fill={PUBLIC_COLORS.blue} />
        <path d={SHIELD_PATH} fill="#ffffff" />
        <path
          d="M23.5 32.2 29.6 38.1 41.2 25.3"
          fill="none"
          stroke={PUBLIC_COLORS.navy}
          strokeWidth="4.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/**
 * Logo + wordmark enlazado al inicio.
 * - `onNavy` (header/footer): «Comply» blanco y «360» ámbar #F5B301.
 * - `onLight`: «Comply» azul marino y «360» en ámbar oscuro #B45309 (el ámbar
 *   claro no se lee sobre blanco).
 */
export function PublicBrandLink({
  tone = 'onNavy',
  className,
}: {
  tone?: 'onNavy' | 'onLight'
  className?: string
}) {
  return (
    <Link
      href="/"
      aria-label="Comply360, ir al inicio"
      className={cn(
        'inline-flex items-center gap-2.5 rounded-md text-lg font-extrabold tracking-[-0.02em] no-underline',
        tone === 'onNavy' ? 'text-[#ffffff]' : 'text-[#0B1B36]',
        className,
      )}
    >
      <PublicBrandMark />
      <span>
        Comply<span className={tone === 'onNavy' ? 'text-[#F5B301]' : 'text-[#B45309]'}>360</span>
      </span>
    </Link>
  )
}
