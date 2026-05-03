import { describe, expect, it } from 'vitest'
import { buildOrgCommandResults } from '../command-search'
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

function assignment(
  partial: Partial<OrgAssignmentDTO> & Pick<OrgAssignmentDTO, 'id' | 'workerId' | 'positionId'>,
): OrgAssignmentDTO {
  return {
    isPrimary: true,
    isInterim: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: null,
    capacityPct: 100,
    worker: {
      id: partial.workerId,
      dni: '00000000',
      email: null,
      firstName: 'Persona',
      lastName: 'Prueba',
      photoUrl: null,
      position: null,
      department: null,
      regimenLaboral: 'GENERAL',
      tipoContrato: 'INDETERMINADO',
      fechaIngreso: '2026-01-01T00:00:00.000Z',
      legajoScore: null,
      status: 'ACTIVE',
    },
    ...partial,
  }
}

function tree(partial: Partial<OrgChartTree>): OrgChartTree {
  return {
    rootUnitIds: ['u1'],
    units: [unit({ id: 'u1', name: 'Gerencia General', kind: 'GERENCIA' })],
    positions: [],
    assignments: [],
    complianceRoles: [],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
    ...partial,
  }
}

describe('Busqueda de comandos del organigrama', () => {
  it('encuentra trabajadores por nombre, DNI y cargo', () => {
    const base = tree({
      units: [unit({ id: 'u1', name: 'Operaciones' })],
      positions: [
        position({
          id: 'p1',
          orgUnitId: 'u1',
          title: 'Jefe de Operaciones',
          purpose: 'Dirigir operaciones',
          functions: ['Planificar'],
          responsibilities: ['Resultados'],
          requirements: { education: 'Universitario' },
        }),
      ],
      assignments: [
        assignment({
          id: 'a1',
          workerId: 'w1',
          positionId: 'p1',
          worker: {
            id: 'w1',
            dni: '44445555',
            email: 'ana@example.com',
            firstName: 'Ana',
            lastName: 'Torres',
            photoUrl: null,
            position: null,
            department: null,
            regimenLaboral: 'GENERAL',
            tipoContrato: 'INDETERMINADO',
            fechaIngreso: '2026-01-01T00:00:00.000Z',
            legajoScore: null,
            status: 'ACTIVE',
          },
        }),
      ],
    })

    const result = buildOrgCommandResults(base, '44445555')[0]

    expect(result).toMatchObject({
      kind: 'worker',
      title: 'Ana Torres',
      unitId: 'u1',
      positionId: 'p1',
      workerId: 'w1',
      lens: 'general',
    })
  })

  it('prioriza vacantes y abre el lente de vacantes', () => {
    const base = tree({
      positions: [position({ id: 'p1', orgUnitId: 'u1', title: 'Analista Legal', seats: 2 })],
      assignments: [],
    })

    const result = buildOrgCommandResults(base, 'vacantes')[0]

    expect(result).toMatchObject({
      id: 'insight:vacancies',
      kind: 'insight',
      lens: 'vacancies',
    })
    expect(result.subtitle).toContain('2 cupo')
  })

  it('detecta cargos sin MOF y dirige al lente MOF', () => {
    const base = tree({
      positions: [position({ id: 'p1', orgUnitId: 'u1', title: 'Coordinador Compliance' })],
    })

    const results = buildOrgCommandResults(base, 'mof')

    expect(results[0]).toMatchObject({ id: 'insight:mof', lens: 'mof' })
    expect(results.some(result => result.kind === 'position' && result.positionId === 'p1' && result.lens === 'mof')).toBe(true)
  })

  it('normaliza acentos y detecta cargos sensibles SST', () => {
    const base = tree({
      units: [unit({ id: 'u1', name: 'Operacion Critica' })],
      positions: [
        position({
          id: 'p1',
          orgUnitId: 'u1',
          title: 'Supervisor de Planta',
          riskCategory: 'CRITICO',
          requiresMedicalExam: true,
        }),
      ],
    })

    const result = buildOrgCommandResults(base, 'operacion critica').find(candidate => candidate.kind === 'unit')
    const sst = buildOrgCommandResults(base, 'sst')[0]

    expect(result).toMatchObject({ unitId: 'u1' })
    expect(sst).toMatchObject({ id: 'insight:sst', lens: 'sst' })
  })

  it('expone relaciones civiles para revisar subordinacion', () => {
    const base = tree({
      positions: [position({ id: 'p1', orgUnitId: 'u1', title: 'Consultor Proyecto' })],
      assignments: [
        assignment({
          id: 'a1',
          workerId: 'w1',
          positionId: 'p1',
          worker: {
            id: 'w1',
            dni: '77889900',
            email: null,
            firstName: 'Luis',
            lastName: 'Vega',
            photoUrl: null,
            position: null,
            department: null,
            regimenLaboral: 'CIVIL',
            tipoContrato: 'LOCACION_SERVICIOS',
            fechaIngreso: '2026-01-01T00:00:00.000Z',
            legajoScore: null,
            status: 'ACTIVE',
          },
        }),
      ],
    })

    const result = buildOrgCommandResults(base, 'locador')[0]

    expect(result).toMatchObject({
      id: 'civil:a1',
      kind: 'insight',
      tab: 'subordinacion',
      workerId: 'w1',
      positionId: 'p1',
      lens: 'contractual',
    })
    expect(buildOrgCommandResults(base, 'subordinacion')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'insight:subordination',
          tab: 'subordinacion',
        }),
      ]),
    )
  })

  it('envia roles legales y consultas de responsables al tab correcto', () => {
    const base = tree({
      complianceRoles: [
        {
          id: 'r1',
          workerId: 'w1',
          roleType: 'DPO_LEY_29733',
          unitId: null,
          startsAt: '2026-01-01T00:00:00.000Z',
          endsAt: null,
          electedAt: null,
          actaUrl: null,
          baseLegal: 'Ley 29733',
          worker: { id: 'w1', firstName: 'Maria', lastName: 'Diaz' },
        },
      ],
    })

    const roleResult = buildOrgCommandResults(base, 'dpo').find(result => result.kind === 'role')
    const insight = buildOrgCommandResults(base, 'responsables')[0]

    expect(roleResult).toMatchObject({
      id: 'role:r1',
      title: 'Oficial de Protección de Datos (DPO)',
      tab: 'responsables',
      workerId: 'w1',
    })
    expect(insight).toMatchObject({
      id: 'insight:responsibles',
      tab: 'responsables',
    })
  })

  it('envia consultas de span y score al tab de analitica', () => {
    const base = tree({
      positions: [
        position({ id: 'p1', orgUnitId: 'u1', title: 'Jefe' }),
        ...Array.from({ length: 13 }, (_, index) =>
          position({
            id: `p${index + 2}`,
            orgUnitId: 'u1',
            title: `Analista ${index + 1}`,
            reportsToPositionId: 'p1',
          }),
        ),
      ],
    })

    const span = buildOrgCommandResults(base, 'span')[0]
    const score = buildOrgCommandResults(base, 'score').find(result => result.id === 'insight:analytics')

    expect(span).toMatchObject({
      id: 'insight:span',
      tab: 'analitica',
    })
    expect(score).toMatchObject({
      title: 'Analitica estructural',
      tab: 'analitica',
    })
  })
})
