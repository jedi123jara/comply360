/**
 * Instrumentación del servidor (Next.js la carga una vez al arrancar).
 *
 * Enciende Sentry con las configs de la raíz, que ya limpian PII (DNI, RUC,
 * correos, teléfonos, tokens) antes de enviar. Sin NEXT_PUBLIC_SENTRY_DSN las
 * configs no inicializan nada, así que en local no envía eventos.
 */
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')

    // Avisa (sin bloquear) qué variables de entorno faltan. Solo nombres, nunca valores.
    const { reportEnvironment } = await import('@/lib/security/env-guard')
    const env = reportEnvironment()
    if (!env.valid) {
      Sentry.captureMessage(`env-guard: ${env.errors.length} variables faltantes o inválidas`, {
        level: 'warning',
        extra: { errors: env.errors },
      })
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

// Errores de Server Components, route handlers y server actions.
export const onRequestError = Sentry.captureRequestError
