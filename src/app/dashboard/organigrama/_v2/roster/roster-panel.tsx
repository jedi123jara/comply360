/**
 * Panel de Trabajadores (roster) — lista lateral acoplable con todos los
 * trabajadores, filtrable por puesto/área/búsqueda. Cada trabajador es
 * arrastrable hacia el canvas para asignarlo a un cargo (drop-on-node).
 */
'use client'

import { useMemo, useState } from 'react'
import { m, AnimatePresence } from 'framer-motion'
import { Users, Search, X, UserCircle2, GripVertical, Loader2 } from 'lucide-react'

import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data'
import { useWorkersRosterQuery, type RosterWorker } from '../data/queries/use-workers'
import { WORKER_DRAG_MIME } from './constants'

type Filter = 'all' | 'assigned' | 'unassigned'

export function RosterPanel() {
  const open = useOrgStore((s) => s.rosterOpen)
  const setOpen = useOrgStore((s) => s.setRosterOpen)
  const setSelectedPosition = useOrgStore((s) => s.setSelectedPosition)
  const setSelectedUnit = useOrgStore((s) => s.setSelectedUnit)
  const setInspectorOpen = useOrgStore((s) => s.setInspectorOpen)
  const openModal = useOrgStore((s) => s.openModal)

  const treeQuery = useTreeQuery(null)
  const workersQuery = useWorkersRosterQuery(open)

  const [filter, setFilter] = useState<Filter>('all')
  const [area, setArea] = useState<string>('all')
  const [search, setSearch] = useState('')

  // workerId → positionId vigente (para "ir al nodo" y saber quién tiene puesto)
  const positionByWorker = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of treeQuery.data?.assignments ?? []) {
      if (!a.endedAt) map.set(a.workerId, a.positionId)
    }
    return map
  }, [treeQuery.data])

  const workers = useMemo(() => workersQuery.data ?? [], [workersQuery.data])
  const areas = useMemo(
    () =>
      Array.from(new Set(workers.map((w) => w.department).filter(Boolean))).sort() as string[],
    [workers],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return workers.filter((w) => {
      if (w.status === 'TERMINATED') return false
      const assigned = positionByWorker.has(w.id)
      if (filter === 'assigned' && !assigned) return false
      if (filter === 'unassigned' && assigned) return false
      if (area !== 'all' && w.department !== area) return false
      if (q) {
        const hay = `${w.firstName} ${w.lastName} ${w.position ?? ''} ${w.department ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [workers, positionByWorker, filter, area, search])

  const counts = useMemo(() => {
    let assigned = 0
    for (const w of workers) {
      if (w.status === 'TERMINATED') continue
      if (positionByWorker.has(w.id)) assigned++
    }
    const active = workers.filter((w) => w.status !== 'TERMINATED').length
    return { total: active, assigned, unassigned: active - assigned }
  }, [workers, positionByWorker])

  function handleClick(w: RosterWorker) {
    const posId = positionByWorker.get(w.id)
    if (posId) {
      setSelectedPosition(posId)
      setInspectorOpen(true)
    } else {
      setSelectedUnit(null)
      openModal('assign-worker', { workerId: w.id })
    }
  }

  const FILTERS: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'Todos', count: counts.total },
    { id: 'assigned', label: 'Con puesto', count: counts.assigned },
    { id: 'unassigned', label: 'Sin puesto', count: counts.unassigned },
  ]

  return (
    <AnimatePresence>
      {open && (
        <m.aside
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
          className="absolute left-0 top-0 z-20 flex h-full w-[300px] flex-col border-r border-slate-200 bg-white shadow-xl"
        >
          <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">Trabajadores</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 transition hover:bg-slate-100"
              aria-label="Cerrar panel de trabajadores"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Filtros */}
          <div className="space-y-2 border-b border-slate-200 px-3 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar nombre, cargo o área…"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
              />
            </div>
            <div className="flex gap-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`flex-1 rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                    filter === f.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                  <span className="ml-1 tabular-nums opacity-70">{f.count}</span>
                </button>
              ))}
            </div>
            {areas.length > 0 && (
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-700 focus:border-emerald-400 focus:outline-none"
              >
                <option value="all">Todas las áreas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto p-2">
            {workersQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-12 text-center text-xs text-slate-400">
                Sin trabajadores que coincidan.
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.map((w) => {
                  const assigned = positionByWorker.has(w.id)
                  return (
                    <div
                      key={w.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(WORKER_DRAG_MIME, w.id)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      onClick={() => handleClick(w)}
                      title={assigned ? 'Ir al cargo en el organigrama' : 'Arrastra al canvas o haz clic para asignar'}
                      className="group flex cursor-grab items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition hover:border-slate-200 hover:bg-slate-50 active:cursor-grabbing"
                    >
                      <GripVertical className="h-3.5 w-3.5 flex-shrink-0 text-slate-300 group-hover:text-slate-400" />
                      <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-400">
                        {w.photoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={w.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <UserCircle2 className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-slate-800">
                          {w.firstName} {w.lastName}
                        </div>
                        <div className="truncate text-[10px] text-slate-500">
                          {w.position || (assigned ? '—' : 'Sin puesto')}
                          {w.department ? ` · ${w.department}` : ''}
                        </div>
                      </div>
                      {!assigned && (
                        <span className="flex-shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-semibold text-amber-700">
                          Sin puesto
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </m.aside>
      )}
    </AnimatePresence>
  )
}
