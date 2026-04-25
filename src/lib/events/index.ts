/**
 * Punto de entrada del módulo de eventos.
 *
 * Exporta `emit`, `registerHandler` y los tipos. Además, auto-registra los
 * handlers built-in (workflow + gamification) la primera vez que se importa
 * este módulo. Si quieres agregar un handler adicional (ej. analytics,
 * webhooks externos), hacelo en este archivo antes del default export.
 *
 * Uso en endpoints:
 * ```ts
 * import { emit } from '@/lib/events'
 * emit('worker.created', { workerId, orgId })
 * ```
 */

import { emit, registerHandler, type EventHandler } from './bus'
import { workflowHandler } from './handlers/workflow-handler'
import { gamificationHandler } from './handlers/gamification-handler'
import { pushHandler } from './handlers/push-handler'
import { webhookOutHandler } from './handlers/webhook-out-handler'

// Registro idempotente: si este módulo se importa en múltiples entry points,
// no duplicamos handlers.
let bootstrapped = false
function bootstrap() {
  if (bootstrapped) return
  registerHandler('workflow', workflowHandler as EventHandler)
  registerHandler('gamification', gamificationHandler as EventHandler)
  registerHandler('push', pushHandler as EventHandler, [
    'training.due',
    'training.completed',
    'document.expired',
    'contract.expiring',
  ])
  // Webhook out: dispara para CUALQUIER evento — el matching por sub se
  // hace dentro del handler usando `subscription.events @> [name]`.
  registerHandler('webhook-out', webhookOutHandler as EventHandler)
  bootstrapped = true
}

bootstrap()

export { emit, registerHandler }
export type { DomainEvent, EventName, EventPayloads } from './catalog'
export { EVENT_CATALOG, listEventNames, listEventsByCategory } from './catalog'
