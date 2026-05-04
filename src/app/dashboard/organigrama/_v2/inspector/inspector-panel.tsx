/**
 * Inspector lateral derecho — muestra detalle del nodo seleccionado.
 *
 * En esta primera iteración tiene 3 tabs (info, mof, cumplimiento).
 * Las demás (reportes, costos, historial, comments) llegan en fases
 * posteriores. Es persistente, colapsable con `[`.
 */
'use client'

import { useMemo } from 'react'
import { X, ChevronRight } from 'lucide-react'

import type { OrgChartTree } from '@/lib/orgchart/types'
import {
  TONE_COLOR_HEX,
  TONE_LABEL,
  describeCoverage,
  type CoverageReport,
} from '@/lib/orgchart/coverage-aggregator'

import { useOrgStore } from '../state/org-store'
import type { InspectorTab } from '../state/slices/inspector-slice'

const TABS: Array<{ id: InspectorTab; label: string }> = [
  { id: 'info', label: 'Información' },
  { id: 'mof', label: 'MOF' },
  { id: 'cumplimiento', label: 'Cumplimiento' },
]

export interface InspectorPanelProps {
  tree: OrgChartTree
  coverage: CoverageReport | null
}

export function InspectorPanel({ tree, coverage }: InspectorPanelProps) {
  const open = useOrgStore((s) => s.inspectorOpen)
  const tab = useOrgStore((s) => s.inspectorTab)
  const setTab = useOrgStore((s) => s.setInspectorTab)
  const setOpen = useOrgStore((s) => s.setInspectorOpen)
  const selectedUnitId = useOrgStore((s) => s.selectedUnitId)

  const unit = useMemo(() => {
    if (!selectedUnitId) return null
    return tree.units.find((u) => u.id === selectedUnitId) ?? null
  }, [selectedUnitId, tree])

  const positions = useMemo(() => {
    if (!unit) return []
    return tree.positions.filter((p) => p.orgUnitId === unit.id)
  }, [unit, tree])

  const occupants = useMemo(() => {
    const positionIds = new Set(positions.map((p) => p.id))
    return tree.assignments.filter((a) => positionIds.has(a.positionId))
  }, [positions, tree])

  const unitCoverage = unit ? coverage?.byUnit.get(unit.id) ?? null : null

  if (!open || !unit) {
    return null
  }

  return (
    <aside className="flex h-full w-[380px] flex-col border-l border-slate-200 bg-white">
      <header className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
            {unit.kind}
          </div>
          <h2 className="truncate text-sm font-semibold text-slate-900">{unit.name}</h2>
          {unitCoverage && (
            <div className="mt-1 flex items-center gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums"
                style={{
                  backgroundColor: `${TONE_COLOR_HEX[unitCoverage.tone]}1a`,
                  color: TONE_COLOR_HEX[unitCoverage.tone],
                }}
              >
                {unitCoverage.score} · {TONE_LABEL[unitCoverage.tone]}
              </span>
              {unitCoverage.findingCount > 0 && (
                <span className="text-[10px] text-slate-500">
                  {unitCoverage.findingCount} hallazgo
                  {unitCoverage.findingCount === 1 ? '' : 's'}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Cerrar inspector"
          title="Cerrar inspector ([)"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <nav role="tablist" className="flex border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            type="button"
            className={`flex-1 border-b-2 px-3 py-2 text-xs font-medium transition ${
              tab === t.id
                ? 'border-emerald-500 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'info' && (
          <div className="space-y-3">
            <Stat label="Cargos" value={positions.length} />
            <Stat label="Ocupantes" value={occupants.length} />
            <Stat
              label="Vacantes"
              value={positions.reduce(
                (sum, p) =>
                  sum +
                  Math.max(
                    0,
                    p.seats - occupants.filter((o) => o.positionId === p.id).length,
                  ),
                0,
              )}
            />
            {unit.code && <Stat label="Código" value={unit.code} />}
            {unit.costCenter && <Stat label="Centro de costo" value={unit.costCenter} />}
            {unit.description && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                  Descripción
                </div>
                <p className="mt-1 text-sm text-slate-700">{unit.description}</p>
              </div>
            )}
          </div>
        )}

        {tab === 'mof' && (
          <div className="space-y-2">
            {positions.length === 0 && (
              <p className="text-sm text-slate-500">Esta unidad no tiene cargos definidos.</p>
            )}
            {positions.map((p) => {
              const hasMof = Boolean(
                p.purpose && p.functions && p.responsibilities && p.requirements,
              )
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-3 ${
                    hasMof
                      ? 'border-emerald-200 bg-emerald-50/50'
                      : 'border-amber-200 bg-amber-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {p.title}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        hasMof
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-amber-200 text-amber-800'
                      }`}
                    >
                      {hasMof ? 'MOF OK' : 'MOF incompleto'}
                    </span>
                  </div>
                  {p.purpose && (
                    <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{p.purpose}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'cumplimiento' && (
          <div className="space-y-3">
            {!unitCoverage && (
              <p className="text-sm text-slate-500">
                Corre el Org Doctor para ver el detalle de cumplimiento de esta unidad.
              </p>
            )}
            {unitCoverage && (
              <>
                <p className="text-sm text-slate-700">{describeCoverage(unitCoverage)}</p>
                {unitCoverage.findings.length === 0 ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                    Sin hallazgos registrados para esta unidad.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {unitCoverage.findings.map((f, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                              f.severity === 'CRITICAL'
                                ? 'bg-red-600 text-white'
                                : f.severity === 'HIGH'
                                  ? 'bg-amber-500 text-white'
                                  : f.severity === 'MEDIUM'
                                    ? 'bg-yellow-400 text-yellow-900'
                                    : 'bg-sky-500 text-white'
                            }`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-xs font-semibold text-slate-900">
                            {f.title}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-700">{f.description}</p>
                        {f.baseLegal && (
                          <p className="mt-1 font-mono text-[10px] text-slate-500">
                            {f.baseLegal}
                          </p>
                        )}
                        {f.suggestedFix && (
                          <p className="mt-1 flex items-start gap-1 rounded bg-white p-1.5 text-[11px] text-slate-700">
                            <ChevronRight className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-600" />
                            {f.suggestedFix}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-xs text-slate-600">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-slate-900">{value}</span>
    </div>
  )
}
