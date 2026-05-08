/**
 * Sentry client config — PII scrubbing alineado con server.
 * Reglas redundantes a propósito; el cliente envía eventos directos.
 */
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b\d{8}\b/g, '[DNI]'],
  [/\b\d{11}\b/g, '[RUC]'],
  [/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[email]'],
  [/\b\+?51\s?9\d{8}\b/g, '[phone]'],
  [/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [token]'],
]

function scrubString(s: string): string {
  let out = s
  for (const [re, replacement] of PII_PATTERNS) out = out.replace(re, replacement)
  return out
}

function scrubObject(value: unknown): unknown {
  if (typeof value === 'string') return scrubString(value)
  if (Array.isArray(value)) return value.map(scrubObject)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (/password|secret|token|api[_-]?key|sueldo|salario|cts/i.test(k)) {
        out[k] = '[redacted]'
        continue
      }
      out[k] = scrubObject(v)
    }
    return out
  }
  return value
}

if (SENTRY_DSN && SENTRY_DSN !== 'https://xxxxx@o0.ingest.sentry.io/0') {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
    sendDefaultPii: false,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.browserTracingIntegration(),
    ],
    beforeSend(event) {
      if (event.request?.data) event.request.data = scrubObject(event.request.data)
      if (event.message) event.message = scrubString(event.message)
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = scrubString(ex.value)
        }
      }
      if (event.user) event.user = { id: event.user.id }
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) breadcrumb.data = scrubObject(breadcrumb.data) as Record<string, unknown>
      if (breadcrumb.message) breadcrumb.message = scrubString(breadcrumb.message)
      return breadcrumb
    },
  })
}
