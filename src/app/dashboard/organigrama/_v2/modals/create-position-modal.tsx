/**
 * Modal — crear nuevo cargo.
 *
 * Permite especificar título, unidad, jefe, jefatura/crítico/seats.
 */
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Briefcase, Plus, Loader2, Crown, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'

export function CreatePositionModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const modalProps = useOrgStore((s) => s.modalProps)
  const closeModal = useOrgStore((s) => s.closeModal)
  const selectedUnitId = useOrgStore((s) => s.selectedUnitId)
  const open = activeModal === 'create-position'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const tree = treeQuery.data
  const units = tree?.units ?? []
  const positions = tree?.positions ?? []

  // Pre-seleccionar unidad: la del modalProps, si no la del store, si no la primera
  const presetUnitId =
    (modalProps.unitId as string | undefined) ?? selectedUnitId ?? units[0]?.id ?? null

  const [title, setTitle] = useState('')
  const [unitId, setUnitId] = useState<string | null>(presetUnitId)
  const [reportsToPositionId, setReportsToPositionId] = useState<string | null>(null)
  const [isManagerial, setIsManagerial] = useState(false)
  const [isCritical, setIsCritical] = useState(false)
  const [seats, setSeats] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setTitle('')
    setUnitId(presetUnitId)
    setReportsToPositionId(null)
    setIsManagerial(false)
    setIsCritical(false)
    setSeats(1)
  }

  const submit = async () => {
    if (!title.trim() || !unitId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          orgUnitId: unitId,
          reportsToPositionId,
          isManagerial,
          isCritical,
          seats,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al crear cargo')
      }
      toast.success('Cargo creado')
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
      title="Nuevo cargo"
      subtitle="Define el título, unidad y línea de mando"
      icon={<Briefcase className="h-4 w-4" />}
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
            disabled={submitting || !title.trim() || !unitId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Crear cargo
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Título <span className="text-rose-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Jefe de Operaciones"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Unidad <span className="text-rose-500">*</span>
            </label>
            <select
              value={unitId ?? ''}
              onChange={(e) => setUnitId(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">—</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reporta a (jefe directo)
          </label>
          <select
            value={reportsToPositionId ?? ''}
            onChange={(e) => setReportsToPositionId(e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">— Sin jefe (cargo raíz) —</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
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
              <div className="text-[10px] text-slate-500">tiene reportes directos</div>
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
              <div className="text-[10px] text-slate-500">requiere sucesor</div>
            </div>
          </button>
        </div>
      </div>
    </ModalShell>
  )
}
