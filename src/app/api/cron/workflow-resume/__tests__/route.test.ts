/**
 * Tests para GET /api/cron/workflow-resume.
 *
 * Cubren:
 *   - 401 sin CRON_SECRET correcto
 *   - cleaned=0 si no hay runs colgados
 *   - Marca FAILED + error message si los hay
 *   - Cutoff es 5 min atrás
 */

import { NextRequest } from 'next/server'

const { mockPrisma, mockIdempotency } = vi.hoisted(() => {
  const mockPrisma = {
    workflowRun: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  }
  const mockIdempotency = {
    claimCronRun: vi.fn(),
    completeCronRun: vi.fn().mockResolvedValue(undefined),
    failCronRun: vi.fn().mockResolvedValue(undefined),
  }
  return { mockPrisma, mockIdempotency }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/cron/idempotency', () => mockIdempotency)

import { GET } from '../route'

beforeAll(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
})

beforeEach(() => {
  vi.clearAllMocks()
  // Default: claim acquired (después del clear)
  mockIdempotency.claimCronRun.mockResolvedValue({
    acquired: true,
    runId: 'cron_run_1',
    bucket: '202604241230',
  })
  mockIdempotency.completeCronRun.mockResolvedValue(undefined)
  mockIdempotency.failCronRun.mockResolvedValue(undefined)
})

function authedReq(): NextRequest {
  return new NextRequest('http://localhost/api/cron/workflow-resume', {
    method: 'GET',
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

describe('GET /api/cron/workflow-resume', () => {
  test('401 sin auth header', async () => {
    const req = new NextRequest('http://localhost/api/cron/workflow-resume', {
      method: 'GET',
    })
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  test('cleaned=0 cuando no hay runs colgados', async () => {
    mockPrisma.workflowRun.findMany.mockResolvedValue([])

    const res = await GET(authedReq())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.cleaned).toBe(0)
    expect(mockPrisma.workflowRun.updateMany).not.toHaveBeenCalled()
  })

  test('marca FAILED runs colgados (>5 min en RUNNING)', async () => {
    const stale = [
      { id: 'run_1', workflowId: 'wf_1', orgId: 'org_1', startedAt: new Date('2026-01-01'), status: 'RUNNING' },
      { id: 'run_2', workflowId: 'wf_2', orgId: 'org_2', startedAt: new Date('2026-01-01'), status: 'PENDING' },
    ]
    mockPrisma.workflowRun.findMany.mockResolvedValue(stale)
    mockPrisma.workflowRun.updateMany.mockResolvedValue({ count: 2 })

    const res = await GET(authedReq())
    const json = await res.json()

    expect(json.cleaned).toBe(2)
    expect(mockPrisma.workflowRun.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['run_1', 'run_2'] } },
      data: expect.objectContaining({
        status: 'FAILED',
        error: expect.stringContaining('stale'),
        completedAt: expect.any(Date),
      }),
    })
  })

  test('cutoff es exactamente 5 min atrás (al menos)', async () => {
    mockPrisma.workflowRun.findMany.mockResolvedValue([])
    const before = Date.now()
    await GET(authedReq())
    const after = Date.now()

    const findArg = mockPrisma.workflowRun.findMany.mock.calls[0][0]
    const cutoff = (findArg.where.startedAt.lt as Date).getTime()
    expect(cutoff).toBeGreaterThanOrEqual(before - 5 * 60 * 1000 - 5)
    expect(cutoff).toBeLessThanOrEqual(after - 5 * 60 * 1000 + 5)
  })

  test('claim duplicado → retorna duplicate=true sin tocar workflows', async () => {
    mockIdempotency.claimCronRun.mockResolvedValue({
      acquired: false,
      reason: 'duplicate',
      bucket: '202604241230',
    })

    const res = await GET(authedReq())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.duplicate).toBe(true)
    expect(json.reason).toBe('duplicate')
    expect(mockPrisma.workflowRun.findMany).not.toHaveBeenCalled()
  })

  test('completeCronRun se llama con cleaned=N tras éxito', async () => {
    mockPrisma.workflowRun.findMany.mockResolvedValue([
      { id: 'r1', workflowId: 'w', orgId: 'o', startedAt: new Date(), status: 'RUNNING' },
    ])
    mockPrisma.workflowRun.updateMany.mockResolvedValue({ count: 1 })

    await GET(authedReq())

    expect(mockIdempotency.completeCronRun).toHaveBeenCalledWith('cron_run_1', { cleaned: 1 })
  })

  test('busca solo runs sin completedAt', async () => {
    mockPrisma.workflowRun.findMany.mockResolvedValue([])
    await GET(authedReq())

    const findArg = mockPrisma.workflowRun.findMany.mock.calls[0][0]
    expect(findArg.where.completedAt).toBe(null)
    expect(findArg.where.status).toEqual({ in: ['PENDING', 'RUNNING'] })
  })
})
