/**
 * Vista mobile del organigrama — sustituye al canvas en pantallas <768px.
 *
 * En lugar de un canvas zoom-pan (inviable en mobile), muestra el árbol
 * como lista colapsable con `<details>/<summary>`. El usuario expande
 * unidades, ve cargos y ocupantes, y hace tap para abrir el inspector como
 * bottom-sheet.
 *
 * Filtros chips arriba (lente, vista, todos) + búsqueda persistente.
 */
'use client'

import { useMemo, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import {
  Building2,
  Users,
  ChevronRight,
  Search,
  Plus,
  Sparkles,
  X,
  ShieldAlert,
  Crown,
  AlertTriangle,
} from 'lucide-react'

import type { OrgChartTree } from '@/lib/orgchart/types'
import {
  TONE_COLOR_HEX,
  type CoverageReport,
} from '@/lib/orgchart/coverage-aggregator'
import { useOrgStore } from '../state/org-store'

interface MobileTreeViewProps {
  tree: OrgChartTree
  coverage: CoverageReport | null
}

export function MobileTreeView({ tree, coverage }: MobileTreeViewProps) {
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const setSelectedWorker = useOrgStore((s) => s.setSelectedWorker)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)
  const setCommandPaletteOpen = useOrgStore((s) => s.setCommandPaletteOpen)
  const openModal = useOrgStore((s) => s.openModal)
  const setCopilotOpen = useOrgStore((s) => s.setCopilotOpen)

  const [search, setSearch] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => {
    // Por defecto expandir las raíces
    return new Set(tree.units.filter((u) => u.parentId === null).map((u) => u.id))
  })

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, typeof tree.units>()
    for (const u of tree.units) {
      const list = map.get(u.parentId ?? null) ?? []
      list.push(u)
      map.set(u.parentId ?? null, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    }
    return map
  }, [tree])

  const positionsByUnit = useMemo(() => {
    const map = new Map<string, typeof tree.positions>()
    for (const p of tree.positions) {
      const list = map.get(p.orgUnitId) ?? []
      list.push(p)
      map.set(p.orgUnitId, list)
    }
    return map
  }, [tree])

  const occupantsByPosition = useMemo(() => {
    const map = new Map<string, typeof tree.assignments>()
    for (const a of tree.assignments) {
      const list = map.get(a.positionId) ?? []
      list.push(a)
      map.set(a.positionId, list)
    }
    return map
  }, [tree])

  // Filtro: si hay búsqueda, recolectamos los unitIds que matchean (por sí mismos
  // o por algún cargo dentro) y todos sus ancestros para mantener jerarquía.
  const visibleUnitIds = useMemo(() => {
    if (!search.trim()) return null // null = mostrar todos
    const q = search.trim().toLowerCase()
    const matches = new Set<string>()
    for (const u of tree.units) {
      if (u.name.toLowerCase().includes(q)) matches.add(u.id)
    }
    for (const p of tree.positions) {
      if (p.title.toLowerCase().includes(q)) matches.add(p.orgUnitId)
    }
    for (const a of tree.assignments) {
      const full = `${a.worker.firstName} ${a.worker.lastName}`.toLowerCase()
      if (full.includes(q)) {
        const pos = tree.positions.find((p) => p.id === a.positionId)
        if (pos) matches.add(pos.orgUnitId)
      }
    }
    // Agregar ancestros
    const result = new Set<string>()
    for (const id of matches) {
      result.add(id)
      let cursor: string | null | undefined = tree.units.find((u) => u.id === id)?.parentId
      while (cursor) {
        result.add(cursor)
        cursor = tree.units.find((u) => u.id === cursor)?.parentId
      }
    }
    return result
  }, [search, tree])

  const roots = childrenByParent.get(null) ?? []

  const toggleExpand = (unitId: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(unitId)) next.delete(unitId)
      else next.add(unitId)
      return next
    })
  }

  // Si hay búsqueda activa, expandir todo lo visible
  const effectiveExpanded = search.trim() ? visibleUnitIds ?? new Set<string>() : expandedKeys

  return (
    <div className="flex h-full flex-col bg-slate-50">
      {/* Header sticky */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-emerald-600" />
          <h1 className="text-sm font-semibold text-slate-900">Organigrama</h1>
          {coverage && (
            <span
              className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: `${TONE_COLOR_HEX[severityFromGlobal(coverage.globalScore)]}1a`,
                color: TONE_COLOR_HEX[severityFromGlobal(coverage.globalScore)],
              }}
            >
              {coverage.globalScore}
            </span>
          )}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar persona, cargo, área…"
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2 pb-32">
        {roots.map((root) => (
          <UnitRow
            key={root.id}
            unit={root}
            depth={0}
            childrenByParent={childrenByParent}
            positionsByUnit={positionsByUnit}
            occupantsByPosition={occupantsByPosition}
            visibleUnitIds={visibleUnitIds}
            expanded={effectiveExpanded}
            onToggle={toggleExpand}
            coverage={coverage}
            onSelectUnit={(unitId) => {
              setSelectedUnit(unitId)
              setInspectorOpen(true)
            }}
            onSelectPosition={(positionId) => {
              setSelectedPosition(positionId)
              setInspectorOpen(true)
            }}
            onSelectWorker={(workerId) => {
              setSelectedWorker(workerId)
              setInspectorOpen(true)
            }}
          />
        ))}
        {roots.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-center text-xs text-slate-500">
            No hay unidades para mostrar.
          </div>
        )}
      </div>

      {/* FAB menu */}
      <FabMenu
        onSearch={() => setCommandPaletteOpen(true)}
        onCreate={() => openModal('create-unit')}
        onCopilot={() => setCopilotOpen(true)}
      />
    </div>
  )
}

