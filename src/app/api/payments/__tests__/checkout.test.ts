/**
 * Tests for POST /api/payments/checkout
 *
 * The route is wrapped with withRole('OWNER'), which internally calls
 * getAuthContext() from @/lib/auth. We mock that to bypass Clerk.
 *
 * The handler:
 *   1. Parses { planId, token } from request body
 *   2. Validates planId with isValidPaidPlan (must be STARTER | EMPRESA | PRO)
 *   3. Fetches the org from prisma
 *   4. Rejects if org.plan === planId (already on that plan)
 *   5. Calls createCharge() from culqi
 *   6. Runs $transaction to update org plan + upsert subscription
 *   7. Creates audit log (fire-and-forget — errors don't block response)
 *   8. Returns { success, data: { chargeId, plan, planName, amount, ... } }
 */

import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures variables exist when vi.mock factories run
// ---------------------------------------------------------------------------

const { mockGetAuthContext, mockPrisma, mockCreateCharge } = vi.hoisted(() => {
  const mockGetAuthContext = vi.fn()
  const mockPrisma = {
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  const mockCreateCharge = vi.fn()
  return { mockGetAuthContext, mockPrisma, mockCreateCharge }
})

vi.mock('@/lib/auth', () => ({
  getAuthContext: (...args: unknown[]) => mockGetAuthContext(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/payments/culqi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/payments/culqi')>()
  return {
    ...actual,
    createCharge: (...args: unknown[]) => mockCreateCharge(...args),
  }
})

// ---------------------------------------------------------------------------
// Import the handler AFTER mocks are set up
// ---------------------------------------------------------------------------

import { POST } from '../checkout/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AUTH_CTX = {
  userId: 'user-1',
  clerkId: 'clerk-1',
  orgId: 'org-1',
  email: 'owner@test.pe',
  role: 'OWNER',
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/payments/checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue(AUTH_CTX)
  })

  // ---- Validation tests ----

  it('returns 400 if planId is missing from body', async () => {
    const req = makeRequest({ token: 'tok_test' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/planId/i)
  })

  it('returns 400 if token is missing from body', async () => {
    const req = makeRequest({ planId: 'PRO' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/token/i)
  })

  it('returns 400 for invalid planId (e.g. "GOLD")', async () => {
    const req = makeRequest({ planId: 'GOLD', token: 'tok_test' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/[Pp]lan inv[aá]lido/i)
  })

  it('returns 400 if org already has the requested plan', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Test Corp',
      plan: 'PRO',
    })

    const req = makeRequest({ planId: 'PRO', token: 'tok_test' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/[Yy]a tienes este plan/i)
  })

  // ---- Success test ----

  it('successful checkout updates org plan and returns charge data', async () => {
    mockPrisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Test Corp',
      plan: 'FREE',
    })

    const mockCharge = {
      id: 'chr_abc123',
      amount: 69900,
      currency: 'PEN',
    }
    mockCreateCharge.mockResolvedValue(mockCharge)
    mockPrisma.$transaction.mockResolvedValue([{}, {}])
    mockPrisma.auditLog.create.mockResolvedValue({})

    const req = makeRequest({ planId: 'PRO', token: 'tok_live_xxx' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.chargeId).toBe('chr_abc123')
    expect(json.data.plan).toBe('PRO')
    expect(json.data.planName).toBe('Pro')
    expect(json.data.amount).toBe(699)
    expect(json.data.currency).toBe('PEN')
    expect(json.data.periodStart).toBeDefined()
    expect(json.data.periodEnd).toBeDefined()

    // Verify createCharge was called with correct args
    expect(mockCreateCharge).toHaveBeenCalledWith(
      'tok_live_xxx',       // token
      69900,                // priceInCentimos for PRO
      'owner@test.pe',      // ctx.email
      expect.stringContaining('Plan Pro'), // description includes plan name
      expect.objectContaining({
        orgId: 'org-1',
        planId: 'PRO',
        userId: 'user-1',
      }),
    )

    // Verify $transaction was called (org update + subscription upsert)
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    const txCalls = mockPrisma.$transaction.mock.calls[0][0]
    expect(txCalls).toHaveLength(2)

    // Verify audit log was created
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org-1',
          userId: 'user-1',
          action: 'payment.processed',
          entityType: 'Subscription',
          entityId: 'chr_abc123',
        }),
      }),
    )
  })
})
