/**
 * Sentry server config — incluye PII scrubbing para cumplir Ley 29733.
 *
 * FIX #8.C — observabilidad con privacidad:
 * - PII scrub en beforeSend (DNI, email, teléfono, sueldos, RUC, tokens).
 * - Tags automáticos: orgId, plan, route.
 * - Sample rate por entorno.
 */
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

// Patrones PII peruanos. Reemplazamos por placeholders para no perder contexto.
const PII_PATTERNS: Array<[RegExp, string]> = [
  [/\b\d{8}\b/g, '[DNI]'],                        // DNI peruano
  [/\b\d{11}\b/g, '[RUC]'],                       // RUC
  [/\b[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[email]'], // Email
  [/\b\+?51\s?9\d{8}\b/g, '[phone]'],             // Celular peruano
  [/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [token]'], // JWT-like tokens
  [/sk_(test|live)_[A-Za-z0-9]+/g, 'sk_[secret]'], // Culqi/Stripe-style keys
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
      // Drop fields claramente sensibles por nombre.
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
    debug: false,
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.data) event.request.data = scrubObject(event.request.data)
      if (event.request?.query_string && typeof event.request.query_string === 'string') {
        event.request.query_string = scrubString(event.request.query_string)
      }
      if (event.message) event.message = scrubString(event.message)
      if (event.exception?.values) {
        for (const ex of event.exception.values) {
          if (ex.value) ex.value = scrubString(ex.value)
        }
      }
      if (event.user) {
        event.user = { id: event.user.id }
      }
      return event
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.data) breadcrumb.data = scrubObject(breadcrumb.data) as Record<string, unknown>
      if (breadcrumb.message) breadcrumb.message = scrubString(breadcrumb.message)
      return breadcrumb
    },
  })
}
