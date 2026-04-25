/**
 * Tests para src/lib/webhooks-out/dispatcher.ts
 *
 * Cubren:
 *   - signWebhookBody determinístico
 *   - generateWebhookSecret retorna 64 chars hex (32 bytes)
 *   - enqueueDeliveriesForEvent crea N rows según subs matching
 *   - processWebhookDelivery success → status SUCCESS
 *   - HTTP 5xx retryable → FAILED + nextRetryAt seteado
 *   - HTTP 4xx (no 408/429) → DEAD_LETTER directo
 *   - Excede MAX_ATTEMPTS → DEAD_LETTER
 *   - Sub auto-disable tras 5 dead-letters consecutivos
 */

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    webhookSubscription: {
      findMany: vi.fn(),
      update: vi.fn().mockResolvedValue({ consecutiveFailures: 0 }),
    },
    webhookDelivery: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      update: vi.fn().mockResolvedValue({}),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import {
  generateWebhookSecret,
  signWebhookBody,
  enqueueDeliveriesForEvent,
  processWebhookDelivery,
  processPendingDeliveries,
} from '../dispatcher'

const realFetch = global.fetch
beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.webhookSubscription.update.mockResolvedValue({ consecutiveFailures: 0 })
})
afterEach(() => {
  global.fetch = realFetch
})

describe('signWebhookBody / generateWebhookSecret', () => {
  test('determinístico: misma entrada → misma firma', () => {
    const a = signWebhookBody('secret-123', '{"x":1}', 1700000000)
    const b = signWebhookBody('secret-123', '{"x":1}', 1700000000)
    expect(a).toBe(b)
    expect(a).toMatch(/^sha256=[0-9a-f]{64}$/)
  })

  test('cambiar timestamp cambia firma', () => {
    const a = signWebhookBody('secret', '{}', 1)
    const b = signWebhookBody('secret', '{}', 2)
    expect(a).not.toBe(b)
  })

  test('cambiar secret cambia firma', () => {
    const a = signWebhookBody('s1', '{}', 1)
    const b = signWebhookBody('s2', '{}', 1)
    expect(a).not.toBe(b)
  })

  test('generateWebhookSecret retorna 64 chars hex (32 bytes)', () => {
    const s = generateWebhookSecret()
    expect(s).toMatch(/^[0-9a-f]{64}$/)
    // Dos llamadas dan secrets distintos (random)
    expect(generateWebhookSecret()).not.toBe(s)
  })
})

describe('enqueueDeliveriesForEvent', () => {
  test('crea 1 row por cada sub matching', async () => {
    mockPrisma.webhookSubscription.findMany.mockResolvedValue([
      { id: 'sub_1' },
      { id: 'sub_2' },
    ])

    const r = await enqueueDeliveriesForEvent({
      id: 'evt_1',
      name: 'worker.created',
      emittedAt: '2026-04-25T12:00:00Z',
      payload: { orgId: 'org_1', workerId: 'w_1' } as never,
    } as never)

    expect(r.enqueued).toBe(2)
    expect(mockPrisma.webhookDelivery.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ subscriptionId: 'sub_1', eventName: 'worker.created' }),
        expect.objectContaining({ subscriptionId: 'sub_2', eventName: 'worker.created' }),
      ]),
    })
  })

  test('payload sin orgId → enqueued=0 (no toca DB)', async () => {
    const r = await enqueueDeliveriesForEvent({
      id: 'evt_x',
      name: 'worker.created',
      emittedAt: '2026-04-25T12:00:00Z',
      payload: { workerId: 'w_x' } as never,
    } as never)

    expect(r.enqueued).toBe(0)
    expect(mockPrisma.webhookSubscription.findMany).not.toHaveBeenCalled()
  })

  test('sin subs matching → enqueued=0', async () => {
    mockPrisma.webhookSubscription.findMany.mockResolvedValue([])

    const r = await enqueueDeliveriesForEvent({
      id: 'evt_2',
      name: 'contract.signed',
      emittedAt: '2026-04-25T12:00:00Z',
      payload: { orgId: 'org_1' } as never,
    } as never)

    expect(r.enqueued).toBe(0)
    expect(mockPrisma.webhookDelivery.createMany).not.toHaveBeenCalled()
  })
})

