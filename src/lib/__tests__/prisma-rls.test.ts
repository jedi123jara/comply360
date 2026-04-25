/**
 * Tests para src/lib/prisma-rls.ts
 *
 * Validan el contrato del helper:
 *   - Si RLS_ENFORCED=true, runWithOrgScope ejecuta `SET LOCAL` antes de fn.
 *   - Si RLS_ENFORCED=false, NO ejecuta SET LOCAL (no-op friendly).
 *   - orgId vacío o con caracteres inválidos → throw (defensa contra SQLi).
 *   - runUnsafeBypass deja AuditLog con la razón y NO ejecuta SET LOCAL.
 */

const { mockPrisma } = vi.hoisted(() => {
  const tx = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(0),
    worker: { findMany: vi.fn().mockResolvedValue([]) },
  }
  const mockPrisma = {
    $transaction: vi.fn(async (fn: (tx: typeof tx) => unknown) => fn(tx)),
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    organization: { findMany: vi.fn().mockResolvedValue([]) },
    __tx: tx,
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

beforeEach(() => {
  vi.clearAllMocks()
  // Restablecer comportamiento default de $transaction tras clearAllMocks
  mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma.__tx))
})

describe('runWithOrgScope', () => {
  test('con RLS_ENFORCED=true, ejecuta SET LOCAL antes del fn', async () => {
    process.env.RLS_ENFORCED = 'true'
    vi.resetModules()
    const { runWithOrgScope } = await import('../prisma-rls')

    const result = await runWithOrgScope('org_abc123', (tx) => tx.worker.findMany())

    expect(mockPrisma.__tx.$executeRawUnsafe).toHaveBeenCalledWith(
      "SET LOCAL app.current_org_id = 'org_abc123'",
    )
    expect(mockPrisma.__tx.worker.findMany).toHaveBeenCalledOnce()
    expect(result).toEqual([])
  })

  test('con RLS_ENFORCED!=true, NO ejecuta SET LOCAL (no-op)', async () => {
    process.env.RLS_ENFORCED = 'false'
    vi.resetModules()
    const { runWithOrgScope } = await import('../prisma-rls')

    await runWithOrgScope('org_abc', (tx) => tx.worker.findMany())

    expect(mockPrisma.__tx.$executeRawUnsafe).not.toHaveBeenCalled()
    expect(mockPrisma.__tx.worker.findMany).toHaveBeenCalledOnce()
  })

  test('rechaza orgId vacío', async () => {
    const { runWithOrgScope } = await import('../prisma-rls')
    await expect(runWithOrgScope('', () => Promise.resolve(null))).rejects.toThrow(
      /orgId requerido/,
    )
  })

  test('rechaza orgId con caracteres inválidos cuando RLS está enforced', async () => {
    process.env.RLS_ENFORCED = 'true'
    vi.resetModules()
    const { runWithOrgScope } = await import('../prisma-rls')

    // Intento de SQL injection
    await expect(
      runWithOrgScope("org' OR '1'='1", () => Promise.resolve(null)),
    ).rejects.toThrow(/caracteres inválidos/)
  })

  test('acepta cuid válido (alfanumérico + guiones)', async () => {
    process.env.RLS_ENFORCED = 'true'
    vi.resetModules()
    const { runWithOrgScope } = await import('../prisma-rls')

    await expect(
      runWithOrgScope('clp_2024_abc-XYZ', () => Promise.resolve('ok')),
    ).resolves.toBe('ok')
  })
})

describe('runUnsafeBypass', () => {
  test('ejecuta el fn y registra AuditLog con la razón', async () => {
    const { runUnsafeBypass } = await import('../prisma-rls')

    const result = await runUnsafeBypass(
      { reason: 'cron:morning-briefing', orgId: 'system' },
      (client) => client.organization.findMany(),
    )

    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'rls.bypass',
          orgId: 'system',
          metadataJson: expect.objectContaining({ reason: 'cron:morning-briefing' }),
        }),
      }),
    )
    expect(result).toEqual([])
  })

  test('no rompe si AuditLog falla (fire-and-forget)', async () => {
    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('audit DB down'))
    const { runUnsafeBypass } = await import('../prisma-rls')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await runUnsafeBypass(
      { reason: 'webhook:culqi-retry' },
      (client) => client.organization.findMany(),
    )

    expect(result).toEqual([])
    // Le damos al microtask del fire-and-forget tiempo para resolverse
    await new Promise((r) => setTimeout(r, 0))
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
