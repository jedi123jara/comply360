import { NextRequest } from 'next/server'

const { mockGetAuthContext, mockPrisma } = vi.hoisted(() => {
  const mockGetAuthContext = vi.fn()
  const mockPrisma = {
    contract: {
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    contractValidation: {
      findMany: vi.fn(),
    },
    orgTemplate: {
      findMany: vi.fn(),
    },
    orgDocument: {
      findMany: vi.fn(),
    },
    bulkContractJob: {
      findMany: vi.fn(),
    },
    worker: {
      count: vi.fn(),
    },
  }
  return { mockGetAuthContext, mockPrisma }
})

vi.mock('@/lib/auth', () => ({
  getAuthContext: (...args: unknown[]) => mockGetAuthContext(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET } from '../route'

const AUTH_CTX = {
  userId: 'user-1',
  clerkId: 'clerk-1',
  orgId: 'org-1',
  email: 'admin@test.pe',
  role: 'ADMIN',
}

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/contracts/ops')
}

describe('GET /api/contracts/ops', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue(AUTH_CTX)

    mockPrisma.contract.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
    mockPrisma.contract.groupBy.mockResolvedValue([
      { provenance: 'ORG_TEMPLATE', _count: { id: 5 } },
      { provenance: 'AI_FALLBACK', _count: { id: 2 } },
    ])
    mockPrisma.contractValidation.findMany
      .mockResolvedValueOnce([{ contractId: 'c1' }, { contractId: 'c1' }, { contractId: 'c2' }])
      .mockResolvedValueOnce([
        {
          id: 'v1',
          ruleCode: 'BLOCK-1',
          message: 'Falta causa objetiva',
          createdAt: new Date('2026-05-01T10:00:00Z'),
          contract: { id: 'c1', title: 'Contrato 1', status: 'DRAFT', provenance: 'ORG_TEMPLATE' },
          rule: { title: 'Causa objetiva', legalBasis: 'LPCL' },
        },
      ])
    mockPrisma.orgTemplate.findMany.mockResolvedValue([
      {
        id: 'tpl-1',
        title: 'Plantilla plazo fijo',
        documentType: 'CONTRATO_PLAZO_FIJO',
        placeholders: ['NOMBRE', 'DNI'],
        mappings: { NOMBRE: 'worker.fullName' },
        usageCount: 3,
        version: 1,
        updatedAt: new Date('2026-05-02T10:00:00Z'),
      },
    ])
    mockPrisma.orgDocument.findMany
      .mockResolvedValueOnce([
        {
          id: 'legacy-1',
          title: 'Legacy',
          description: JSON.stringify({
            _schema: 'contract_template_v1',
            documentType: 'OTRO',
            content: 'Hola {{NOMBRE}}',
            placeholders: ['NOMBRE'],
            mappings: {},
            usageCount: 0,
          }),
          version: 2,
          updatedAt: new Date('2026-05-02T11:00:00Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'doc-1',
          title: 'RIT',
          type: 'RIT',
          version: 1,
          updatedAt: new Date('2026-05-03T10:00:00Z'),
          _count: { acknowledgments: 4 },
        },
      ])
    mockPrisma.bulkContractJob.findMany.mockResolvedValue([
      {
        id: 'job-1',
        status: 'COMPLETED',
        contractType: 'LABORAL_INDEFINIDO',
        sourceFileName: 'contratos.xlsx',
        totalRows: 10,
        succeededRows: 9,
        failedRows: 1,
        createdAt: new Date('2026-05-03T09:00:00Z'),
        finishedAt: new Date('2026-05-03T09:01:00Z'),
      },
    ])
    mockPrisma.worker.count.mockResolvedValue(6)
  })

  it('returns operational aggregates for the contract generator', async () => {
    const res = await GET(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.health).toMatchObject({
      totalActive: 12,
      blockerCount: 3,
      blockerContracts: 2,
      fallbackCount: 2,
      unreviewedAiCount: 1,
      templatesWithGaps: 2,
      failedBulkJobs: 1,
      ackPendingDocuments: 1,
    })
    expect(json.byProvenance).toMatchObject({ ORG_TEMPLATE: 5, AI_FALLBACK: 2 })
    expect(json.templates).toMatchObject({ total: 2, activeDedicated: 1, legacy: 1 })
    expect(json.templates.withGaps[0]).toMatchObject({ id: 'tpl-1', unmapped: ['DNI'] })
    expect(json.schema).toMatchObject({
      status: 'ok',
      pendingCount: 0,
    })
    expect(json.acknowledgments.documents[0]).toMatchObject({
      id: 'doc-1',
      acknowledged: 4,
      pending: 2,
      totalWorkers: 6,
    })
  })

  it('returns schema compatibility diagnostics when new tables or columns are missing', async () => {
    mockPrisma.contract.groupBy.mockRejectedValueOnce(new Error('column does not exist'))
    mockPrisma.contract.count
      .mockReset()
      .mockResolvedValueOnce(12)
      .mockRejectedValueOnce(new Error('column does not exist'))
      .mockRejectedValueOnce(new Error('column does not exist'))
    mockPrisma.orgTemplate.findMany.mockRejectedValueOnce(new Error('table does not exist'))

    const res = await GET(makeRequest())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.warnings).toEqual([
      'contract_render_metadata_missing',
      'org_templates_table_missing',
    ])
    expect(json.schema).toMatchObject({
      status: 'compatibility',
      pendingCount: 2,
    })
    expect(json.schema.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'contract_render_metadata_missing',
          status: 'compatibility',
          migration: '20260508010000_add_contract_render_metadata',
        }),
        expect.objectContaining({
          code: 'org_templates_table_missing',
          status: 'compatibility',
          migration: '20260508000000_add_org_templates',
        }),
      ]),
    )
  })
})
