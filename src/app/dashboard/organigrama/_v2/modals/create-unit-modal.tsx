/**
 * Modal — crear nueva unidad.
 *
 * Reemplaza el `CreateUnitModal` del v1. Usa @tanstack/react-query para
 * invalidar el árbol al crear.
 */
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'

const KIND_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'GERENCIA', label: 'Gerencia' },
  { value: 'AREA', label: 'Área' },
  { value: 'DEPARTAMENTO', label: 'Departamento' },
  { value: 'EQUIPO', label: 'Equipo' },
  { value: 'COMITE_LEGAL', label: 'Comité legal' },
  { value: 'BRIGADA', label: 'Brigada' },
  { value: 'PROYECTO', label: 'Proyecto' },
]

export function CreateUnitModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'create-unit'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const units = treeQuery.data?.units ?? []

  const [name, setName] = useState('')
  const [kind, setKind] = useState('AREA')
  const [parentId, setParentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setKind('AREA')
    setParentId(null)
  }

  const submit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), kind, parentId }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al crear')
      }
      toast.success('Unidad creada')
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
      title="Nueva unidad organizacional"
      subtitle="Crea una gerencia, área, departamento o comité"
      icon={<Building2 className="h-4 w-4" />}
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
            disabled={submitting || !name.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            Crear unidad
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Nombre <span className="text-rose-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Gerencia de Operaciones"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tipo
          </label>
          <div className="mt-1 grid grid-cols-2 gap-1.5 md:grid-cols-3">
            {KIND_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setKind(opt.value)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                  kind === opt.value
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Reporta a
          </label>
          <select
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">— Sin padre (raíz) —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {'  '.repeat(u.level)}
                {u.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-500">
            Deja vacío para crear una unidad raíz (típicamente Gerencia General).
          </p>
        </div>
      </div>
    </ModalShell>
  )
}
