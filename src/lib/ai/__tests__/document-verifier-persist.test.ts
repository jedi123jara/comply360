/**
 * Tests para src/lib/ai/document-verifier-persist.ts
 *
 * Cubren:
 *   - auto-verified → patch status=VERIFIED + verifiedBy='ai-v1'
 *   - expiresAt detectado y doc no lo tenía → setear
 *   - expiresAt detectado y doc YA lo tenía → respetar el existente
 *   - suspicionScore >= 0.8 → crear WorkerAlert CRITICAL
 *   - suspicionScore en [0.6, 0.8) → crear WorkerAlert HIGH
 *   - suspicionScore < 0.6 → no crear alerta
 *   - alerta ya existe (resolvedAt=null) → idempotente, no duplica
 */

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    workerDocument: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    workerAlert: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { persistVerification } from '../document-verifier-persist'

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.workerDocument.findUnique.mockResolvedValue({ expiresAt: null })
  mockPrisma.workerDocument.update.mockResolvedValue({})
  mockPrisma.auditLog.create.mockResolvedValue({})
  mockPrisma.workerAlert.findFirst.mockResolvedValue(null)
  mockPrisma.workerAlert.create.mockResolvedValue({})
})

describe('persistVerification — auto-verify', () => {
  test('decision auto-verified setea VERIFIED + verifiedBy=ai-v1', async () => {
    await persistVerification('doc_1', 'w_1', 'u_1', 'org_1', {
      decision: 'auto-verified',
      confidence: 0.95,
      issues: [],
      summary: 'OK',
      model: 'gpt-4o',
    } as never)

    expect(mockPrisma.workerDocument.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'doc_1' },
        data: expect.objectContaining({
          status: 'VERIFIED',
          verifiedBy: 'ai-v1',
          verifiedAt: expect.any(Date),
        }),
      }),
    )
  })

  test('decision needs-review NO marca VERIFIED', async () => {
    await persistVerification('doc_1', 'w_1', 'u_1', 'org_1', {
      decision: 'needs-review',
      confidence: 0.5,
      issues: [],
      summary: '',
      model: 'gpt-4o',
    } as never)

    // Si docPatch quedó vacío, update no se llama
    const updateCalls = mockPrisma.workerDocument.update.mock.calls
    if (updateCalls.length > 0) {
      const data = updateCalls[0][0].data
      expect(data.status).not.toBe('VERIFIED')
    }
  })
})

describe('persistVerification — expiresAt auto-detection', () => {
  test('aplica expiresAt si IA lo detectó y doc no lo tenía', async () => {
    mockPrisma.workerDocument.findUnique.mockResolvedValue({ expiresAt: null })

    await persistVerification('doc_2', 'w_1', 'u_1', 'org_1', {
      decision: 'auto-verified',
      confidence: 0.9,
      issues: [],
      summary: '',
      model: 'gpt-4o',
      expiresAt: '2027-06-15',
    } as never)

    const updateCall = mockPrisma.workerDocument.update.mock.calls[0]
    expect(updateCall[0].data.expiresAt).toEqual(new Date('2027-06-15T00:00:00Z'))
  })

  test('NO sobreescribe expiresAt si el doc ya lo tenía', async () => {
    const existing = new Date('2026-01-01T00:00:00Z')
    mockPrisma.workerDocument.findUnique.mockResolvedValue({ expiresAt: existing })

    await persistVerification('doc_3', 'w_1', 'u_1', 'org_1', {
      decision: 'auto-verified',
      confidence: 0.9,
      issues: [],
      summary: '',
      model: 'gpt-4o',
      expiresAt: '2027-06-15',
    } as never)

    const updateCall = mockPrisma.workerDocument.update.mock.calls[0]
    expect(updateCall[0].data.expiresAt).toBeUndefined()
  })
})

describe('persistVerification — anti-fraude WorkerAlert', () => {
  test('suspicionScore=0.85 → crea WorkerAlert CRITICAL', async () => {
    await persistVerification('doc_4', 'w_99', 'u_1', 'org_X', {
      decision: 'needs-review',
      confidence: 0.4,
      issues: ['firma sospechosa'],
      summary: 'Posible manipulación digital',
      model: 'gpt-4o',
      suspicionScore: 0.85,
      suspicionFlags: ['fontMismatch', 'edgeArtifacts'],
    } as never)

    expect(mockPrisma.workerAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workerId: 'w_99',
          orgId: 'org_X',
          type: 'DOCUMENTO_SOSPECHOSO',
          severity: 'CRITICAL',
          title: expect.stringContaining('manipulación'),
          description: expect.stringContaining('doc_4'),
        }),
      }),
    )
  })

  test('suspicionScore=0.65 → crea alerta HIGH (no CRITICAL)', async () => {
    await persistVerification('doc_5', 'w_88', 'u_1', 'org_X', {
      decision: 'needs-review',
      confidence: 0.5,
      issues: [],
      summary: '',
      model: 'gpt-4o',
      suspicionScore: 0.65,
      suspicionFlags: ['watermarkAbsent'],
    } as never)

    const callData = mockPrisma.workerAlert.create.mock.calls[0]?.[0].data
    expect(callData?.severity).toBe('HIGH')
    expect(callData?.type).toBe('DOCUMENTO_SOSPECHOSO')
  })

  test('suspicionScore=0.4 → NO crea alerta', async () => {
    await persistVerification('doc_6', 'w_77', 'u_1', 'org_X', {
      decision: 'auto-verified',
      confidence: 0.9,
      issues: [],
      summary: '',
      model: 'gpt-4o',
      suspicionScore: 0.4,
    } as never)

    expect(mockPrisma.workerAlert.create).not.toHaveBeenCalled()
  })

  test('alerta ya existe sobre este doc → no duplica (idempotente)', async () => {
    mockPrisma.workerAlert.findFirst.mockResolvedValue({ id: 'wa_existing' })

    await persistVerification('doc_7', 'w_66', 'u_1', 'org_X', {
      decision: 'needs-review',
      confidence: 0.3,
      issues: [],
      summary: '',
      model: 'gpt-4o',
      suspicionScore: 0.9,
    } as never)

    expect(mockPrisma.workerAlert.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          workerId: 'w_66',
          type: 'DOCUMENTO_SOSPECHOSO',
          resolvedAt: null,
          description: { contains: 'doc_7' },
        }),
      }),
    )
    expect(mockPrisma.workerAlert.create).not.toHaveBeenCalled()
  })
})
