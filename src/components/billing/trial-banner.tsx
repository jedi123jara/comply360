'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, AlertOctagon, Clock, X } from 'lucide-react'
import { track } from '@/lib/analytics'

/**
 * TrialBanner — banner sticky en topbar con contexto de facturación.
 *
 * Estados:
 *  - Trial activo con >3 días → banner emerald "Te quedan X días de tu trial"
 *  - Trial activo con ≤3 días → banner amber (urgencia)
 *  - Trial expirado hoy (0 días) → banner crimson "Trial expiró hoy"
 *  - Past due (pago rechazado) → banner crimson "Actualizá tu método de pago"
 *  - Suscripción activa → oculto
 *  - STARTER/FREE → oculto (usa UpgradeModal cuando choca feature gate)
 *
 * Persiste dismissal en sessionStorage (no localStorage — reaparece en otra sesión).
 */

interface BillingStatus {
  plan: 'FREE' | 'STARTER' | 'EMPRESA' | 'PRO'
  planExpiresAt: string | null
  trialDaysRemaining: number | null
  isTrialActive: boolean
  isPastDue: boolean
  hasSubscription: boolean
}

type BannerVariant = 'trial-ok' | 'trial-urgent' | 'trial-expired' | 'past-due' | null

const DISMISS_KEY = 'comply360.trialBanner.dismissed'

export function TrialBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check session dismiss
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === '1') {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Hidratación desde sessionStorage; migrar a useSyncExternalStore en refactor futuro.
        setDismissed(true)
        return
      }
    } catch {
      /* ignore */
    }

    fetch('/api/billing/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BillingStatus | null) => {
         
        setStatus(data)
        if (data) {
          const v = resolveVariant(data)
          if (v) {
            track('trial_banner_shown', {
              variant: v,
              days_remaining: data.trialDaysRemaining ?? 0,
              plan: data.plan,
            })
          }
        }
      })
      .catch(() => {
        /* silent fail */
      })
  }, [])

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  if (!status || dismissed) return null

  const variant = resolveVariant(status)
  if (!variant) return null

  const palette = PALETTE[variant]
  const message = buildMessage(variant, status)
  const cta = buildCta(variant)

  return (
    <div
      className="relative px-4 py-2 text-sm flex items-center justify-center gap-3"
      style={{
        background: palette.bg,
        color: palette.text,
        borderBottom: `0.5px solid ${palette.border}`,
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center flex-shrink-0"
        style={{ color: palette.iconColor }}
      >
        {palette.icon}
      </span>
      <span className="flex-1 text-center leading-tight">
        {message}{' '}
        <Link
          href={cta.href}
          onClick={() =>
            track('trial_banner_cta_clicked', {
              variant,
              days_remaining: status.trialDaysRemaining ?? 0,
              plan: status.plan,
            })
          }
          className="underline underline-offset-2 font-semibold hover:opacity-80"
          style={{ color: palette.text }}
        >
          {cta.label}
        </Link>
      </span>
      {variant === 'trial-ok' ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Cerrar banner"
          className="flex-shrink-0 rounded p-1 opacity-70 hover:opacity-100"
          style={{ color: palette.text }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────────────────── */

function resolveVariant(s: BillingStatus): BannerVariant {
  if (s.isPastDue) return 'past-due'
  if (s.hasSubscription) return null // Paying user — no banner
  if (!s.isTrialActive) {
    // Plan STARTER/FREE → no banner (usa UpgradeModal en feature-gated clicks)
    return null
  }
  if (s.trialDaysRemaining === null) return null
  if (s.trialDaysRemaining === 0) return 'trial-expired'
  if (s.trialDaysRemaining <= 3) return 'trial-urgent'
  return 'trial-ok'
}

function buildMessage(variant: Exclude<BannerVariant, null>, s: BillingStatus): React.ReactNode {
  const days = s.trialDaysRemaining ?? 0
  const planName = s.plan.toLowerCase()

  switch (variant) {
    case 'trial-ok':
      return (
        <>
          <b>Te quedan {days} días de tu trial {planName.toUpperCase()}</b>{' '}
          · Activa tu plan ahora y evita interrupciones en tus alertas SUNAFIL.
        </>
      )
    case 'trial-urgent':
      return (
        <>
          <b>Tu trial expira en {days} {days === 1 ? 'día' : 'días'}</b> · Activa tu plan para
          no perder acceso al diagnóstico, simulacro e IA laboral.
        </>
      )
    case 'trial-expired':
      return (
        <>
          <b>Tu trial {planName.toUpperCase()} expiró hoy</b> · Reactiva tu plan para recuperar
          acceso a todas las funciones premium.
        </>
      )
    case 'past-due':
      return (
        <>
          <b>Problema con tu método de pago</b> · Actualiza tu tarjeta antes de que perdamos
          el cargo recurrente y tu plan se degrade.
        </>
      )
  }
}

function buildCta(variant: Exclude<BannerVariant, null>): { label: string; href: string } {
  if (variant === 'past-due') {
    return { label: 'Actualizar método de pago →', href: '/dashboard/planes' }
  }
  return { label: 'Activar plan →', href: '/dashboard/planes' }
}

const PALETTE: Record<
  Exclude<BannerVariant, null>,
  {
    bg: string
    text: string
    border: string
    iconColor: string
    icon: React.ReactNode
  }
> = {
  'trial-ok': {
    bg: 'linear-gradient(90deg, #ecfdf5 0%, #d1fae5 50%, #ecfdf5 100%)',
    text: '#065f46',
    border: 'rgba(16,185,129,0.3)',
    iconColor: '#047857',
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
  'trial-urgent': {
    bg: 'linear-gradient(90deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)',
    text: '#92400e',
    border: 'rgba(245,158,11,0.35)',
    iconColor: '#d97706',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  'trial-expired': {
    bg: 'linear-gradient(90deg, #fef2f2 0%, #fee2e2 50%, #fef2f2 100%)',
    text: '#991b1b',
    border: 'rgba(239,68,68,0.35)',
    iconColor: '#dc2626',
    icon: <AlertOctagon className="h-3.5 w-3.5" />,
  },
  'past-due': {
    bg: 'linear-gradient(90deg, #fef2f2 0%, #fee2e2 50%, #fef2f2 100%)',
    text: '#991b1b',
    border: 'rgba(239,68,68,0.35)',
    iconColor: '#dc2626',
    icon: <AlertOctagon className="h-3.5 w-3.5" />,
  },
}
