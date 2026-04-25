'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Sparkles, ArrowRight } from 'lucide-react'

/**
 * PremiumEmptyState — el estado vacío editorial de todo el dashboard.
 *
 * Reemplaza los "no data" genéricos (texto gris + SVG minimalista) con una
 * experiencia orientada a **primera acción**. Tres variants:
 *
 *  - `celebrate`   — "¡Todo bajo control!" (emerald hero)
 *  - `invite`      — "Empieza acá" (ambar warm, onboarding first action)
 *  - `discover`    — "Desbloqueá esta función" (emerald con gradient)
 *
 * Todas las variantes incluyen:
 *  - Icon 48px en círculo redondo (emerald, amber o gradient)
 *  - Título serif 28px con `<em>emerald</em>` opcional
 *  - Subtítulo Geist 14px (hasta 2 líneas)
 *  - Hasta 3 hints en grid (bullets + icons pequeños)
 *  - CTA primario + secundario opcional
 *  - Footer educativo opcional con link a ayuda
 *
 * Usa copy orientado a VALOR, no a función técnica ("Agregá tu primer
 * trabajador y desbloqueá cálculos automáticos de CTS" > "No hay
 * registros.")
 */

export interface EmptyStateHint {
  icon: LucideIcon
  text: string
}

export interface PremiumEmptyStateProps {
  /** Icono principal del círculo hero. */
  icon: LucideIcon
  /** Variant visual. */
  variant?: 'celebrate' | 'invite' | 'discover'
  /** Eyebrow opcional (uppercase 11px) arriba del título. */
  eyebrow?: string
  /** Título — acepta HTML con `<em>` para resaltado emerald. */
  title: string
  /** Subtítulo explicativo. */
  subtitle: string
  /** Hasta 3 hints (bullets). */
  hints?: EmptyStateHint[]
  /** CTA primario obligatorio. */
  cta: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** CTA secundario opcional (ghost style). */
  secondaryCta?: {
    label: string
    href?: string
    onClick?: () => void
  }
  /** Texto footer educativo opcional (ej: "¿Dudas? Mira la guía"). */
  helpLink?: {
    label: string
    href: string
  }
  /** Padding reducido para contextos embebidos. */
  compact?: boolean
}

