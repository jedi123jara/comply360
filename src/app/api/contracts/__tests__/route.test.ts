import { NextRequest } from 'next/server'

const { mockGetAuthContext, mockCreateContractWithSideEffects } = vi.hoisted(() => ({
  mockGetAuthContext: vi.fn(),
  mockCreateContractWithSideEffects: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getAuthContext: (...args: unknown[]) => mockGetAuthContext(...args),
}))

vi.mock('@/lib/contracts/create', () => ({
  createContractWithSideEffects: (...args: unknown[]) => mockCreateContractWithSideEffects(...args),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    contract: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

import { POST } from '../route'

const AUTH_CTX = {
  userId: 'user-1',
  clerkId: 'clerk-1',
  orgId: 'org-1',
  email: 'admin@test.pe',
  role: 'ADMIN',
}

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/contracts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/contracts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAuthContext.mockResolvedValue(AUTH_CTX)
    mockCreateContractWithSideEffects.mockResolvedValue({
      contract: {
        id: 'contract-1',
        title: 'Contrato test',
        provenance: 'AI_FALLBACK',
        generationMode: 'fallback',
        renderVersion: 'contract-render-v1',
        isFallback: true,
      },
    })
  })

  it('delegates contract creation to createContractWithSideEffects with provenance metadata', async () => {
    const res = await POST(makeRequest({
      title: 'Contrato test',
      type: 'LABORAL_INDEFINIDO',
      contentHtml: '<article>Contrato</article>',
      contentJson: { generadoPor: 'simulated' },
      formData: { trabajador_nombre: 'Ana Perez' },
      sourceKind: 'ai-draft-based',
      provenance: 'AI_FALLBACK',
    }))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toMatchObject({
      id: 'contract-1',
      provenance: 'AI_FALLBACK',
      generationMode: 'fallback',
      isFallback: true,
    })
    expect(mockCreateContractWithSideEffects).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1',
      userId: 'user-1',
      title: 'Contrato test',
      type: 'LABORAL_INDEFINIDO',
      sourceKind: 'ai-draft-based',
      provenance: 'AI_FALLBACK',
    }))
  })

  it('rejects invalid contract types before side effects', async () => {
    const res = await POST(makeRequest({
      title: 'Contrato test',
      type: 'NO_EXISTE',
    }))
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toMatch(/Invalid contract type/i)
    expect(mockCreateContractWithSideEffects).not.toHaveBeenCalled()
  })
})
