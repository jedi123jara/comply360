/**
 * Feed unificado de hallazgos del organigrama.
 *
 * Combina dos fuentes que antes vivían separadas:
 *   - `useAlertsQuery`  → /api/orgchart/alerts   (12 reglas operativas con persistencia)
 *   - `useDoctorReportQuery` → /api/orgchart/diagnose (Org Doctor IA, antes mostrado como nudges flotantes)
 *
 * Tras eliminar los nudges del canvas, este hook es la fuente única para:
 *   - El AlertsDrawer (drawer lateral 420px)
 *   - El badge "Alertas N" del header
 *   - La card "Salud del organigrama" cuando se vuelve clickeable
 *
 * Deduplica por `(rule, affectedUnitIds.sort().join('|'))` y recalcula totales.
 */
'use client'

import { useMemo } from 'react'

import type { DoctorFinding, DoctorReport } from '@/lib/orgchart/types'
import {
  useAlertsQuery,
  type OrgAlertCategory,
  type OrgAlertDTO,
  type OrgAlertSeverity,
  type OrgAlertsReportDTO,
} from './queries/use-alerts'
import { useDoctorReportQuery } from './queries/use-doctor-report'

const SEVERITY_PRIORITY: Record<OrgAlertSeverity, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
}

function categorizeDoctorRule(rule: string): OrgAlertCategory {
  const r = rule.toLowerCase()
  if (/mof/.test(r)) return 'MOF'
  if (/sst|seguridad|salud/.test(r)) return 'SST'
  if (/legal[-_.]?role|compliance[-_.]?role|brigada|comit[ée]/.test(r)) return 'LEGAL_ROLE'
  if (/vacan|vacancy|vacante/.test(r)) return 'VACANCY'
  if (/subordin/.test(r)) return 'SUBORDINATION'
  if (/sucess|sucesi[oó]n|succession|backup/.test(r)) return 'SUCCESSION'
  return 'STRUCTURE'
}

function fingerprintAlert(a: { sourceRule: string; affectedUnitIds: string[] }): string {
  const units = [...a.affectedUnitIds].sort().join(',')
  return `${a.sourceRule}::${units}`
}

function findingToAlert(f: DoctorFinding): OrgAlertDTO {
  const units = [...f.affectedUnitIds].sort().join(',')
  return {
    id: `doctor:${f.rule}:${units}`,
    category: categorizeDoctorRule(f.rule),
    severity: f.severity,
    title: f.title,
    description: f.description,
    baseLegal: f.baseLegal,
    affectedUnitIds: f.affectedUnitIds,
    affectedWorkerIds: f.affectedWorkerIds,
    suggestedTaskTitle: f.suggestedTaskTitle,
    suggestedFix: f.suggestedFix,
    sourceRule: f.rule,
    priority: SEVERITY_PRIORITY[f.severity],
  }
}

function computeTotals(alerts: OrgAlertDTO[]): OrgAlertsReportDTO['totals'] {
  const byCategory: Record<OrgAlertCategory, number> = {
    MOF: 0,
    SST: 0,
    LEGAL_ROLE: 0,
    VACANCY: 0,
    SUBORDINATION: 0,
    SUCCESSION: 0,
    STRUCTURE: 0,
  }
  let critical = 0
  let high = 0
  let medium = 0
  let low = 0
  for (const a of alerts) {
    byCategory[a.category]++
    if (a.severity === 'CRITICAL') critical++
    else if (a.severity === 'HIGH') high++
    else if (a.severity === 'MEDIUM') medium++
    else low++
  }
  return {
    critical,
    high,
    medium,
    low,
    open: alerts.length,
    byCategory,
  }
}

export interface MergedFindingsReport extends OrgAlertsReportDTO {
  /** Indica si la fuente alerts está cargando. */
  isLoading: boolean
  /** Error agregado de cualquiera de las dos fuentes. */
  error: Error | null
}

/**
 * Hook que devuelve el feed unificado + totales recalculados.
 *
 * El consumidor recibe la misma forma que `OrgAlertsReportDTO`, pero con
 * findings del Org Doctor ya incorporados.
 *
 * Si una de las dos fuentes aún no carga, se devuelven los datos de la que
 * sí esté lista — así el badge nunca queda en cero falso mientras espera al
 * Doctor.
 */
export function useMergedFindings(enabled = true): MergedFindingsReport {
  const alertsQuery = useAlertsQuery(enabled)
  const doctorQuery = useDoctorReportQuery(enabled)

  return useMemo<MergedFindingsReport>(() => {
    const alertsData: OrgAlertsReportDTO | undefined = alertsQuery.data
    const doctorData: DoctorReport | undefined = doctorQuery.data

    const baseAlerts = alertsData?.alerts ?? []
    const doctorAlerts: OrgAlertDTO[] = (doctorData?.findings ?? []).map(findingToAlert)

    const seen = new Set<string>()
    const merged: OrgAlertDTO[] = []

    for (const a of baseAlerts) {
      const fp = fingerprintAlert(a)
      if (seen.has(fp)) continue
      seen.add(fp)
      merged.push(a)
    }
    for (const a of doctorAlerts) {
      const fp = fingerprintAlert(a)
      if (seen.has(fp)) continue
      seen.add(fp)
      merged.push(a)
    }

    merged.sort((x, y) => {
      if (x.priority !== y.priority) return x.priority - y.priority
      return x.title.localeCompare(y.title)
    })

    const totals = computeTotals(merged)
    const generatedAt = alertsData?.generatedAt ?? doctorData?.generatedAt ?? new Date().toISOString()

    // Score: si tenemos ambos, promediamos; si solo uno, usamos ese; si ninguno, 100.
    const hasAlerts = typeof alertsData?.scoreOrgHealth === 'number'
    const hasDoctor = typeof doctorData?.scoreOrgHealth === 'number'
    let scoreOrgHealth = 100
    if (hasAlerts && hasDoctor) {
      scoreOrgHealth = Math.round(
        (alertsData!.scoreOrgHealth + doctorData!.scoreOrgHealth) / 2,
      )
    } else if (hasAlerts) {
      scoreOrgHealth = alertsData!.scoreOrgHealth
    } else if (hasDoctor) {
      scoreOrgHealth = doctorData!.scoreOrgHealth
    }

    const error =
      (alertsQuery.error instanceof Error ? alertsQuery.error : null) ??
      (doctorQuery.error instanceof Error ? doctorQuery.error : null)

    return {
      generatedAt,
      scoreOrgHealth,
      alerts: merged,
      totals,
      isLoading: alertsQuery.isLoading || doctorQuery.isLoading,
      error,
    }
  }, [
    alertsQuery.data,
    alertsQuery.error,
    alertsQuery.isLoading,
    doctorQuery.data,
    doctorQuery.error,
    doctorQuery.isLoading,
  ])
}
