// =============================================
// Tests for src/lib/payments/culqi.ts
// =============================================

import {
  CULQI_PLANS,
  CulqiPaymentError,
  CulqiService,
  getPlanDetails,
  isValidPaidPlan,
} from '@/lib/payments/culqi'

// =============================================
// CULQI_PLANS structure
// =============================================

describe('CULQI_PLANS', () => {
  it('has exactly 3 entries: STARTER, EMPRESA, PRO', () => {
    const keys = Object.keys(CULQI_PLANS)
    expect(keys).toHaveLength(3)
    expect(keys).toContain('STARTER')
    expect(keys).toContain('EMPRESA')
    expect(keys).toContain('PRO')
  })

  it('each plan has priceInCentimos === priceDisplay * 100', () => {
    for (const plan of Object.values(CULQI_PLANS)) {
      expect(plan.priceInCentimos).toBe(plan.priceDisplay * 100)
    }
  })

  it('all prices are positive integers', () => {
    for (const plan of Object.values(CULQI_PLANS)) {
      expect(plan.priceInCentimos).toBeGreaterThan(0)
      expect(Number.isInteger(plan.priceInCentimos)).toBe(true)
      expect(plan.priceDisplay).toBeGreaterThan(0)
      expect(Number.isInteger(plan.priceDisplay)).toBe(true)
    }
  })

  it('all plans have currency PEN and interval month', () => {
    for (const plan of Object.values(CULQI_PLANS)) {
      expect(plan.currency).toBe('PEN')
      expect(plan.interval).toBe('month')
    }
  })
})

// =============================================
// isValidPaidPlan
// =============================================

describe('isValidPaidPlan', () => {
  it('returns true for STARTER, EMPRESA, PRO', () => {
    expect(isValidPaidPlan('STARTER')).toBe(true)
    expect(isValidPaidPlan('EMPRESA')).toBe(true)
    expect(isValidPaidPlan('PRO')).toBe(true)
  })

  it('returns false for FREE, ENTERPRISE, GOLD, and empty string', () => {
    expect(isValidPaidPlan('FREE')).toBe(false)
    expect(isValidPaidPlan('ENTERPRISE')).toBe(false)
    expect(isValidPaidPlan('GOLD')).toBe(false)
    expect(isValidPaidPlan('')).toBe(false)
  })
})

// =============================================
// getPlanDetails
// =============================================

describe('getPlanDetails', () => {
  it('returns correct plan for valid keys', () => {
    const starter = getPlanDetails('STARTER')
    expect(starter).not.toBeNull()
    expect(starter!.key).toBe('STARTER')
    expect(starter!.priceDisplay).toBe(CULQI_PLANS.STARTER.priceDisplay)

    const empresa = getPlanDetails('EMPRESA')
    expect(empresa).not.toBeNull()
    expect(empresa!.key).toBe('EMPRESA')

    const pro = getPlanDetails('PRO')
    expect(pro).not.toBeNull()
    expect(pro!.key).toBe('PRO')
  })

  it('returns null for invalid keys', () => {
    expect(getPlanDetails('FREE')).toBeNull()
    expect(getPlanDetails('ENTERPRISE')).toBeNull()
    expect(getPlanDetails('GOLD')).toBeNull()
    expect(getPlanDetails('')).toBeNull()
  })
})

// =============================================
// CulqiPaymentError
// =============================================

describe('CulqiPaymentError', () => {
  it('has correct name, code, and statusCode', () => {
    const error = new CulqiPaymentError('Pago rechazado', 'CARD_DECLINED', 402)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CulqiPaymentError)
    expect(error.name).toBe('CulqiPaymentError')
    expect(error.message).toBe('Pago rechazado')
    expect(error.code).toBe('CARD_DECLINED')
    expect(error.statusCode).toBe(402)
  })
})

// =============================================
// CulqiService — Dev mode (no CULQI_SECRET_KEY)
// =============================================

