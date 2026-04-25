/**
 * Tests for POST /api/payments/webhook
 *
 * Cubre la idempotencia: si Culqi reenvía un evento ya procesado, el handler
 * debe devolver 200 con `{ duplicated: true }` y NO ejecutar handlers de
 * subscription / organization (que extenderían el `currentPeriodEnd`).
 */

import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    webhookEvent: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    organization: { update: vi.fn() },
    subscription: { upsert: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { POST } from '@/app/api/payments/webhook/route'

const SECRET = 'test-webhook-secret'
beforeAll(() => {
  process.env.CULQI_WEBHOOK_SECRET = SECRET
})

function signedRequest(body: object): NextRequest {
  const raw = JSON.stringify(body)
  const signature = createHmac('sha256', SECRET).update(raw).digest('hex')
  return new NextRequest('http://localhost/api/payments/webhook', {
    method: 'POST',
    body: raw,
    headers: {
      'content-type': 'application/json',
      'x-culqi-signature': signature,
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  // $transaction simplemente ejecuta los argumentos (array de promesas)
  mockPrisma.$transaction.mockImplementation(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops)
    if (typeof ops === 'function') return (ops as (tx: unknown) => unknown)(mockPrisma)
    return ops
  })
})

describe('POST /api/payments/webhook — idempotency', () => {
  test('procesa charge.success normalmente la primera vez', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValue(null)
    mockPrisma.webhookEvent.upsert.mockResolvedValue({ id: 'wh_1' })
    mockPrisma.webhookEvent.update.mockResolvedValue({})
    mockPrisma.organization.update.mockResolvedValue({})
    mockPrisma.subscription.upsert.mockResolvedValue({})

    const req = signedRequest({
      type: 'charge.success',
      data: {
        id: 'chr_NEW_1',
        object: 'charge',
        amount: 12900,
        currency: 'PEN',
        metadata: { orgId: 'org_1', planId: 'STARTER', userId: 'u1' },
      },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
    expect(json.duplicated).toBeUndefined()
    expect(mockPrisma.organization.update).toHaveBeenCalledOnce()
    expect(mockPrisma.subscription.upsert).toHaveBeenCalledOnce()
    expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'PROCESSED', processedAt: expect.any(Date) }),
      }),
    )
  })

  test('NO reprocesa si el evento ya fue procesado (duplicated=true)', async () => {
    const previouslyProcessedAt = new Date('2026-04-24T10:00:00Z')
    mockPrisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'wh_old',
      provider: 'culqi',
      externalId: 'chr_DUP_1',
      status: 'PROCESSED',
      processedAt: previouslyProcessedAt,
    })

    const req = signedRequest({
      type: 'charge.success',
      data: {
        id: 'chr_DUP_1',
        object: 'charge',
        amount: 12900,
        currency: 'PEN',
        metadata: { orgId: 'org_1', planId: 'STARTER', userId: 'u1' },
      },
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.received).toBe(true)
    expect(json.duplicated).toBe(true)
    // Crítico: NO se ejecuta el handler — currentPeriodEnd NO se extiende.
    expect(mockPrisma.organization.update).not.toHaveBeenCalled()
    expect(mockPrisma.subscription.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.webhookEvent.upsert).not.toHaveBeenCalled()
    expect(mockPrisma.webhookEvent.update).not.toHaveBeenCalled()
  })

  test('marca FAILED si el handler lanza, y propaga el error al catch externo (DLQ)', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValue(null)
    mockPrisma.webhookEvent.upsert.mockResolvedValue({ id: 'wh_2' })
    mockPrisma.webhookEvent.update.mockResolvedValue({})
    mockPrisma.organization.update.mockRejectedValue(new Error('DB caída'))
    mockPrisma.auditLog.create.mockResolvedValue({})

    const req = signedRequest({
      type: 'charge.success',
      data: {
        id: 'chr_FAIL_1',
        object: 'charge',
        amount: 12900,
        currency: 'PEN',
        metadata: { orgId: 'org_1', planId: 'STARTER', userId: 'u1' },
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)

    // Marcado FAILED en el WebhookEvent
    const failingUpdate = mockPrisma.webhookEvent.update.mock.calls.find(
      (c) => (c[0]?.data as { status?: string })?.status === 'FAILED',
    )
    expect(failingUpdate).toBeDefined()
    // Y persistido en DLQ via auditLog
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'culqi.webhook.dlq' }),
      }),
    )
  })

  test('rechaza con 400 si el payload no trae data.id (no se puede deduplicar)', async () => {
    const req = signedRequest({
      type: 'charge.success',
      data: { object: 'charge', amount: 100 },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockPrisma.webhookEvent.findUnique).not.toHaveBeenCalled()
  })

  test('firma inválida → 401 sin tocar la BD', async () => {
    const raw = JSON.stringify({ type: 'charge.success', data: { id: 'chr_X' } })
    const req = new NextRequest('http://localhost/api/payments/webhook', {
      method: 'POST',
      body: raw,
      headers: { 'x-culqi-signature': 'firma-falsa' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(mockPrisma.webhookEvent.findUnique).not.toHaveBeenCalled()
  })
})
