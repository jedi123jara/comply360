/**
 * Modal — asignar trabajador a cargo.
 *
 * Carga workers vía /api/workers, filtra inline, marca primary/interim.
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UserPlus, Loader2, CheckCircle2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'

interface WorkerOption {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
  department: string | null
}

export function AssignWorkerModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const modalProps = useOrgStore((s) => s.modalProps)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'assign-worker'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const positions = useMemo(
    () => treeQuery.data?.positions ?? [],
    [treeQuery.data?.positions],
  )

  const presetPositionId = modalProps.positionId as string | undefined

  const [positionId, setPositionId] = useState<string | null>(presetPositionId ?? null)
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [isPrimary, setIsPrimary] = useState(true)
  const [isInterim, setIsInterim] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setPositionId(presetPositionId ?? null)
    setLoading(true)
    fetch('/api/workers?limit=500')
      .then((r) => r.json())
      .then((data) => {
        setWorkers(data.workers ?? data.items ?? data ?? [])
      })
      .catch(() => toast.error('No se pudieron cargar trabajadores'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers.slice(0, 50)
    return workers
      .filter((w) =>
        `${w.firstName} ${w.lastName} ${w.dni} ${w.position ?? ''} ${w.department ?? ''}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 50)
  }, [workers, search])

  const positionLabel = useMemo(() => {
    const p = positions.find((x) => x.id === positionId)
    return p?.title ?? 'cargo'
  }, [positionId, positions])

  const reset = () => {
    setSelectedWorkerId(null)
    setSearch('')
    setIsPrimary(true)
    setIsInterim(false)
  }

  const submit = async () => {
    if (!selectedWorkerId || !positionId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorkerId,
          positionId,
          isPrimary,
          isInterim,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al asignar')
      }
      toast.success('Trabajador asignado al cargo')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
      ])
      reset()
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={() => {
        reset()
        closeModal()
      }}
      title={`Asignar a ${positionLabel}`}
      subtitle="Vincula a un trabajador con el cargo"
      icon={<UserPlus className="h-4 w-4" />}
      width="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              reset()
              closeModal()
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !selectedWorkerId || !positionId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <UserPlus className="h-3.5 w-3.5" />
            )}
            Asignar
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {!presetPositionId && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cargo
            </label>
            <select
              value={positionId ?? ''}
              onChange={(e) => setPositionId(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">—</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Buscar trabajador
          </label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Por nombre, DNI, área…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200">
          {loading && (
            <div className="p-6 text-center text-xs text-slate-500">
              Cargando trabajadores…
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="p-6 text-center text-xs text-slate-500">Sin resultados</div>
          )}
          {!loading &&
            filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setSelectedWorkerId(w.id)}
                className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5 text-left text-xs transition last:border-b-0 hover:bg-slate-50 ${
                  selectedWorkerId === w.id ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-slate-900">
                    {w.firstName} {w.lastName}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-500">
                    DNI {w.dni}
                    {w.position && ` · ${w.position}`}
                    {w.department && ` · ${w.department}`}
                  </div>
                </div>
                {selectedWorkerId === w.id && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                )}
              </button>
            ))}
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Cargo titular</span>
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-slate-700">
            <input
              type="checkbox"
              checked={isInterim}
              onChange={(e) => setIsInterim(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>Es interino / encargado temporal</span>
          </label>
        </div>
      </div>
    </ModalShell>
  )
}
