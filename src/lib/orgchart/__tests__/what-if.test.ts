import { describe, expect, it } from 'vitest'
import {
  assertWhatIfDraftStillMatchesCurrentParent,
  evaluatePositionReparentScenario,
  WhatIfScenarioError,
} from '../what-if'
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
    ],
    positions,
    assignments: [],
    complianceRoles: [],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
  }
}

describe('What-If organigrama', () => {
  it('simula un cambio de jefatura y devuelve diff e impacto', () => {
    const base = tree([
      position({ id: 'p1', orgUnitId: 'u1', title: 'Gerente' }),
      position({ id: 'p2', orgUnitId: 'u1', title: 'Jefe Legal', reportsToPositionId: 'p1', isManagerial: true }),
      position({ id: 'p3', orgUnitId: 'u1', title: 'Analista', reportsToPositionId: 'p2' }),
    ])

    const result = evaluatePositionReparentScenario(base, 'p3', 'p1')

    expect(result.simulatedTree.positions.find(candidate => candidate.id === 'p3')?.reportsToPositionId).toBe('p1')
    expect(result.diff.movedPositions).toHaveLength(1)
    expect(result.impact.scenario).toMatchObject({
      positionId: 'p3',
      fromParentTitle: 'Jefe Legal',
      toParentTitle: 'Gerente',
    })
    expect(result.impact.blocked).toBe(false)
  })

  it('bloquea escenarios con ciclo jerárquico', () => {
    const base = tree([
      position({ id: 'p1', orgUnitId: 'u1', title: 'Gerente' }),
      position({ id: 'p2', orgUnitId: 'u1', title: 'Jefe Legal', reportsToPositionId: 'p1' }),
      position({ id: 'p3', orgUnitId: 'u1', title: 'Analista', reportsToPositionId: 'p2' }),
    ])

    const result = evaluatePositionReparentScenario(base, 'p1', 'p3')

    expect(result.impact.blocked).toBe(true)
    expect(result.impact.risks.some(risk => risk.title === 'Ciclo jerárquico')).toBe(true)
  })

  it('rechaza cargos inexistentes', () => {
    const base = tree([position({ id: 'p1', orgUnitId: 'u1', title: 'Gerente' })])

    expect(() => evaluatePositionReparentScenario(base, 'missing', 'p1')).toThrow(WhatIfScenarioError)
  })

  it('rechaza aplicar un escenario si la estructura base ya cambió', () => {
    const base = tree([
      position({ id: 'p1', orgUnitId: 'u1', title: 'Gerente' }),
      position({ id: 'p2', orgUnitId: 'u1', title: 'Jefe Legal', reportsToPositionId: 'p1' }),
      position({ id: 'p3', orgUnitId: 'u1', title: 'Analista', reportsToPositionId: 'p2' }),
      position({ id: 'p4', orgUnitId: 'u1', title: 'Jefe Operaciones', reportsToPositionId: 'p1' }),
    ])
    const result = evaluatePositionReparentScenario(base, 'p3', 'p1')

    expect(() => assertWhatIfDraftStillMatchesCurrentParent(result.impact, 'p2')).not.toThrow()
    expect(() => assertWhatIfDraftStillMatchesCurrentParent(result.impact, 'p4')).toThrow(WhatIfScenarioError)
  })
})
