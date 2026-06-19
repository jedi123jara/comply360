import { describe, expect, it } from 'vitest'

import {
  buildUnitPath,
  inferPositionHierarchy,
  inferUnitHierarchy,
  isParallelGovernanceUnit,
} from '../hierarchy-inference'
import type { OrgAssignmentDTO, OrgPositionDTO, OrgUnitDTO } from '../types'

function unit(partial: Pick<OrgUnitDTO, 'id' | 'name'> & Partial<OrgUnitDTO>): OrgUnitDTO {
  return {
    parentId: null,
    slug: partial.name.toLowerCase(),
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

function position(
  partial: Pick<OrgPositionDTO, 'id' | 'orgUnitId' | 'title'> & Partial<OrgPositionDTO>,
): OrgPositionDTO {
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

function assignment(positionId: string): OrgAssignmentDTO {
  return {
    id: `a-${positionId}`,
    workerId: `w-${positionId}`,
    positionId,
    isPrimary: true,
    isInterim: false,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: null,
    capacityPct: 100,
    worker: {
      id: `w-${positionId}`,
      dni: '00000000',
      email: null,
      firstName: 'Test',
      lastName: positionId,
      photoUrl: null,
      position: null,
      department: null,
      regimenLaboral: 'GENERAL',
      tipoContrato: 'INDEFINIDO',
      fechaIngreso: '2026-01-01T00:00:00.000Z',
      legajoScore: null,
      status: 'ACTIVE',
    },
  }
}

describe('inferPositionHierarchy', () => {
  it('organiza cargos sin jefe bajo lideres de unidad y gerencia', () => {
    const units = [
      unit({ id: 'u-gerencia', name: 'Dirección General', kind: 'GERENCIA' }),
      unit({ id: 'u-ops', name: 'Operaciones', parentId: 'u-gerencia', level: 1 }),
    ]
    const positions = [
      position({
        id: 'p-ceo',
        orgUnitId: 'u-gerencia',
        title: 'Gerente General',
        isManagerial: true,
      }),
      position({
        id: 'p-ops',
        orgUnitId: 'u-ops',
        title: 'Gerente de Operaciones',
        isManagerial: true,
      }),
      position({ id: 'p-analyst', orgUnitId: 'u-ops', title: 'Analista' }),
    ]

    const result = inferPositionHierarchy({
      units,
      positions,
      assignments: [assignment('p-ceo')],
    })

    expect(result.leadByUnit.get('u-gerencia')?.id).toBe('p-ceo')
    expect(result.leadByUnit.get('u-ops')?.id).toBe('p-ops')
    expect(result.parentByPosition.get('p-ops')).toBe('p-ceo')
    expect(result.parentByPosition.get('p-analyst')).toBe('p-ops')
    expect(result.directReportsByPosition.get('p-ceo')).toBe(1)
    expect(result.directReportsByPosition.get('p-ops')).toBe(1)
    expect(result.inferredPositionIds.has('p-analyst')).toBe(true)
  })

  it('preserva lineas de mando explicitas', () => {
    const units = [unit({ id: 'u1', name: 'Legal' })]
    const positions = [
      position({ id: 'p1', orgUnitId: 'u1', title: 'Responsable Legal' }),
      position({ id: 'p2', orgUnitId: 'u1', title: 'Especialista', reportsToPositionId: 'p1' }),
    ]

    const result = inferPositionHierarchy({ units, positions })

    expect(result.parentByPosition.get('p2')).toBe('p1')
    expect(result.inferredPositionIds.has('p2')).toBe(false)
  })

  it('conecta gerencias planas bajo una gerencia general detectada', () => {
    const units = [
      unit({ id: 'u-gg', name: 'Gerencia General', kind: 'GERENCIA' }),
      unit({ id: 'u-ops', name: 'Operaciones' }),
      unit({ id: 'u-admin', name: 'Administración' }),
    ]
    const positions = [
      position({
        id: 'p-gg',
        orgUnitId: 'u-gg',
        title: 'Gerente General',
        isManagerial: true,
      }),
      position({
        id: 'p-ops',
        orgUnitId: 'u-ops',
        title: 'Gerente de Operaciones',
        isManagerial: true,
      }),
      position({
        id: 'p-admin',
        orgUnitId: 'u-admin',
        title: 'Jefe de Administración',
        isManagerial: true,
      }),
    ]

    const unitResult = inferUnitHierarchy({ units, positions })
    const positionResult = inferPositionHierarchy({ units, positions })

    expect(unitResult.rootUnit?.id).toBe('u-gg')
    expect(unitResult.parentByUnit.get('u-ops')).toBe('u-gg')
    expect(unitResult.parentByUnit.get('u-admin')).toBe('u-gg')
    expect(positionResult.parentByPosition.get('p-ops')).toBe('p-gg')
    expect(positionResult.parentByPosition.get('p-admin')).toBe('p-gg')
  })

  it('crea cadena interna por nivel de cargo dentro del mismo proceso', () => {
    const units = [
      unit({ id: 'u-gg', name: 'Dirección General', kind: 'GERENCIA' }),
      unit({ id: 'u-ops', name: 'Operaciones y Proyectos', parentId: 'u-gg', level: 1 }),
    ]
    const positions = [
      position({
        id: 'p-gg',
        orgUnitId: 'u-gg',
        title: 'Gerente General',
        isManagerial: true,
      }),
      position({
        id: 'p-gerente',
        orgUnitId: 'u-ops',
        title: 'Gerente de Proyectos',
        isManagerial: true,
      }),
      position({
        id: 'p-lider',
        orgUnitId: 'u-ops',
        title: 'Líder de Proyecto',
        isManagerial: true,
      }),
      position({
        id: 'p-consultor',
        orgUnitId: 'u-ops',
        title: 'Consultor',
      }),
      position({
        id: 'p-apoyo',
        orgUnitId: 'u-ops',
        title: 'Apoyo operativo SST',
      }),
    ]

    const result = inferPositionHierarchy({ units, positions })

    expect(result.parentByPosition.get('p-gerente')).toBe('p-gg')
    expect(result.parentByPosition.get('p-lider')).toBe('p-gerente')
    expect(result.parentByPosition.get('p-consultor')).toBe('p-lider')
    expect(result.parentByPosition.get('p-apoyo')).toBe('p-lider')
  })

  it('permite excluir comisiones del arbol empresarial', () => {
    const units = [
      unit({ id: 'u-gg', name: 'Gerencia General', kind: 'GERENCIA' }),
      unit({ id: 'u-csst', name: 'Comité SST', kind: 'AREA' }),
    ]
    const positions = [
      position({
        id: 'p-gg',
        orgUnitId: 'u-gg',
        title: 'Gerente General',
        isManagerial: true,
      }),
      position({
        id: 'p-csst',
        orgUnitId: 'u-csst',
        title: 'Presidente del Comité SST',
        isManagerial: true,
      }),
    ]

    const excludedUnitIds = units.filter(isParallelGovernanceUnit).map((item) => item.id)
    const result = inferPositionHierarchy({ units, positions, excludedUnitIds })

    expect(excludedUnitIds).toEqual(['u-csst'])
    expect(result.parentByPosition.get('p-csst')).toBeNull()
  })

  it('construye ruta de unidad desde sus ancestros', () => {
    const units = [
      unit({ id: 'u1', name: 'Dirección General' }),
      unit({ id: 'u2', name: 'Operaciones', parentId: 'u1' }),
    ]

    expect(buildUnitPath('u2', new Map(units.map((item) => [item.id, item])))).toBe(
      'Dirección General / Operaciones',
    )
  })
})
