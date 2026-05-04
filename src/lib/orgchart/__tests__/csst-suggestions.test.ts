import { describe, expect, it } from 'vitest'
import { buildCsstCompositionSuggestions } from '../csst-suggestions'
import type { OrgAssignmentDTO, OrgChartTree, OrgPositionDTO } from '../types'

const generatedAt = '2026-05-01T12:00:00.000Z'

describe('sugerencias de composición CSST', () => {
  it('propone comité paritario para empresas con 20 o más trabajadores', () => {
    const tree = makeTree(22)
    const report = buildCsstCompositionSuggestions(tree, new Date(generatedAt))

    expect(report.needsCommittee).toBe(true)
    expect(report.missingRoles).toEqual([
      'PRESIDENTE_COMITE_SST',
      'SECRETARIO_COMITE_SST',
      'REPRESENTANTE_TRABAJADORES_SST',
      'REPRESENTANTE_TRABAJADORES_SST',
      'REPRESENTANTE_EMPLEADOR_SST',
      'REPRESENTANTE_EMPLEADOR_SST',
    ])
    expect(report.suggestions[0]).toMatchObject({
      roleType: 'PRESIDENTE_COMITE_SST',
      workerId: 'w-manager',
    })
    expect(report.suggestions.some(suggestion => suggestion.roleType === 'REPRESENTANTE_TRABAJADORES_SST')).toBe(true)
  })

  it('propone Supervisor SST para empresas con menos de 20 trabajadores', () => {
    const tree = makeTree(12)
    const report = buildCsstCompositionSuggestions(tree, new Date(generatedAt))

    expect(report.needsCommittee).toBe(false)
    expect(report.missingRoles).toEqual(['SUPERVISOR_SST'])
    expect(report.suggestions[0]).toMatchObject({
      roleType: 'SUPERVISOR_SST',
      workerId: 'w-sst',
    })
    expect(report.suggestions[0].evidence).toContain('perfil SST directo')
  })
})

function makeTree(workerCount: number): OrgChartTree {
  const units = [
    { id: 'u-admin', parentId: null, name: 'Administración', slug: 'administracion', kind: 'AREA' as const, code: null, description: null, costCenter: null, level: 0, sortOrder: 0, color: null, icon: null, version: 1, isActive: true },
    { id: 'u-ops', parentId: null, name: 'Operaciones', slug: 'operaciones', kind: 'AREA' as const, code: null, description: null, costCenter: null, level: 0, sortOrder: 0, color: null, icon: null, version: 1, isActive: true },
    { id: 'u-sst', parentId: null, name: 'SST', slug: 'sst', kind: 'AREA' as const, code: null, description: null, costCenter: null, level: 0, sortOrder: 0, color: null, icon: null, version: 1, isActive: true },
  ]
  const positions: OrgPositionDTO[] = [
    position('p-manager', 'Gerente de Operaciones', 'u-ops', true),
    position('p-admin', 'Responsable Legal y Administración', 'u-admin', true),
    position('p-sst', 'Supervisor SST', 'u-sst', false, { requiresSctr: true, requiresMedicalExam: true, riskCategory: 'ALTO' }),
    position('p-operator', 'Operario de Producción', 'u-ops', false, { requiresSctr: true, riskCategory: 'ALTO' }),
  ]
  const assignments: OrgAssignmentDTO[] = [
    assignment('a-manager', 'w-manager', 'p-manager', 'Gerente', 'Operaciones', '2020-01-10T00:00:00.000Z', 95),
    assignment('a-admin', 'w-admin', 'p-admin', 'Responsable Legal', 'Administración', '2019-04-01T00:00:00.000Z', 88),
    assignment('a-sst', 'w-sst', 'p-sst', 'Supervisor SST', 'SST', '2021-02-01T00:00:00.000Z', 86),
  ]

  for (let index = 0; assignments.length < workerCount; index++) {
    assignments.push(
      assignment(
        `a-op-${index}`,
        `w-op-${index}`,
        'p-operator',
        'Operario de Producción',
        'Operaciones',
        '2022-01-01T00:00:00.000Z',
        70 + (index % 10),
      ),
    )
  }

  return {
    rootUnitIds: ['u-admin', 'u-ops', 'u-sst'],
    units,
    positions,
    assignments,
    complianceRoles: [],
    generatedAt,
    asOf: null,
  }
}

function position(
  id: string,
  title: string,
  orgUnitId: string,
  isManagerial: boolean,
  patch: Partial<OrgPositionDTO> = {},
): OrgPositionDTO {
  return {
    id,
    orgUnitId,
    title,
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
    riskCategory: 'BAJO',
    requiresSctr: false,
    requiresMedicalExam: false,
    isCritical: false,
    isManagerial,
    reportsToPositionId: null,
    backupPositionId: null,
    seats: 1,
    ...patch,
  }
}

function assignment(
  id: string,
  workerId: string,
  positionId: string,
  workerPosition: string,
  department: string,
  fechaIngreso: string,
  legajoScore: number,
): OrgAssignmentDTO {
  return {
    id,
    workerId,
    positionId,
    isPrimary: true,
    isInterim: false,
    startedAt: fechaIngreso,
    endedAt: null,
    capacityPct: 100,
    worker: {
      id: workerId,
      dni: workerId.replace(/\D/g, '').padStart(8, '0').slice(0, 8),
      email: null,
      firstName: workerId,
      lastName: 'Trabajador',
      photoUrl: null,
      position: workerPosition,
      department,
      regimenLaboral: 'GENERAL',
      tipoContrato: 'INDEFINIDO',
      fechaIngreso,
      legajoScore,
      status: 'ACTIVE',
    },
  }
}
