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
import {
  isWhatsAppConfigured,
  sendText as waSendText,
  sendTemplate as waSendTemplate,
} from './whatsapp-business'

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

/**
 * Provider real de Web Push (VAPID + `web-push` package).
 *
 * Usa `sendPushToUser` de `web-push-server.ts` que ya tiene cargado el
 * dynamic import + manejo de fallas. El `payload.recipient` es el
 * `User.id` para que el helper pueda buscar la `pushSubscription` en DB.
 *
 * El nombre `WebPushStubProvider` se mantiene como alias para no romper
 * imports legacy.
 */
export class WebPushProvider implements NotificationProvider {
  readonly channel = 'web-push' as const
  readonly name = 'Web Push (VAPID)'

  async send(payload: NotificationPayload): Promise<NotificationDelivery> {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return {
        channel: 'web-push',
        success: false,
        error: 'VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY no configurados',
      }
    }

    // Import dinámico para no crear un ciclo de módulos a nivel top.
    const { sendPushToUser } = await import('./web-push-server')

    const userId = payload.recipient
    if (!userId) {
      return {
        channel: 'web-push',
        success: false,
        error: 'payload.recipient (userId) requerido',
      }
    }

    const sevRaw = payload.metadata?.severity
    const sev =
      typeof sevRaw === 'string'
        ? (sevRaw.toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW')
        : undefined
    const ok = await sendPushToUser(userId, {
      title: payload.title,
      body: payload.body,
      url: payload.actionUrl,
      severity: sev && ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(sev) ? sev : undefined,
    })

    if (!ok) {
      return {
        channel: 'web-push',
        success: false,
        error: 'sin suscripción activa o VAPID falló',
      }
    }

    return {
      channel: 'web-push',
      success: true,
      deliveredAt: new Date().toISOString(),
      providerMessageId: `push-${randomUUID()}`,
    }
  }
}

// Alias legacy
export { WebPushProvider as WebPushStubProvider }

// =============================================
// WHATSAPP BUSINESS (real — Meta Cloud API)
// =============================================

/**
 * Envía por WhatsApp Business usando el cliente en `whatsapp-business.ts`.
 *
 * Estrategia de envío:
 *  - Si `metadata.waTemplate` está presente (nombre del template aprobado por
 *    Meta), usa template — única forma de iniciar conversación (alertas).
 *    Las variables del body se arman con `payload.title + payload.body`.
 *  - Sin template → texto libre (requiere ventana de 24h abierta).
 *
 * El número de teléfono destino viene en `payload.recipient` (admite
 * variantes de formato, el cliente normaliza a E.164).
 */
export class WhatsAppBusinessProvider implements NotificationProvider {
  readonly channel = 'whatsapp' as const
  readonly name = 'WhatsApp Business (Meta Cloud API)'

  async send(payload: NotificationPayload): Promise<NotificationDelivery> {
    if (!isWhatsAppConfigured()) {
      return {
        channel: 'whatsapp',
        success: false,
        error: 'WHATSAPP_BUSINESS_TOKEN y WHATSAPP_PHONE_NUMBER_ID no configurados',
      }
    }

    const templateName =
      typeof payload.metadata?.waTemplate === 'string'
        ? (payload.metadata.waTemplate as string)
        : undefined

    const result = templateName
      ? await waSendTemplate(payload.recipient, {
          name: templateName,
          language:
            typeof payload.metadata?.waLanguage === 'string'
              ? (payload.metadata.waLanguage as string)
              : 'es',
          bodyParams: [payload.title, payload.body].filter(Boolean),
          buttonUrlParam: payload.actionUrl,
        })
      : await waSendText(payload.recipient, `*${payload.title}*\n\n${payload.body}${payload.actionUrl ? `\n\n${payload.actionUrl}` : ''}`)

    if (result.ok) {
      return {
        channel: 'whatsapp',
        success: true,
        deliveredAt: new Date().toISOString(),
        providerMessageId: result.messageId ?? `wa-${randomUUID()}`,
      }
    }

    return {
      channel: 'whatsapp',
      success: false,
      error: result.error ?? result.reason ?? 'error desconocido',
    }
  }
}

// Alias legacy — código antiguo que importa el nombre Stub sigue funcionando,
// pero redirige al provider real.
export { WhatsAppBusinessProvider as WhatsAppStubProvider }

// =============================================
// EMAIL (genérico)
// =============================================

/**
 * Provider real de Email (Resend).
 *
 * Usa `sendEmail` de `lib/email/client.ts` que tiene fallback dev (console
 * log si falta `RESEND_API_KEY`). El `payload.recipient` es la dirección
 * email destino. Si `payload.body` parece HTML, se envía tal cual; si no,
 * lo envolvemos en un layout básico.
 *
 * El nombre `EmailStubProvider` se mantiene como alias.
 */
export class EmailProvider implements NotificationProvider {
  readonly channel = 'email' as const
  readonly name = 'Email (Resend)'

  async send(payload: NotificationPayload): Promise<NotificationDelivery> {
    const { sendEmail } = await import('@/lib/email/client')

    const html = looksLikeHtml(payload.body)
      ? payload.body
      : wrapAsHtml(payload.title, payload.body, payload.actionUrl)

    const sent = await sendEmail({
      to: payload.recipient,
      subject: payload.title,
      html,
    })

    if (!sent) {
      return {
        channel: 'email',
        success: false,
        error: 'sendEmail devolvió false (Resend rechazó o sin API key configurada)',
      }
    }

    return {
      channel: 'email',
      success: true,
      deliveredAt: new Date().toISOString(),
      providerMessageId: `email-${randomUUID()}`,
    }
  }
}

// Alias legacy
export { EmailProvider as EmailStubProvider }

function looksLikeHtml(s: string | undefined | null): boolean {
  if (!s) return false
  return /<\/?[a-z][\s\S]*>/i.test(s)
}

function wrapAsHtml(title: string, body: string, actionUrl?: string): string {
  const safeTitle = escapeHtml(title)
  const safeBody = escapeHtml(body).replace(/\n/g, '<br>')
  const cta = actionUrl
    ? `<p><a href="${escapeAttr(actionUrl)}" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;">Ver detalles</a></p>`
    : ''
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#1e293b;max-width:600px;margin:0 auto;padding:24px;">
    <h2 style="color:#0f172a;">${safeTitle}</h2>
    <p>${safeBody}</p>
    ${cta}
    <hr style="border:0;border-top:1px solid #e2e8f0;margin-top:32px;">
    <p style="font-size:11px;color:#64748b;">Este mensaje fue enviado por COMPLY360. Si no esperabas recibirlo, contáctanos en datos@comply360.pe.</p>
  </body></html>`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;')
}

// =============================================
// REGISTRY + SENDER
// =============================================

const providers = new Map<NotificationChannel, NotificationProvider>()

// Defaults
providers.set('console', new ConsoleNotificationProvider())
providers.set('web-push', new WebPushProvider())
providers.set('whatsapp', new WhatsAppBusinessProvider())
providers.set('email', new EmailProvider())

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
