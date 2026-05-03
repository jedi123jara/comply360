import { describe, expect, it } from 'vitest'
import { buildRitSummary } from '../rit-docx'
import type { OrgChartTree, OrgPositionDTO } from '../types'

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

function tree(positions: OrgPositionDTO[]): OrgChartTree {
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
      {
        id: 'u2',
        parentId: 'u1',
        name: 'Operaciones',
        slug: 'operaciones',
        kind: 'AREA',
        code: null,
        description: null,
        costCenter: null,
        level: 1,
        sortOrder: 0,
        color: null,
        icon: null,
        version: 1,
        isActive: true,
      },
    ],
    positions,
    assignments: [
      {
        id: 'a1',
        workerId: 'w1',
        positionId: 'p1',
        isPrimary: true,
        isInterim: false,
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
        capacityPct: 100,
        worker: {
          id: 'w1',
          dni: '12345678',
          email: null,
          firstName: 'Ana',
          lastName: 'Perez',
          photoUrl: null,
          position: null,
          department: null,
          regimenLaboral: 'GENERAL',
          tipoContrato: 'INDETERMINADO',
          fechaIngreso: '2026-01-01T00:00:00.000Z',
          legajoScore: null,
          status: 'ACTIVE',
        },
      },
    ],
    complianceRoles: [
      {
        id: 'r1',
        workerId: 'w1',
        roleType: 'PRESIDENTE_COMITE_SST',
        unitId: 'u1',
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: null,
        electedAt: null,
        actaUrl: null,
        baseLegal: 'Ley 29783',
        worker: { id: 'w1', firstName: 'Ana', lastName: 'Perez' },
      },
    ],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
  }
}

describe('RIT estructural DOCX', () => {
  it('resume vacantes, MOF pendiente, puestos criticos y roles legales', () => {
    const summary = buildRitSummary(
      tree([
        position({
          id: 'p1',
          orgUnitId: 'u1',
          title: 'Gerente General',
          purpose: 'Dirigir la empresa',
          functions: ['Gestion general'],
          responsibilities: ['Resultados'],
          requirements: { education: 'Universitario' },
          isCritical: true,
        }),
        position({ id: 'p2', orgUnitId: 'u2', title: 'Supervisor SST', seats: 2, requiresSctr: true }),
        position({ id: 'p3', orgUnitId: 'u2', title: 'Analista', riskCategory: 'CRITICO' }),
      ]),
    )

    expect(summary).toMatchObject({
      unitCount: 2,
      positionCount: 3,
      assignmentCount: 1,
      vacancyCount: 3,
      missingMofCount: 2,
      criticalPositionCount: 1,
      sstSensitiveCount: 3,
      complianceRoleCount: 1,
      maxDepth: 1,
      structureScore: expect.any(Number),
      structureHealth: expect.any(String),
      overloadedManagers: 0,
      criticalManagers: 0,
      maxSpan: 0,
      averageSpan: 0,
    })
    expect(summary.structureScore).toBeLessThan(100)
  })
})