function severityFromGlobal(score: number): 'success' | 'warning' | 'danger' | 'critical' {
  if (score >= 85) return 'success'
  if (score >= 65) return 'warning'
  if (score >= 40) return 'danger'
  return 'critical'
}

interface UnitRowProps {
  unit: OrgChartTree['units'][number]
  depth: number
  childrenByParent: Map<string | null, OrgChartTree['units']>
  positionsByUnit: Map<string, OrgChartTree['positions']>
  occupantsByPosition: Map<string, OrgChartTree['assignments']>
  visibleUnitIds: Set<string> | null
  expanded: Set<string>
  onToggle: (unitId: string) => void
  coverage: CoverageReport | null
  onSelectUnit: (unitId: string) => void
  onSelectPosition: (positionId: string) => void
  onSelectWorker: (workerId: string) => void
}

function UnitRow({
  unit,
  depth,
  childrenByParent,
  positionsByUnit,
  occupantsByPosition,
  visibleUnitIds,
  expanded,
  onToggle,
  coverage,
  onSelectUnit,
  onSelectPosition,
  onSelectWorker,
}: UnitRowProps) {
  const visible = !visibleUnitIds || visibleUnitIds.has(unit.id)
  if (!visible) return null

  const kids = childrenByParent.get(unit.id) ?? []
  const positions = positionsByUnit.get(unit.id) ?? []
  const isOpen = expanded.has(unit.id)
  const cov = coverage?.byUnit.get(unit.id) ?? null
  const occupantsTotal = positions.reduce(
    (sum, p) => sum + (occupantsByPosition.get(p.id)?.length ?? 0),
    0,
  )

  return (
    <div className="mb-1.5">
      <div
        className={`flex w-full items-center gap-2 rounded-lg border bg-white px-3 py-2 text-left shadow-sm transition active:bg-slate-50 ${
          cov ? '' : 'border-slate-200'
        }`}
        style={{
          marginLeft: depth * 12,
          borderColor: cov ? TONE_COLOR_HEX[cov.tone] : undefined,
          borderLeftWidth: cov ? 4 : 1,
        }}
      >
        <button
          type="button"
          onClick={() => onToggle(unit.id)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-400 transition active:bg-slate-100"
          aria-label={isOpen ? 'Contraer unidad' : 'Expandir unidad'}
          aria-expanded={isOpen}
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
          />
        </button>
        <button
          type="button"
          onClick={() => onSelectUnit(unit.id)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-slate-900">
              {unit.name}
            </span>
            <span className="rounded bg-slate-100 px-1 py-0.5 text-[8px] font-bold uppercase text-slate-600">
              {unit.kind}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[10px] text-slate-500">
            <span className="inline-flex items-center gap-0.5">
              <Users className="h-3 w-3" />
              {occupantsTotal}
            </span>
            <span className="inline-flex items-center gap-0.5">
              <ShieldAlert className="h-3 w-3" />
              {positions.length} cargo{positions.length === 1 ? '' : 's'}
            </span>
            {cov && (
              <span
                className="ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  backgroundColor: `${TONE_COLOR_HEX[cov.tone]}1a`,
                  color: TONE_COLOR_HEX[cov.tone],
                }}
              >
              {cov.score}
            </span>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => onSelectUnit(unit.id)}
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-emerald-600 transition active:bg-emerald-50"
          aria-label="Ver detalle"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
            style={{ marginLeft: (depth + 1) * 12 }}
          >
            {/* Cargos */}
            {positions.length > 0 && (
              <div className="mt-1 space-y-0.5 border-l-2 border-slate-100 pl-2">
                {positions.map((p) => {
                  const occupants = occupantsByPosition.get(p.id) ?? []
                  return (
                    <div
                      key={p.id}
                      className="rounded-md bg-white px-2 py-1.5 text-[11px] text-slate-700 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectPosition(p.id)}
                        className="flex w-full items-center gap-1.5 text-left"
                      >
                        <span className="font-medium text-slate-800">{p.title}</span>
                        {p.isManagerial && (
                          <Crown className="h-3 w-3 text-amber-500" />
                        )}
                        {p.isCritical && (
                          <AlertTriangle className="h-3 w-3 text-rose-500" />
                        )}
                      </button>
                      {occupants.length === 0 ? (
                        <div className="text-[10px] italic text-slate-400">Vacante</div>
                      ) : (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {occupants.map((o) => (
                            <button
                              key={o.id}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                onSelectWorker(o.workerId)
                              }}
                              className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 transition active:bg-emerald-50 active:text-emerald-700"
                            >
                              {o.worker.firstName} {o.worker.lastName}
                              {o.isInterim ? ' (interino)' : ''}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Hijos recursivamente */}
            {kids.map((k) => (
              <UnitRow
                key={k.id}
                unit={k}
                depth={depth + 1}
                childrenByParent={childrenByParent}
                positionsByUnit={positionsByUnit}
                occupantsByPosition={occupantsByPosition}
                visibleUnitIds={visibleUnitIds}
                expanded={expanded}
                onToggle={onToggle}
                coverage={coverage}
                onSelectUnit={onSelectUnit}
                onSelectPosition={onSelectPosition}
                onSelectWorker={onSelectWorker}
              />
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FabMenu({
  onSearch,
  onCreate,
  onCopilot,
}: {
  onSearch: () => void
  onCreate: () => void
  onCopilot: () => void
}) {
  return (
    <div className="fixed bottom-4 right-4 z-30 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onSearch}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg ring-1 ring-slate-200 transition active:scale-95"
        aria-label="Buscar"
      >
        <Search className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCopilot}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-lg ring-1 ring-emerald-200 transition active:scale-95"
        aria-label="Copiloto IA"
      >
        <Sparkles className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onCreate}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg transition active:scale-95"
        aria-label="Crear"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  )
}
