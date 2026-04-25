/**
 * Tests E2E del workflowHandler completo (mockeando Prisma + workflowEngine).
 *
 * Cubren:
 *   - Sin workflows matching → no-op
 *   - Con workflows matching → crea placeholder + ejecuta engine + update final
 *   - Idempotencia P2002 → skip silencioso
 *   - Anti-loop global (depth >= MAX_EMIT_DEPTH) → skip
 *   - Anti-loop per-workflow (wfId en chain) → skip
 *   - Engine falla → marca status FAILED + persiste error
 */

import { Prisma } from '@/generated/prisma/client'

const { mockPrisma, mockEngine } = vi.hoisted(() => {
  const mockPrisma = {
    workflow: { findMany: vi.fn() },
    workflowRun: {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  }
  const mockEngine = {
    registerWorkflow: vi.fn(),
    executeWorkflow: vi.fn(),
  }
  return { mockPrisma, mockEngine }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/workflows/engine', () => ({
  workflowEngine: mockEngine,
}))

import { workflowHandler } from '../workflow-handler'
import type { DomainEvent } from '../../catalog'

function makeEvent(overrides: Partial<DomainEvent<'worker.created'>> = {}): DomainEvent<'worker.created'> {
  return {
    id: 'evt_1',
    name: 'worker.created',
    emittedAt: '2026-04-24T12:00:00.000Z',
    payload: {
      orgId: 'org_1',
      workerId: 'w_1',
      worker: { id: 'w_1', dni: '12345678', firstName: 'A', lastName: 'B' },
    } as DomainEvent<'worker.created'>['payload'],
    ...overrides,
  } as DomainEvent<'worker.created'>
}

function makeWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wf_1',
    orgId: 'org_1',
    name: 'WF Test',
    description: '',
    version: 1,
    active: true,
    triggerId: 'event.worker.created',
    stepsJson: [{ id: 's1', name: 'noti', type: 'NOTIFICATION', order: 0, errorStrategy: 'CONTINUE' }],
    metadata: null,
    createdAt: new Date('2026-04-01'),
    updatedAt: new Date('2026-04-01'),
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('workflowHandler — E2E con Prisma mockeado', () => {
  test('sin workflows matching → no se crea WorkflowRun', async () => {
    mockPrisma.workflow.findMany.mockResolvedValue([])

    await workflowHandler(makeEvent())

    expect(mockPrisma.workflowRun.create).not.toHaveBeenCalled()
    expect(mockEngine.executeWorkflow).not.toHaveBeenCalled()
  })

  test('con workflow matching → claim placeholder + ejecuta + update final', async () => {
    mockPrisma.workflow.findMany.mockResolvedValue([makeWorkflow()])
    mockPrisma.workflowRun.create.mockResolvedValue({ id: 'run_1' })
    mockEngine.executeWorkflow.mockResolvedValue({
      id: 'exec_1',
      workflowId: 'wf_1',
      workflowName: 'WF Test',
      orgId: 'org_1',
      status: 'COMPLETED',
      stepResults: [{ stepId: 's1', status: 'SUCCESS' }],
      currentStepIndex: 1,
      startedAt: '2026-04-24T12:00:00.000Z',
      completedAt: '2026-04-24T12:00:01.000Z',
      triggerData: {},
      context: {},
    })

    await workflowHandler(makeEvent())

    expect(mockPrisma.workflowRun.create).toHaveBeenCalledOnce()
    const createArg = mockPrisma.workflowRun.create.mock.calls[0][0].data
    expect(createArg.status).toBe('PENDING')
    expect(createArg.idempotencyKey).toMatch(/^[0-9a-f]{32}$/)
    expect(createArg.triggeredBy).toBe('event:worker.created')

    expect(mockEngine.registerWorkflow).toHaveBeenCalledOnce()
    expect(mockEngine.executeWorkflow).toHaveBeenCalledOnce()
    expect(mockPrisma.workflowRun.update).toHaveBeenCalledWith({
      where: { id: 'run_1' },
      data: expect.objectContaining({ status: 'COMPLETED' }),
    })
  })

  test('P2002 (idempotencia, duplicate run) → skip silencioso', async () => {
    mockPrisma.workflow.findMany.mockResolvedValue([makeWorkflow()])
    const dupErr = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: '7.0.0',
    })
    mockPrisma.workflowRun.create.mockRejectedValueOnce(dupErr)

    await workflowHandler(makeEvent())

    // No se llamó al engine porque el claim falló como duplicado
    expect(mockEngine.executeWorkflow).not.toHaveBeenCalled()
    expect(mockPrisma.workflowRun.update).not.toHaveBeenCalled()
  })

  test('anti-loop global: depth >= 3 → no consulta workflows', async () => {
    const deepEvent = makeEvent({
      payload: {
        orgId: 'org_1',
        workerId: 'w_1',
        worker: { id: 'w_1', dni: '12345678', firstName: 'A', lastName: 'B' },
        _emittedBy: ['wf_a', 'wf_b', 'wf_c'], // depth 3
      } as DomainEvent<'worker.created'>['payload'],
    })

    await workflowHandler(deepEvent)

    expect(mockPrisma.workflow.findMany).not.toHaveBeenCalled()
  })

  test('anti-loop per-workflow: wfId ya en chain → skip ese workflow', async () => {
    mockPrisma.workflow.findMany.mockResolvedValue([
      makeWorkflow({ id: 'wf_LOOP' }),
    ])
    const loopEvent = makeEvent({
      payload: {
        orgId: 'org_1',
        workerId: 'w_1',
        worker: { id: 'w_1', dni: '12345678', firstName: 'A', lastName: 'B' },
        _emittedBy: ['wf_LOOP'], // este workflow ya emitió antes
      } as DomainEvent<'worker.created'>['payload'],
    })

    await workflowHandler(loopEvent)

    expect(mockPrisma.workflowRun.create).not.toHaveBeenCalled()
  })

  test('engine lanza → marca run como FAILED + persiste error', async () => {
    mockPrisma.workflow.findMany.mockResolvedValue([makeWorkflow()])
    mockPrisma.workflowRun.create.mockResolvedValue({ id: 'run_2' })
    mockEngine.executeWorkflow.mockRejectedValue(new Error('engine boom'))

    await workflowHandler(makeEvent())

    const updateCall = mockPrisma.workflowRun.update.mock.calls.find(
      (c) => (c[0]?.data as { status?: string })?.status === 'FAILED',
    )
    expect(updateCall).toBeDefined()
    expect(updateCall![0].data.error).toMatch(/engine boom/)
    expect(updateCall![0].data.completedAt).toBeInstanceOf(Date)
  })

  test('payload sin orgId → no-op', async () => {
    await workflowHandler({
      id: 'evt_x',
      name: 'worker.created',
      emittedAt: '2026-04-24T12:00:00Z',
      payload: { workerId: 'w_x' } as DomainEvent<'worker.created'>['payload'],
    } as DomainEvent<'worker.created'>)

    expect(mockPrisma.workflow.findMany).not.toHaveBeenCalled()
  })
})