export function PremiumEmptyState({
  icon: Icon,
  variant = 'invite',
  eyebrow,
  title,
  subtitle,
  hints = [],
  cta,
  secondaryCta,
  helpLink,
  compact = false,
}: PremiumEmptyStateProps) {
  const palette = PALETTE[variant]
  const padding = compact ? 'px-6 py-10' : 'px-8 py-14'

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${padding} text-center`}
      style={{
        background: palette.bg,
        border: `0.5px solid ${palette.border}`,
      }}
    >
      {/* Halo sutil detrás */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: palette.halo,
          opacity: 0.6,
        }}
      />
      {/* Grid overlay sutil */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          maskImage: 'radial-gradient(60% 60% at 50% 40%, #000 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(60% 60% at 50% 40%, #000 0%, transparent 75%)',
        }}
      />

      <div className="relative max-w-xl mx-auto">
        {/* Icon hero */}
        <div className="flex justify-center mb-5">
          <div
            className="relative flex items-center justify-center rounded-2xl"
            style={{
              width: 56,
              height: 56,
              background: palette.iconBg,
              boxShadow: palette.iconShadow,
            }}
          >
            <Icon className="h-6 w-6" style={{ color: palette.iconColor }} />
            {variant === 'discover' ? (
              <span
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full"
                style={{
                  width: 18,
                  height: 18,
                  background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                  color: '#fff',
                  boxShadow: '0 2px 6px rgba(245,158,11,0.35)',
                }}
              >
                <Sparkles style={{ width: 10, height: 10 }} />
              </span>
            ) : null}
          </div>
        </div>

        {/* Eyebrow */}
        {eyebrow ? (
          <div
            className="inline-flex items-center gap-2 mb-3"
            style={{ color: palette.eyebrowColor }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: palette.eyebrowColor,
                boxShadow: `0 0 0 3px ${palette.eyebrowDot}`,
              }}
            />
            <span className="text-xs font-bold uppercase tracking-widest">
              {eyebrow}
            </span>
          </div>
        ) : null}

        {/* Title */}
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 28,
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            lineHeight: 1.15,
            marginBottom: 10,
          }}
          dangerouslySetInnerHTML={{ __html: title }}
        />

        {/* Subtitle */}
        <p
          className="text-sm leading-relaxed mx-auto"
          style={{ color: 'var(--text-secondary)', maxWidth: 460, marginBottom: hints.length ? 24 : 20 }}
        >
          {subtitle}
        </p>

        {/* Hints */}
        {hints.length > 0 ? (
          <ul
            className="grid gap-2 mb-6 text-left mx-auto"
            style={{
              maxWidth: 440,
              gridTemplateColumns: hints.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
            }}
          >
            {hints.map((hint, i) => {
              const HintIcon = hint.icon
              return (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs"
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,0.7)',
                    border: '0.5px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <HintIcon
                    className="h-3.5 w-3.5 flex-shrink-0"
                    style={{ color: palette.iconColor }}
                  />
                  <span>{hint.text}</span>
                </li>
              )
            })}
          </ul>
        ) : null}

        {/* CTAs */}
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <CtaButton primary palette={palette} {...cta} />
          {secondaryCta ? <CtaButton primary={false} {...secondaryCta} /> : null}
        </div>

        {/* Help link */}
        {helpLink ? (
          <p className="mt-5 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            ¿Dudas?{' '}
            <Link
              href={helpLink.href}
              className="font-semibold hover:underline"
              style={{ color: palette.iconColor }}
            >
              {helpLink.label} →
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  )
}

/* ── CtaButton ─────────────────────────────────────────────────────────── */

interface CtaButtonProps {
  label: string
  href?: string
  onClick?: () => void
  primary: boolean
  palette?: (typeof PALETTE)[keyof typeof PALETTE]
}

function CtaButton({ label, href, onClick, primary, palette }: CtaButtonProps) {
  const style: React.CSSProperties = primary
    ? {
        background: palette?.ctaBg ?? 'var(--emerald-600)',
        color: '#fff',
        padding: '10px 18px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        boxShadow:
          '0 10px 24px -6px rgba(4,120,87,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
        transition: 'all 200ms',
      }
    : {
        background: 'white',
        color: 'var(--text-primary)',
        padding: '10px 16px',
        borderRadius: 10,
        fontSize: 13,
        fontWeight: 600,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        border: '0.5px solid var(--border-default)',
        transition: 'all 200ms',
      }

  const content = (
    <>
      {label}
      {primary ? <ArrowRight style={{ width: 14, height: 14 }} /> : null}
    </>
  )

  if (href) {
    return (
      <Link href={href} style={style}>
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} style={style}>
      {content}
    </button>
  )
}

/* ── Variant palettes ──────────────────────────────────────────────────── */

const PALETTE = {
  celebrate: {
    bg: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%, #fefce8 100%)',
    border: 'rgba(16,185,129,0.18)',
    halo: 'radial-gradient(circle at 50% 20%, rgba(16,185,129,0.18), transparent 60%)',
    iconBg: 'linear-gradient(165deg, #10b981 0%, #047857 100%)',
    iconColor: '#ffffff',
    iconShadow: '0 8px 24px -6px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
    eyebrowColor: '#047857',
    eyebrowDot: 'rgba(16,185,129,0.2)',
    ctaBg: 'var(--emerald-600)',
  },
  invite: {
    bg: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
    border: 'var(--border-default)',
    halo: 'radial-gradient(circle at 50% 20%, rgba(16,185,129,0.08), transparent 60%)',
    iconBg: '#ecfdf5',
    iconColor: '#047857',
    iconShadow: 'inset 0 0 0 0.5px rgba(16,185,129,0.25)',
    eyebrowColor: '#047857',
    eyebrowDot: 'rgba(16,185,129,0.2)',
    ctaBg: 'var(--emerald-600)',
  },
  discover: {
    bg: 'linear-gradient(135deg, #065f46 0%, #047857 55%, #10b981 100%)',
    border: 'rgba(16,185,129,0.35)',
    halo: 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08), transparent 60%)',
    iconBg: 'rgba(255,255,255,0.12)',
    iconColor: '#ffffff',
    iconShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.25)',
    eyebrowColor: '#d1fae5',
    eyebrowDot: 'rgba(209,250,229,0.25)',
    ctaBg: '#f59e0b',
  },
} as const
