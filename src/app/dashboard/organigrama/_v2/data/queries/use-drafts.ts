/**
 * Query de los escenarios "What-If" guardados (OrgChartDraft).
 *
 * Cada draft simula una reestructuración (mover un cargo bajo otro padre)
 * y guarda el impactReport pre-calculado: métricas, riesgos, costo proyectado.
 */
'use client'

import { useQuery } from '@tanstack/react-query'

export type DraftStatus = 'DRAFT' | 'APPLIED' | 'DISCARDED'

export interface WhatIfRiskDTO {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  title: string
  description: string
}

export interface WhatIfCostImpactDTO {
  basis: 'POSITION_SALARY_BAND'
  currency: 'PEN'
  positionsAffected: number
  workersAffected: number
  vacantSeatsAffected: number
  estimatedMonthlyPayroll: number
  estimatedAnnualPayroll: number
  estimatedMonthlyVacancyBudget: number
  estimatedSeveranceExposure: number
  salaryBandCoverage: {
    positionsWithBand: number
    positionsMissingBand: number
    assignmentsWithBand: number
    assignmentsMissingBand: number
  }
  notes: string[]
}

export interface WhatIfImpactReportDTO {
  generatedAt: string
  blocked: boolean
  scenario: {
    positionId: string
    positionTitle: string
    unitId: string
    unitName: string | null
    fromParentId: string | null
    fromParentTitle: string | null
    toParentId: string
    toParentTitle: string
  }
  metrics: {
    occupants: number
    directReportsMoved: number
    projectedSpanOfControl: number
    risks: number
  }
  costImpact: WhatIfCostImpactDTO
  risks: WhatIfRiskDTO[]
}

export interface DraftDTO {
  id: string
  name: string
  status: DraftStatus
  baseSnapshotId: string | null
  diffSummary: unknown
  impactReport: WhatIfImpactReportDTO | null
  createdAt: string
  updatedAt: string
  appliedAt: string | null
  createdBy?: { name: string; email: string } | null
  appliedBy?: { name: string; email: string } | null
}

export const draftsKey = ['orgchart', 'drafts'] as const

export function useDraftsQuery(enabled = true) {
  return useQuery({
    queryKey: draftsKey,
    queryFn: async (): Promise<DraftDTO[]> => {
      const res = await fetch('/api/orgchart/drafts', { cache: 'no-store' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Error ${res.status} al cargar escenarios`)
      }
      const data = (await res.json()) as { drafts: DraftDTO[] }
      return data.drafts
    },
    enabled,
    staleTime: 30_000,
  })
}
