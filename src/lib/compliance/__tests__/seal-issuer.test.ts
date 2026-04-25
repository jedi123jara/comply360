/**
 * Tests para src/lib/compliance/seal-issuer.ts
 */

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    complianceScore: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    orgComplianceSeal: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  }
  return { mockPrisma }
})

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))

import { tierForScore, issueSealForOrg, runSealIssuance } from '../seal-issuer'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('tierForScore', () => {
  test.each([
    [80, 'BRONZE'],
    [89, 'BRONZE'],
    [90, 'SILVER'],
    [94, 'SILVER'],
    [95, 'GOLD'],
    [100, 'GOLD'],
  ])('score %s → %s', (score, tier) => {
    expect(tierForScore(score)).toBe(tier)
  })
})

describe('issueSealForOrg', () => {
  test('skip si no hay score histórico', async () => {
    mockPrisma.complianceScore.findFirst.mockResolvedValue(null)
    const r = await issueSealForOrg('org_1')
    expect(r.status).toBe('skipped:no_history')
  })

  test('skip si score actual < 80', async () => {
    mockPrisma.complianceScore.findFirst.mockResolvedValue({ scoreGlobal: 75 })
    const r = await issueSealForOrg('org_1')
    expect(r.status).toBe('skipped:score_too_low')
    if (r.status === 'skipped:score_too_low') expect(r.scoreAtIssue).toBe(75)
  })

  test('skip si promedio 90d < 80 aun con score actual ≥80', async () => {
    mockPrisma.complianceScore.findFirst.mockResolvedValue({ scoreGlobal: 85 })
    mockPrisma.complianceScore.findMany.mockResolvedValue([
      { scoreGlobal: 70 },
      { scoreGlobal: 75 },
      { scoreGlobal: 78 },
    ])
    const r = await issueSealForOrg('org_1')
    expect(r.status).toBe('skipped:score_too_low')
    if (r.status === 'skipped:score_too_low') {
      expect(r.scoreAtIssue).toBe(85)
      expect(r.scoreAvg90d).toBeLessThan(80)
    }
  })

  test('emite cuando cualifica (score 88 + promedio 84)', async () => {
    mockPrisma.complianceScore.findFirst.mockResolvedValue({ scoreGlobal: 88 })
    mockPrisma.complianceScore.findMany.mockResolvedValue([
      { scoreGlobal: 80 },
      { scoreGlobal: 85 },
      { scoreGlobal: 88 },
    ])
    mockPrisma.orgComplianceSeal.findFirst.mockResolvedValue(null) // no existe del mes
    mockPrisma.organization.findUnique.mockResolvedValue({ razonSocial: 'ACME S.A.C.', name: 'ACME' })
    mockPrisma.orgComplianceSeal.create.mockResolvedValue({
      id: 'seal_1',
      slug: 'acme-sac-abcdef',
    })

    const r = await issueSealForOrg('org_1')

    expect(r.status).toBe('issued')
    if (r.status === 'issued') {
      expect(r.tier).toBe('BRONZE') // score 88
      expect(r.scoreAtIssue).toBe(88)
      expect(r.scoreAvg90d).toBeGreaterThanOrEqual(80)
    }
    const createArg = mockPrisma.orgComplianceSeal.create.mock.calls[0][0].data
    expect(createArg.tier).toBe('BRONZE')
    expect(createArg.validUntil).toBeInstanceOf(Date)
    // validUntil debe ser ~12 meses adelante
    const months = (createArg.validUntil.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)
    expect(months).toBeGreaterThanOrEqual(11.5)
    expect(months).toBeLessThanOrEqual(12.5)
  })

  test('GOLD tier para score ≥95', async () => {
    mockPrisma.complianceScore.findFirst.mockResolvedValue({ scoreGlobal: 96 })
    mockPrisma.complianceScore.findMany.mockResolvedValue([{ scoreGlobal: 95 }])
    mockPrisma.orgComplianceSeal.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue({ razonSocial: 'ELITE', name: 'ELITE' })
    mockPrisma.orgComplianceSeal.create.mockResolvedValue({ id: 's', slug: 'elite-x' })

    const r = await issueSealForOrg('org_2')

    expect(r.status).toBe('issued')
    if (r.status === 'issued') expect(r.tier).toBe('GOLD')
  })

  test('renewed si ya hay sello del mes en curso (idempotencia mensual)', async () => {
    mockPrisma.complianceScore.findFirst.mockResolvedValue({ scoreGlobal: 85 })
    mockPrisma.complianceScore.findMany.mockResolvedValue([{ scoreGlobal: 85 }])
    mockPrisma.orgComplianceSeal.findFirst.mockResolvedValue({
      id: 'existing_seal',
      slug: 'acme-old',
      tier: 'BRONZE',
      scoreAtIssue: 85,
      scoreAvg90d: 85,
    })

    const r = await issueSealForOrg('org_1')

    expect(r.status).toBe('renewed')
    if (r.status === 'renewed') expect(r.sealId).toBe('existing_seal')
    // No crea uno nuevo
    expect(mockPrisma.orgComplianceSeal.create).not.toHaveBeenCalled()
  })

  test('slug generado es URL-safe', async () => {
    mockPrisma.complianceScore.findFirst.mockResolvedValue({ scoreGlobal: 90 })
    mockPrisma.complianceScore.findMany.mockResolvedValue([{ scoreGlobal: 90 }])
    mockPrisma.orgComplianceSeal.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue({
      razonSocial: 'EMPRESA, S.A.C. & CÍA. LTDA.',
      name: null,
    })
    mockPrisma.orgComplianceSeal.create.mockResolvedValue({ id: 's', slug: '-' })

    await issueSealForOrg('org_x')

    const createArg = mockPrisma.orgComplianceSeal.create.mock.calls[0][0].data
    expect(createArg.slug).toMatch(/^[a-z0-9-]+$/)
    expect(createArg.slug.length).toBeLessThanOrEqual(60)
  })
})

describe('runSealIssuance', () => {
  test('agrega resumen de issued/renewed/skipped/errors', async () => {
    mockPrisma.organization.findMany.mockResolvedValue([
      { id: 'org_a' },
      { id: 'org_b' },
      { id: 'org_c' },
    ])

    // org_a: emite
    // org_b: skip por score bajo
    // org_c: error
    mockPrisma.complianceScore.findFirst
      .mockResolvedValueOnce({ scoreGlobal: 88 }) // a
      .mockResolvedValueOnce({ scoreGlobal: 50 }) // b
      .mockRejectedValueOnce(new Error('DB transient')) // c
    mockPrisma.complianceScore.findMany.mockResolvedValue([{ scoreGlobal: 88 }])
    mockPrisma.orgComplianceSeal.findFirst.mockResolvedValue(null)
    mockPrisma.organization.findUnique.mockResolvedValue({ razonSocial: 'A', name: 'A' })
    mockPrisma.orgComplianceSeal.create.mockResolvedValue({ id: 's', slug: 'a-x' })

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await runSealIssuance()
    errorSpy.mockRestore()

    expect(r.evaluated).toBe(3)
    expect(r.issued).toBe(1)
    expect(r.skipped).toBe(1)
    expect(r.errors).toBe(1)
  })
})
