import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToBuffer, Document } from '@react-pdf/renderer'
import { CompliancePage } from '../pages/compliance-page'
import type { MemoriaAnualData } from '../types'

// Mock mínimo: CompliancePage solo usa org, year, doctorReport y stats.workerCount.
const mock = {
  org: {
    name: 'ACME',
    razonSocial: 'ACME SAC',
    ruc: '20123456789',
    sector: null,
    plan: null,
    regimenPrincipal: null,
  },
  year: 2026,
  generatedAt: new Date('2026-06-19'),
  tree: {
    rootUnitIds: [],
    units: [],
    positions: [],
    assignments: [],
    complianceRoles: [],
    generatedAt: '2026-06-19',
    asOf: null,
  },
  doctorReport: {
    generatedAt: '2026-06-19',
    scoreOrgHealth: 55,
    findings: [
      {
        rule: 'committee-sst',
        severity: 'CRITICAL',
        title: 'Falta Comité de SST',
        description: 'La empresa supera los 20 trabajadores y no tiene Comité de SST.',
        baseLegal: 'Ley 29783, art. 29',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: null,
        suggestedFix: 'Constituir el Comité de SST.',
      },
      {
        rule: 'dpo-required',
        severity: 'HIGH',
        title: 'DPO no designado',
        description: 'Tratamiento de datos personales sin DPO.',
        baseLegal: 'Ley 29733',
        affectedUnitIds: [],
        affectedWorkerIds: [],
        suggestedTaskTitle: null,
        suggestedFix: 'Designar un Oficial de Datos Personales.',
      },
    ],
    totals: { critical: 1, high: 1, medium: 0, low: 0 },
  },
  coverage: {},
  evolution: {},
  stats: {
    workerCount: 25,
    unitCount: 6,
    positionCount: 12,
    vacantCount: 3,
    activeContracts: 22,
    legalRolesAssigned: 1,
    legalRolesRequired: 3,
  },
} as unknown as MemoriaAnualData

describe('memoria compliance-page (smoke render)', () => {
  it('renderiza el dossier con la caja de exposición en soles sin lanzar', async () => {
    const el = createElement(Document, null, createElement(CompliancePage, { data: mock }))
    const buf = await renderToBuffer(el)
    expect(buf.length).toBeGreaterThan(1000)
  }, 30000)
})
