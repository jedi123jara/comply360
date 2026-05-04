import { NextRequest } from 'next/server'

const {
  AUTH_CTX,
  mockIsContractQualityPassing,
  mockPrisma,
  mockResolveContractAnnexCoverage,
  mockRunContractQualityGate,
  mockRunValidationPipeline,
  mockWithContractAnnexCoverageMetadata,
  mockWithContractQualityMetadata,
} = vi.hoisted(() => {
  const AUTH_CTX = {
    userId: 'user-1',
    clerkId: 'clerk-1',
    orgId: 'org-1',
    email: 'admin@test.pe',
    role: 'ADMIN',
  }
  return {
    AUTH_CTX,
    mockIsContractQualityPassing: vi.fn(),
    mockPrisma: {
      contract: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      contractValidation: {
        findMany: vi.fn(),
      },
    },
    mockResolveContractAnnexCoverage: vi.fn(),
    mockRunContractQualityGate: vi.fn(),
    mockRunValidationPipeline: vi.fn(),
    mockWithContractAnnexCoverageMetadata: vi.fn(),
    mockWithContractQualityMetadata: vi.fn(),
  }
})

vi.mock('@/lib/api-auth', () => ({
  withAuthParams:
    (handler: (req: NextRequest, ctx: typeof AUTH_CTX, params: { id: string }) => Promise<Response>) =>
      (req: NextRequest, routeCtx: { params: { id: string } }) =>
        handler(req, AUTH_CTX, routeCtx.params),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/contracts/annex-coverage', () => ({
  resolveContractAnnexCoverage: (...args: unknown[]) => mockResolveContractAnnexCoverage(...args),
  withContractAnnexCoverageMetadata: (...args: unknown[]) => mockWithContractAnnexCoverageMetadata(...args),
}))

vi.mock('@/lib/contracts/quality-gate', async () => {
  const actual = await vi.importActual<typeof import('@/lib/contracts/quality-gate')>('@/lib/contracts/quality-gate')
  return {
    ...actual,
    isContractQualityPassing: (...args: unknown[]) => mockIsContractQualityPassing(...args),
    runContractQualityGate: (...args: unknown[]) => mockRunContractQualityGate(...args),
    withContractQualityMetadata: (...args: unknown[]) => mockWithContractQualityMetadata(...args),
  }
})

vi.mock('@/lib/contracts/validation/engine', () => ({
  runValidationPipeline: (...args: unknown[]) => mockRunValidationPipeline(...args),
}))

import { POST } from '../route'

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/contracts/contract-1/quality', {
    method: 'POST',
  })
}

describe('POST /api/contracts/[id]/quality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.contract.findFirst.mockResolvedValue({
      id: 'contract-1',
      title: 'Contrato premium',
      type: 'LABORAL_INDEFINIDO',
      contentHtml: '<article>Contrato</article>',
      contentJson: {
        provenance: 'MANUAL_TEMPLATE',
        renderVersion: 'contract-render-v1',
      },
      formData: {
        empleador_razon_social: 'Empresa S.A.C.',
        trabajador_nombre: 'Ana Perez',
      },
      aiReviewedAt: null,
    })
    mockPrisma.contractValidation.findMany.mockResolvedValue([])
    mockPrisma.contract.update.mockResolvedValue({ id: 'contract-1' })
    mockRunValidationPipeline.mockResolvedValue(undefined)
    mockResolveContractAnnexCoverage.mockResolvedValue({
      required: [],
      covered: [],
      missingRequired: [],
      coverageScore: 100,
    })
    mockWithContractAnnexCoverageMetadata.mockImplementation((contentJson, annexCoverage) => ({
      ...(contentJson as Record<string, unknown>),
      annexCoverage,
    }))
    mockRunContractQualityGate.mockReturnValue({
      status: 'READY_FOR_SIGNATURE',
      score: 100,
      blockers: [],
      warnings: [],
      requiredActions: [],
      missingInputs: [],
      missingAnnexes: [],
      legalCoverage: {
        requiredClauses: 1,
        coveredClauses: 1,
        missingClauses: [],
        legalBasisCount: 1,
      },
      qualityGateVersion: 'contract-quality-gate-v1',
      checkedAt: '2026-05-04T12:00:00.000Z',
    })
    mockWithContractQualityMetadata.mockImplementation((contentJson, quality) => ({
      ...(contentJson as Record<string, unknown>),
      quality,
    }))
    mockIsContractQualityPassing.mockReturnValue(true)
  })

  it('re-runs validation, persists quality metadata and returns the passing state', async () => {
    const res = await POST(makeRequest(), { params: { id: 'contract-1' } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockRunValidationPipeline).toHaveBeenCalledWith('contract-1', 'org-1', {
      triggeredBy: 'user-1',
      trigger: 'manual',
    })
    expect(mockResolveContractAnnexCoverage).toHaveBeenCalledWith({
      contractId: 'contract-1',
      orgId: 'org-1',
      contentJson: expect.objectContaining({ provenance: 'MANUAL_TEMPLATE' }),
    })
    expect(mockPrisma.contract.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'contract-1', orgId: 'org-1' },
      data: {
        contentJson: expect.objectContaining({
          quality: expect.objectContaining({ status: 'READY_FOR_SIGNATURE' }),
        }),
      },
    }))
    expect(json.data).toMatchObject({
      contractId: 'contract-1',
      passing: true,
      quality: { status: 'READY_FOR_SIGNATURE', score: 100 },
    })
  })

  it('returns 404 without running side effects when the contract is missing', async () => {
    mockPrisma.contract.findFirst.mockResolvedValueOnce(null)

    const res = await POST(makeRequest(), { params: { id: 'missing' } })
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toBe('Contrato no encontrado')
    expect(mockRunValidationPipeline).not.toHaveBeenCalled()
    expect(mockPrisma.contract.update).not.toHaveBeenCalled()
  })
})
