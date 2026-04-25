/**
 * Tests para WebPushProvider y EmailProvider (S3.5).
 *
 * Validan que ahora usan los helpers reales (`sendPushToUser`, `sendEmail`)
 * en lugar de los stubs anteriores que mentían "success: true" sin enviar.
 */

const { mockSendPushToUser, mockSendEmail } = vi.hoisted(() => ({
  mockSendPushToUser: vi.fn(),
  mockSendEmail: vi.fn(),
}))

vi.mock('@/lib/notifications/web-push-server', () => ({
  sendPushToUser: mockSendPushToUser,
}))
vi.mock('@/lib/email/client', () => ({
  sendEmail: mockSendEmail,
}))

import { WebPushProvider, EmailProvider } from '../index'

beforeAll(() => {
  process.env.VAPID_PUBLIC_KEY = 'pk_test'
  process.env.VAPID_PRIVATE_KEY = 'sk_test'
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WebPushProvider', () => {
  test('llama sendPushToUser con userId, title, body, url', async () => {
    mockSendPushToUser.mockResolvedValue(true)
    const p = new WebPushProvider()

    const r = await p.send({
      channel: 'web-push',
      recipient: 'user_123',
      title: 'CTS por vencer',
      body: 'Quedan 3 días',
      actionUrl: '/dashboard/calendario',
      metadata: { severity: 'high' },
    })

    expect(r.success).toBe(true)
    expect(mockSendPushToUser).toHaveBeenCalledWith('user_123', {
      title: 'CTS por vencer',
      body: 'Quedan 3 días',
      url: '/dashboard/calendario',
      severity: 'HIGH', // normalizado a mayúsculas
    })
  })

  test('sin VAPID configurado → success=false con razón', async () => {
    delete process.env.VAPID_PUBLIC_KEY

    const r = await new WebPushProvider().send({
      channel: 'web-push',
      recipient: 'user_1',
      title: 'X',
      body: 'Y',
    })

    expect(r.success).toBe(false)
    expect(r.error).toMatch(/VAPID/)
    expect(mockSendPushToUser).not.toHaveBeenCalled()

    process.env.VAPID_PUBLIC_KEY = 'pk_test' // restore
  })

  test('sin recipient → success=false', async () => {
    const r = await new WebPushProvider().send({
      channel: 'web-push',
      recipient: '',
      title: 'X',
      body: 'Y',
    })

    expect(r.success).toBe(false)
    expect(r.error).toMatch(/recipient/i)
    expect(mockSendPushToUser).not.toHaveBeenCalled()
  })

  test('sendPushToUser devuelve false (sin suscripción) → success=false', async () => {
    mockSendPushToUser.mockResolvedValue(false)

    const r = await new WebPushProvider().send({
      channel: 'web-push',
      recipient: 'user_no_sub',
      title: 'X',
      body: 'Y',
    })

    expect(r.success).toBe(false)
    expect(r.error).toMatch(/suscripción|VAPID/)
  })

  test('severity inválida se descarta (no se pasa al helper)', async () => {
    mockSendPushToUser.mockResolvedValue(true)

    await new WebPushProvider().send({
      channel: 'web-push',
      recipient: 'u',
      title: 't',
      body: 'b',
      metadata: { severity: 'unknown_level' },
    })

    expect(mockSendPushToUser).toHaveBeenCalledWith(
      'u',
      expect.objectContaining({ severity: undefined }),
    )
  })
})

describe('EmailProvider', () => {
  test('envía con HTML directo si el body parece HTML', async () => {
    mockSendEmail.mockResolvedValue(true)

    const r = await new EmailProvider().send({
      channel: 'email',
      recipient: 'a@b.pe',
      title: 'Subject',
      body: '<p>Cuerpo HTML</p>',
    })

    expect(r.success).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: 'a@b.pe',
      subject: 'Subject',
      html: '<p>Cuerpo HTML</p>',
    })
  })

  test('envuelve en layout si el body es texto plano', async () => {
    mockSendEmail.mockResolvedValue(true)

    await new EmailProvider().send({
      channel: 'email',
      recipient: 'a@b.pe',
      title: 'Alerta',
      body: 'Texto plano\nsegunda línea',
      actionUrl: 'https://app.comply360.pe/dashboard',
    })

    const html = mockSendEmail.mock.calls[0][0].html as string
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Alerta')
    expect(html).toContain('Texto plano')
    expect(html).toContain('segunda línea')
    expect(html).toContain('href="https://app.comply360.pe/dashboard"')
  })

  test('escapa HTML en title cuando body es texto plano (path wrap)', async () => {
    mockSendEmail.mockResolvedValue(true)

    await new EmailProvider().send({
      channel: 'email',
      recipient: 'a@b.pe',
      title: '<script>alert(1)</script>',
      body: 'Body sin tags', // texto plano fuerza el path "wrap" que escapa
    })

    const html = mockSendEmail.mock.calls[0][0].html as string
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })

  test('sendEmail devuelve false → success=false', async () => {
    mockSendEmail.mockResolvedValue(false)

    const r = await new EmailProvider().send({
      channel: 'email',
      recipient: 'a@b.pe',
      title: 'T',
      body: 'B',
    })

    expect(r.success).toBe(false)
    expect(r.error).toMatch(/Resend|API key/i)
  })
})
