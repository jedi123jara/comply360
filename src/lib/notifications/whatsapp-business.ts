/**
 * Cliente WhatsApp Business — Meta Cloud API (Graph API v18+).
 *
 * Hoy reemplaza el stub que vivía dentro de `notifications/index.ts` con
 * llamadas reales a https://graph.facebook.com/v18.0/{PHONE_ID}/messages.
 *
 * Dos modos de envío:
 *   - `sendText(to, body)` — mensaje libre. Solo funciona dentro de la
 *     ventana de 24 horas luego de que el usuario escribió a la empresa.
 *     Fuera de esa ventana, Meta rechaza con error 131026 y hay que usar
 *     template.
 *
 *   - `sendTemplate(to, templateName, vars)` — template previamente aprobada
 *     por Meta. Es la única forma de iniciar una conversación (mensajes
 *     proactivos como alertas de vencimiento).
 *
 * Fallback graceful:
 *   - Si faltan `WHATSAPP_BUSINESS_TOKEN` o `WHATSAPP_PHONE_NUMBER_ID`
 *     devuelve `{ ok: false, reason: 'not_configured' }` sin lanzar.
 *   - Así el resto del sistema (notificaciones multicanal) sigue funcionando
 *     aunque Meta no esté configurado todavía.
 *
 * Normalización de número: acepta "+51 916 275 643", "51916275643", "916275643"
 * (prefija 51 si falta). Meta requiere E.164 sin "+" ni espacios.
 */

const GRAPH_BASE = 'https://graph.facebook.com/v18.0'
const DEFAULT_COUNTRY_CODE = '51' // Perú

export interface WhatsAppSendResult {
  ok: boolean
  /** Message ID devuelto por Meta (si ok=true). */
  messageId?: string
  /** Motivo del fallo — código técnico usable para control de flujo. */
  reason?:
    | 'not_configured'
    | 'invalid_phone'
    | 'api_error'
    | 'outside_24h_window'
    | 'network_error'
  /** Mensaje legible (para logs y debugging). */
  error?: string
  /** Status HTTP crudo en caso de fallo de API. */
  httpStatus?: number
}

interface WhatsAppConfig {
  token: string
  phoneNumberId: string
}

/**
 * Resuelve credenciales desde process.env. Devuelve null si falta alguna.
 */
function getConfig(): WhatsAppConfig | null {
  const token = process.env.WHATSAPP_BUSINESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) return null
  return { token, phoneNumberId }
}

/** Verifica si el provider está listo para enviar (sin hacer request). */
export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null
}

/**
 * Normaliza un número al formato E.164 que pide Meta (solo dígitos, con código de país).
 * Acepta variantes comunes: "+51 916 275 643", "51-916-275-643", "916275643".
 * Si no tiene código de país, le prefija el default (51 = Perú).
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (digits.length === 0) return null
  // Si ya tiene 11+ dígitos asumimos que incluye código de país.
  if (digits.length >= 11) return digits
  // 9 dígitos típico de móvil peruano → prefijamos 51.
  if (digits.length === 9) return DEFAULT_COUNTRY_CODE + digits
  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// Envío de texto libre (requiere ventana 24h abierta)
// ═══════════════════════════════════════════════════════════════════════════

export async function sendText(to: string, body: string): Promise<WhatsAppSendResult> {
  const config = getConfig()
  if (!config) {
    return { ok: false, reason: 'not_configured', error: 'WHATSAPP_BUSINESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados' }
  }

  const normalized = normalizePhone(to)
  if (!normalized) {
    return { ok: false, reason: 'invalid_phone', error: `Número inválido: "${to}"` }
  }

  return postToMeta(config, {
    messaging_product: 'whatsapp',
    to: normalized,
    type: 'text',
    text: { body: body.slice(0, 4096), preview_url: false },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Envío por template aprobada (inicia conversación proactivamente)
// ═══════════════════════════════════════════════════════════════════════════

export interface TemplateOptions {
  /** Nombre exacto del template aprobado en el Meta Business Manager. */
  name: string
  /** Idioma ISO del template aprobado. Default: 'es' (español neutro). */
  language?: string
  /** Variables a interpolar en el body del template, en orden. */
  bodyParams?: string[]
  /** URL variable para botón de tipo URL (si el template tiene uno). */
  buttonUrlParam?: string
}

export async function sendTemplate(
  to: string,
  options: TemplateOptions,
): Promise<WhatsAppSendResult> {
  const config = getConfig()
  if (!config) {
    return { ok: false, reason: 'not_configured', error: 'WHATSAPP_BUSINESS_TOKEN o WHATSAPP_PHONE_NUMBER_ID no configurados' }
  }

  const normalized = normalizePhone(to)
  if (!normalized) {
    return { ok: false, reason: 'invalid_phone', error: `Número inválido: "${to}"` }
  }

  const components: Array<Record<string, unknown>> = []

  if (options.bodyParams && options.bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: options.bodyParams.map((text) => ({ type: 'text', text })),
    })
  }

  if (options.buttonUrlParam) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: options.buttonUrlParam }],
    })
  }

  return postToMeta(config, {
    messaging_product: 'whatsapp',
    to: normalized,
    type: 'template',
    template: {
      name: options.name,
      language: { code: options.language ?? 'es' },
      ...(components.length > 0 ? { components } : {}),
    },
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Transporte HTTP — aislado para testing
// ═══════════════════════════════════════════════════════════════════════════

interface MetaApiError {
  error?: {
    code?: number
    message?: string
    error_subcode?: number
  }
}

interface MetaApiSuccess {
  messages?: Array<{ id: string }>
}

async function postToMeta(
  config: WhatsAppConfig,
  body: Record<string, unknown>,
): Promise<WhatsAppSendResult> {
  const url = `${GRAPH_BASE}/${config.phoneNumberId}/messages`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    return {
      ok: false,
      reason: 'network_error',
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const data = (await res.json().catch(() => ({}))) as MetaApiError & MetaApiSuccess

  if (!res.ok) {
    const code = data.error?.code
    // Código 131047 / 131026: "message undeliverable" porque la ventana de 24h expiró.
    const outside24h = code === 131047 || code === 131026
    return {
      ok: false,
      reason: outside24h ? 'outside_24h_window' : 'api_error',
      error: data.error?.message ?? `Meta API devolvió ${res.status}`,
      httpStatus: res.status,
    }
  }

  const messageId = data.messages?.[0]?.id
  return { ok: true, messageId }
}
