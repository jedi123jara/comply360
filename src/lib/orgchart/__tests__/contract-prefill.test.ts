import { describe, expect, it } from 'vitest'
import { buildOrgPositionContractPrefill } from '../contract-prefill'
import type { OrgChartTree, OrgPositionDTO, OrgUnitDTO } from '../types'

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

function tree(): OrgChartTree {
  return {
    rootUnitIds: ['u-ops'],
    units: [unit({ id: 'u-ops', name: 'Operaciones' })],
    positions: [
      position({
        id: 'p-analista',
        orgUnitId: 'u-ops',
        title: 'Analista de Operaciones',
        salaryBandMin: '3200',
        requiresSctr: true,
        riskCategory: 'ALTO',
      }),
    ],
    assignments: [
      {
        id: 'a-1',
        workerId: 'w-1',
        positionId: 'p-analista',
        isPrimary: true,
        isInterim: false,
        startedAt: '2026-01-01T00:00:00.000Z',
        endedAt: null,
        capacityPct: 100,
        worker: {
          id: 'w-1',
          dni: '12345678',
          email: 'ana@example.com',
          firstName: 'Ana',
          lastName: 'Silva',
          photoUrl: null,
          position: 'Analista legacy',
          department: 'Ops',
          regimenLaboral: 'GENERAL',
          tipoContrato: 'LABORAL_PLAZO_FIJO',
          fechaIngreso: '2026-01-01T00:00:00.000Z',
          legajoScore: 90,
          status: 'ACTIVE',
        },
      },
    ],
    complianceRoles: [],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
  }
}

describe('prefill de contratos desde organigrama', () => {
  it('prepara campos de contrato desde cargo, area y ocupante principal', () => {
    const prefill = buildOrgPositionContractPrefill(tree(), 'p-analista', '2026-05-02T13:00:00.000Z')

    expect(prefill).toMatchObject({
      source: 'ORGCHART_POSITION',
      positionId: 'p-analista',
      positionTitle: 'Analista de Operaciones',
      unitName: 'Operaciones',
      suggestedTemplateId: 'laboral-plazo-fijo',
      worker: {
        dni: '12345678',
        fullName: 'Ana Silva',
      },
    })
    expect(prefill.suggestedFields).toMatchObject({
      org_position_id: 'p-analista',
      org_unit_id: 'u-ops',
      trabajador_cargo: 'Analista de Operaciones',
      trabajador_area: 'Operaciones',
      trabajador_dni: '12345678',
      trabajador_nombre: 'Ana Silva',
      remuneracion_mensual: '3200',
      fecha_inicio: '2026-01-01',
    })
    expect(prefill.warnings).toContain('El cargo requiere revisar SCTR antes de firmar.')
  })

  it('rechaza cargos que no existen en el arbol', () => {
    expect(() => buildOrgPositionContractPrefill(tree(), 'missing')).toThrow('Cargo no existe')
  })
})
