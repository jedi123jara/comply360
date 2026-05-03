import { describe, expect, it } from 'vitest'
import { buildWhatIfCostImpact } from '../what-if-cost'
import type { OrgAssignmentDTO, OrgChartTree, OrgPositionDTO } from '../types'

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

function assignment(partial: Partial<OrgAssignmentDTO> & Pick<OrgAssignmentDTO, 'id' | 'positionId'>): OrgAssignmentDTO {
  return {
    workerId: `w-${partial.id}`,
    isPrimary: true,
    isInterim: false,
    startedAt: '2024-01-01T00:00:00.000Z',
    endedAt: null,
    capacityPct: 100,
    worker: {
      id: `w-${partial.id}`,
      dni: '00000000',
      email: null,
      firstName: 'Demo',
      lastName: 'Worker',
      photoUrl: null,
      position: null,
      department: null,
      regimenLaboral: 'GENERAL',
      tipoContrato: 'INDEFINIDO',
      fechaIngreso: '2010-01-01T00:00:00.000Z',
      legajoScore: null,
      status: 'ACTIVE',
    },
    ...partial,
  }
}

function tree(positions: OrgPositionDTO[], assignments: OrgAssignmentDTO[]): OrgChartTree {
  return {
    rootUnitIds: ['u1'],
    units: [
      {
        id: 'u1',
        parentId: null,
        name: 'Gerencia',
        slug: 'gerencia',
        kind: 'GERENCIA',
        code: null,
        description: null,
        costCenter: null,
        level: 0,
        sortOrder: 0,
        color: null,
        icon: null,
        version: 1,
        isActive: true,
      },
    ],
    positions,
    assignments,
    complianceRoles: [],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
  }
}

describe('Impacto económico What-If', () => {
  it('estima nómina, vacantes e indemnización referencial de la rama afectada', () => {
    const base = tree(
      [
        position({ id: 'p1', orgUnitId: 'u1', title: 'Gerente', salaryBandMin: '2000', salaryBandMax: '4000', seats: 2 }),
        position({ id: 'p2', orgUnitId: 'u1', title: 'Analista', reportsToPositionId: 'p1', salaryBandMin: '1000', salaryBandMax: '1000' }),
      ],
      [
        assignment({ id: 'a1', positionId: 'p1' }),
        assignment({
          id: 'a2',
          positionId: 'p2',
          capacityPct: 50,
          worker: {
            id: 'w-a2',
            dni: '11111111',
            email: null,
            firstName: 'Mype',
            lastName: 'Worker',
            photoUrl: null,
            position: null,
            department: null,
            regimenLaboral: 'MYPE_MICRO',
            tipoContrato: 'INDEFINIDO',
            fechaIngreso: '2023-05-02T00:00:00.000Z',
            legajoScore: null,
            status: 'ACTIVE',
          },
        }),
      ],
    )

    const impact = buildWhatIfCostImpact(base, 'p1', new Date('2026-05-02T12:00:00.000Z'))

    expect(impact.positionsAffected).toBe(2)
    expect(impact.workersAffected).toBe(2)
    expect(impact.vacantSeatsAffected).toBe(1)
    expect(impact.estimatedMonthlyPayroll).toBe(3500)
    expect(impact.estimatedAnnualPayroll).toBe(42000)
    expect(impact.estimatedMonthlyVacancyBudget).toBe(3000)
    expect(impact.estimatedSeveranceExposure).toBeGreaterThan(36000)
    expect(impact.salaryBandCoverage).toMatchObject({
      positionsWithBand: 2,
      positionsMissingBand: 0,
      assignmentsWithBand: 2,
      assignmentsMissingBand: 0,
    })
  })

  it('marca cobertura incompleta cuando faltan bandas salariales', () => {
    const base = tree(
      [position({ id: 'p1', orgUnitId: 'u1', title: 'Jefe Legal' })],
      [assignment({ id: 'a1', positionId: 'p1' })],
    )

    const impact = buildWhatIfCostImpact(base, 'p1')

    expect(impact.estimatedMonthlyPayroll).toBe(0)
    expect(impact.salaryBandCoverage.positionsMissingBand).toBe(1)
    expect(impact.salaryBandCoverage.assignmentsMissingBand).toBe(1)
    expect(impact.notes.at(-1)).toContain('bandas salariales')
  })
})
