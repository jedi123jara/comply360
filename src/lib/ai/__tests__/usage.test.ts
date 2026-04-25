/**
 * Tests para src/lib/ai/usage.ts
 *
 * Cubren:
 *   - recordAiUsage persiste con costo calculado
 *   - recordAiUsage no rompe si Prisma falla (fire-and-forget)
 *   - getMonthlyBudgetUsd respeta plan
 *   - checkAiBudget bloquea si spentUsd >= budget
 *   - checkAiBudget allowed=true si spent < budget
 */

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    aiUsage: {
      create: vi.fn().mockResolvedValue({}),
      aggregate: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { recordAiUsage, checkAiBudget, getMonthlyBudgetUsd } from '../usage'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('recordAiUsage', () => {
  test('persiste con costo calculado correctamente', async () => {
    await recordAiUsage({
      orgId: 'org_1',
      userId: 'u_1',
      feature: 'contract-review',
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens: 5000,
      completionTokens: 1000,
      latencyMs: 2300,
    })

    expect(mockPrisma.aiUsage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        orgId: 'org_1',
        feature: 'contract-review',
        provider: 'openai',
        model: 'gpt-4o-mini',
        promptTokens: 5000,
        completionTokens: 1000,
        totalTokens: 6000,
        latencyMs: 2300,
        success: true,
        // costo: (5000/1M)*0.15 + (1000/1M)*0.6 = 0.00135
        costUsd: expect.closeTo(0.00135, 6),
      }),
    })
  })

  test('valores negativos se clampean a 0', async () => {
    await recordAiUsage({
      feature: 'unknown',
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens: -10,
      completionTokens: -5,
    })
    const data = mockPrisma.aiUsage.create.mock.calls[0][0].data
    expect(data.promptTokens).toBe(0)
    expect(data.completionTokens).toBe(0)
    expect(data.totalTokens).toBe(0)
  })

  test('no rompe si Prisma falla (fire-and-forget)', async () => {
    mockPrisma.aiUsage.create.mockRejectedValueOnce(new Error('DB down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(
      recordAiUsage({
        feature: 'chat',
        provider: 'openai',
        model: 'gpt-4o-mini',
      }),
    ).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})

describe('getMonthlyBudgetUsd', () => {
  test('mapea planes a budgets', () => {
    expect(getMonthlyBudgetUsd('FREE')).toBe(1)
    expect(getMonthlyBudgetUsd('STARTER')).toBe(5)
    expect(getMonthlyBudgetUsd('EMPRESA')).toBe(25)
    expect(getMonthlyBudgetUsd('PRO')).toBe(100)
    expect(getMonthlyBudgetUsd('ENTERPRISE')).toBe(500)
  })

  test('plan desconocido cae a STARTER por seguridad', () => {
    expect(getMonthlyBudgetUsd('CUSTOM_X')).toBe(5)
  })
})

describe('checkAiBudget', () => {
  test('allowed=true si spent < budget', async () => {
    mockPrisma.aiUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 2.5 } })

    const r = await checkAiBudget({ orgId: 'org_1', plan: 'EMPRESA' })

    expect(r.allowed).toBe(true)
    if (r.allowed) {
      expect(r.spentUsd).toBe(2.5)
      expect(r.budgetUsd).toBe(25)
      expect(r.remainingUsd).toBeCloseTo(22.5, 6)
    }
  })

  test('allowed=false si spent >= budget', async () => {
    mockPrisma.aiUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 26 } })

    const r = await checkAiBudget({ orgId: 'org_1', plan: 'EMPRESA' })

    expect(r.allowed).toBe(false)
    if (!r.allowed) {
      expect(r.reason).toBe('budget_exceeded')
      expect(r.spentUsd).toBe(26)
      expect(r.budgetUsd).toBe(25)
    }
  })

  test('plan FREE con budget 1 USD: 0.5 USD permite, 1.0 USD bloquea', async () => {
    mockPrisma.aiUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 0.5 } })
    expect((await checkAiBudget({ orgId: 'org_1', plan: 'FREE' })).allowed).toBe(true)

    mockPrisma.aiUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 1 } })
    expect((await checkAiBudget({ orgId: 'org_1', plan: 'FREE' })).allowed).toBe(false)
  })

  test('aggregate retorna null sum (mes sin uso) → allowed con spent=0', async () => {
    mockPrisma.aiUsage.aggregate.mockResolvedValue({ _sum: { costUsd: null } })

    const r = await checkAiBudget({ orgId: 'org_X', plan: 'PRO' })
    expect(r.allowed).toBe(true)
    if (r.allowed) {
      expect(r.spentUsd).toBe(0)
      expect(r.remainingUsd).toBe(100)
    }
  })

  test('filtra por mes calendario actual (gte=primer día UTC)', async () => {
    mockPrisma.aiUsage.aggregate.mockResolvedValue({ _sum: { costUsd: 0 } })
    await checkAiBudget({ orgId: 'org_1', plan: 'STARTER' })

    const arg = mockPrisma.aiUsage.aggregate.mock.calls[0][0]
    expect(arg.where.orgId).toBe('org_1')
    expect(arg.where.createdAt.gte).toBeInstanceOf(Date)
    const gte = arg.where.createdAt.gte as Date
    expect(gte.getUTCDate()).toBe(1)
    expect(gte.getUTCHours()).toBe(0)
    expect(gte.getUTCMinutes()).toBe(0)
  })
})
