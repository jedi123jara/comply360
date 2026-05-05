/**
 * Modal — asignar rol legal de compliance (DPO, CSST, Hostigamiento, etc.).
 *
 * Mapea cada roleType al worker correspondiente, opcionalmente vinculándolo
 * a una unidad (típicamente un Comité legal).
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Loader2, Search } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'
import { COMMITTEE_GROUPS, COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'
import type { ComplianceRoleType } from '@/lib/orgchart/types'

interface WorkerOption {
  id: string
  firstName: string
  lastName: string
  dni: string
}

const ALL_ROLE_TYPES = Object.keys(COMPLIANCE_ROLES) as ComplianceRoleType[]

export function AssignRoleModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const modalProps = useOrgStore((s) => s.modalProps)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'assign-role'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const units = useMemo(() => treeQuery.data?.units ?? [], [treeQuery.data?.units])

  const presetRole = modalProps.roleType as ComplianceRoleType | undefined
  const presetUnit = modalProps.unitId as string | undefined
  const presetWorker = modalProps.workerId as string | undefined

  const [roleType, setRoleType] = useState<ComplianceRoleType>(
    presetRole ?? 'PRESIDENTE_COMITE_SST',
  )
  const [unitId, setUnitId] = useState<string | null>(presetUnit ?? null)
  const [workerId, setWorkerId] = useState<string | null>(presetWorker ?? null)
  const [endsAt, setEndsAt] = useState('')
  const [actaUrl, setActaUrl] = useState('')

  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [loadingWorkers, setLoadingWorkers] = useState(false)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === unitId) ?? null,
    [unitId, units],
  )

  useEffect(() => {
    if (!open) return
    setRoleType(presetRole ?? 'PRESIDENTE_COMITE_SST')
    setUnitId(presetUnit ?? null)
    setWorkerId(presetWorker ?? null)
    setEndsAt('')
    setActaUrl('')
    setSearch('')

    setLoadingWorkers(true)
    fetch('/api/workers?limit=500')
      .then((r) => r.json())
      .then((data) => {
        const items = data.workers ?? data.items ?? data.data ?? data
        setWorkers(Array.isArray(items) ? items : [])
      })
      .catch(() => toast.error('No se pudieron cargar trabajadores'))
      .finally(() => setLoadingWorkers(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const roleTypesForUnit = useMemo(() => {
    if (!selectedUnit) return ALL_ROLE_TYPES
    if (selectedUnit.kind === 'BRIGADA') return COMMITTEE_GROUPS.BRIGADA_EMERGENCIA
    const name = selectedUnit.name.toLowerCase()
    if (name.includes('hostigamiento')) return COMMITTEE_GROUPS.COMITE_HOSTIGAMIENTO
    if (name.includes('seguridad') || name.includes('salud') || name.includes('sst')) {
      return [...COMMITTEE_GROUPS.COMITE_SST, 'SUPERVISOR_SST'] as ComplianceRoleType[]
    }
    return ALL_ROLE_TYPES.filter((type) => COMPLIANCE_ROLES[type].committeeKind !== 'INDIVIDUAL')
  }, [selectedUnit])

  useEffect(() => {
    if (!open || roleTypesForUnit.includes(roleType)) return
    setRoleType(roleTypesForUnit[0] ?? 'PRESIDENTE_COMITE_SST')
  }, [open, roleType, roleTypesForUnit])

  const def = COMPLIANCE_ROLES[roleType]

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers.slice(0, 50)
    return workers
      .filter((w) =>
        `${w.firstName} ${w.lastName} ${w.dni}`.toLowerCase().includes(q),
      )
      .slice(0, 50)
  }, [workers, search])

  const submit = async () => {
    if (!workerId || !roleType) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/compliance-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roleType,
          workerId,
          unitId,
          endsAt: endsAt || null,
          actaUrl: actaUrl || null,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al designar')
      }
      toast.success(`Designado como ${def.label}`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
      ])
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const committeeUnits = units.filter(
    (u) => u.kind === 'COMITE_LEGAL' || u.kind === 'BRIGADA',
  )

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Designar responsable legal"
      subtitle={def?.baseLegal ?? ''}
      icon={<ShieldCheck className="h-4 w-4" />}
      width="lg"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !workerId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            Designar
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rol legal
          </label>
          <select
            value={roleType}
            onChange={(e) => setRoleType(e.target.value as ComplianceRoleType)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {roleTypesForUnit.map((rt) => (
              <option key={rt} value={rt}>
                {COMPLIANCE_ROLES[rt].label}
              </option>
            ))}
          </select>
          {def && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
              {def.description}
            </p>
          )}
        </div>

        {committeeUnits.length > 0 && (
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Vincular a comité (opcional)
            </label>
            <select
              value={unitId ?? ''}
              onChange={(e) => setUnitId(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">— Sin comité —</option>
              {committeeUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Designar a
          </label>
          <div className="relative mt-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI…"
              className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">
          {loadingWorkers && (
            <div className="p-4 text-center text-xs text-slate-500">
              Cargando trabajadores…
            </div>
          )}
          {!loadingWorkers && filteredWorkers.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500">Sin resultados</div>
          )}
          {!loadingWorkers &&
            filteredWorkers.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWorkerId(w.id)}
                className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs transition last:border-b-0 hover:bg-slate-50 ${
                  workerId === w.id ? 'bg-emerald-50' : ''
                }`}
              >
                <span className="font-medium text-slate-900">
                  {w.firstName} {w.lastName}
                </span>
                <span className="text-[10px] text-slate-500">DNI {w.dni}</span>
              </button>
            ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Vence (opcional)
            </label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {def?.defaultDurationMonths && (
              <p className="mt-1 text-[10px] text-slate-500">
                Vigencia típica {def.defaultDurationMonths} meses
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              URL del acta (opcional)
            </label>
            <input
              type="url"
              value={actaUrl}
              onChange={(e) => setActaUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>
    </ModalShell>
  )
}
