import { describe, expect, it } from 'vitest'
import {
  LOCADOR_SUBORDINATED_EVENT_CODE,
  shouldEmitRiskEventForCase,
  subordinationCaseToRiskEventMetadata,
  subordinationCaseToTaskPayload,
} from '../subordination-risk-sync'
import type { SubordinationCase, SubordinationDossier } from '../subordination-dossier'

function dossier(): Pick<SubordinationDossier, 'generatedAt'> {
  return { generatedAt: '2026-05-02T12:00:00.000Z' }
}

function subordinationCase(partial: Partial<SubordinationCase> = {}): SubordinationCase {
  return {
    providerId: 'sp-1',
    providerName: 'Luis Rojas',
    document: 'DNI 00000000',
    serviceDescription: 'Soporte operativo permanente',
    areaName: 'Operaciones',
    unitId: 'u-ops',
    unitName: 'Operaciones',
    linkedPositionCount: 2,
    status: 'ACTIVE',
    severity: 'CRITICAL',
    score: 85,
    monthlyAmount: 5000,
    currency: 'PEN',
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: null,
    indicators: [],
    presentIndicators: [
      {
        code: 'RECEIVES_ORDERS',
        label: 'Recibe ordenes directas',
        weight: 25,
        present: true,
        legalMeaning: 'Indicador sensible de subordinacion.',
      },
      {
        code: 'FIXED_SCHEDULE',
        label: 'Horario fijo impuesto',
        weight: 20,
        present: true,
        legalMeaning: 'Reduce autonomia.',
      },
    ],
    evidence: {
      hasContractFile: false,
      invoiceCount: 3,
      latestInvoicePeriod: '2026-04',
      hasAreaMapping: true,
      hasFourthCategorySuspension: false,
      suspensionExpiresAt: null,
    },
    riskEnginePayload: {
      source: 'ORGCHART_SUBORDINATION_DOSSIER',
      riskType: 'DESNATURALIZACION_RELACION_CIVIL',
      score: 85,
      severity: 'CRITICAL',
      legalBasis: ['Principio de primacia de la realidad', 'D.S. 003-97-TR, art. 4'],
      factors: ['Recibe ordenes directas', 'Horario fijo impuesto'],
      affectedUnitId: 'u-ops',
      providerId: 'sp-1',
    },
    recommendedActions: [
      'Revisar regularizacion laboral o redisenar la relacion civil antes de una inspeccion.',
      'Retirar horario fijo impuesto y documentar entregables por resultado.',
    ],
    ...partial,
  }
}

describe('sincronizacion de subordinacion con Risk Engine', () => {
  it('emite evento solo para casos con riesgo real', () => {
    expect(shouldEmitRiskEventForCase(subordinationCase())).toBe(true)
    expect(shouldEmitRiskEventForCase(subordinationCase({ severity: 'CLEAR', score: 0 }))).toBe(false)
  })

  it('construye metadata canonica LOCADOR_SUBORDINATED para AuditLog/Risk Engine', () => {
    const metadata = subordinationCaseToRiskEventMetadata(
      subordinationCase(),
      dossier(),
      new Date('2026-05-02T13:00:00.000Z'),
    )

    expect(metadata.riskEvent).toMatchObject({
      code: LOCADOR_SUBORDINATED_EVENT_CODE,
      source: 'ORGCHART_SUBORDINATION_DOSSIER',
      riskType: 'DESNATURALIZACION_RELACION_CIVIL',
      score: 85,
      severity: 'CRITICAL',
      affectedUnitId: 'u-ops',
      providerId: 'sp-1',
      emittedAt: '2026-05-02T13:00:00.000Z',
      dossierGeneratedAt: '2026-05-02T12:00:00.000Z',
    })
    expect(metadata.evidence).toMatchObject({
      invoiceCount: 3,
      latestInvoicePeriod: '2026-04',
      hasContractFile: false,
      hasAreaMapping: true,
    })
  })

  it('convierte un caso critico en tarea de remediacion con vencimiento a 7 dias', () => {
    const payload = subordinationCaseToTaskPayload(
      'org-1',
      subordinationCase(),
      new Date('2026-05-02T10:00:00.000Z'),
    )

    expect(payload).toMatchObject({
      orgId: 'org-1',
      area: 'organigrama',
      priority: 1,
      title: 'Remediar subordinacion civil: Luis Rojas',
      gravedad: 'MUY_GRAVE',
      sourceId: 'risk-event:LOCADOR_SUBORDINATED:sp-1',
      plazoSugerido: 'Inmediato (7 dias)',
    })
    expect(payload.dueDate.toISOString()).toBe('2026-05-09T10:00:00.000Z')
    expect(payload.description).toContain('85/100')
    expect(payload.description).toContain('PEN 5000')
    expect(payload.baseLegal).toContain('D.S. 003-97-TR')
  })
})
