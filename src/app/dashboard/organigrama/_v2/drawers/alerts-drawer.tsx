/**
 * Drawer lateral derecho que muestra los hallazgos activos del organigrama.
 *
 * Fuente unificada (`useMergedFindings`): combina las 12 alertas operativas
 * (`/api/orgchart/alerts`) con los findings del Org Doctor IA
 * (`/api/orgchart/diagnose`). Estos últimos antes salían como nudges flotantes
 * sobre el canvas; ahora se consolidan aquí.
 *
 * Cada hallazgo tiene severidad, descripción, base legal, sugerencia de fix y
 * (opcional) sugerencia de tarea. Filtramos por severidad y categoría.
 */
'use client'

import { useMemo, useState } from 'react'
import { Bell, X, Loader2, Filter } from 'lucide-react'

import { useMergedFindings } from '../data/use-merged-findings'
import type { OrgAlertDTO, OrgAlertSeverity } from '../data/queries/use-alerts'
import { useOrgStore } from '../state/org-store'

const SEVERITY_TONE: Record<OrgAlertSeverity, string> = {
  CRITICAL: 'border-l-rose-500 bg-rose-50',
  HIGH: 'border-l-amber-500 bg-amber-50',
  MEDIUM: 'border-l-yellow-400 bg-yellow-50',
  LOW: 'border-l-sky-400 bg-sky-50',
}

const SEVERITY_BADGE: Record<OrgAlertSeverity, string> = {
  CRITICAL: 'bg-rose-600 text-white',
  HIGH: 'bg-amber-500 text-white',
  MEDIUM: 'bg-yellow-400 text-yellow-900',
  LOW: 'bg-sky-500 text-white',
}

const SEVERITY_FILTERS: Array<{ id: 'all' | OrgAlertSeverity; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'CRITICAL', label: 'Críticas' },
  { id: 'HIGH', label: 'Altas' },
  { id: 'MEDIUM', label: 'Medias' },
  { id: 'LOW', label: 'Bajas' },
]

export function AlertsDrawer() {
  const open = useOrgStore((s) => s.alertsOpen)
  const setOpen = useOrgStore((s) => s.setAlertsOpen)
  const report = useMergedFindings(open)
  const [filter, setFilter] = useState<'all' | OrgAlertSeverity>('all')

  const filtered = useMemo(() => {
    const all = report.alerts
    if (filter === 'all') return all
    return all.filter((a) => a.severity === filter)
  }, [report.alerts, filter])

  if (!open) return null

  return (
    <aside className="flex h-full w-[420px] flex-col border-l border-slate-200 bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <Bell className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Hallazgos del organigrama</h2>
            <p className="text-[11px] text-slate-500">
              {report.totals.open} hallazgo{report.totals.open === 1 ? '' : 's'} abierto
              {report.totals.open === 1 ? '' : 's'} · score{' '}
              <span className="font-semibold tabular-nums">{report.scoreOrgHealth}</span>/100
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* Totales por severidad */}
      <div className="grid grid-cols-4 gap-1.5 border-b border-slate-200 px-4 py-2 text-center text-[10px]">
        <SeverityBox label="CRIT" value={report.totals.critical} severity="CRITICAL" />
        <SeverityBox label="ALTO" value={report.totals.high} severity="HIGH" />
        <SeverityBox label="MEDIO" value={report.totals.medium} severity="MEDIUM" />
        <SeverityBox label="BAJO" value={report.totals.low} severity="LOW" />
      </div>

      {/* Filtros */}
      <nav className="flex flex-wrap items-center gap-1 border-b border-slate-200 px-4 py-2">
        <Filter className="h-3 w-3 text-slate-400" />
        {SEVERITY_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
              filter === f.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-3">
        {report.isLoading && report.alerts.length === 0 && (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando hallazgos…
          </div>
        )}

        {report.error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {report.error.message}
          </div>
        )}

        {filtered.length === 0 && !report.isLoading && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Bell className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-700">
              {filter === 'all' ? 'Sin hallazgos' : 'Sin hallazgos de esa severidad'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {filter === 'all'
                ? 'Tu organigrama está al día con las reglas de compliance.'
                : 'Cambia el filtro para ver otras severidades.'}
            </p>
          </div>
        )}

        <ul className="space-y-2">
          {filtered.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </ul>
      </div>
    </aside>
  )
}

function AlertCard({ alert }: { alert: OrgAlertDTO }) {
  return (
    <li className={`rounded-lg border-l-4 p-3 ${SEVERITY_TONE[alert.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${SEVERITY_BADGE[alert.severity]}`}
            >
              {alert.severity}
            </span>
            <span className="rounded bg-white/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700">
              {alert.category}
            </span>
          </div>
          <h3 className="mt-1 text-xs font-semibold text-slate-900">{alert.title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{alert.description}</p>
          {alert.baseLegal && (
            <p className="mt-1 font-mono text-[10px] text-slate-500">{alert.baseLegal}</p>
          )}
          {alert.suggestedFix && (
            <p className="mt-1.5 rounded bg-white/70 p-1.5 text-[11px] text-slate-700">
              <span className="font-semibold text-emerald-700">Sugerencia: </span>
              {alert.suggestedFix}
            </p>
          )}
        </div>
      </div>
    </li>
  )
}

function SeverityBox({
  label,
  value,
  severity,
}: {
  label: string
  value: number
  severity: OrgAlertSeverity
}) {
  return (
    <div className={`rounded ${value > 0 ? SEVERITY_BADGE[severity] : 'bg-slate-100 text-slate-500'} px-1 py-1`}>
      <div className="text-[8px] font-bold uppercase tracking-wide opacity-80">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  )
}
