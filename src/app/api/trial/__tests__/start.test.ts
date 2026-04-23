/**
 * Tests for POST /api/trial/start
 *
 * The route is wrapped with withRole('OWNER'), which internally calls
 * getAuthContext() from @/lib/auth. We mock that to bypass Clerk.
 *
 * The handler:
 *   1. Checks AuditLog for previous 'trial.started' — rejects with 409 if found
 *   2. Fetches org and checks plan is FREE or STARTER — rejects with 409 otherwise
 *   3. Runs $transaction: update org (plan=PRO, planExpiresAt=+14d),
 *      upsert subscription (status=TRIALING), create auditLog (trial.started)
 *   4. Returns { success, plan, trialEnd, trialDays, message }
 */

import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted ensures variables exist when vi.mock factories run
// ---------------------------------------------------------------------------

const { mockGetAuthContext, mockPrisma } = vi.hoisted(() => {
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
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  return { mockGetAuthContext, mockPrisma }
})

vi.mock('@/lib/auth', () => ({
  getAuthContext: (...args: unknown[]) => mockGetAuthContext(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// ---------------------------------------------------------------------------
// Import the handler AFTER mocks are set up
// ---------------------------------------------------------------------------

import { POST } from '../start/route'

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

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/trial/start', {
    method: 'POST',
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/trial/start', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue(AUTH_CTX)
  })

  it('returns 409 if trial was already used', async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue({
      id: 'audit-prev',
      createdAt: new Date('2026-04-01T10:00:00Z'),
    })

    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/[Yy]a usaste/i)
    expect(json.code).toBe('TRIAL_ALREADY_USED')
    expect(json.upgradeUrl).toBe('/dashboard/planes')

    // Should NOT have checked org or run transaction
    expect(mockPrisma.organization.findUnique).not.toHaveBeenCalled()
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns 409 if org plan is already PRO', async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue({
      plan: 'PRO',
      name: 'Test Corp',
      razonSocial: 'Test Corp SAC',
    })

    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.error).toMatch(/PRO/i)
    expect(json.code).toBe('PLAN_NOT_ELIGIBLE')
    expect(json.currentPlan).toBe('PRO')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('returns 409 if org plan is EMPRESA', async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue({
      plan: 'EMPRESA',
      name: 'Big Corp',
      razonSocial: 'Big Corp SAC',
    })

    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe('PLAN_NOT_ELIGIBLE')
    expect(json.currentPlan).toBe('EMPRESA')
  })

  it('successful trial sets plan=PRO and planExpiresAt in the future', async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue({
      plan: 'FREE',
      name: 'Startup',
      razonSocial: 'Startup SAC',
    })
    mockPrisma.$transaction.mockResolvedValue([{}, {}, {}])

    const beforeCall = Date.now()
    const res = await POST(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.plan).toBe('PRO')
    expect(json.trialDays).toBe(14)

    // trialEnd should be ~14 days from now
    const trialEnd = new Date(json.trialEnd)
    const diffDays = (trialEnd.getTime() - beforeCall) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeGreaterThan(13)
    expect(diffDays).toBeLessThan(15)

    // Verify $transaction was called with 3 operations
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1)
    const txCalls = mockPrisma.$transaction.mock.calls[0][0]
    expect(txCalls).toHaveLength(3)
  })

  it('creates audit log with action trial.started in the transaction', async () => {
    mockPrisma.auditLog.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue({
      plan: 'STARTER',
      name: 'Small Co',
      razonSocial: 'Small Co SAC',
    })
    mockPrisma.$transaction.mockResolvedValue([{}, {}, {}])

    const res = await POST(makeRequest())
    expect(res.status).toBe(200)

    // The transaction array should include an auditLog.create call.
    // Since $transaction receives an array of PrismaPromises, we verify
    // that auditLog.create was called with the correct args (it produces
    // the PrismaPromise that goes into the array).
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org-1',
          userId: 'user-1',
          action: 'trial.started',
          entityType: 'Organization',
          entityId: 'org-1',
          metadataJson: expect.objectContaining({
            plan: 'PRO',
            trialDays: 14,
          }),
        }),
      }),
    )
  })
})
