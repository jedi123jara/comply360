/**
 * Modal — asignar trabajador a cargo.
 *
 * Carga workers vía /api/workers, filtra inline, marca primary/interim.
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { UserPlus, Loader2, CheckCircle2, Search, BriefcaseBusiness } from 'lucide-react'
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
  const selectedPositionId = useOrgStore((s) => s.selectedPositionId)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'assign-worker'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const positions = useMemo(
    () => treeQuery.data?.positions ?? [],
    [treeQuery.data?.positions],
  )
  const units = useMemo(() => treeQuery.data?.units ?? [], [treeQuery.data?.units])
  const assignments = useMemo(
    () => treeQuery.data?.assignments ?? [],
    [treeQuery.data?.assignments],
  )

  const explicitPositionId = modalProps.positionId as string | undefined
  const explicitUnitId = modalProps.unitId as string | undefined
  const presetPositionId =
    explicitPositionId ?? (!explicitUnitId ? selectedPositionId : undefined) ?? undefined

  const [positionId, setPositionId] = useState<string | null>(presetPositionId ?? null)
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [positionSearch, setPositionSearch] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [isPrimary, setIsPrimary] = useState(true)
  const [isInterim, setIsInterim] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const positionOptions = useMemo(() => {
    const unitsById = new Map(units.map((unit) => [unit.id, unit]))
    const assignmentsByPosition = new Map<string, number>()
    for (const assignment of assignments) {
      assignmentsByPosition.set(
        assignment.positionId,
        (assignmentsByPosition.get(assignment.positionId) ?? 0) + 1,
      )
    }

    return positions
      .filter((position) => !explicitUnitId || position.orgUnitId === explicitUnitId)
      .map((position) => {
        const unit = unitsById.get(position.orgUnitId)
        const occupantCount = assignmentsByPosition.get(position.id) ?? 0
        const seats = position.seats ?? 1
        const vacancies = Math.max(0, seats - occupantCount)
        const haystack = `${position.title} ${unit?.name ?? ''} ${position.code ?? ''}`.toLowerCase()

        return {
          position,
          unit,
          occupantCount,
          vacancies,
          isVacant: vacancies > 0,
          isSst: haystack.includes('sst') || haystack.includes('seguridad y salud'),
          isSupervisorSst:
            haystack.includes('supervisor sst') ||
            (haystack.includes('supervisor') && haystack.includes('seguridad y salud')),
          searchText: haystack,
        }
      })
      .sort((a, b) => {
        if (a.isVacant !== b.isVacant) return a.isVacant ? -1 : 1
        if (a.isSupervisorSst !== b.isSupervisorSst) return a.isSupervisorSst ? -1 : 1
        if (a.isSst !== b.isSst) return a.isSst ? -1 : 1
        return a.position.title.localeCompare(b.position.title, 'es')
      })
  }, [assignments, explicitUnitId, positions, units])

  const recommendedPositionId = useMemo(() => {
    const supervisorSst = positionOptions.find((option) => option.isVacant && option.isSupervisorSst)
    const sstVacant = positionOptions.find((option) => option.isVacant && option.isSst)
    const anyVacant = positionOptions.find((option) => option.isVacant)
    return (
      supervisorSst?.position.id ??
      sstVacant?.position.id ??
      anyVacant?.position.id ??
      positionOptions[0]?.position.id
    )
  }, [positionOptions])

  const filteredPositions = useMemo(() => {
    const q = positionSearch.trim().toLowerCase()
    if (!q) return positionOptions.slice(0, 12)
    return positionOptions.filter((option) => option.searchText.includes(q)).slice(0, 20)
  }, [positionOptions, positionSearch])

  const selectedPosition = useMemo(
    () => positionOptions.find((option) => option.position.id === positionId) ?? null,
    [positionId, positionOptions],
  )

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (!open) return
      setPositionId(presetPositionId ?? null)
      setPositionSearch('')
      setLoading(true)
      fetch('/api/workers?limit=500')
        .then((r) => r.json())
        .then((data) => {
          const items = data.workers ?? data.items ?? data.data ?? data
          setWorkers(Array.isArray(items) ? items : [])
        })
        .catch(() => toast.error('No se pudieron cargar trabajadores'))
        .finally(() => setLoading(false))
    })
    return () => {
      cancelled = true
    }
  }, [open, presetPositionId])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (!open || positionId || !recommendedPositionId) return
      setPositionId(recommendedPositionId)
    })
    return () => {
      cancelled = true
    }
  }, [open, positionId, recommendedPositionId])

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
    setPositionSearch('')
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
        {explicitPositionId ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <BriefcaseBusiness className="mt-0.5 h-4 w-4 text-emerald-700" />
              <div className="min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Cargo seleccionado
                </div>
                <div className="mt-0.5 text-sm font-semibold text-slate-900">
                  {selectedPosition?.position.title ?? positionLabel}
                </div>
                {selectedPosition?.unit && (
                  <div className="mt-0.5 text-xs text-slate-600">
                    {selectedPosition.unit.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {explicitUnitId ? 'Cargo de esta unidad' : 'Cargo a cubrir'}
            </label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={positionSearch}
                onChange={(e) => setPositionSearch(e.target.value)}
                placeholder="Buscar cargo, gerencia o SST..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white">
              {filteredPositions.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  No encontramos cargos con ese criterio
                </div>
              ) : (
                filteredPositions.map((option) => (
                  <button
                    key={option.position.id}
                    type="button"
                    onClick={() => setPositionId(option.position.id)}
                    className={`flex w-full items-start justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left transition last:border-b-0 hover:bg-slate-50 ${
                      positionId === option.position.id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-sm font-semibold text-slate-900">
                          {option.position.title}
                        </span>
                        {option.isSst && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            SST
                          </span>
                        )}
                        {option.isVacant && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            Vacante
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {option.unit?.name ?? 'Sin unidad'} · {option.occupantCount}/
                        {option.position.seats ?? 1} ocupantes
                      </div>
                    </div>
                    {positionId === option.position.id && (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-emerald-600" />
                    )}
                  </button>
                ))
              )}
            </div>
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
