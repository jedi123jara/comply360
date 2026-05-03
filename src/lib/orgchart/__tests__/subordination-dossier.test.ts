import { describe, expect, it } from 'vitest'
import { buildSubordinationDossier, type SubordinationProviderInput } from '../subordination-dossier'
import type { OrgChartTree, OrgUnitDTO, OrgPositionDTO } from '../types'

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

function provider(partial: Partial<SubordinationProviderInput> & Pick<SubordinationProviderInput, 'id'>): SubordinationProviderInput {
  return {
    documentType: 'DNI',
    documentNumber: '00000000',
    firstName: 'Luis',
    lastName: 'Rojas',
    area: null,
    servicioDescripcion: 'Consultoria puntual',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    monthlyAmount: 2500,
    currency: 'PEN',
    paymentFrequency: 'MONTHLY',
    hasSuspensionRetencion: false,
    suspensionExpiryDate: null,
    hasFixedSchedule: false,
    hasExclusivity: false,
    worksOnPremises: false,
    usesCompanyTools: false,
    reportsToSupervisor: false,
    receivesOrders: false,
    desnaturalizacionRisk: 0,
    contractFileUrl: null,
    status: 'ACTIVE',
    rhInvoices: [],
    ...partial,
  }
}

function tree(): OrgChartTree {
  return {
    rootUnitIds: ['u-ops'],
    units: [unit({ id: 'u-ops', name: 'Operaciones', code: 'OPS' })],
    positions: [
      position({ id: 'p-jefe', orgUnitId: 'u-ops', title: 'Jefe de Operaciones', isManagerial: true }),
      position({ id: 'p-analista', orgUnitId: 'u-ops', title: 'Analista de Operaciones' }),
    ],
    assignments: [],
    complianceRoles: [],
    generatedAt: '2026-05-02T12:00:00.000Z',
    asOf: null,
  }
}

describe('Expediente de subordinacion del organigrama', () => {
  it('prioriza prestadores con indicadores nucleares de subordinacion', () => {
    const dossier = buildSubordinationDossier(tree(), [
      provider({
        id: 'sp-critical',
        area: 'Operaciones',
        servicioDescripcion: 'Soporte operativo permanente',
        hasFixedSchedule: true,
        reportsToSupervisor: true,
        receivesOrders: true,
        usesCompanyTools: true,
        monthlyAmount: '5000',
        desnaturalizacionRisk: 72,
        rhInvoices: [
          { id: 'rh-1', issueDate: '2026-04-30T00:00:00.000Z', periodo: '2026-04', grossAmount: '5000', status: 'PAID' },
        ],
      }),
      provider({ id: 'sp-clear', firstName: 'Ana', lastName: 'Silva', contractFileUrl: 'https://example.com/contrato.pdf' }),
    ])

    expect(dossier.summary).toMatchObject({
      providers: 2,
      critical: 1,
      clear: 1,
      mappedToOrgUnits: 1,
      missingContracts: 1,
      estimatedMonthlyCivilSpendAtRisk: 5000,
    })
    expect(dossier.cases[0]).toMatchObject({
      providerId: 'sp-critical',
      severity: 'CRITICAL',
      unitId: 'u-ops',
      linkedPositionCount: 2,
      score: 80,
    })
    expect(dossier.cases[0].riskEnginePayload).toMatchObject({
      source: 'ORGCHART_SUBORDINATION_DOSSIER',
      riskType: 'DESNATURALIZACION_RELACION_CIVIL',
      affectedUnitId: 'u-ops',
    })
    expect(dossier.cases[0].presentIndicators.map(indicator => indicator.code)).toContain('RECEIVES_ORDERS')
  })

  it('marca accion de normalizacion cuando el area no calza con el organigrama', () => {
    const dossier = buildSubordinationDossier(tree(), [
      provider({
        id: 'sp-unmapped',
        area: 'Operaciones Lima',
        reportsToSupervisor: true,
        receivesOrders: true,
        desnaturalizacionRisk: 55,
      }),
    ])

    expect(dossier.summary.mappedToOrgUnits).toBe(0)
    expect(dossier.cases[0].unitId).toBeNull()
    expect(dossier.cases[0].recommendedActions.join(' ')).toContain('Normalizar')
  })
})
