'use client'

import type { ReactNode } from 'react'

/**
 * EditorialTitle — titular serif editorial del sistema "Emerald Light".
 *
 * Estructura:
 *  - Eyebrow opcional (uppercase 11px emerald, con dot pulsante)
 *  - Título en Instrument Serif 34px con soporte de <em> resaltado emerald
 *  - Subtítulo en Geist 14px secondary
 *  - Hairline inferior sutil
 *
 * El título acepta emphasis mediante el patrón `before <em>hightlight</em> after`.
 * Usa dangerouslySetInnerHTML para que el consumidor pase el HTML del <em>.
 *
 * Uso:
 * ```tsx
 * <EditorialTitle
 *   eyebrow="Equipo"
 *   title="Gestiona tu <em>planilla completa</em>."
 *   subtitle="Registra, importa y actualiza a todos tus trabajadores desde un solo lugar."
 * />
 * ```
 */
export interface EditorialTitleProps {
  /** Eyebrow opcional (categoría o contexto). */
  eyebrow?: string
  /** Título principal. Soporta <em>...</em> para resaltado emerald italic. */
  title: string
  /** Subtítulo / descripción. */
  subtitle?: string
  /** Icono o elemento antes del eyebrow (ej: un Lucide icon). */
  eyebrowIcon?: ReactNode
  /** Ocultar hairline inferior (default false). */
  noHairline?: boolean
}

export function EditorialTitle({
  eyebrow,
  title,
  subtitle,
  eyebrowIcon,
  noHairline = false,
}: EditorialTitleProps) {
  return (
    <header
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        paddingBottom: noHairline ? 0 : 16,
        borderBottom: noHairline ? 'none' : '0.5px solid var(--border-default)',
      }}
    >
      {eyebrow ? (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--emerald-700)',
          }}
        >
          {eyebrowIcon ?? (
            <span
              aria-hidden="true"
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: 'var(--emerald-500)',
                boxShadow: '0 0 0 3px rgba(16,185,129,0.15)',
                animation: 'c360-pulseEmerald 2.4s infinite',
              }}
            />
          )}
          <span>{eyebrow}</span>
        </div>
      ) : null}
      <h1
        className="c360-page-title-editorial"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {subtitle ? (
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--text-secondary)',
            maxWidth: 680,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </header>
  )
}

/**
 * PageHeader — wrapper común: EditorialTitle + slot derecho para acciones.
 * Ideal para la cabecera de cualquier página de /dashboard/*.
 *
 * Uso:
 * ```tsx
 * <PageHeader
 *   eyebrow="Equipo"
 *   title="Gestiona tu <em>planilla completa</em>."
 *   subtitle="..."
 *   actions={<Button>Agregar trabajador</Button>}
 * />
 * ```
 */
export interface PageHeaderProps extends EditorialTitleProps {
  /** Elementos a la derecha del título (botones, filtros, etc). */
  actions?: ReactNode
}

export function PageHeader({ actions, ...titleProps }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        paddingBottom: 16,
        borderBottom: '0.5px solid var(--border-default)',
      }}
    >
      <div style={{ flex: '1 1 420px', minWidth: 0 }}>
        <EditorialTitle {...titleProps} noHairline />
      </div>
      {actions ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexShrink: 0,
            flexWrap: 'wrap',
          }}
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}
