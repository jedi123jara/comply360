/**
 * Tests para src/lib/cron/idempotency.ts
 *
 * Cubren:
 *   - computeBucket determinístico, formato YYYYMMDDHHmm
 *   - bucketMinutes>1 trunca correctamente
 *   - claimCronRun crea runs únicos
 *   - claimCronRun retorna duplicate si P2002
 *   - completeCronRun + failCronRun no rompen ante errores
 */

import { Prisma } from '@/generated/prisma/client'

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    cronRun: {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { computeBucket, claimCronRun, completeCronRun, failCronRun } from '../idempotency'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('computeBucket', () => {
  test('formato YYYYMMDDHHmm para bucketMinutes=1', () => {
    const at = new Date(Date.UTC(2026, 3, 24, 12, 30, 15)) // abril=3
    expect(computeBucket(at, 1)).toBe('202604241230')
  })

  test('bucketMinutes=5 trunca a múltiplo de 5', () => {
    const at = new Date(Date.UTC(2026, 3, 24, 12, 33, 0))
    expect(computeBucket(at, 5)).toBe('202604241230')

    const at2 = new Date(Date.UTC(2026, 3, 24, 12, 36, 0))
    expect(computeBucket(at2, 5)).toBe('202604241235')
  })

  test('bucketMinutes=60 mantiene minuto=00', () => {
    const at = new Date(Date.UTC(2026, 3, 24, 12, 45, 0))
    expect(computeBucket(at, 60)).toBe('202604241200')
  })

  test('determinístico: misma fecha → mismo bucket', () => {
    const at = new Date(Date.UTC(2026, 3, 24, 12, 30, 0))
    expect(computeBucket(at, 1)).toBe(computeBucket(at, 1))
  })

  test('mes y día se zero-padean', () => {
    const at = new Date(Date.UTC(2026, 0, 5, 3, 7, 0))
    expect(computeBucket(at, 1)).toBe('202601050307')
  })
})

describe('claimCronRun', () => {
  test('crea run y retorna acquired=true', async () => {
    mockPrisma.cronRun.create.mockResolvedValueOnce({ id: 'run_1' })

    const claim = await claimCronRun('test-cron', {
      now: new Date(Date.UTC(2026, 3, 24, 12, 30, 0)),
    })

    expect(claim.acquired).toBe(true)
    if (claim.acquired) {
      expect(claim.runId).toBe('run_1')
      expect(claim.bucket).toBe('202604241230')
    }
    expect(mockPrisma.cronRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cronName: 'test-cron',
        bucket: '202604241230',
        status: 'RUNNING',
      }),
      select: { id: true },
    })
  })

  test('P2002 (unique violation) → duplicate', async () => {
    const dupErr = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: '7.0.0',
    })
    mockPrisma.cronRun.create.mockRejectedValueOnce(dupErr)

    const claim = await claimCronRun('test-cron', {
      now: new Date(Date.UTC(2026, 3, 24, 12, 30, 0)),
    })

    expect(claim.acquired).toBe(false)
    if (!claim.acquired) expect(claim.reason).toBe('duplicate')
  })

  test('error genérico → reason=error (no rompe el cron)', async () => {
    mockPrisma.cronRun.create.mockRejectedValueOnce(new Error('DB down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const claim = await claimCronRun('test-cron')

    expect(claim.acquired).toBe(false)
    if (!claim.acquired) expect(claim.reason).toBe('error')
    errorSpy.mockRestore()
  })
})

describe('completeCronRun + failCronRun', () => {
  test('completeCronRun marca COMPLETED con resultado', async () => {
    await completeCronRun('run_1', { processed: 42 })

    expect(mockPrisma.cronRun.update).toHaveBeenCalledWith({
      where: { id: 'run_1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        result: { processed: 42 },
        completedAt: expect.any(Date),
      }),
    })
  })

  test('failCronRun marca FAILED con error truncado', async () => {
    const longErr = new Error('x'.repeat(800))
    await failCronRun('run_2', longErr)

    const arg = mockPrisma.cronRun.update.mock.calls[0][0]
    expect(arg.data.status).toBe('FAILED')
    expect((arg.data.error as string).length).toBeLessThanOrEqual(500)
  })

  test('completeCronRun no relanza si Prisma falla', async () => {
    mockPrisma.cronRun.update.mockRejectedValueOnce(new Error('DB down'))
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(completeCronRun('run_x')).resolves.toBeUndefined()

    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
