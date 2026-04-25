/**
 * Tests para el cliente WhatsApp Business (Meta Cloud API).
 *
 * Cubre:
 *  - Normalización de números peruanos e internacionales
 *  - Fallback graceful cuando faltan credenciales
 *  - Envío de texto (body correcto hacia Meta)
 *  - Envío de template con variables + botón URL
 *  - Mapeo de errores Meta (ventana 24h, API error, network)
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  normalizePhone,
  isWhatsAppConfigured,
  sendText,
  sendTemplate,
} from '../whatsapp-business'

const ORIG_TOKEN = process.env.WHATSAPP_BUSINESS_TOKEN
const ORIG_PHONE = process.env.WHATSAPP_PHONE_NUMBER_ID

function setCreds(token: string | undefined, phone: string | undefined) {
  if (token) process.env.WHATSAPP_BUSINESS_TOKEN = token
  else delete process.env.WHATSAPP_BUSINESS_TOKEN
  if (phone) process.env.WHATSAPP_PHONE_NUMBER_ID = phone
  else delete process.env.WHATSAPP_PHONE_NUMBER_ID
}

function restoreCreds() {
  setCreds(ORIG_TOKEN, ORIG_PHONE)
}

function mockFetchOk(messageId = 'wamid.HBgL51XXXXX') {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ messages: [{ id: messageId }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

function mockFetchError(status: number, code: number, message = 'fail') {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ error: { code, message } }),
      { status, headers: { 'Content-Type': 'application/json' } },
    ),
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// normalizePhone
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizePhone', () => {
  it('prefija 51 para móviles peruanos de 9 dígitos', () => {
    expect(normalizePhone('916275643')).toBe('51916275643')
  })

  it('respeta números que ya incluyen código de país', () => {
    expect(normalizePhone('51916275643')).toBe('51916275643')
    expect(normalizePhone('+51 916 275 643')).toBe('51916275643')
    expect(normalizePhone('(51) 916-275-643')).toBe('51916275643')
  })

  it('devuelve null para entradas vacías o imposibles', () => {
    expect(normalizePhone('')).toBe(null)
    expect(normalizePhone('---')).toBe(null)
    expect(normalizePhone('1234')).toBe(null) // muy corto
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// isWhatsAppConfigured
// ═══════════════════════════════════════════════════════════════════════════

describe('isWhatsAppConfigured', () => {
  afterEach(restoreCreds)

  it('true con ambas env vars presentes', () => {
    setCreds('EAA-fake', '12345')
    expect(isWhatsAppConfigured()).toBe(true)
  })

  it('false si falta el token', () => {
    setCreds(undefined, '12345')
    expect(isWhatsAppConfigured()).toBe(false)
  })

  it('false si falta el phone ID', () => {
    setCreds('EAA-fake', undefined)
    expect(isWhatsAppConfigured()).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// sendText
// ═══════════════════════════════════════════════════════════════════════════

describe('sendText', () => {
  beforeEach(() => setCreds('EAA-fake', '12345'))
  afterEach(() => {
    restoreCreds()
    vi.restoreAllMocks()
  })

  it('devuelve not_configured cuando faltan credenciales', async () => {
    setCreds(undefined, undefined)
    const result = await sendText('916275643', 'hola')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not_configured')
  })

  it('devuelve invalid_phone cuando el número no es parseable', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await sendText('abc', 'hola')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('invalid_phone')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('postea a Meta con el body esperado y devuelve messageId', async () => {
    const fetchSpy = mockFetchOk('wamid.abc123')
    const result = await sendText('916275643', 'Hola pe')
    expect(result.ok).toBe(true)
    expect(result.messageId).toBe('wamid.abc123')

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toBe('https://graph.facebook.com/v18.0/12345/messages')
    expect(init?.method).toBe('POST')
    const headers = init?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer EAA-fake')
    const body = JSON.parse(init?.body as string)
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '51916275643',
      type: 'text',
      text: { body: 'Hola pe', preview_url: false },
    })
  })

  it('mapea error 131026 (fuera de ventana 24h) a reason="outside_24h_window"', async () => {
    mockFetchError(400, 131026, 'Message undeliverable')
    const result = await sendText('916275643', 'x')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('outside_24h_window')
    expect(result.httpStatus).toBe(400)
  })

  it('mapea otros errores API a reason="api_error"', async () => {
    mockFetchError(500, 1, 'Internal error')
    const result = await sendText('916275643', 'x')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('api_error')
  })

  it('mapea caída de red a reason="network_error"', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ENOTFOUND'))
    const result = await sendText('916275643', 'x')
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('network_error')
    expect(result.error).toContain('ENOTFOUND')
  })

  it('trunca bodies mayores a 4096 caracteres (límite Meta)', async () => {
    const fetchSpy = mockFetchOk()
    const huge = 'x'.repeat(5000)
    await sendText('916275643', huge)
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.text.body.length).toBe(4096)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// sendTemplate
// ═══════════════════════════════════════════════════════════════════════════

describe('sendTemplate', () => {
  beforeEach(() => setCreds('EAA-fake', '12345'))
  afterEach(() => {
    restoreCreds()
    vi.restoreAllMocks()
  })

  it('arma el payload con body params + botón URL', async () => {
    const fetchSpy = mockFetchOk()
    await sendTemplate('916275643', {
      name: 'alerta_vencimiento',
      language: 'es_PE',
      bodyParams: ['Carlos', 'CTS', '15 de mayo'],
      buttonUrlParam: 'abc123',
    })

    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body).toMatchObject({
      messaging_product: 'whatsapp',
      to: '51916275643',
      type: 'template',
      template: {
        name: 'alerta_vencimiento',
        language: { code: 'es_PE' },
      },
    })
    expect(body.template.components).toHaveLength(2)
    expect(body.template.components[0]).toEqual({
      type: 'body',
      parameters: [
        { type: 'text', text: 'Carlos' },
        { type: 'text', text: 'CTS' },
        { type: 'text', text: '15 de mayo' },
      ],
    })
    expect(body.template.components[1]).toMatchObject({
      type: 'button',
      sub_type: 'url',
      index: '0',
    })
  })

  it('usa idioma "es" por default', async () => {
    const fetchSpy = mockFetchOk()
    await sendTemplate('916275643', { name: 'saludo' })
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.template.language.code).toBe('es')
  })

  it('omite components cuando no hay params ni botón', async () => {
    const fetchSpy = mockFetchOk()
    await sendTemplate('916275643', { name: 'welcome' })
    const body = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string)
    expect(body.template.components).toBeUndefined()
  })

  it('devuelve not_configured sin intentar fetch cuando faltan credenciales', async () => {
    setCreds(undefined, undefined)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await sendTemplate('916275643', { name: 'x' })
    expect(result.ok).toBe(false)
    expect(result.reason).toBe('not_configured')
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
