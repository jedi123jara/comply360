/**
 * Modal — editar cargo existente.
 *
 * Permite modificar título, jefe, jefatura/crítico/seats. Incluye opción
 * de eliminar (con confirmación inline).
 */
'use client'

import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Briefcase, Loader2, Save, Trash2, Crown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'

export function EditPositionModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const modalProps = useOrgStore((s) => s.modalProps)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'edit-position'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const positions = treeQuery.data?.positions ?? []
  const positionId = modalProps.positionId as string | undefined
  const position = positions.find((p) => p.id === positionId) ?? null

  const [title, setTitle] = useState('')
  const [reportsToPositionId, setReportsToPositionId] = useState<string | null>(null)
  const [isManagerial, setIsManagerial] = useState(false)
  const [isCritical, setIsCritical] = useState(false)
  const [seats, setSeats] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (open && position) {
        setTitle(position.title)
        setReportsToPositionId(position.reportsToPositionId)
        setIsManagerial(Boolean(position.isManagerial))
        setIsCritical(Boolean(position.isCritical))
        setSeats(position.seats)
        setConfirmDelete(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [open, position])

  if (!open || !position) {
    return null
  }

  const submit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orgchart/positions/${position.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          reportsToPositionId,
          isManagerial,
          isCritical,
          seats,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al actualizar')
      }
      toast.success('Cargo actualizado')
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

  const remove = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/orgchart/positions/${position.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al eliminar')
      }
      toast.success('Cargo eliminado')
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

  const possibleParents = positions.filter((p) => p.id !== position.id)

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Editar cargo"
      subtitle={position.title}
      icon={<Briefcase className="h-4 w-4" />}
      width="md"
      footer={
        <div className="flex items-center justify-between gap-2">
          {confirmDelete ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-700">
              <button
                type="button"
                onClick={remove}
                disabled={submitting}
                className="rounded-md bg-rose-600 px-3 py-1.5 font-semibold text-white transition hover:bg-rose-700"
              >
                Confirmar eliminar
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800"
            >
              <Trash2 className="h-3 w-3" />
              Eliminar cargo
            </button>
          )}
          <div className="flex items-center gap-2">
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
              disabled={submitting || !title.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Guardar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Título
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reporta a
          </label>
          <select
            value={reportsToPositionId ?? ''}
            onChange={(e) => setReportsToPositionId(e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">— Sin jefe —</option>
            {possibleParents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Plazas
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="mt-1 w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsManagerial((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border p-3 text-left transition ${
              isManagerial
                ? 'border-amber-300 bg-amber-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <Crown className={`h-4 w-4 ${isManagerial ? 'text-amber-600' : 'text-slate-400'}`} />
            <div className="text-xs">
              <div className="font-semibold text-slate-900">Es jefatura</div>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsCritical((v) => !v)}
            className={`flex items-center gap-2 rounded-lg border p-3 text-left transition ${
              isCritical
                ? 'border-rose-300 bg-rose-50'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className={`h-4 w-4 ${isCritical ? 'text-rose-600' : 'text-slate-400'}`} />
            <div className="text-xs">
              <div className="font-semibold text-slate-900">Es crítico</div>
            </div>
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
