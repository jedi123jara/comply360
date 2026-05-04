/**
 * Inspector lateral derecho — muestra detalle del nodo seleccionado.
 *
 * En esta primera iteración tiene 3 tabs (info, mof, cumplimiento).
 * Las demás (reportes, costos, historial, comments) llegan en fases
 * posteriores. Es persistente, colapsable con `[`.
 */
'use client'

import { useMemo } from 'react'
import { X, ChevronRight, Loader2, Download, ScrollText, History as HistoryIcon } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

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
  { id: 'reportes', label: 'Reportes' },
  { id: 'costos', label: 'Costos' },
  { id: 'cumplimiento', label: 'Cumplimiento' },
  { id: 'historial', label: 'Historial' },
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

      <nav
        role="tablist"
        className="flex overflow-x-auto border-b border-slate-200"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            type="button"
            className={`flex-shrink-0 border-b-2 px-3 py-2 text-[11px] font-medium transition ${
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

        {tab === 'reportes' && (
          <ReportsTab unitId={unit.id} unitName={unit.name} />
        )}

        {tab === 'costos' && (
          <CostsTab tree={tree} unitId={unit.id} positions={positions} occupants={occupants} />
        )}

        {tab === 'historial' && (
          <HistoryTab unitId={unit.id} />
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

// ─── Tab "Reportes" — descargas relacionadas con la unidad ───────────────────
function ReportsTab({ unitId, unitName }: { unitId: string; unitName: string }) {
  const reports = [
    {
      label: 'MOF de la unidad',
      sub: 'Manual de Organización y Funciones',
      href: `/api/orgchart/mof?unitId=${encodeURIComponent(unitId)}`,
      Icon: ScrollText,
    },
    {
      label: 'Memoria Anual del Organigrama',
      sub: 'PDF institucional con sello SHA-256',
      href: `/api/orgchart/memoria-anual?year=${new Date().getFullYear()}`,
      Icon: ScrollText,
    },
    {
      label: 'Gráfico del organigrama',
      sub: 'PDF con jerarquía visual',
      href: `/api/orgchart/export-pdf`,
      Icon: Download,
    },
    {
      label: 'Reglamento Interno (RIT)',
      sub: 'Capítulos por jerarquía',
      href: `/api/orgchart/rit`,
      Icon: ScrollText,
    },
  ]

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-600">
        Reportes y documentos relacionados con <strong>{unitName}</strong>.
      </p>
      {reports.map((r) => (
        <a
          key={r.label}
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition hover:border-emerald-300 hover:bg-emerald-50/40"
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
            <r.Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 text-xs">
            <div className="font-semibold text-slate-900">{r.label}</div>
            <div className="text-[10px] text-slate-500">{r.sub}</div>
          </div>
          <Download className="h-3 w-3 text-slate-400" />
        </a>
      ))}
    </div>
  )
}

// ─── Tab "Costos" — sueldos agregados por unidad ─────────────────────────────
interface CostsTabProps {
  tree: OrgChartTree
  unitId: string
  positions: OrgChartTree['positions']
  occupants: OrgChartTree['assignments']
}

function CostsTab({ tree, unitId, positions, occupants }: CostsTabProps) {
  // Mapa unitId → todos los descendientes (incluyéndose a sí mismo)
  const descendantUnitIds = useMemo(() => {
    const result = new Set<string>([unitId])
    const queue = [unitId]
    while (queue.length) {
      const current = queue.shift()!
      const kids = tree.units.filter((u) => u.parentId === current)
      for (const k of kids) {
        if (!result.has(k.id)) {
          result.add(k.id)
          queue.push(k.id)
        }
      }
    }
    return result
  }, [tree.units, unitId])

  const subtreePositions = useMemo(
    () => tree.positions.filter((p) => descendantUnitIds.has(p.orgUnitId)),
    [tree.positions, descendantUnitIds],
  )
  const subtreePositionIds = new Set(subtreePositions.map((p) => p.id))
  const subtreeAssignments = tree.assignments.filter((a) =>
    subtreePositionIds.has(a.positionId),
  )

  // Sueldos: usamos salaryBandMin/Max como rango si están; si no, basados en
  // legajoScore/posición no tenemos sueldo real expuesto, así que mostramos
  // bandas. (El v1 hace esto mismo en what-if-cost.ts.)
  const positionsWithBand = subtreePositions.filter(
    (p) => p.salaryBandMin || p.salaryBandMax,
  )
  const totalMinAnnual = positionsWithBand.reduce((sum, p) => {
    const min = Number(p.salaryBandMin ?? '0')
    return sum + (Number.isFinite(min) ? min * 14 * (p.seats ?? 1) : 0)
  }, 0)
  const totalMaxAnnual = positionsWithBand.reduce((sum, p) => {
    const max = Number(p.salaryBandMax ?? p.salaryBandMin ?? '0')
    return sum + (Number.isFinite(max) ? max * 14 * (p.seats ?? 1) : 0)
  }, 0)

  const totalSeats = subtreePositions.reduce((s, p) => s + (p.seats ?? 1), 0)
  const totalOccupied = subtreeAssignments.length
  const fillRate = totalSeats > 0 ? Math.round((totalOccupied / totalSeats) * 100) : 100

  void positions
  void occupants

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-600">
        Vista agregada de costos del subárbol bajo esta unidad
        ({descendantUnitIds.size} unidad{descendantUnitIds.size === 1 ? '' : 'es'}{' '}
        incluida{descendantUnitIds.size === 1 ? '' : 's'}).
      </p>

      <Stat label="Cargos totales (subárbol)" value={subtreePositions.length} />
      <Stat label="Plazas totales" value={totalSeats} />
      <Stat label="Ocupadas" value={`${totalOccupied} (${fillRate}%)`} />
      {totalMinAnnual > 0 && (
        <>
          <Stat
            label="Costo anual mínimo"
            value={`S/ ${totalMinAnnual.toLocaleString('es-PE')}`}
          />
          <Stat
            label="Costo anual máximo"
            value={`S/ ${totalMaxAnnual.toLocaleString('es-PE')}`}
          />
          <p className="text-[10px] text-slate-500">
            Estimación basada en bandas salariales registradas y 14 sueldos al año
            (incluye gratificaciones).
          </p>
        </>
      )}
      {totalMinAnnual === 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[11px] text-amber-800">
          Esta unidad no tiene bandas salariales registradas. Asígnalas en cada cargo
          para ver costos estimados.
        </div>
      )}
    </div>
  )
}

// ─── Tab "Historial" — últimos cambios estructurales ─────────────────────────
interface ChangeLogEntry {
  id: string
  type: string
  entityType: string
  entityId: string | null
  reason: string | null
  createdAt: string
  performedBy: { name: string } | null
}

function HistoryTab({ unitId }: { unitId: string }) {
  // Usamos useQuery para evitar el patrón "setState in effect" — react-query
  // maneja loading/error/data como state externo (cumple la regla nueva).
  const { data, isLoading, error } = useQuery({
    queryKey: ['orgchart', 'change-log', unitId],
    queryFn: async () => {
      const res = await fetch(
        `/api/orgchart/change-log?entityId=${encodeURIComponent(unitId)}&limit=50`,
        { cache: 'no-store' },
      )
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      return (json.entries ?? json ?? []) as ChangeLogEntry[]
    },
    staleTime: 60_000,
  })
  const entries = data ?? []
  const loading = isLoading

  if (loading) {
    return (
      <div className="flex justify-center py-6 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
        {error instanceof Error ? error.message : 'Error'}
      </div>
    )
  }
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
        No hay cambios registrados sobre esta unidad.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs text-slate-600">
        <HistoryIcon className="h-3.5 w-3.5 text-slate-400" />
        Últimos {entries.length} cambios
      </p>
      <ol className="space-y-1.5">
        {entries.map((e) => (
          <li
            key={e.id}
            className="rounded-lg border border-slate-200 bg-white p-2.5 text-xs"
          >
            <div className="flex items-center gap-1.5">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700">
                {e.type.replace(/_/g, ' ')}
              </span>
              <span className="ml-auto text-[10px] text-slate-500 tabular-nums">
                {new Date(e.createdAt).toLocaleString('es-PE', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            {e.reason && (
              <p className="mt-1 text-[11px] text-slate-700">{e.reason}</p>
            )}
            {e.performedBy?.name && (
              <p className="mt-1 text-[10px] text-slate-500">
                por {e.performedBy.name}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
