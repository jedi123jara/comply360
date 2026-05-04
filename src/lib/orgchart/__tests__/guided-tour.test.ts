import { describe, it, expect } from 'vitest'
import { buildGuidedTour } from '../public-link/guided-tour'
import type { ComplianceRoleType } from '../types'

interface PublicTree {
  units: Array<{ id: string; parentId: string | null; name: string; kind: string }>
  positions: Array<{
    id: string
    orgUnitId: string
    title: string
    occupants: Array<{ name: string; isInterim: boolean }>
  }>
  complianceRoles: Array<{
    roleType: ComplianceRoleType
    workerName: string
    unitId: string | null
    endsAt: string | null
  }>
}

function emptyTree(): PublicTree {
  return {
    units: [{ id: 'root', parentId: null, name: 'Empresa', kind: 'GERENCIA' }],
    positions: [],
    complianceRoles: [],
  }
}

function role(
  type: ComplianceRoleType,
  name: string,
  unitId: string | null = 'root',
): PublicTree['complianceRoles'][0] {
  return { roleType: type, workerName: name, unitId, endsAt: null }
}

describe('buildGuidedTour', () => {
  it('genera 6 steps en el orden esperado', () => {
    const tree = emptyTree()
    const tour = buildGuidedTour(tree, { workerCount: 50, mofCompletedRatio: 1 })
    expect(tour.steps).toHaveLength(6)
    expect(tour.steps.map((s) => s.key)).toEqual([
      'sst-committee',
      'hostigamiento-committee',
      'dpo',
      'brigada-emergencia',
      'other-legal-roles',
      'mof-coverage',
    ])
    expect(tour.steps.map((s) => s.order)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('empresa con 50 trabajadores sin Comité SST → step pending', () => {
    const tree = emptyTree()
    const tour = buildGuidedTour(tree, { workerCount: 50, mofCompletedRatio: 1 })
    const sstStep = tour.steps.find((s) => s.key === 'sst-committee')!
    expect(sstStep.status).toBe('pending')
    expect(sstStep.recommendation).toBeTruthy()
  })

  it('empresa con 50 trabajadores con Comité SST paritario → step ok', () => {
    const tree = emptyTree()
    tree.complianceRoles = [
      role('PRESIDENTE_COMITE_SST', 'Ana Pérez'),
      role('SECRETARIO_COMITE_SST', 'Juan García'),
      role('REPRESENTANTE_TRABAJADORES_SST', 'María López'),
      role('REPRESENTANTE_TRABAJADORES_SST', 'Pedro Ruiz'),
      role('REPRESENTANTE_EMPLEADOR_SST', 'Carmen Vera'),
      role('REPRESENTANTE_EMPLEADOR_SST', 'Luis Soto'),
    ]
    const tour = buildGuidedTour(tree, { workerCount: 50, mofCompletedRatio: 1 })
    const sstStep = tour.steps.find((s) => s.key === 'sst-committee')!
    expect(sstStep.status).toBe('ok')
    expect(sstStep.highlightPeople).toHaveLength(6)
  })

  it('empresa pequeña (≤20) con Supervisor SST → step ok', () => {
    const tree = emptyTree()
    tree.complianceRoles = [role('SUPERVISOR_SST', 'Carlos Vega')]
    const tour = buildGuidedTour(tree, { workerCount: 12, mofCompletedRatio: 1 })
    const sstStep = tour.steps.find((s) => s.key === 'sst-committee')!
    expect(sstStep.status).toBe('ok')
  })

  it('empresa <20 trabajadores no necesita comité hostigamiento formal → step ok', () => {
    const tree = emptyTree()
    const tour = buildGuidedTour(tree, { workerCount: 10, mofCompletedRatio: 1 })
    const hostStep = tour.steps.find((s) => s.key === 'hostigamiento-committee')!
    expect(hostStep.status).toBe('ok')
  })

  it('empresa ≥20 sin DPO → step attention con recomendación', () => {
    const tree = emptyTree()
    const tour = buildGuidedTour(tree, { workerCount: 50, mofCompletedRatio: 1 })
    const dpoStep = tour.steps.find((s) => s.key === 'dpo')!
    expect(dpoStep.status).toBe('attention')
    expect(dpoStep.recommendation).toContain('ANPDP')
  })

  it('MOF completado al 100% → step ok', () => {
    const tour = buildGuidedTour(emptyTree(), { workerCount: 50, mofCompletedRatio: 1 })
    const mofStep = tour.steps.find((s) => s.key === 'mof-coverage')!
    expect(mofStep.status).toBe('ok')
    expect(mofStep.summary).toContain('100%')
  })

  it('MOF al 30% → step pending', () => {
    const tour = buildGuidedTour(emptyTree(), { workerCount: 50, mofCompletedRatio: 0.3 })
    const mofStep = tour.steps.find((s) => s.key === 'mof-coverage')!
    expect(mofStep.status).toBe('pending')
    expect(mofStep.summary).toContain('30%')
  })

  it('globalStatus refleja el peor step', () => {
    // Tree sin nada — la mayoría dará pending → globalStatus = pending
    const tour = buildGuidedTour(emptyTree(), { workerCount: 100, mofCompletedRatio: 0.1 })
    expect(tour.globalStatus).toBe('pending')
  })

  it('highlightUnitIds extrae los unitId de los roles asignados', () => {
    const tree = emptyTree()
    tree.units.push({
      id: 'csst-unit',
      parentId: 'root',
      name: 'Comité SST',
      kind: 'COMITE_LEGAL',
    })
    tree.complianceRoles = [
      role('SUPERVISOR_SST', 'Carlos Vega', 'csst-unit'),
    ]
    const tour = buildGuidedTour(tree, { workerCount: 12, mofCompletedRatio: 1 })
    const sstStep = tour.steps.find((s) => s.key === 'sst-committee')!
    expect(sstStep.highlightUnitIds).toContain('csst-unit')
  })
})
