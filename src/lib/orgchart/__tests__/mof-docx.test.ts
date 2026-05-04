import { describe, expect, it } from 'vitest'
import { buildOrgChartMofSummary } from '../mof-docx'
import type { OrgChartTree, OrgPositionDTO } from '../types'

describe('MOF integral del organigrama', () => {
  it('resume completitud, vacantes y score por alcance', () => {
    const tree = makeTree([
      makePosition({
        id: 'p-gerencia',
        orgUnitId: 'u-root',
        title: 'Gerente General',
        seats: 1,
        isCritical: true,
        isManagerial: true,
        backupPositionId: 'p-backup',
      }),
      makePosition({
        id: 'p-ops',
        orgUnitId: 'u-ops',
        title: 'Supervisor de Operaciones',
        seats: 2,
        description: 'Corto',
        level: null,
        purpose: null,
        functions: ['Supervisar turnos'],
        responsibilities: [],
        requirements: null,
        category: null,
        riskCategory: 'ALTO',
        requiresSctr: false,
        requiresMedicalExam: false,
        isCritical: true,
        isManagerial: true,
      }),
    ])

    const summary = buildOrgChartMofSummary(tree)

    expect(summary).toMatchObject({
      unitCount: 2,
      positionCount: 2,
      assignmentCount: 1,
      vacancyCount: 2,
      completeCount: 1,
      missingMofCount: 1,
      criticalCount: 1,
    })
    expect(summary.averageScore).toBeGreaterThan(50)
    expect(summary.averageScore).toBeLessThan(100)
  })

  it('permite resumir solo una rama de unidades', () => {
    const tree = makeTree([
      makePosition({ id: 'p-root', orgUnitId: 'u-root', title: 'CEO' }),
      makePosition({
        id: 'p-ops',
        orgUnitId: 'u-ops',
        title: 'Analista Operativo',
        purpose: null,
        functions: [],
        responsibilities: [],
        requirements: null,
      }),
    ])

    const summary = buildOrgChartMofSummary(tree, new Set(['u-ops']))

    expect(summary.unitCount).toBe(1)
    expect(summary.positionCount).toBe(1)
    expect(summary.assignmentCount).toBe(0)
    expect(summary.missingMofCount).toBe(1)
  })
})

function makeTree(positions: OrgPositionDTO[]): OrgChartTree {
  return {
    rootUnitIds: ['u-root'],
    units: [
      {
        id: 'u-root',
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
        id: 'u-ops',
        parentId: 'u-root',
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
        id: 'a-gerencia',
        workerId: 'w-1',
        positionId: 'p-gerencia',
        isPrimary: true,
        isInterim: false,
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
        capacityPct: 100,
        worker: {
          id: 'w-1',
          dni: '12345678',
          email: 'gerencia@example.com',
          firstName: 'Ana',
          lastName: 'Torres',
          photoUrl: null,
          position: 'Gerente General',
          department: 'Gerencia',
          regimenLaboral: 'GENERAL',
          tipoContrato: 'INDEFINIDO',
          fechaIngreso: '2025-01-01T00:00:00.000Z',
          legajoScore: 92,
          status: 'ACTIVE',
        },
      },
    ],
    complianceRoles: [],
    generatedAt: '2026-05-01T00:00:00.000Z',
    asOf: null,
  }
}

function makePosition(patch: Partial<OrgPositionDTO> & { id: string; orgUnitId: string; title: string }): OrgPositionDTO {
  return {
    id: patch.id,
    orgUnitId: patch.orgUnitId,
    title: patch.title,
    code: null,
    description: 'Cargo documentado con proposito operativo y responsabilidad formal.',
    level: 'Jefatura',
    purpose: 'Asegurar continuidad operativa, cumplimiento de controles y coordinacion de equipos internos.',
    functions: ['Planificar operaciones', 'Supervisar indicadores', 'Coordinar mejoras'],
    responsibilities: ['Cumplimiento operativo', 'Control de riesgos', 'Gestion de equipos'],
    requirements: {
      education: 'Universitario o tecnico',
      experience: '3 anos',
      competencies: ['Liderazgo', 'Analisis', 'Comunicacion'],
    },
    salaryBandMin: null,
    salaryBandMax: null,
    category: 'Operativo',
    riskCategory: 'MEDIO',
    requiresSctr: false,
    requiresMedicalExam: true,
    isCritical: false,
    isManagerial: false,
    reportsToPositionId: null,
    backupPositionId: null,
    seats: 1,
    ...patch,
  }
}
