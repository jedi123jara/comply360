/**
 * Modal — cambiar de cargo / promover a un trabajador desde el organigrama.
 *
 * Selecciona el cargo destino y, opcionalmente, un nuevo sueldo (si se llena →
 * promoción; si no → transferencia). Llama al servicio único applyWorkerChange
 * vía /api/orgchart/worker-change, que encadena Worker + OrgAssignment + alertas
 * + score + historial.
 */
'use client'

import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRightLeft, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'

export function WorkerChangeModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const modalProps = useOrgStore((s) => s.modalProps)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'worker-change'

  const workerId = modalProps.workerId as string | undefined
  const currentPositionId = modalProps.currentPositionId as string | undefined

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const tree = treeQuery.data

  const unitName = useMemo(() => {
    const m = new Map<string, string>()
    tree?.units.forEach((u) => m.set(u.id, u.name))
    return m
  }, [tree])

  const positions = useMemo(
    () => (tree?.positions ?? []).filter((p) => p.id !== currentPositionId),
    [tree, currentPositionId],
  )

  const workerName = useMemo(() => {
    const a = tree?.assignments.find((x) => x.workerId === workerId && !x.endedAt)
    return a ? `${a.worker.firstName} ${a.worker.lastName}` : ''
  }, [tree, workerId])

  const [newPositionId, setNewPositionId] = useState('')
  const [newSalary, setNewSalary] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setNewPositionId('')
    setNewSalary('')
  }

  const submit = async () => {
    if (!workerId || !newPositionId) return
    const salaryNum = newSalary.trim() ? Number(newSalary) : undefined
    const change: Record<string, unknown> =
      salaryNum && salaryNum > 0
        ? { kind: 'promote', newPositionId, newSalary: salaryNum }
        : { kind: 'transfer', newPositionId }
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/worker-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId, change }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'No se pudo aplicar el cambio')
      }
      toast.success(salaryNum ? 'Promoción aplicada' : 'Cargo actualizado')
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
      title="Cambiar de cargo / promover"
      subtitle={workerName ? `Trabajador: ${workerName}` : 'Mueve al trabajador a otro cargo'}
      icon={<ArrowRightLeft className="h-4 w-4" />}
      width="md"
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
            disabled={submitting || !newPositionId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-3.5 w-3.5" />
            )}
            Aplicar cambio
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nuevo cargo <span className="text-rose-500">*</span>
          </label>
          <select
            value={newPositionId}
            onChange={(e) => setNewPositionId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          >
            <option value="">— Selecciona un cargo —</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
                {unitName.get(p.orgUnitId) ? ` — ${unitName.get(p.orgUnitId)}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nuevo sueldo bruto (opcional)
          </label>
          <div className="mt-1 flex items-center rounded-lg border border-slate-200 focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500">
            <span className="pl-3 text-sm text-slate-400">S/</span>
            <input
              type="number"
              min={0}
              step={50}
              value={newSalary}
              onChange={(e) => setNewSalary(e.target.value)}
              placeholder="Déjalo vacío si solo cambia de cargo"
              className="w-full rounded-lg px-2 py-2 text-sm focus:outline-none"
            />
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Si ingresas un sueldo, se registra como <strong>promoción</strong>; si lo dejas vacío, es
            una <strong>transferencia</strong> de cargo. El cambio se refleja en el perfil, planilla,
            alertas y score automáticamente.
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
