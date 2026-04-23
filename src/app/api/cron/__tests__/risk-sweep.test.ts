/**
 * Tests for GET /api/cron/risk-sweep
 *
 * This cron runs the risk-monitor agent for all organizations.
 * Behavior:
 *   - Returns 401 if CRON_SECRET is missing or authorization doesn't match
 *   - Fetches all orgs and runs runAgent('risk-monitor', ...) for each
 *   - Returns { success, organizationsScanned, summary, runAt }
 *   - On agent error for an org, pushes findings: -1 (does not abort)
 */

import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockRunAgent } = vi.hoisted(() => {
  const mockPrisma = {
    organization: {
      findMany: vi.fn(),
    },
  }
  const mockRunAgent = vi.fn()
  return { mockPrisma, mockRunAgent }
})

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/agents/runtime', () => ({
  runAgent: (...args: unknown[]) => mockRunAgent(...args),
}))

// ---------------------------------------------------------------------------
// Import handler AFTER mocks
// ---------------------------------------------------------------------------

import { GET } from '../risk-sweep/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CRON_SECRET = 'risk-sweep-test-secret'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/cron/risk-sweep', {
    method: 'GET',
    headers,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/risk-sweep', () => {
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

  it('returns 401 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET

    const res = await GET(makeRequest('Bearer anything'))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBeDefined()
    expect(mockPrisma.organization.findMany).not.toHaveBeenCalled()
  })

  it('returns 401 with wrong authorization header', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBeDefined()
  })

  it('returns 401 with no authorization header', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBeDefined()
  })

  // -- Success tests --

  it('returns 200 with summary when auth is valid', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: 'org-1' },
      { id: 'org-2' },
    ])
    mockRunAgent.mockResolvedValue({
      data: { findings: [{ id: 'f1' }, { id: 'f2' }], exposicionTotalSoles: 15000 },
    })

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.organizationsScanned).toBe(2)
    expect(json.runAt).toBeDefined()
    expect(json.summary).toHaveLength(2)
    expect(json.summary[0]).toEqual({
      orgId: 'org-1',
      findings: 2,
      exposicion: 15000,
    })
  })

  it('empty org list returns summary with 0 findings', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([])

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.organizationsScanned).toBe(0)
    expect(json.summary).toEqual([])
  })

  it('calls runAgent with correct parameters for each org', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org-abc' }])
    mockRunAgent.mockResolvedValue({
      data: { findings: [], exposicionTotalSoles: 0 },
    })

    await GET(makeRequest(`Bearer ${CRON_SECRET}`))

    expect(mockRunAgent).toHaveBeenCalledTimes(1)
    expect(mockRunAgent).toHaveBeenCalledWith(
      'risk-monitor',
      { type: 'json' },
      { orgId: 'org-abc', userId: 'system-cron' },
    )
  })

  it('handles agent errors gracefully with findings: -1', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: 'org-ok' },
      { id: 'org-fail' },
    ])

    mockRunAgent
      .mockResolvedValueOnce({
        data: { findings: [{ id: 'f1' }], exposicionTotalSoles: 5000 },
      })
      .mockRejectedValueOnce(new Error('Agent timeout'))

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.organizationsScanned).toBe(2)
    expect(json.summary).toHaveLength(2)

    // First org succeeded
    expect(json.summary[0]).toEqual({
      orgId: 'org-ok',
      findings: 1,
      exposicion: 5000,
    })

    // Second org failed — findings: -1 signals error
    expect(json.summary[1]).toEqual({
      orgId: 'org-fail',
      findings: -1,
      exposicion: 0,
    })
  })
})
