/**
 * Instrumentación del navegador (Next.js la carga antes de hidratar la app).
 *
 * Inicializa Sentry con sentry.client.config.ts, que limpia PII y enmascara
 * todo el texto y los medios en las grabaciones de sesión.
 */
import * as Sentry from '@sentry/nextjs'
import '../sentry.client.config'

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