describe('processWebhookDelivery', () => {
  function mockDelivery(overrides: Record<string, unknown> = {}) {
    return {
      id: 'del_1',
      eventName: 'worker.created',
      eventId: 'evt_1',
      attempts: 0,
      status: 'PENDING',
      payload: { workerId: 'w_1' },
      createdAt: new Date('2026-04-25T12:00:00Z'),
      subscription: {
        id: 'sub_1',
        url: 'https://client.test/webhook',
        secret: 'shared-secret',
        active: true,
      },
      ...overrides,
    }
  }

  test('200 → status SUCCESS + headers HMAC presentes', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery())
    let capturedHeaders: Record<string, string> = {}
    let capturedBody = ''
    global.fetch = vi.fn(async (url, init) => {
      capturedBody = (init?.body as string) ?? ''
      capturedHeaders = (init?.headers as Record<string, string>) ?? {}
      return new Response('OK', { status: 200 })
    }) as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('SUCCESS')
    expect(capturedHeaders['X-Comply360-Event']).toBe('worker.created')
    expect(capturedHeaders['X-Comply360-Signature']).toMatch(/^sha256=[0-9a-f]{64}$/)
    expect(capturedHeaders['X-Comply360-Delivery-Id']).toBe('del_1')

    // Verificar firma reproduciendo
    const ts = capturedHeaders['X-Comply360-Timestamp']
    const expected = signWebhookBody('shared-secret', capturedBody, Number(ts))
    expect(capturedHeaders['X-Comply360-Signature']).toBe(expected)

    // Sub se actualizó con success
    expect(mockPrisma.webhookSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lastDeliveryStatus: 'SUCCESS', consecutiveFailures: 0 }),
      }),
    )
  })

  test('500 retryable → FAILED + nextRetryAt seteado', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery({ attempts: 0 }))
    global.fetch = vi.fn(async () => new Response('Internal', { status: 500 })) as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('FAILED')
    const updateCall = mockPrisma.webhookDelivery.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('FAILED')
    expect(updateCall.data.nextRetryAt).toBeInstanceOf(Date)
    expect(updateCall.data.attempts).toBe(1)
  })

  test('400 (cliente debe corregir) → DEAD_LETTER directo', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery())
    global.fetch = vi.fn(async () => new Response('Bad Request', { status: 400 })) as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('DEAD_LETTER')
    const updateCall = mockPrisma.webhookDelivery.update.mock.calls[0][0]
    expect(updateCall.data.status).toBe('DEAD_LETTER')
    expect(updateCall.data.completedAt).toBeInstanceOf(Date)
  })

  test('429 rate-limit → retryable (FAILED, no DEAD_LETTER)', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery())
    global.fetch = vi.fn(async () => new Response('Rate limited', { status: 429 })) as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('FAILED')
  })

  test('attempts ≥ MAX → DEAD_LETTER aunque sea retryable', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery({ attempts: 4 }))
    global.fetch = vi.fn(async () => new Response('Internal', { status: 503 })) as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('DEAD_LETTER')
  })

  test('sub inactiva → DEAD_LETTER sin hacer fetch', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(
      mockDelivery({ subscription: { id: 's', url: 'https://x', secret: 's', active: false } }),
    )
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('DEAD_LETTER')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('delivery ya en SUCCESS → no se reprocesa', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery({ status: 'SUCCESS' }))
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('SUCCESS')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  test('5 dead-letters consecutivas → desactiva sub automáticamente', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery())
    mockPrisma.webhookSubscription.update.mockResolvedValueOnce({ consecutiveFailures: 5 })
    global.fetch = vi.fn(async () => new Response('Bad', { status: 400 })) as never

    await processWebhookDelivery('del_1')

    // Segunda update: active=false
    const calls = mockPrisma.webhookSubscription.update.mock.calls
    const deactivate = calls.find((c) => (c[0]?.data as { active?: boolean })?.active === false)
    expect(deactivate).toBeDefined()
  })

  test('timeout/network error → FAILED retryable', async () => {
    mockPrisma.webhookDelivery.findUnique.mockResolvedValue(mockDelivery())
    global.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED')
    }) as never

    const r = await processWebhookDelivery('del_1')

    expect(r.status).toBe('FAILED')
    expect(r.error).toMatch(/ECONNREFUSED/)
  })
})

describe('processPendingDeliveries', () => {
  test('procesa batch y agrega resumen', async () => {
    mockPrisma.webhookDelivery.findMany.mockResolvedValue([
      { id: 'd1' },
      { id: 'd2' },
    ])

    // Mock processWebhookDelivery via re-mock de findUnique
    let call = 0
    mockPrisma.webhookDelivery.findUnique.mockImplementation(async () => {
      call += 1
      return {
        id: `d${call}`,
        eventName: 'x',
        eventId: 'e',
        attempts: 0,
        status: 'PENDING',
        payload: {},
        createdAt: new Date(),
        subscription: { id: 's', url: 'https://x', secret: 's', active: true },
      }
    })
    global.fetch = vi.fn(async () => new Response('ok', { status: 200 })) as never

    const r = await processPendingDeliveries(50)

    expect(r.processed).toBe(2)
    expect(r.successes).toBe(2)
    expect(r.failures).toBe(0)
    expect(r.deadLetters).toBe(0)
  })
})
