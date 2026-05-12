/**
 * Botón con badge en el toolbar para abrir el drawer de hallazgos del organigrama.
 *
 * Muestra el conteo unificado: alertas operativas (12 reglas: MOF, SST,
 * vacantes, subordinación, etc.) + findings del Org Doctor IA (antes
 * mostrados como nudges flotantes). El badge cambia de color según la
 * severidad máxima presente.
 */
'use client'

import { Bell } from 'lucide-react'

import { useMergedFindings } from '../data/use-merged-findings'
import { useOrgStore } from '../state/org-store'

export function AlertsButton() {
  const setAlertsOpen = useOrgStore((s) => s.setAlertsOpen)
  const report = useMergedFindings(true)

  const total = report.totals.open
  const critical = report.totals.critical
  const high = report.totals.high

  // Determina el tono del badge por severidad máxima.
  const tone = critical > 0 ? 'critical' : high > 0 ? 'high' : total > 0 ? 'medium' : 'idle'
  const badgeClass = {
    critical: 'bg-rose-600 text-white',
    high: 'bg-amber-500 text-white',
    medium: 'bg-yellow-400 text-yellow-900',
    idle: 'bg-emerald-100 text-emerald-700',
  }[tone]

  return (
    <button
      type="button"
      onClick={() => setAlertsOpen(true)}
      className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      title={total > 0 ? `${total} hallazgos abiertos` : 'Sin hallazgos'}
    >
      <Bell className="h-4 w-4" />
      <span className="hidden md:inline">Alertas</span>
      {total > 0 && (
        <span
          className={`min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums ${badgeClass}`}
        >
          {total}
        </span>
      )}
    </button>
  )
}
