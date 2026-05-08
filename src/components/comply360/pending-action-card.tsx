'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Clock } from 'lucide-react'

/**
 * PendingActionCard — tarjeta de acción pendiente del Portal Trabajador.
 *
 * Severity = cuánto urge:
 *  - critical: deadline vencido o < 24h (crimson)
 *  - high: deadline < 3 días (amber)
 *  - medium: deadline < 7 días (emerald soft)
 *  - info: sin deadline o > 7 días (neutral)
 *
 * Usado en /mi-portal (home del trabajador) para listar acciones que requieren
 * atención: boletas por firmar, documentos por subir, capacitaciones por completar,
 * políticas por aceptar, etc.
 */

export type ActionSeverity = 'critical' | 'high' | 'medium' | 'info'

export interface PendingActionCardProps {
  icon: LucideIcon
  title: string
  description: string
  deadline?: string | null
  severity?: ActionSeverity
  href: string
  ctaLabel?: string
}

const PALETTES: Record<
  ActionSeverity,
  { bg: string; border: string; iconBg: string; iconColor: string; ctaBg: string; deadlineColor: string }
> = {
  critical: {
    bg: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
    border: 'rgba(239,68,68,0.28)',
    iconBg: 'linear-gradient(165deg, #ef4444 0%, #dc2626 100%)',
    iconColor: '#ffffff',
    ctaBg: 'var(--crimson-600, #dc2626)',
    deadlineColor: 'var(--crimson-700, #b91c1c)',
  },
  high: {
    bg: 'linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)',
    border: 'rgba(245,158,11,0.3)',
    iconBg: 'linear-gradient(165deg, #f59e0b 0%, #d97706 100%)',
    iconColor: '#ffffff',
    ctaBg: 'var(--amber-600, #d97706)',
    deadlineColor: 'var(--amber-700, #b45309)',
  },
  medium: {
    bg: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
    border: 'rgba(16,185,129,0.28)',
    iconBg: 'linear-gradient(165deg, #2563eb 0%, #1e40af 100%)',
    iconColor: '#ffffff',
    ctaBg: 'var(--emerald-600)',
    deadlineColor: 'var(--emerald-700)',
  },
  info: {
    bg: '#ffffff',
    border: 'var(--border-default)',
    iconBg: 'var(--neutral-100)',
    iconColor: 'var(--text-secondary)',
    ctaBg: 'var(--emerald-600)',
    deadlineColor: 'var(--text-tertiary)',
  },
}

/**
 * Deriva severity a partir de una fecha límite (o null = info).
 */
export function deriveSeverity(deadline: string | null | undefined): ActionSeverity {
  if (!deadline) return 'info'
  const now = Date.now()
  const due = new Date(deadline).getTime()
  const diffMs = due - now
  const day = 86400000
  if (diffMs < day) return 'critical'
  if (diffMs < 3 * day) return 'high'
  if (diffMs < 7 * day) return 'medium'
  return 'info'
}

/**
 * Formatea el deadline en texto humano relativo.
 */
function formatDeadline(deadline: string, _severity: ActionSeverity): string {
  const now = Date.now()
  const due = new Date(deadline).getTime()
  const diffMs = due - now
  const day = 86400000
  const hr = 3600000

  if (diffMs < 0) {
    const days = Math.floor(Math.abs(diffMs) / day)
    if (days === 0) return 'Vencido hace unas horas'
    if (days === 1) return 'Vencido hace 1 día'
    return `Vencido hace ${days} días`
  }
  if (diffMs < hr) return 'Vence en menos de 1 hora'
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hr)
    return `Vence en ${hours} ${hours === 1 ? 'hora' : 'horas'}`
  }
  const days = Math.ceil(diffMs / day)
  if (days === 1) return 'Vence mañana'
  if (days <= 7) return `Vence en ${days} días`
  const date = new Date(deadline)
  return `Hasta ${date.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
}

export function PendingActionCard({
  icon: Icon,
  title,
  description,
  deadline,
  severity,
  href,
  ctaLabel = 'Resolver ahora',
}: PendingActionCardProps) {
  const sev = severity ?? deriveSeverity(deadline)
  const palette = PALETTES[sev]

  return (
    <Link
      href={href}
      className="group block rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-lift,0_8px_16px_-4px_rgba(15,23,42,0.08))]"
      style={{
        background: palette.bg,
        border: `0.5px solid ${palette.border}`,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="flex items-center justify-center rounded-xl flex-shrink-0"
          style={{
            width: 44,
            height: 44,
            background: palette.iconBg,
            boxShadow:
              sev === 'info'
                ? 'inset 0 0 0 0.5px var(--border-default)'
                : '0 4px 12px -2px rgba(15,23,42,0.15), inset 0 1px 0 rgba(255,255,255,0.18)',
          }}
        >
          <Icon className="h-5 w-5" style={{ color: palette.iconColor }} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3
            className="text-sm font-bold leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {title}
          </h3>
          <p
            className="mt-0.5 text-xs leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {description}
          </p>

          {/* Deadline pill */}
          {deadline ? (
            <div
              className="inline-flex items-center gap-1 mt-2 text-[11px] font-semibold"
              style={{ color: palette.deadlineColor }}
            >
              <Clock className="h-3 w-3" />
              {formatDeadline(deadline, sev)}
            </div>
          ) : null}
        </div>

        {/* CTA arrow */}
        <span
          aria-hidden="true"
          className="flex items-center justify-center rounded-full flex-shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{
            width: 28,
            height: 28,
            background: palette.ctaBg,
            color: '#fff',
          }}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* Mobile screen reader label for CTA */}
      <span className="sr-only">{ctaLabel}</span>
    </Link>
  )
}
