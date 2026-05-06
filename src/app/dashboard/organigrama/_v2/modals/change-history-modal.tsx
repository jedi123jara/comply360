/**
 * Modal — Historial de cambios estructurales (change-log).
 *
 * Tabla con últimos N cambios sobre el organigrama: creación/edición/movimiento
 * de unidades, cargos, asignaciones, snapshots, drafts. Filtros por tipo de
 * entidad y búsqueda libre.
 *
 * Backend: GET /api/orgchart/change-log.
 */
'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { History, Loader2, Search, Filter } from 'lucide-react'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'

interface ChangeEntry {
  id: string
  type: string
  entityType: string
  entityId: string | null
  reason: string | null
  ipAddress: string | null
  createdAt: string
  summary: string
  actor: { id: string; name: string; email: string } | null
}

interface ChangeLogResponse {
  changes: ChangeEntry[]
}

const ENTITY_FILTERS: Array<{ id: 'all' | string; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'OrgUnit', label: 'Unidades' },
  { id: 'OrgPosition', label: 'Cargos' },
  { id: 'OrgAssignment', label: 'Asignaciones' },
  { id: 'OrgComplianceRole', label: 'Roles legales' },
  { id: 'OrgChartSnapshot', label: 'Snapshots' },
  { id: 'OrgChartDraft', label: 'Escenarios' },
]

export function ChangeHistoryModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'change-history'

  const [filter, setFilter] = useState<'all' | string>('all')
  const [search, setSearch] = useState('')

  const query = useQuery({
    queryKey: ['orgchart', 'change-log-global', filter],
    enabled: open,
    queryFn: async (): Promise<ChangeLogResponse> => {
      const params = new URLSearchParams()
      params.set('limit', '100')
      if (filter !== 'all') params.set('entityType', filter)
      const res = await fetch(`/api/orgchart/change-log?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      return res.json()
    },
    staleTime: 30_000,
  })

  const filtered = useMemo(() => {
    const list = query.data?.changes ?? []
    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (e) =>
        e.summary.toLowerCase().includes(q) ||
        e.reason?.toLowerCase().includes(q) ||
        e.actor?.name.toLowerCase().includes(q),
    )
  }, [query.data, search])

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Historial de cambios"
      subtitle="Auditoría de cambios estructurales del organigrama"
      icon={<History className="h-4 w-4" />}
      width="xl"
      footer={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-1">
          <Filter className="h-3 w-3 text-slate-400" />
          {ENTITY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded px-2 py-0.5 text-[11px] font-medium transition ${
                filter === f.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descripción, motivo o usuario…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {query.isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando historial…
          </div>
        )}

        {query.error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            {query.error instanceof Error ? query.error.message : 'Error desconocido'}
          </div>
        )}

        {filtered.length === 0 && !query.isLoading && (
          <p className="py-6 text-center text-sm text-slate-500">
            {(query.data?.changes.length ?? 0) === 0
              ? 'No hay cambios registrados todavía.'
              : 'No hay coincidencias para tu filtro o búsqueda.'}
          </p>
        )}

        {filtered.length > 0 && (
          <ol className="space-y-1.5">
            {filtered.map((entry) => (
              <li key={entry.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-700">
                        {entry.type.replace(/_/g, ' ')}
                      </span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                        {entityShortLabel(entry.entityType)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-900">{entry.summary}</p>
                    {entry.reason && (
                      <p className="mt-0.5 text-[11px] text-slate-600">{entry.reason}</p>
                    )}
                    <p className="mt-1 text-[10px] text-slate-500">
                      {entry.actor?.name && <>por {entry.actor.name} · </>}
                      {new Date(entry.createdAt).toLocaleString('es-PE', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </ModalShell>
  )
}

function entityShortLabel(entityType: string) {
  const labels: Record<string, string> = {
    OrgUnit: 'Unidad',
    OrgPosition: 'Cargo',
    OrgAssignment: 'Asignación',
    OrgComplianceRole: 'Rol legal',
    OrgChartSnapshot: 'Snapshot',
    OrgChartDraft: 'What-If',
    OrgTemplate: 'Plantilla',
    OrgChartImport: 'Import',
  }
  return labels[entityType] ?? entityType
}
