/**
 * Datos reales de la ruta de arranque (getStartRouteProgress en data.ts).
 */

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    organization: { findUnique: vi.fn() },
    complianceTask: { aggregate: vi.fn() },
    workerAlert: { aggregate: vi.fn(), count: vi.fn() },
    workerDocument: { count: vi.fn() },
    worker: { findFirst: vi.fn() },
  },
}))

vi.mock('@/lib/prisma', () => ({ prisma: mockPrisma }))
vi.mock('@/lib/compliance/score-calculator', () => ({
  calculateComplianceScore: vi.fn().mockResolvedValue(null),
}))

import { getStartRouteProgress, missingOrgFields } from '../data'

const fullOrg = {
  ruc: '20123456789',
  razonSocial: 'Panadería San José S.A.C.',
  name: 'Panadería San José',
  sector: 'Comercio',
  regimenPrincipal: 'MYPE_PEQUENA',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockPrisma.organization.findUnique.mockResolvedValue(fullOrg)
  mockPrisma.complianceTask.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { multaEvitable: null } })
  mockPrisma.workerAlert.aggregate.mockResolvedValue({ _count: { _all: 0 }, _sum: { multaEstimada: null } })
  mockPrisma.workerAlert.count.mockResolvedValue(0)
  mockPrisma.workerDocument.count.mockResolvedValue(0)
  mockPrisma.worker.findFirst.mockResolvedValue(null)
})

describe('missingOrgFields', () => {
  it('no pide nada si la empresa tiene RUC, razón social, sector y régimen', () => {
    expect(missingOrgFields(fullOrg)).toEqual([])
  })

  it('pide un RUC válido de 11 dígitos y el sector', () => {
    expect(missingOrgFields({ ...fullOrg, ruc: '123', sector: '  ' })).toEqual(['RUC', 'sector'])
  })

  it('acepta el nombre como razón social de respaldo', () => {
    expect(missingOrgFields({ ...fullOrg, razonSocial: null })).toEqual([])
  })
})

describe('getStartRouteProgress', () => {
  it('suma tareas completadas y alertas resueltas, con su multa', async () => {
    mockPrisma.complianceTask.aggregate.mockResolvedValue({ _count: { _all: 2 }, _sum: { multaEvitable: '3000.50' } })
    mockPrisma.workerAlert.aggregate.mockResolvedValue({ _count: { _all: 1 }, _sum: { multaEstimada: 1949.5 } })
    mockPrisma.workerAlert.count.mockResolvedValue(4)

    const result = await getStartRouteProgress('org-1')

    expect(result.resolvedTasks).toBe(2)
    expect(result.resolvedAlerts).toBe(1)
    expect(result.multaReducida).toBeCloseTo(4950)
    expect(result.openAlerts).toBe(4)
    expect(mockPrisma.workerAlert.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 'org-1', resolvedAt: { not: null } } })
    )
    expect(mockPrisma.complianceTask.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 'org-1', status: 'COMPLETED' } })
    )
  })

  it('cuenta solo documentos subidos o verificados de trabajadores activos', async () => {
    mockPrisma.workerDocument.count.mockResolvedValue(5)
    mockPrisma.worker.findFirst.mockResolvedValue({ id: 'w1', firstName: 'Ana', lastName: 'Pérez', legajoScore: 28 })

    const result = await getStartRouteProgress('org-1')

    expect(result.legajoDocs).toBe(5)
    expect(result.legajoWorker).toEqual({ id: 'w1', name: 'Ana Pérez', legajoScore: 28 })
    expect(mockPrisma.workerDocument.count).toHaveBeenCalledWith({
      where: {
        status: { in: ['UPLOADED', 'VERIFIED'] },
        worker: { orgId: 'org-1', status: { not: 'TERMINATED' }, deletedAt: null },
      },
    })
  })

  it('si la tabla de tareas falla, no inventa avance', async () => {
    mockPrisma.complianceTask.aggregate.mockRejectedValue(new Error('relation does not exist'))

    const result = await getStartRouteProgress('org-1')

    expect(result.resolvedTasks).toBe(0)
    expect(result.multaReducida).toBe(0)
    expect(result.orgMissingFields).toEqual([])
  })
})
