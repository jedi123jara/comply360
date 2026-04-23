/**
 * Analytics tracking for COMPLY360 — Plausible-primary abstraction.
 *
 * Privacy: Plausible es GDPR/CCPA-friendly, no usa cookies, no vende datos.
 * El script se carga desde `src/app/layout.tsx` condicionalmente según
 * `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`. Si no está configurado, los eventos se
 * loguean a consola en desarrollo y se silencian en producción.
 *
 * **Nunca loguees PII**. Emails, DNIs, nombres, números de tarjeta, etc. NO
 * deben ir en `properties`. Usa hashes o IDs opacos si necesitás correlacionar.
 *
 * Uso:
 * ```ts
 * import { analytics } from '@/lib/analytics'
 * analytics.track('plan_upgrade_modal_shown', { feature: 'diagnostico', plan: 'EMPRESA' })
 * ```
 */

/** Nombres canónicos del funnel — usar estos, no strings arbitrarios. */
export type EventName =
  // Navegación + landing
  | 'page_view'
  | 'landing_cta_clicked'
  | 'landing_pricing_clicked'

  // Funnel de conversión marketing
  | 'free_diagnostic_started'
  | 'free_diagnostic_question_answered'
  | 'free_diagnostic_completed'
  | 'lead_captured'
  | 'signup_started'
  | 'signup_completed'
  | 'onboarding_started'
  | 'onboarding_completed'

  // Activación dentro del producto
  | 'worker_added'
  | 'document_uploaded'
  | 'contract_created'
  | 'calculator_used'

  // Módulos PRO
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'simulacro_started'
  | 'simulacro_completed'
  | 'copilot_query_sent'
  | 'ai_review_submitted'

  // Retention + gamification
  | 'course_started'
  | 'course_completed'
  | 'complaint_submitted'
  | 'export_generated'
  | 'streak_milestone'
  | 'push_subscribed'
  | 'pwa_installed'

  // Plan gate + billing funnel
  | 'plan_selected'
  | 'plan_upgrade_modal_shown'
  | 'plan_upgrade_cta_clicked'
  | 'checkout_started'
  | 'checkout_sdk_opened'
  | 'payment_completed'
  | 'payment_failed'
  | 'trial_banner_shown'
  | 'trial_banner_cta_clicked'

  // Legal / compliance (Ley 29733 + 27269)
  | 'consent_shown'
  | 'consent_accepted'
  | 'consent_rejected'
  | 'zero_liability_acknowledged'
  | 'data_export_requested'
  | 'account_deletion_requested'

  // Biblioteca de plantillas (Fase 2.5)
  | 'template_created'
  | 'template_edited'
  | 'template_generated'

  // Portal del trabajador (Fase 1.5)
  | 'worker_portal_first_login'
  | 'worker_contract_viewed'
  | 'worker_contract_signed'
  | 'biometric_ceremony_started'
  | 'biometric_ceremony_succeeded'
  | 'biometric_ceremony_failed'
  | 'worker_doc_uploaded'

  // Cascada de onboarding
  | 'onboarding_cascade_triggered'
  | 'onboarding_cascade_completed'

  // Auto-verify IA (Fase 3.5)
  | 'ai_verify_auto_verified'
  | 'ai_verify_needs_review'
  | 'ai_verify_mismatch'
  | 'ai_verify_unsupported'

export interface EventProperties {
  [key: string]: string | number | boolean | null | undefined
}

interface PlausibleOptions {
  props?: Record<string, unknown>
  callback?: () => void
}
type PlausibleFn = (event: string, opts?: PlausibleOptions) => void

function getPlausible(): PlausibleFn | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { plausible?: PlausibleFn }
  return typeof w.plausible === 'function' ? w.plausible : null
}

class Analytics {
  private isBrowser: boolean

  constructor() {
    this.isBrowser = typeof window !== 'undefined'
  }

  /** Track a canonical funnel event. */
  track(event: EventName, properties?: EventProperties): void {
    if (!this.isBrowser) return

    // Dev: log to console con prefijo consistente para fácil filtrado
    if (process.env.NODE_ENV === 'development') {
       
      console.log(`%c[analytics] ${event}`, 'color:#047857;font-weight:bold', properties || '')
    }

    // Prod (o dev con script cargado): enviar a Plausible
    try {
      const plausible = getPlausible()
      if (plausible) {
        plausible(event, properties ? { props: properties as Record<string, unknown> } : undefined)
      }
    } catch {
      // Analytics nunca debe romper la app
    }
  }

  /** Identify user (no-op en Plausible — respeta privacidad). */
  identify(userId: string, traits?: EventProperties): void {
    if (!this.isBrowser) return
    if (process.env.NODE_ENV === 'development') {
       
      console.log(`%c[analytics] identify: ${userId}`, 'color:#047857', traits || '')
    }
    // Plausible no soporta identify (por diseño). Si migramos a PostHog/Mixpanel,
    // acá se enviaría posthog.identify(userId, traits).
  }

  /** Track a page view manualmente (Plausible auto-trackea navegaciones full page). */
  page(pageName?: string): void {
    this.track('page_view', { page: pageName ?? '' })
  }
}

export const analytics = new Analytics()

/**
 * Helper para tracking con typings ergonómicos desde componentes client.
 * Evita tener que importar `analytics` — permite `track(...)` directo.
 */
export function track(event: EventName, properties?: EventProperties): void {
  analytics.track(event, properties)
}
