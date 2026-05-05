/**
 * Modal — evidencia de designación legal.
 *
 * Permite registrar o actualizar el acta, fecha de elección y vigencia de un
 * responsable legal sin sacar al usuario del inspector lateral.
 */
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  CalendarDays,
  ExternalLink,
  FileCheck2,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'

import { alertsKey } from '../data/queries/use-alerts'
import { treeKey, useTreeQuery } from '../data/queries/use-tree'
import { useOrgStore } from '../state/org-store'
import { ModalShell } from './modal-shell'

function toDateInput(value: string | null | undefined) {
  if (!value) return ''
  return value.slice(0, 10)
}

function dateInputToIso(value: string) {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`).toISOString()
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function storageUrlFromUpload(data: unknown) {
  type UploadPayload = { url?: string; bucket?: string; path?: string }
  const record = data as {
    url?: string
    bucket?: string
    path?: string
    data?: UploadPayload
  }
  const payload: UploadPayload = record.data ?? record
  if (payload.bucket && payload.path) {
    return `/api/storage/${payload.bucket}/${payload.path}`
  }
  return payload.url ?? ''
}

export function RoleEvidenceModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const modalProps = useOrgStore((s) => s.modalProps)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'role-evidence'
  const roleId = modalProps.roleId as string | undefined

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(null)
  const role = useMemo(
    () => treeQuery.data?.complianceRoles.find((item) => item.id === roleId) ?? null,
    [roleId, treeQuery.data?.complianceRoles],
  )

  const [actaUrl, setActaUrl] = useState('')
  const [electedAt, setElectedAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setActaUrl(role?.actaUrl ?? '')
    setElectedAt(toDateInput(role?.electedAt))
    setEndsAt(toDateInput(role?.endsAt))
    setSelectedFile(null)
  }, [open, role])

  const roleLabel = role
    ? COMPLIANCE_ROLES[role.roleType]?.label ?? role.roleType
    : 'Responsable legal'
  const workerName = role ? `${role.worker.firstName} ${role.worker.lastName}` : ''
  const canOpenActa = actaUrl.trim().startsWith('http://') || actaUrl.trim().startsWith('https://')

  const submit = async () => {
    if (!role) return
    setSubmitting(true)
    try {
      let nextActaUrl = actaUrl.trim()
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        formData.append('bucket', 'documents')
        formData.append('subfolder', `orgchart/actas/${role.id}`)

        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        })
        const uploadData = await uploadRes.json().catch(() => ({}))
        if (!uploadRes.ok) {
          throw new Error(uploadData.error ?? 'No se pudo subir el archivo')
        }
        nextActaUrl = storageUrlFromUpload(uploadData)
      }

      const res = await fetch(`/api/orgchart/compliance-roles/${role.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actaUrl: nextActaUrl,
          electedAt: dateInputToIso(electedAt),
          endsAt: dateInputToIso(endsAt),
        }),
      })
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error ?? 'No se pudo guardar la evidencia')
      }
      toast.success('Evidencia actualizada')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: treeKey(null) }),
        queryClient.invalidateQueries({ queryKey: alertsKey }),
      ])
      closeModal()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Evidencia de designación"
      subtitle={role ? `${roleLabel} · ${workerName}` : 'Registrar acta y vigencia'}
      icon={<FileCheck2 className="h-4 w-4" />}
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setActaUrl('')}
            disabled={!actaUrl || submitting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Quitar acta
          </button>
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
              disabled={submitting || !role}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileCheck2 className="h-3.5 w-3.5" />
              )}
              Guardar evidencia
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {role && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
            <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Responsable
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{workerName}</div>
            <div className="text-xs text-slate-600">{roleLabel}</div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            URL del acta o evidencia
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="url"
              value={actaUrl}
              onChange={(e) => setActaUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {canOpenActa && (
              <a
                href={actaUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            Puede ser un enlace a Drive, SharePoint, gestor documental o repositorio interno.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Archivo del acta
          </label>
          <label
            htmlFor="role-evidence-file"
            className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-emerald-300 hover:bg-emerald-50/60"
          >
            <UploadCloud className="h-6 w-6 text-emerald-600" />
            <span className="mt-2 text-sm font-semibold text-slate-800">
              Seleccionar PDF, imagen o documento
            </span>
            <span className="mt-1 text-[11px] text-slate-500">
              PDF, DOCX, XLSX, JPG o PNG hasta 10 MB
            </span>
          </label>
          <input
            id="role-evidence-file"
            type="file"
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
            className="sr-only"
            onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
          />
          {selectedFile && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-slate-900">
                  {selectedFile.name}
                </div>
                <div className="text-[10px] text-slate-500">
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-slate-800"
                aria-label="Quitar archivo"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fecha de acta
            </label>
            <div className="relative mt-1">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={electedAt}
                onChange={(e) => setElectedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Vigente hasta
            </label>
            <div className="relative mt-1">
              <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  )
}
