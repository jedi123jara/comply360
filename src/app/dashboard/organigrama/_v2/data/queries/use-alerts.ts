/**
 * Query de alertas del organigrama. Activa solo cuando no hay snapshot histórico.
 */
'use client'

import { useQuery } from '@tanstack/react-query'

export type OrgAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type OrgAlertCategory =
  | 'MOF'
  | 'SST'
  | 'LEGAL_ROLE'
  | 'VACANCY'
  | 'SUBORDINATION'
  | 'SUCCESSION'
  | 'STRUCTURE'

export interface OrgAlertDTO {
  id: string
  category: OrgAlertCategory
  severity: OrgAlertSeverity
  title: string
  description: string
  baseLegal: string | null
  affectedUnitIds: string[]
  affectedWorkerIds: string[]
  suggestedTaskTitle: string | null
  suggestedFix: string | null
  sourceRule: string
  priority: number
}

export interface OrgAlertsReportDTO {
  generatedAt: string
  scoreOrgHealth: number
  alerts: OrgAlertDTO[]
  totals: Record<'critical' | 'high' | 'medium' | 'low', number> & {
    open: number
    byCategory: Record<OrgAlertCategory, number>
  }
}

export const alertsKey = ['orgchart', 'alerts'] as const

export function useAlertsQuery(enabled = true) {
  return useQuery({
    queryKey: alertsKey,
    queryFn: async (): Promise<OrgAlertsReportDTO> => {
      const res = await fetch('/api/orgchart/alerts', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status} al cargar alertas`)
      return data as OrgAlertsReportDTO
    },
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
}
