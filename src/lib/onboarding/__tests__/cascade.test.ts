/**
 * Tests for src/lib/onboarding/cascade.ts
 *
 * runOnboardingCascade      — single worker onboarding cascade
 * runOnboardingCascadeBatch — batch wrapper
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const {
  mockWorkerFindUnique,
  mockAuditLogFindFirst,
  mockAuditLogCreate,
  mockOrgDocumentCount,
  mockWorkerDocumentFindMany,
  mockWorkerRequestFindMany,
  mockWorkerRequestCreate,
  mockOrgFindUnique,
  mockSendEmail,
  mockWorkerOnboardingEmail,
} = vi.hoisted(() => ({
  mockWorkerFindUnique: vi.fn(),
  mockAuditLogFindFirst: vi.fn(),
  mockAuditLogCreate: vi.fn(),
  mockOrgDocumentCount: vi.fn(),
  mockWorkerDocumentFindMany: vi.fn(),
  mockWorkerRequestFindMany: vi.fn(),
  mockWorkerRequestCreate: vi.fn(),
  mockOrgFindUnique: vi.fn(),
  mockSendEmail: vi.fn(),
  mockWorkerOnboardingEmail: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    worker: { findUnique: mockWorkerFindUnique },
    auditLog: { findFirst: mockAuditLogFindFirst, create: mockAuditLogCreate },
    orgDocument: { count: mockOrgDocumentCount },
    workerDocument: { findMany: mockWorkerDocumentFindMany },
    workerRequest: { findMany: mockWorkerRequestFindMany, create: mockWorkerRequestCreate },
    organization: { findUnique: mockOrgFindUnique },
  },
}))

vi.mock('@/lib/email', () => ({
  sendEmail: mockSendEmail,
}))

vi.mock('@/lib/email/templates', () => ({
  workerOnboardingEmail: mockWorkerOnboardingEmail,
}))

// Import AFTER mocks
import { runOnboardingCascade, runOnboardingCascadeBatch } from '../cascade'

// ── Helpers ────────────────────────────────────────────────────────────────

function buildWorker(overrides: Record<string, unknown> = {}) {
  return {
    id: 'w1',
    orgId: 'org1',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria@example.com',
    status: 'ACTIVE',
    fechaIngreso: new Date('2025-06-01'),
    ...overrides,
  }
}

// ── Setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // Sensible defaults — most tests override what they need
  mockWorkerFindUnique.mockResolvedValue(buildWorker())
  mockAuditLogFindFirst.mockResolvedValue(null) // no previous cascade
  mockAuditLogCreate.mockResolvedValue({ id: 'audit-1' })
  mockOrgDocumentCount.mockResolvedValue(3)
  mockWorkerDocumentFindMany.mockResolvedValue([]) // no docs uploaded yet
  mockWorkerRequestFindMany.mockResolvedValue([]) // no existing requests
  mockWorkerRequestCreate.mockResolvedValue({ id: 'req-1' })
  mockOrgFindUnique.mockResolvedValue({ name: 'Acme', razonSocial: 'Acme SAC' })
  mockSendEmail.mockResolvedValue({ success: true, id: 'email-1' })
  mockWorkerOnboardingEmail.mockReturnValue('<html>email</html>')
})

// ═══════════════════════════════════════════════════════════════════════════
// runOnboardingCascade
// ═══════════════════════════════════════════════════════════════════════════

describe('runOnboardingCascade', () => {
  // ── Worker not found ──────────────────────────────────────────────────

  it('returns skipped result when worker not found', async () => {
    mockWorkerFindUnique.mockResolvedValue(null)

    const result = await runOnboardingCascade('nonexistent')

    expect(result.success).toBe(false)
    expect(result.skipReason).toContain('not found')
    expect(result.documentsPublished).toBe(0)
  })

  // ── Terminated worker ─────────────────────────────────────────────────

  it('returns skipped for TERMINATED worker', async () => {
    mockWorkerFindUnique.mockResolvedValue(buildWorker({ status: 'TERMINATED' }))

    const result = await runOnboardingCascade('w1')

    expect(result.success).toBe(false)
    expect(result.skipped).toBe(true)
    expect(result.skipReason).toContain('terminated')
  })

  // ── Idempotency ───────────────────────────────────────────────────────

  it('skips when cascade was already executed (idempotency)', async () => {
    mockAuditLogFindFirst.mockResolvedValue({
      id: 'prev-audit',
      createdAt: new Date('2026-04-01'),
    })

    const result = await runOnboardingCascade('w1')

    expect(result.skipped).toBe(true)
    expect(result.skipReason).toContain('Ya ejecutada')
    expect(result.success).toBe(false)
  })

  it('runs when force=true even if previously executed', async () => {
    mockAuditLogFindFirst.mockResolvedValue({
      id: 'prev-audit',
      createdAt: new Date('2026-04-01'),
    })

    const result = await runOnboardingCascade('w1', { force: true })

    expect(result.success).toBe(true)
    expect(result.skipped).toBe(false)
    // Should have created a new AuditLog
    expect(mockAuditLogCreate).toHaveBeenCalled()
  })

  // ── WorkerRequest creation ────────────────────────────────────────────

  it('creates WorkerRequest entries for missing worker-uploaded docs', async () => {
    // Worker has no documents uploaded
    mockWorkerDocumentFindMany.mockResolvedValue([])
    // No existing requests
    mockWorkerRequestFindMany.mockResolvedValue([])

    const result = await runOnboardingCascade('w1')

    expect(result.success).toBe(true)
    // WORKER_UPLOADED_DOCS has 5 items: cv, dni_copia, declaracion_jurada,
    // examen_medico_ingreso, afp_onp_afiliacion
    expect(result.requestsCreated).toBe(5)
    expect(mockWorkerRequestCreate).toHaveBeenCalledTimes(5)
  })

  it('does NOT create duplicate WorkerRequest for same doc type', async () => {
    // Worker already uploaded cv and dni_copia
    mockWorkerDocumentFindMany.mockResolvedValue([
      { documentType: 'cv' },
      { documentType: 'dni_copia' },
    ])

    // An existing active request for declaracion_jurada
    mockWorkerRequestFindMany.mockResolvedValue([
      {
        description: 'Por favor subi declaracion jurada de domicilio a tu portal en Comply360. [doc:declaracion_jurada]',
      },
    ])

    const result = await runOnboardingCascade('w1')

    // 5 worker-uploaded types - 2 already uploaded - 1 already requested = 2
    expect(result.requestsCreated).toBe(2)
    expect(mockWorkerRequestCreate).toHaveBeenCalledTimes(2)
  })

  // ── Email sending ─────────────────────────────────────────────────────

  it('sends email when worker has email and sendEmail is not false', async () => {
    const result = await runOnboardingCascade('w1')

    expect(result.emailSent).toBe(true)
    expect(mockSendEmail).toHaveBeenCalledTimes(1)
    expect(mockWorkerOnboardingEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        workerName: 'Maria Garcia',
        orgName: 'Acme SAC',
      }),
    )
  })

  it('does NOT send email when sendEmail=false', async () => {
    const result = await runOnboardingCascade('w1', { sendEmail: false })

    expect(result.emailSent).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  it('does NOT send email when worker has no email', async () => {
    mockWorkerFindUnique.mockResolvedValue(buildWorker({ email: null }))

    const result = await runOnboardingCascade('w1')

    expect(result.emailSent).toBe(false)
    expect(mockSendEmail).not.toHaveBeenCalled()
  })

  // ── AuditLog ──────────────────────────────────────────────────────────

  it('creates AuditLog with action ONBOARDING_CASCADE_EXECUTED', async () => {
    await runOnboardingCascade('w1', { triggeredBy: 'admin-user', contractId: 'c1' })

    expect(mockAuditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: 'org1',
          userId: 'admin-user',
          action: 'ONBOARDING_CASCADE_EXECUTED',
          entityType: 'Worker',
          entityId: 'w1',
          metadataJson: expect.objectContaining({
            contractId: 'c1',
          }),
        }),
      }),
    )
  })

  // ── Return values ─────────────────────────────────────────────────────

  it('returns correct counts in result', async () => {
    mockOrgDocumentCount.mockResolvedValue(7)
    mockWorkerDocumentFindMany.mockResolvedValue([
      { documentType: 'cv' },
    ])
    mockWorkerRequestFindMany.mockResolvedValue([])

    const result = await runOnboardingCascade('w1')

    expect(result.success).toBe(true)
    expect(result.workerId).toBe('w1')
    expect(result.documentsPublished).toBe(7)
    // 5 worker-uploaded - 1 already uploaded = 4
    expect(result.requestsCreated).toBe(4)
    expect(result.emailSent).toBe(true)
    expect(result.auditLogId).toBe('audit-1')
    expect(result.skipped).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// runOnboardingCascadeBatch
// ═══════════════════════════════════════════════════════════════════════════

describe('runOnboardingCascadeBatch', () => {
  it('processes multiple workers and aggregates totals', async () => {
    // w1 succeeds, w2 not found (fails), w3 already run (skipped)
    mockWorkerFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
      if (where.id === 'w2') return null
      return buildWorker({ id: where.id })
    })

    mockAuditLogFindFirst.mockImplementation(
      async ({ where }: { where: { entityId: string } }) => {
        if (where.entityId === 'w3') return { id: 'prev', createdAt: new Date() }
        return null
      },
    )

    const batch = await runOnboardingCascadeBatch(['w1', 'w2', 'w3'])

    expect(batch.results).toHaveLength(3)
    expect(batch.totals.success).toBe(1)
    expect(batch.totals.skipped).toBe(1)
    expect(batch.totals.failed).toBe(1)
  })
})
