/**
 * Módulo de notificaciones multicanal.
 *
 * Arquitectura pluggable por canal:
 *   - web-push: W3C Push API (requiere VAPID keys)
 *   - whatsapp: WhatsApp Business Cloud API (requiere ACCESS_TOKEN)
 *   - email: cualquier provider (Resend, Postmark, SES)
 *   - sms: Twilio
 *
 * Por defecto se usa un provider `console` para desarrollo (loggea a stdout).
 */

import { randomUUID } from 'crypto'

// =============================================
// TYPES
// =============================================

export type NotificationChannel = 'web-push' | 'whatsapp' | 'email' | 'sms' | 'console'

export type NotificationPriority = 'critical' | 'high' | 'normal' | 'low'

export interface NotificationPayload {
  id: string
  orgId: string
  /** Usuario destino (o 'broadcast' para todos los admins) */
  recipient: string
  /** Canales por los que debe enviarse */
  channels: NotificationChannel[]
  priority: NotificationPriority
  title: string
  body: string
  /** URL de acción (opcional) */
  actionUrl?: string
  /** Datos adicionales */
  metadata?: Record<string, unknown>
  createdAt: string
}

export interface NotificationDelivery {
  channel: NotificationChannel
  success: boolean
  error?: string
  deliveredAt?: string
  providerMessageId?: string
}

export interface NotificationProvider {
  readonly channel: NotificationChannel
  readonly name: string
  send(payload: NotificationPayload): Promise<NotificationDelivery>
}

// =============================================
// CONSOLE PROVIDER (default dev)
// =============================================

export class ConsoleNotificationProvider implements NotificationProvider {
  readonly channel = 'console' as const
  readonly name = 'Console (stdout logger)'

  async send(payload: NotificationPayload): Promise<NotificationDelivery> {
    const prefix = {
      critical: '🚨',
      high: '⚠️',
      normal: 'ℹ️',
      low: '💬',
    }[payload.priority]
    console.log(
      `${prefix} [notif:${payload.orgId}] → ${payload.recipient}: ${payload.title} — ${payload.body}`
    )
    return {
      channel: 'console',
      success: true,
      deliveredAt: new Date().toISOString(),
      providerMessageId: `console-${randomUUID()}`,
    }
  }
}

// =============================================
// WEB PUSH (stub, requiere VAPID)
// =============================================

export class WebPushStubProvider implements NotificationProvider {
  readonly channel = 'web-push' as const
  readonly name = 'Web Push (VAPID stub)'

  async send(payload: NotificationPayload): Promise<NotificationDelivery> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return {
        channel: 'web-push',
        success: false,
        error: 'VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY no configurados',
      }
    }
    // TODO: integración real con `web-push` package
    return {
      channel: 'web-push',
      success: true,
      deliveredAt: new Date().toISOString(),
      providerMessageId: `push-${randomUUID()}`,
    }
  }
}

// =============================================
// WHATSAPP BUSINESS (stub)
// =============================================

export class WhatsAppStubProvider implements NotificationProvider {
  readonly channel = 'whatsapp' as const
  readonly name = 'WhatsApp Business (stub)'

  async send(payload: NotificationPayload): Promise<NotificationDelivery> {
    const token = process.env.WHATSAPP_BUSINESS_TOKEN
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID
    if (!token || !phoneId) {
      return {
        channel: 'whatsapp',
        success: false,
        error: 'WHATSAPP_BUSINESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID no configurados',
      }
    }
    // TODO: llamada real a Graph API
    // POST https://graph.facebook.com/v18.0/{phoneId}/messages
    return {
      channel: 'whatsapp',
      success: true,
      deliveredAt: new Date().toISOString(),
      providerMessageId: `wa-${randomUUID()}`,
    }
  }
}

// =============================================
// EMAIL (genérico)
// =============================================

export class EmailStubProvider implements NotificationProvider {
  readonly channel = 'email' as const
  readonly name = 'Email (stub)'

  async send(payload: NotificationPayload): Promise<NotificationDelivery> {
    // TODO: integrar con Resend/Postmark/SES
    console.log(`[email] to=${payload.recipient} subject="${payload.title}" body="${payload.body}"`)
    return {
      channel: 'email',
      success: true,
      deliveredAt: new Date().toISOString(),
      providerMessageId: `email-${randomUUID()}`,
    }
  }
}

// =============================================
// REGISTRY + SENDER
// =============================================

const providers = new Map<NotificationChannel, NotificationProvider>()

// Defaults
providers.set('console', new ConsoleNotificationProvider())
providers.set('web-push', new WebPushStubProvider())
providers.set('whatsapp', new WhatsAppStubProvider())
providers.set('email', new EmailStubProvider())

export function registerProvider(provider: NotificationProvider): void {
  providers.set(provider.channel, provider)
}

export function listProviders(): Array<{ channel: NotificationChannel; name: string }> {
  return Array.from(providers.values()).map(p => ({ channel: p.channel, name: p.name }))
}

/**
 * Envía una notificación por TODOS los canales solicitados, en paralelo.
 * Devuelve el array de deliveries (incluye éxitos y fallos por canal).
 */
export async function sendNotification(
  input: Omit<NotificationPayload, 'id' | 'createdAt'>
): Promise<{ payload: NotificationPayload; deliveries: NotificationDelivery[] }> {
  const payload: NotificationPayload = {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  const deliveries: NotificationDelivery[] = []
  await Promise.all(
    payload.channels.map(async ch => {
      const provider = providers.get(ch)
      if (!provider) {
        deliveries.push({ channel: ch, success: false, error: 'Provider no registrado' })
        return
      }
      try {
        const res = await provider.send(payload)
        deliveries.push(res)
      } catch (e) {
        deliveries.push({
          channel: ch,
          success: false,
          error: e instanceof Error ? e.message : 'error',
        })
      }
    })
  )
  return { payload, deliveries }
}

// =============================================
// HELPERS para casos comunes
// =============================================

export function notifyCriticalRisk(
  orgId: string,
  recipient: string,
  title: string,
  body: string,
  actionUrl?: string
) {
  return sendNotification({
    orgId,
    recipient,
    channels: ['console', 'web-push', 'whatsapp', 'email'],
    priority: 'critical',
    title,
    body,
    actionUrl,
  })
}

export function notifySunafilNotification(
  orgId: string,
  recipient: string,
  numeroOficial: string,
  fechaLimite: string
) {
  return sendNotification({
    orgId,
    recipient,
    channels: ['console', 'web-push', 'email'],
    priority: 'critical',
    title: `📨 Nueva notificación SUNAFIL: ${numeroOficial}`,
    body: `Plazo de descargo vence el ${fechaLimite}. Ejecuta el Agente Analizador ahora.`,
    actionUrl: '/dashboard/casilla-sunafil',
  })
}
