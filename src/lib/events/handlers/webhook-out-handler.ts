/**
 * Handler que enlaza el event bus interno con los webhooks salientes (API v1).
 *
 * Cada `DomainEvent` emitido por el sistema se evalúa contra las suscripciones
 * activas de la org. Por cada match, se crea una fila `WebhookDelivery` que
 * el cron `webhook-retry` procesa.
 *
 * Diseñado para no bloquear al emisor: solo persiste, no hace HTTP.
 */

import type { DomainEvent, EventName } from '../catalog'
import { enqueueDeliveriesForEvent } from '@/lib/webhooks-out/dispatcher'

export async function webhookOutHandler<K extends EventName>(
  event: DomainEvent<K>,
): Promise<void> {
  try {
    await enqueueDeliveriesForEvent(event)
  } catch (err) {
    console.error('[webhook-out-handler] enqueue falló:', err)
  }
}
