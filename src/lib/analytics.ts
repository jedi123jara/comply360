/**
 * Analytics tracking for COMPLY360.
 * Abstraction layer — can be wired to PostHog, Plausible, or Google Analytics.
 * In development, logs events to console.
 */

type EventName =
  | 'page_view'
  | 'signup_completed'
  | 'onboarding_completed'
  | 'diagnostic_started'
  | 'diagnostic_completed'
  | 'calculator_used'
  | 'contract_created'
  | 'worker_added'
  | 'export_generated'
  | 'course_started'
  | 'course_completed'
  | 'complaint_submitted'
  | 'plan_selected'
  | 'document_uploaded'

interface EventProperties {
  [key: string]: string | number | boolean | null
}

class Analytics {
  private enabled: boolean

  constructor() {
    this.enabled = typeof window !== 'undefined'
  }

  track(event: EventName, properties?: EventProperties) {
    if (!this.enabled) return

    // Development: log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`[analytics] ${event}`, properties || '')
      return
    }

    // Production: send to analytics provider
    // Placeholder for PostHog/Plausible integration
    try {
      const w = window as unknown as Record<string, unknown>
      if (typeof w.plausible === 'function') {
        (w.plausible as (event: string, opts?: Record<string, unknown>) => void)(event, { props: properties })
      }
    } catch {
      // Analytics should never break the app
    }
  }

  identify(userId: string, traits?: EventProperties) {
    if (!this.enabled) return

    if (process.env.NODE_ENV === 'development') {
      console.log(`[analytics] identify: ${userId}`, traits || '')
      return
    }
  }

  page(pageName?: string) {
    this.track('page_view', { page: pageName || '' })
  }
}

export const analytics = new Analytics()
