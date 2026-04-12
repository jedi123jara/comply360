/* -------------------------------------------------------------------------- */
/*  Sentry — Error tracking & performance monitoring for COMPLY360            */
/* -------------------------------------------------------------------------- */

import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

/**
 * Shared Sentry configuration used by both client and server init.
 */
const sharedOptions: Sentry.BrowserOptions & Sentry.NodeOptions = {
  dsn: SENTRY_DSN,
  enabled: !!SENTRY_DSN,

  environment: process.env.NODE_ENV ?? 'development',
  release: process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0',

  // Performance monitoring
  tracesSampleRate: IS_PRODUCTION ? 0.2 : 1.0,

  // Session replay (client only — ignored on server)
  replaysSessionSampleRate: IS_PRODUCTION ? 0.1 : 0,
  replaysOnErrorSampleRate: IS_PRODUCTION ? 1.0 : 0,

  // Reduce noise in development
  debug: false,

  // Filter events before sending
  beforeSend(event) {
    // Don't send events in development unless DSN is explicitly set
    if (IS_DEVELOPMENT && !SENTRY_DSN) {
      return null
    }

    // Strip sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.category === 'fetch' && breadcrumb.data?.url) {
          const url = new URL(breadcrumb.data.url, 'http://localhost')
          // Remove auth-related paths from breadcrumbs
          if (url.pathname.includes('/api/auth') || url.pathname.includes('/sign-in')) {
            breadcrumb.data.url = '[REDACTED_AUTH_URL]'
          }
        }
        return breadcrumb
      })
    }

    return event
  },

  // Ignore common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    'ResizeObserver loop',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors from user navigation
    'AbortError',
    'Load failed',
    'Failed to fetch',
    'NetworkError',
    // Clerk auth redirects
    'NEXT_REDIRECT',
    'NEXT_NOT_FOUND',
  ],
}

/* -------------------------------------------------------------------------- */
/*  Client-side initialization                                                */
/* -------------------------------------------------------------------------- */

export function initSentryClient(): void {
  if (typeof window === 'undefined') return

  Sentry.init({
    ...sharedOptions,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  })
}

/* -------------------------------------------------------------------------- */
/*  Server-side initialization                                                */
/* -------------------------------------------------------------------------- */

export function initSentryServer(): void {
  if (typeof window !== 'undefined') return

  Sentry.init({
    ...sharedOptions,
    // Server-specific: no replay integrations needed
    integrations: [],
  })
}

/* -------------------------------------------------------------------------- */
/*  Error reporting utilities                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Capture an error and send it to Sentry with optional context.
 */
export function captureError(
  error: unknown,
  context?: Record<string, unknown>
): string | undefined {
  if (!SENTRY_DSN) {
    console.error('[Sentry disabled] Error:', error, context)
    return undefined
  }

  const eventId = Sentry.captureException(error, {
    extra: context,
  })

  return eventId
}

/**
 * Capture a message (non-error) event.
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, unknown>
): void {
  if (!SENTRY_DSN) {
    console.log(`[Sentry disabled] ${level}: ${message}`, context)
    return
  }

  Sentry.captureMessage(message, {
    level,
    extra: context,
  })
}

/**
 * Set user context for Sentry events.
 */
export function setSentryUser(user: {
  id: string
  email?: string
  organizationId?: string
}): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  })

  if (user.organizationId) {
    Sentry.setTag('organization_id', user.organizationId)
  }
}

/**
 * Clear user context (e.g., on logout).
 */
export function clearSentryUser(): void {
  Sentry.setUser(null)
}

/**
 * Create a performance transaction span.
 */
export function startSpan<T>(
  name: string,
  op: string,
  fn: () => T | Promise<T>
): T | Promise<T> {
  return Sentry.startSpan({ name, op }, fn)
}

/* -------------------------------------------------------------------------- */
/*  Re-export Sentry for direct access when needed                            */
/* -------------------------------------------------------------------------- */

export { Sentry }
