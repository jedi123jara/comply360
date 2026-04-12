// =============================================
// Webhook System - Event delivery with HMAC signing
// =============================================

import { createHmac, randomBytes } from 'crypto'

// =============================================
// Types
// =============================================

export type WebhookEvent =
  | 'worker.created'
  | 'worker.updated'
  | 'contract.created'
  | 'contract.expiring'
  | 'alert.triggered'
  | 'compliance.updated'
  | 'payment.received'

export interface WebhookRegistration {
  id: string
  orgId: string
  url: string
  events: WebhookEvent[]
  secret: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface WebhookDeliveryLog {
  id: string
  webhookId: string
  event: WebhookEvent
  payload: unknown
  statusCode: number | null
  response: string | null
  success: boolean
  attempt: number
  deliveredAt: Date
}

export interface WebhookPayload {
  id: string
  event: WebhookEvent
  orgId: string
  timestamp: string
  data: unknown
}

// =============================================
// Constants
// =============================================

const ALL_EVENTS: WebhookEvent[] = [
  'worker.created',
  'worker.updated',
  'contract.created',
  'contract.expiring',
  'alert.triggered',
  'compliance.updated',
  'payment.received',
]

const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000 // 1 segundo base para backoff exponencial
const DELIVERY_TIMEOUT_MS = 10000 // 10 segundos timeout por request

// =============================================
// In-memory store (replaced by DB in production)
// =============================================

const webhookStore = new Map<string, WebhookRegistration>()
const deliveryLogs: WebhookDeliveryLog[] = []

// =============================================
// WebhookService class
// =============================================

export class WebhookService {
  /**
   * Register a new webhook for an organization.
   */
  registerWebhook(
    orgId: string,
    url: string,
    events: WebhookEvent[],
    secret?: string
  ): WebhookRegistration {
    // Validar URL
    try {
      new URL(url)
    } catch {
      throw new WebhookError('URL de webhook invalida', 'INVALID_URL')
    }

    // Validar eventos
    const invalidEvents = events.filter((e) => !ALL_EVENTS.includes(e))
    if (invalidEvents.length > 0) {
      throw new WebhookError(
        `Eventos invalidos: ${invalidEvents.join(', ')}. Permitidos: ${ALL_EVENTS.join(', ')}`,
        'INVALID_EVENTS'
      )
    }

    if (events.length === 0) {
      throw new WebhookError(
        'Debe especificar al menos un evento',
        'NO_EVENTS'
      )
    }

    const id = `whk_${Date.now()}_${randomBytes(4).toString('hex')}`
    const webhookSecret = secret ?? `whsec_${randomBytes(32).toString('hex')}`

    const registration: WebhookRegistration = {
      id,
      orgId,
      url,
      events,
      secret: webhookSecret,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    webhookStore.set(id, registration)

    console.log(`[WebhookService] Webhook registrado: ${id} para org ${orgId}`)

    return registration
  }

  /**
   * Remove a webhook by ID.
   */
  removeWebhook(webhookId: string): void {
    const webhook = webhookStore.get(webhookId)
    if (!webhook) {
      throw new WebhookError(
        `Webhook no encontrado: ${webhookId}`,
        'NOT_FOUND'
      )
    }

    webhookStore.delete(webhookId)
    console.log(`[WebhookService] Webhook eliminado: ${webhookId}`)
  }

  /**
   * Trigger a webhook event for an organization.
   * Sends to all registered webhooks that subscribe to this event.
   * Includes retry logic with exponential backoff.
   */
  async triggerWebhook(
    orgId: string,
    event: WebhookEvent,
    data: unknown
  ): Promise<void> {
    const webhooks = this.getWebhooksForOrg(orgId)
    const matchingWebhooks = webhooks.filter(
      (w) => w.active && w.events.includes(event)
    )

    if (matchingWebhooks.length === 0) {
      console.log(`[WebhookService] No hay webhooks para evento ${event} en org ${orgId}`)
      return
    }

    const payload: WebhookPayload = {
      id: `evt_${Date.now()}_${randomBytes(4).toString('hex')}`,
      event,
      orgId,
      timestamp: new Date().toISOString(),
      data,
    }

    // Enviar a todos los webhooks en paralelo
    const deliveryPromises = matchingWebhooks.map((webhook) =>
      this.deliverWithRetry(webhook, payload)
    )

    await Promise.allSettled(deliveryPromises)
  }

  /**
   * Get all webhooks for an organization.
   */
  getWebhooksForOrg(orgId: string): WebhookRegistration[] {
    const results: WebhookRegistration[] = []
    for (const webhook of webhookStore.values()) {
      if (webhook.orgId === orgId) {
        results.push(webhook)
      }
    }
    return results
  }

  /**
   * Get a specific webhook by ID.
   */
  getWebhook(webhookId: string): WebhookRegistration | null {
    return webhookStore.get(webhookId) ?? null
  }

  /**
   * Get delivery logs for a webhook.
   */
  getDeliveryLogs(webhookId: string): WebhookDeliveryLog[] {
    return deliveryLogs.filter((log) => log.webhookId === webhookId)
  }

  /**
   * Get all available webhook events.
   */
  getAvailableEvents(): WebhookEvent[] {
    return [...ALL_EVENTS]
  }

  // =============================================
  // Internal delivery logic
  // =============================================

  /**
   * Deliver a webhook with retry logic (3 attempts, exponential backoff).
   */
  private async deliverWithRetry(
    webhook: WebhookRegistration,
    payload: WebhookPayload
  ): Promise<void> {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const result = await this.deliver(webhook, payload, attempt)

      if (result.success) {
        console.log(
          `[WebhookService] Entrega exitosa: ${webhook.id} evento=${payload.event} intento=${attempt}`
        )
        return
      }

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1)
        console.log(
          `[WebhookService] Reintentando en ${delay}ms: ${webhook.id} intento=${attempt}/${MAX_RETRIES}`
        )
        await this.sleep(delay)
      } else {
        console.error(
          `[WebhookService] Entrega fallida tras ${MAX_RETRIES} intentos: ${webhook.id} evento=${payload.event}`
        )
      }
    }
  }

  /**
   * Deliver a single webhook payload.
   */
  private async deliver(
    webhook: WebhookRegistration,
    payload: WebhookPayload,
    attempt: number
  ): Promise<{ success: boolean }> {
    const body = JSON.stringify(payload)
    const signature = this.generateSignature(body, webhook.secret)

    let statusCode: number | null = null
    let responseText: string | null = null
    let success = false

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS)

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Id': payload.id,
          'X-Webhook-Timestamp': payload.timestamp,
          'User-Agent': 'COMPLY360-Webhooks/1.0',
        },
        body,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      statusCode = response.status
      responseText = await response.text().catch(() => null)
      success = response.ok
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido'
      responseText = `Error de conexion: ${errorMessage}`
      console.error(`[WebhookService] Error de entrega: ${errorMessage}`)
    }

    // Registrar en log de entregas
    const logEntry: WebhookDeliveryLog = {
      id: `dlv_${Date.now()}_${randomBytes(4).toString('hex')}`,
      webhookId: webhook.id,
      event: payload.event,
      payload,
      statusCode,
      response: responseText?.slice(0, 1000) ?? null, // Limitar respuesta
      success,
      attempt,
      deliveredAt: new Date(),
    }
    deliveryLogs.push(logEntry)

    // Mantener solo los ultimos 1000 logs en memoria
    if (deliveryLogs.length > 1000) {
      deliveryLogs.splice(0, deliveryLogs.length - 1000)
    }

    return { success }
  }

  /**
   * Generate HMAC-SHA256 signature for a payload.
   */
  private generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// =============================================
// Custom Error
// =============================================

export class WebhookError extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'WebhookError'
    this.code = code
  }
}

// =============================================
// Verify incoming webhook signature (for consumers)
// =============================================

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret).update(payload).digest('hex')

  if (signature.length !== expected.length) return false

  let mismatch = 0
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return mismatch === 0
}

// =============================================
// Default singleton instance
// =============================================

export const webhookService = new WebhookService()
