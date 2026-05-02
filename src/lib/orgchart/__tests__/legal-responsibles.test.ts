import { describe, expect, it } from 'vitest'
import { buildLegalResponsiblesSummary } from '../legal-responsibles'
import type { ComplianceRoleType, OrgAssignmentDTO, OrgChartTree, OrgComplianceRoleDTO, OrgUnitDTO } from '../types'

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

function assignment(workerId: string): OrgAssignmentDTO {
  return {
    id: `a-${workerId}`,
    workerId,
    positionId: `p-${workerId}`,
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

function role(partial: Partial<OrgComplianceRoleDTO> & { id: string; workerId: string; roleType: ComplianceRoleType }): OrgComplianceRoleDTO {
  return {
    unitId: null,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: null,
    electedAt: null,
    actaUrl: null,
    baseLegal: null,
    worker: { id: partial.workerId, firstName: 'Persona', lastName: partial.workerId },
    ...partial,
  }
}

function tree(partial: Partial<OrgChartTree>): OrgChartTree {
  return {
    rootUnitIds: ['u1'],
    units: [unit({ id: 'u1', name: 'Gerencia' })],
    positions: [],
    assignments: [],
    complianceRoles: [],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
    ...partial,
  }
}

describe('Resumen de responsables legales', () => {
  it('agrupa roles, detecta vigencias proximas y conserva unidad', () => {
    const summary = buildLegalResponsiblesSummary(
      tree({
        assignments: [assignment('w1')],
        complianceRoles: [
          role({
            id: 'r1',
            workerId: 'w1',
            roleType: 'PRESIDENTE_COMITE_SST',
            unitId: 'u1',
            endsAt: '2026-05-20T00:00:00.000Z',
          }),
        ],
      }),
      new Date('2026-05-02T00:00:00.000Z'),
    )

    const sst = summary.groups.find(group => group.key === 'COMITE_SST')
    const president = sst?.items.find(item => item.roleType === 'PRESIDENTE_COMITE_SST')

    expect(summary.totals).toMatchObject({
      assignedRoles: 1,
      coveredRoleTypes: 1,
      expiringSoon: 1,
      orphaned: 0,
    })
    expect(president).toMatchObject({
      status: 'expiring',
      holders: [{ workerId: 'w1', unitName: 'Gerencia', daysToExpiry: 18 }],
    })
  })

  it('marca roles sin titular y titulares sin cargo activo', () => {
    const summary = buildLegalResponsiblesSummary(
      tree({
        assignments: [],
        complianceRoles: [
          role({
            id: 'r1',
            workerId: 'w9',
            roleType: 'DPO_LEY_29733',
          }),
        ],
      }),
    )

    const dpo = summary.groups
      .flatMap(group => group.items)
      .find(item => item.roleType === 'DPO_LEY_29733')
    const supervisor = summary.groups
      .flatMap(group => group.items)
      .find(item => item.roleType === 'SUPERVISOR_SST')

    expect(dpo).toMatchObject({ status: 'orphaned' })
    expect(supervisor).toMatchObject({ status: 'missing' })
    expect(summary.totals.orphaned).toBe(1)
    expect(summary.totals.missingRoleTypes).toBeGreaterThan(0)
  })
})
