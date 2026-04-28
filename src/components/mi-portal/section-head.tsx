/**
 * SectionHead — header de sección con typography editorial.
 *
 * Mock-up del diseño Claude Design (handoff 2026-04-28):
 * - Title en Instrument Serif 22px
 * - Soporta una palabra en `<em>` italic emerald via prop emPart
 * - Link "Ver todo" opcional con chevron right
 *
 * Ej: <SectionHead title="Necesitan tu" emPart="atención" link={{...}} />
 */

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface SectionHeadProps {
  title: string
  emPart?: string
  /** Link opcional a la derecha. Si se omite, no se renderiza nada. */
  link?: {
    label: string
    href?: string
    onClick?: () => void
  } | null
}

export function SectionHead({ title, emPart, link }: SectionHeadProps) {
  return (
    <div
      className="flex items-baseline justify-between"
      style={{ padding: '0 4px 12px' }}
    >
      <h2
        style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 22,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          color: 'var(--text-primary)',
        }}
      >
        {title}
        {emPart && (
          <>
            {' '}
            <em style={{ color: '#047857', fontStyle: 'italic' }}>
              {emPart}
            </em>
          </>
        )}
      </h2>
      {link && (
        link.href ? (
          <Link
            href={link.href}
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#047857',
            }}
          >
            {link.label} <ChevronRight className="w-3 h-3" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={link.onClick}
            className="inline-flex items-center gap-1"
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: '#047857',
            }}
          >
            {link.label} <ChevronRight className="w-3 h-3" />
          </button>
        )
      )}
    </div>
  )
}
