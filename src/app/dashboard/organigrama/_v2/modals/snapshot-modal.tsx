/**
 * Modal — tomar un snapshot firmado del organigrama.
 *
 * Reemplaza los dos window.prompt() nativos del shell por un modal propio
 * (consistente con el resto del módulo).
 */
'use client'

import { useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useCreateSnapshotMutation } from '../data'

export function SnapshotModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'snapshot'

  const createSnapshot = useCreateSnapshotMutation()
  const defaultLabel = `Snapshot ${new Date().toLocaleDateString('es-PE')}`
  const [label, setLabel] = useState('')
  const [reason, setReason] = useState('')

  const submit = async () => {
    try {
      await createSnapshot.mutateAsync({
        label: label.trim() || defaultLabel,
        reason: reason.trim() || null,
      })
      toast.success('Snapshot tomado y firmado con SHA-256.')
      setLabel('')
      setReason('')
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al tomar snapshot')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Tomar snapshot del organigrama"
      subtitle="Congela la estructura actual, firmada con SHA-256 para auditoría"
      icon={<Camera className="h-4 w-4" />}
      width="md"
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
            disabled={createSnapshot.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {createSnapshot.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
            Tomar snapshot
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
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={defaultLabel}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Motivo (opcional)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ej. antes de la reorganización del área comercial…"
            className="mt-1 w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>
    </ModalShell>
  )
}
