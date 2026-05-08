/**
 * Tests for GET /api/cron/daily-alerts
 *
 * This is a 422-line cron with sections for:
 *   0. Auto-mark expired contracts
 *   1. Contracts expiring within 7 days
 *   2. Overdue SST records
 *   3. CTS deadline proximity
 *   4. Complaint deadline alerts
 *   + Aggregate and send one email per org + push notifications
 *
 * These tests focus on auth, structure, and basic response shape.
 * Internal query logic depends heavily on DB state and date math.
 */

import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockPrisma, mockSendEmail, mockAlertEmail, mockSendPushToOrg, mockDiasLaborables } =
  vi.hoisted(() => {
    const mockPrisma = {
      contract: {
        updateMany: vi.fn(),
        findMany: vi.fn(),
      },
      sstRecord: {
        findMany: vi.fn(),
      },
      organization: {
        findMany: vi.fn(),
      },
      complaint: {
        findMany: vi.fn(),
      },
    }
    const mockSendEmail = vi.fn()
    const mockAlertEmail = vi.fn()
    const mockSendPushToOrg = vi.fn()
    const mockDiasLaborables = vi.fn()
    return { mockPrisma, mockSendEmail, mockAlertEmail, mockSendPushToOrg, mockDiasLaborables }
  })

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/email/client', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}))

vi.mock('@/lib/email/templates', () => ({
  alertEmail: (...args: unknown[]) => mockAlertEmail(...args),
}))

vi.mock('@/lib/notifications/web-push-server', () => ({
  sendPushToOrg: (...args: unknown[]) => mockSendPushToOrg(...args),
}))

vi.mock('@/lib/legal-engine/feriados-peru', () => ({
  diasLaborables: (...args: unknown[]) => mockDiasLaborables(...args),
}))

// FIX #5.A: el cron ahora usa claimCronRun para idempotencia. En tests
// siempre dejamos pasar (acquired:true) para que la lógica del handler corra.
vi.mock('@/lib/cron/idempotency', () => ({
  claimCronRun: vi.fn().mockResolvedValue({ acquired: true, runId: 'test-run', bucket: '202605' }),
  completeCronRun: vi.fn().mockResolvedValue(undefined),
  failCronRun: vi.fn().mockResolvedValue(undefined),
}))

// ---------------------------------------------------------------------------
// Import handler AFTER mocks
// ---------------------------------------------------------------------------

import { GET } from '../daily-alerts/route'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CRON_SECRET = 'daily-alerts-test-secret'

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {}
  if (authHeader !== undefined) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/cron/daily-alerts', {
    method: 'GET',
    headers,
  })
}

/** Set all prisma mocks to return empty results (no alerts to send) */
function mockEmptyState() {
  mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 })
  mockPrisma.contract.findMany.mockResolvedValue([])
  mockPrisma.sstRecord.findMany.mockResolvedValue([])
  mockPrisma.organization.findMany.mockResolvedValue([])
  mockPrisma.complaint.findMany.mockResolvedValue([])
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/cron/daily-alerts', () => {
  const originalEnv = process.env.CRON_SECRET

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = CRON_SECRET
    mockAlertEmail.mockReturnValue('<html>alert</html>')
    mockSendPushToOrg.mockResolvedValue({ sent: 0, failed: 0 })
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
    expect(json.error).toBeDefined()
    expect(mockPrisma.contract.updateMany).not.toHaveBeenCalled()
  })

  it('returns 401 with invalid authorization', async () => {
    const res = await GET(makeRequest('Bearer wrong-secret'))
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toMatch(/[Uu]nauthorized/)
  })

  it('returns 401 with no authorization header', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBeDefined()
  })

  // -- Structure tests --

  it('returns 200 with summary object when auth is valid', async () => {
    mockEmptyState()

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.summary).toBeDefined()

    // Verify the summary shape matches route output
    const s = json.summary
    expect(typeof s.contractsAutoExpired).toBe('number')
    expect(typeof s.expiringContracts).toBe('number')
    expect(typeof s.overdueSst).toBe('number')
    expect(typeof s.ctsDeadlineActive).toBe('boolean')
    expect(typeof s.complaintDeadlineAlerts).toBe('number')
    expect(typeof s.orgsNotified).toBe('number')
    expect(typeof s.emailsSent).toBe('number')
    expect(typeof s.emailsFailed).toBe('number')
    expect(typeof s.pushesSent).toBe('number')
    expect(typeof s.pushesFailed).toBe('number')
  })

  it('calls all prisma queries for each section', async () => {
    mockEmptyState()

    await GET(makeRequest(`Bearer ${CRON_SECRET}`))

    // Section 0: auto-expire contracts
    expect(mockPrisma.contract.updateMany).toHaveBeenCalledTimes(1)
    // Section 1: expiring contracts
    expect(mockPrisma.contract.findMany).toHaveBeenCalled()
    // Section 2: overdue SST
    expect(mockPrisma.sstRecord.findMany).toHaveBeenCalled()
    // Section 4: complaints
    expect(mockPrisma.complaint.findMany).toHaveBeenCalled()
  })

  it('the handler imports diasLaborables from feriados-peru', async () => {
    // The import of diasLaborables is used in complaint deadline calculations.
    // We verify that the mock was set up and would be called when complaints exist.
    // The fact that the route module loaded successfully with our mock proves
    // the import path '@/lib/legal-engine/feriados-peru' is correct.
    expect(mockDiasLaborables).toBeDefined()

    // Set up a complaint that triggers the diasLaborables call
    mockPrisma.contract.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.contract.findMany.mockResolvedValue([])
    mockPrisma.sstRecord.findMany.mockResolvedValue([])
    mockPrisma.organization.findMany.mockResolvedValue([])

    const received = new Date()
    received.setDate(received.getDate() - 2) // received 2 days ago
    mockPrisma.complaint.findMany.mockResolvedValue([
      {
        id: 'c1',
        code: 'DENUNCIA-2026-001',
        status: 'RECEIVED',
        receivedAt: received,
        organization: { id: 'org-1', name: 'Test', alertEmail: 'test@test.pe' },
      },
    ])

    await GET(makeRequest(`Bearer ${CRON_SECRET}`))

    // diasLaborables should have been called for the complaint
    expect(mockDiasLaborables).toHaveBeenCalled()
  })

  it('returns zeroed summary when no data exists', async () => {
    mockEmptyState()

    const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`))
    const json = await res.json()

    expect(json.summary.contractsAutoExpired).toBe(0)
    expect(json.summary.expiringContracts).toBe(0)
    expect(json.summary.overdueSst).toBe(0)
    expect(json.summary.complaintDeadlineAlerts).toBe(0)
    expect(json.summary.orgsNotified).toBe(0)
    expect(json.summary.emailsSent).toBe(0)
    expect(json.summary.emailsFailed).toBe(0)
  })
})
