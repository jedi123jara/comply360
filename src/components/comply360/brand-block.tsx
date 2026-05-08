'use client'

import { BrandLogo } from '@/components/ui/brand-logo'

/**
 * BrandBlockA — Vault Pro brand block del sidebar.
 *
 * Escudo emerald con check ✓ animado (rise + draw 850ms) + wordmark con
 * gradient white→emerald + badge "360" mono. Caption mínima con live dot.
 *
 * Visual upgrade Vault Pro (2026-05-08):
 *   El logo viejo era un shield 16px estático. Ahora 32px con animación de
 *   entrada (escudo se eleva + check se dibuja trazo a trazo) y glow emerald.
 *   La caption "COMPLIANCE · PERÚ" se mantiene con su dot pulsante.
 */
export function BrandBlockA() {
  return (
    <div className="c360-sb-brand">
      <BrandLogo size={32} />
      <div className="c360-sb-brand-wordmark">
        <div
          className="brand-name"
          style={{
            fontSize: 16,
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
            className="num-tag"
            style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              fontSize: 13,
              letterSpacing: 0,
              marginLeft: 1,
              color: 'var(--accent)',
              WebkitTextFillColor: 'var(--accent)',
            }}
          >
            360
          </span>
        </div>
        <div className="brand-meta">
          <span className="dot" />
          Compliance · Perú
        </div>
      </div>
    </div>
  )
}
