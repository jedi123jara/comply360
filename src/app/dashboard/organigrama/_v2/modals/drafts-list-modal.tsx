/**
 * Modal — lista de escenarios What-If guardados (OrgChartDraft).
 *
 * Cada draft tiene status DRAFT / APPLIED / DISCARDED. Para los DRAFT,
 * el usuario puede aplicar o descartar. Los APPLIED y DISCARDED son
 * solo lectura (auditoría de simulaciones pasadas).
 */
'use client'

import { Loader2, FolderClock, Check, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useDraftsQuery, type DraftDTO, type DraftStatus } from '../data/queries/use-drafts'
import {
  useApplyDraftMutation,
  useDiscardDraftMutation,
} from '../data/mutations/use-draft-mutations'

const STATUS_TONE: Record<DraftStatus, string> = {
  DRAFT: 'bg-amber-100 text-amber-800',
  APPLIED: 'bg-emerald-100 text-emerald-800',
  DISCARDED: 'bg-slate-200 text-slate-600',
}

const STATUS_LABEL: Record<DraftStatus, string> = {
  DRAFT: 'Borrador',
  APPLIED: 'Aplicado',
  DISCARDED: 'Descartado',
}

export function DraftsListModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'drafts'

  const draftsQuery = useDraftsQuery(open)

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Escenarios What-If"
      subtitle="Simulaciones de reestructuración guardadas"
      icon={<FolderClock className="h-4 w-4" />}
      width="lg"
      footer={
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      }
    >
      {draftsQuery.isLoading && (
        <div className="flex items-center justify-center py-10 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Cargando escenarios…
        </div>
      )}

      {draftsQuery.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Error al cargar:{' '}
          {draftsQuery.error instanceof Error ? draftsQuery.error.message : 'desconocido'}
        </div>
      )}

      {draftsQuery.data && draftsQuery.data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FolderClock className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">No hay escenarios guardados</p>
          <p className="mt-1 text-xs text-slate-500">
            Usa "What-If" en el menú "Más" para simular un cambio en la estructura.
          </p>
        </div>
      )}

      {draftsQuery.data && draftsQuery.data.length > 0 && (
        <ul className="space-y-2">
          {draftsQuery.data.map((draft) => (
            <DraftCard key={draft.id} draft={draft} />
          ))}
        </ul>
      )}
    </ModalShell>
  )
}

function DraftCard({ draft }: { draft: DraftDTO }) {
  const applyMutation = useApplyDraftMutation()
  const discardMutation = useDiscardDraftMutation()

  const isPending = applyMutation.isPending || discardMutation.isPending
  const canMutate = draft.status === 'DRAFT'
  const blocked = draft.impactReport?.blocked ?? false

  const apply = async () => {
    try {
      await applyMutation.mutateAsync(draft.id)
      toast.success(`Escenario "${draft.name}" aplicado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo aplicar')
    }
  }

  const discard = async () => {
    try {
      await discardMutation.mutateAsync(draft.id)
      toast.info(`Escenario "${draft.name}" descartado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo descartar')
    }
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{draft.name}</h3>
            <span
              className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STATUS_TONE[draft.status]}`}
            >
              {STATUS_LABEL[draft.status]}
            </span>
            {blocked && (
              <span className="flex-shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rose-800">
                Bloqueado
              </span>
            )}
          </div>
          {draft.impactReport && (
            <p className="mt-1 text-xs text-slate-600">
              <span className="text-slate-500">{draft.impactReport.scenario.positionTitle}</span>{' '}
              ·{' '}
              <span className="line-through">
                {draft.impactReport.scenario.fromParentTitle ?? 'sin jefe'}
              </span>{' '}
              → <span className="font-medium text-emerald-700">
                {draft.impactReport.scenario.toParentTitle}
              </span>
            </p>
          )}
          <p className="mt-1 text-[11px] text-slate-500">
            Creado {formatRelative(draft.createdAt)}
            {draft.createdBy && ` · ${draft.createdBy.name}`}
            {draft.appliedAt && ` · Aplicado ${formatRelative(draft.appliedAt)}`}
          </p>
          {draft.impactReport && draft.impactReport.risks.length > 0 && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
              <AlertTriangle className="h-3 w-3" />
              {draft.impactReport.risks.length} riesgo
              {draft.impactReport.risks.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {canMutate && (
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={discard}
              disabled={isPending}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              title="Descartar escenario"
            >
              <Trash2 className="h-3 w-3" />
              Descartar
            </button>
            <button
              type="button"
              onClick={apply}
              disabled={isPending || blocked}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              title={blocked ? 'No se puede aplicar — escenario bloqueado' : 'Aplicar al organigrama'}
            >
              {applyMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Aplicar
            </button>
          </div>
        )}
      </div>
    </li>
  )
}

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = Date.now()
  const diffSec = Math.round((now - date.getTime()) / 1000)
  if (diffSec < 60) return 'ahora'
  if (diffSec < 3600) return `hace ${Math.round(diffSec / 60)} min`
  if (diffSec < 86_400) return `hace ${Math.round(diffSec / 3600)} h`
  if (diffSec < 30 * 86_400) return `hace ${Math.round(diffSec / 86_400)} d`
  return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}
