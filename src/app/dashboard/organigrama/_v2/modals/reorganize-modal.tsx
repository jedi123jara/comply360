/**
 * Modal — Reorganizar jerarquía automáticamente.
 *
 * Detecta la unidad de Gerencia (o cualquier candidata por nombre) y mueve
 * todas las áreas huérfanas para que cuelguen de ella. Reemplaza tener que
 * mover áreas una por una con drag-and-drop.
 *
 * Backend: GET/POST /api/orgchart/reorganize → inferAndApplyHierarchy().
 */
'use client'

import { Wand2, Loader2, ArrowRight, Crown, Building2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import {
  useReorganizeMutation,
  useReorganizePreviewQuery,
} from '../data/mutations/use-reorganize'

const KIND_LABELS: Record<string, string> = {
  GERENCIA: 'Gerencia',
  AREA: 'Área',
  DEPARTAMENTO: 'Departamento',
  EQUIPO: 'Equipo',
  COMITE_LEGAL: 'Comité legal',
  BRIGADA: 'Brigada',
  PROYECTO: 'Proyecto',
}

export function ReorganizeModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'reorganize'

  const previewQuery = useReorganizePreviewQuery(open)
  const mutation = useReorganizeMutation()

  const preview = previewQuery.data
  const isLoading = previewQuery.isLoading
  const isApplying = mutation.isPending

  const nothingToDo =
    !!preview &&
    preview.unitsToReparent.length === 0 &&
    !preview.willPromote
  const hasCandidate = !!preview?.rootCandidate

  const handleApply = async () => {
    try {
      const result = await mutation.mutateAsync()
      if (result.reparented === 0 && !result.promoted) {
        toast.info('No había nada que reorganizar.')
      } else {
        const parts: string[] = []
        if (result.promoted) parts.push(`${result.rootUnitName} promovida a Gerencia`)
        if (result.reparented > 0) {
          parts.push(
            `${result.reparented} área${result.reparented === 1 ? '' : 's'} reubicada${result.reparented === 1 ? '' : 's'}`,
          )
        }
        toast.success(parts.join(' · '))
      }
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo reorganizar')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Reorganizar jerarquía"
      subtitle="Pon a la Gerencia como raíz y cuelga las demás áreas debajo"
      icon={<Wand2 className="h-4 w-4" />}
      width="md"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            Esta acción modifica la estructura. Queda registrada en el historial.
          </p>
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
              onClick={handleApply}
              disabled={isLoading || isApplying || nothingToDo || !hasCandidate}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Reorganizando…
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" />
                  Reorganizar
                </>
              )}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analizando estructura actual…
          </div>
        )}

        {previewQuery.error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {previewQuery.error instanceof Error
                ? previewQuery.error.message
                : 'Error al calcular el preview'}
            </span>
          </div>
        )}

        {preview && !hasCandidate && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
              <div className="text-sm text-amber-900">
                <p className="font-semibold">No se detectó una Gerencia.</p>
                <p className="mt-1 text-xs">
                  {preview.reason === 'no-units'
                    ? 'Tu organigrama está vacío. Crea primero algunas unidades.'
                    : 'Renombra una unidad para que contenga "Gerencia" o "Gerente General", o crea una unidad nueva con tipo Gerencia desde el botón "Crear".'}
                </p>
              </div>
            </div>
          </div>
        )}

        {preview && hasCandidate && nothingToDo && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold">Tu organigrama ya está jerarquizado.</p>
              <p className="mt-1 text-xs">
                {preview.rootCandidate?.name} ya es la raíz y no hay áreas sueltas que mover.
              </p>
            </div>
          </div>
        )}

        {preview && hasCandidate && !nothingToDo && (
          <>
            {/* Raíz detectada */}
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Unidad raíz detectada
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
                  <Crown className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {preview.rootCandidate!.name}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {preview.willPromote
                      ? `Pasará de ${KIND_LABELS[preview.rootCandidate!.kind] ?? preview.rootCandidate!.kind} a Gerencia`
                      : 'Ya es Gerencia · queda como raíz'}
                  </div>
                </div>
              </div>
            </div>

            {/* Unidades a reubicar */}
            {preview.unitsToReparent.length > 0 && (
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Áreas que colgarán de la raíz
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                    {preview.unitsToReparent.length}
                  </span>
                </div>
                <ul className="space-y-1">
                  {preview.unitsToReparent.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                    >
                      <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                      <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {KIND_LABELS[u.kind] ?? u.kind}
                      </span>
                      <ArrowRight className="h-3 w-3 text-emerald-500" />
                      <span className="text-[10px] font-medium text-emerald-700">
                        {preview.rootCandidate!.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600">
              Tu organigrama no será destructivo: cualquier área que ya tenga padre
              definido se respeta tal cual. Solo se mueven las que están sueltas en
              la raíz.
            </div>
          </>
        )}
      </div>
    </ModalShell>
  )
}