describe('CulqiService (dev mode)', () => {
  const service = new CulqiService()

  beforeEach(() => {
    vi.unstubAllEnvs()
    // Ensure CULQI_SECRET_KEY is NOT set for dev mode
    vi.stubEnv('CULQI_SECRET_KEY', '')
    // Delete so isDevMode() → !process.env.CULQI_SECRET_KEY → true
    delete process.env.CULQI_SECRET_KEY
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('createCharge returns mock with correct shape', async () => {
    const result = await service.createCharge(
      12900,
      'PEN',
      'test@example.com',
      'tok_test_123',
      'Plan Starter',
      { orgId: 'org_1' }
    )

    expect(result.id).toMatch(/^mock_chr_/)
    expect(result.amount).toBe(12900)
    expect(result.currency).toBe('PEN')
    expect(result.email).toBe('test@example.com')
    expect(result.description).toBe('Plan Starter')
    expect(result.source).toBeDefined()
    expect(result.source.last_four).toBe('4242')
    expect(result.outcome).toBeDefined()
    expect(result.outcome.type).toBe('venta_exitosa')
    expect(result.metadata).toEqual({ orgId: 'org_1' })
  })

  it('cancelSubscription returns { id, status: cancelled }', async () => {
    const result = await service.cancelSubscription('sub_abc_123')

    expect(result.id).toBe('sub_abc_123')
    expect(result.status).toBe('cancelled')
  })
})

// =============================================
// CulqiService — Prod mode (with CULQI_SECRET_KEY)
// =============================================

describe('CulqiService (prod mode)', () => {
  const service = new CulqiService()
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('CULQI_SECRET_KEY', 'sk_live_test_secret_key')
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('createCharge calls fetch with correct URL, headers, and payload', async () => {
    const mockResponse = {
      id: 'chr_live_123',
      amount: 29900,
      currency: 'PEN',
      email: 'prod@example.com',
      description: 'Plan Empresa',
      source: {
        object: 'token',
        id: 'tok_live',
        type: 'card',
        card_number: '************1234',
        last_four: '1234',
        active: true,
        iin: {
          card_brand: 'Visa',
          card_type: 'credito',
          issuer: { name: 'BCP', country: 'PE' },
        },
      },
      outcome: {
        type: 'venta_exitosa',
        code: 'AUT0000',
        merchant_message: 'Autorizada',
        user_message: 'Compra exitosa',
      },
      metadata: {},
      creation_date: Date.now(),
      reference_code: 'ref_123',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    })

    const result = await service.createCharge(
      29900,
      'PEN',
      'prod@example.com',
      'tok_live_abc',
      'Plan Empresa'
    )

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, options] = mockFetch.mock.calls[0]
    expect(url).toBe('https://api.culqi.com/v2/charges')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/json')
    expect(options.headers['Authorization']).toBe('Bearer sk_live_test_secret_key')

    const body = JSON.parse(options.body)
    expect(body.token).toBe('tok_live_abc')
    expect(body.amount).toBe(29900)
    expect(body.currency).toBe('PEN')
    expect(body.email).toBe('prod@example.com')
    expect(body.description).toBe('Plan Empresa')

    expect(result.id).toBe('chr_live_123')
  })

  it('createCharge throws CulqiPaymentError on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 402,
      json: async () => ({
        object: 'error',
        type: 'card_error',
        code: 'card_declined',
        merchant_message: 'La tarjeta fue rechazada',
        user_message: 'Su tarjeta fue rechazada. Intente con otra.',
      }),
    })

    await expect(
      service.createCharge(12900, 'PEN', 'fail@example.com', 'tok_bad', 'Test')
    ).rejects.toThrow(CulqiPaymentError)
    // Re-mock and verify error properties
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        object: 'error',
        type: 'invalid_request',
        code: 'invalid_token',
        merchant_message: 'Token invalido',
        user_message: 'Error en el pago, intente nuevamente.',
      }),
    })

    try {
      await service.createCharge(12900, 'PEN', 'fail@example.com', 'tok_bad', 'Test')
      expect.unreachable('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(CulqiPaymentError)
      const culqiErr = err as CulqiPaymentError
      expect(culqiErr.message).toBe('Error en el pago, intente nuevamente.')
      expect(culqiErr.code).toBe('invalid_token')
      expect(culqiErr.statusCode).toBe(422)
    }
  })
})
