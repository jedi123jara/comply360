/**
 * Tests for GET /api/cron/check-trials
 *
 * This cron runs daily and downgrades orgs whose trial period has expired.
 * Behavior:
 *   - 503 if CRON_SECRET env var is not configured
 *   - 401 if authorization header doesn't match Bearer ${CRON_SECRET}
 *   - Finds orgs with planExpiresAt < now AND plan in ['EMPRESA', 'PRO']
 *   - Only downgrades if subscription status is TRIALING (not ACTIVE)
 *   - Downgrades to plan 'FREE' (not STARTER)
 *   - Sends email to org.alertEmail if present
 *   - Returns { checked, downgraded, timestamp }
 */

import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockSendEmail } = vi.hoisted(() => {
  const mockPrisma = {
    organization: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      update: vi.fn(),
    },
  }
  const mockSendEmail = vi.fn()
  return { mockPrisma, mockSendEmail }
})

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

// ---------------------------------------------------------------------------
// Import handler AFTER mocks
// ---------------------------------------------------------------------------

import { GET } from '../check-trials/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CRON_SECRET = 'test-cron-secret-12345'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/cron/check-trials', {
    method: 'GET',
    headers,
  })
}

function makeOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: 'org-1',
    name: 'Test Corp',
    razonSocial: 'Test Corp SAC',
    alertEmail: 'admin@test.pe',
    plan: 'PRO',
    planExpiresAt: new Date('2026-04-01'),
    subscription: {
      id: 'sub-1',
      status: 'TRIALING',
    },
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/check-trials', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.CRON_SECRET = originalEnv
    } else {
      delete process.env.CRON_SECRET
    }
  })

  // -- Auth tests --

  it('returns 503 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(503)
    expect(json.error).toMatch(/CRON_SECRET/i)
    expect(mockPrisma.organization.findMany).not.toHaveBeenCalled()
  })

  it('returns 401 with wrong authorization header', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/[Uu]nauthorized/)
    expect(mockPrisma.organization.findMany).not.toHaveBeenCalled()
  })

  it('returns 401 with no authorization header', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/[Uu]nauthorized/)
  })

  // -- Business logic tests --

  it('finds expired trials and downgrades to FREE', async () => {
    const org = makeOrg()
    mockPrisma.organization.findMany.mockResolvedValue([org])
    mockPrisma.organization.update.mockResolvedValue({})
    mockPrisma.subscription.update.mockResolvedValue({})
    mockSendEmail.mockResolvedValue({ success: true })

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.checked).toBe(1)
    expect(json.downgraded).toBe(1)
    expect(json.timestamp).toBeDefined()

    // Verify org was downgraded to FREE
    expect(mockPrisma.organization.update).toHaveBeenCalledWith({
      where: { id: 'org-1' },
      data: {
        plan: 'FREE',
        planExpiresAt: null,
      },
    })

    // Verify subscription was cancelled
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: expect.objectContaining({
        status: 'CANCELLED',
      }),
    })
  })

  it('does NOT downgrade if subscription status is ACTIVE (paid user)', async () => {
    const org = makeOrg({
      subscription: { id: 'sub-1', status: 'ACTIVE' },
    })
    mockPrisma.organization.findMany.mockResolvedValue([org])

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.checked).toBe(1)
    expect(json.downgraded).toBe(0)

    // Should NOT have updated org or subscription
    expect(mockPrisma.organization.update).not.toHaveBeenCalled()
    expect(mockPrisma.subscription.update).not.toHaveBeenCalled()
  })

  it('does NOT touch FREE or STARTER orgs (query only targets EMPRESA/PRO)', async () => {
    // The query filters by plan: { in: ['EMPRESA', 'PRO'] },
    // so FREE/STARTER orgs should never be returned by findMany.
    // We verify the query parameters.
    mockPrisma.organization.findMany.mockResolvedValue([])

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.checked).toBe(0)
    expect(json.downgraded).toBe(0)

    // Verify the query uses the correct plan filter
    expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          plan: { in: ['EMPRESA', 'PRO'] },
        }),
      }),
    )
  })

  it('sends email to org.alertEmail on downgrade', async () => {
    const org = makeOrg({ alertEmail: 'rrhh@empresa.pe' })
    mockPrisma.organization.findMany.mockResolvedValue([org])
    mockPrisma.organization.update.mockResolvedValue({})
    mockPrisma.subscription.update.mockResolvedValue({})
    mockSendEmail.mockResolvedValue({ success: true })

    await GET(makeRequest(`Bearer ${CRON_SECRET}`))

    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'rrhh@empresa.pe',
        subject: expect.stringContaining('prueba gratuita'),
      }),
    )
  })

  it('does NOT send email when org has no alertEmail', async () => {
    const org = makeOrg({ alertEmail: null })
    mockPrisma.organization.findMany.mockResolvedValue([org])
    mockPrisma.organization.update.mockResolvedValue({})
    mockPrisma.subscription.update.mockResolvedValue({})

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.downgraded).toBe(1)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('returns correct checked/downgraded counts with mixed orgs', async () => {
    const orgs = [
      makeOrg({ id: 'org-1', subscription: { id: 's1', status: 'TRIALING' } }),
      makeOrg({ id: 'org-2', subscription: { id: 's2', status: 'ACTIVE' } }),
      makeOrg({ id: 'org-3', subscription: { id: 's3', status: 'TRIALING' }, alertEmail: null }),
      makeOrg({ id: 'org-4', subscription: null }), // no subscription
    ]
    mockPrisma.organization.findMany.mockResolvedValue(orgs)
    mockPrisma.organization.update.mockResolvedValue({})
    mockPrisma.subscription.update.mockResolvedValue({})
    mockSendEmail.mockResolvedValue({ success: true })

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.checked).toBe(4)
    // Only org-1 and org-3 have TRIALING status; org-2 is ACTIVE, org-4 has no sub
    expect(json.downgraded).toBe(2)
    // Only org-1 has alertEmail, org-3 has null
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
  })
})
