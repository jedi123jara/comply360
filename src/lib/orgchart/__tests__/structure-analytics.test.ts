import { describe, expect, it } from 'vitest'
import { buildStructureAnalytics } from '../structure-analytics'
import type { OrgAssignmentDTO, OrgChartTree, OrgPositionDTO, OrgUnitDTO } from '../types'

function unit(partial: Partial<OrgUnitDTO> & Pick<OrgUnitDTO, 'id' | 'name'>): OrgUnitDTO {
  return {
    parentId: null,
    slug: partial.name.toLowerCase().replace(/\s+/g, '-'),
    kind: 'AREA',
    code: null,
    description: null,
    costCenter: null,
    level: 0,
    sortOrder: 0,
    color: null,
    icon: null,
    version: 1,
    isActive: true,
    ...partial,
  }
}

function position(partial: Partial<OrgPositionDTO> & Pick<OrgPositionDTO, 'id' | 'orgUnitId' | 'title'>): OrgPositionDTO {
  return {
    code: null,
    description: null,
    level: null,
    purpose: null,
    functions: null,
    responsibilities: null,
    requirements: null,
    salaryBandMin: null,
    salaryBandMax: null,
    category: null,
    riskCategory: null,
    requiresSctr: false,
    requiresMedicalExam: false,
    isCritical: false,
    isManagerial: false,
    reportsToPositionId: null,
    backupPositionId: null,
    seats: 1,
    ...partial,
  }
}

function assignment(workerId: string, positionId: string): OrgAssignmentDTO {
  return {
    id: `a-${workerId}-${positionId}`,
    workerId,
    positionId,
    isPrimary: true,
    isInterim: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: null,
    capacityPct: 100,
    worker: {
      id: workerId,
      dni: '12345678',
      email: null,
      firstName: 'Persona',
      lastName: workerId,
      photoUrl: null,
      position: null,
      department: null,
      regimenLaboral: 'GENERAL',
      tipoContrato: 'INDETERMINADO',
      fechaIngreso: '2026-01-01T00:00:00.000Z',
      legajoScore: null,
      status: 'ACTIVE',
    },
  }
}

function tree(partial: Partial<OrgChartTree>): OrgChartTree {
  return {
    rootUnitIds: ['u1'],
    units: [unit({ id: 'u1', name: 'Operaciones' })],
    positions: [],
    assignments: [],
    complianceRoles: [],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
    ...partial,
  }
}

describe('Analitica estructural del organigrama', () => {
  it('detecta span alto y calcula score por area', () => {
    const reports = Array.from({ length: 14 }, (_, index) =>
      position({
        id: `p${index + 2}`,
        orgUnitId: 'u1',
        title: `Analista ${index + 1}`,
        reportsToPositionId: 'p1',
      }),
    )
    const base = tree({
      positions: [
        position({
          id: 'p1',
          orgUnitId: 'u1',
          title: 'Jefe Operaciones',
          isManagerial: true,
          purpose: 'Dirigir operaciones',
          functions: ['Planificar'],
          responsibilities: ['Resultados'],
          requirements: { education: 'Universitario' },
        }),
        ...reports,
      ],
      assignments: [assignment('w1', 'p1')],
    })

    const summary = buildStructureAnalytics(base, new Date('2026-05-02T00:00:00.000Z'))

    expect(summary.spanRecords[0]).toMatchObject({
      positionId: 'p1',
      directReports: 14,
      severity: 'high',
      totalSubtree: 14,
    })
    expect(summary.totals).toMatchObject({
      managers: 1,
      overloadedManagers: 1,
      vacancies: 14,
      missingMof: 14,
    })
    expect(summary.unitScores[0]).toMatchObject({
      unitId: 'u1',
      maxSpan: 14,
      health: 'critical',
    })
    expect(summary.unitScores[0].flags).toContain('span maximo 14')
  })

  it('premia areas completas con MOF y ocupacion', () => {
    const positions = [
      position({
        id: 'p1',
        orgUnitId: 'u1',
        title: 'Gerente Legal',
        isManagerial: true,
        purpose: 'Dirigir legal',
        functions: ['Supervisar'],
        responsibilities: ['Riesgos'],
        requirements: { education: 'Derecho' },
      }),
      position({
        id: 'p2',
        orgUnitId: 'u1',
        title: 'Analista Legal',
        reportsToPositionId: 'p1',
        purpose: 'Gestion documental',
        functions: ['Revisar'],
        responsibilities: ['Contratos'],
        requirements: { education: 'Derecho' },
      }),
    ]

    const summary = buildStructureAnalytics(
      tree({
        units: [unit({ id: 'u1', name: 'Legal' })],
        positions,
        assignments: [assignment('w1', 'p1'), assignment('w2', 'p2')],
      }),
    )

    expect(summary.score).toBeGreaterThanOrEqual(85)
    expect(summary.health).toBe('excellent')
    expect(summary.unitScores[0]).toMatchObject({
      unitName: 'Legal',
      vacancies: 0,
      missingMof: 0,
      health: 'excellent',
    })
  })
})
