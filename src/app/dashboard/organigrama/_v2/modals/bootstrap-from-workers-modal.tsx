/**
 * Modal — Generar organigrama desde la planilla.
 *
 * Lee Worker.position y Worker.department de los trabajadores activos y genera
 * automáticamente OrgUnits, OrgPositions y OrgAssignments. Idempotente: si lo
 * ejecutas dos veces, no duplica nada — solo aplica los cambios pendientes.
 *
 * Backend: GET/POST /api/orgchart/seed-from-legacy + applyLegacySeed().
 */
'use client'

import { Wand2, Loader2, Building2, Briefcase, UserPlus, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useBootstrapPreviewQuery, type BootstrapPreviewDTO } from '../data/queries/use-bootstrap-preview'
import { useApplyBootstrapMutation } from '../data/mutations/use-apply-bootstrap'

export function BootstrapFromWorkersModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'bootstrap-from-workers'

  const previewQuery = useBootstrapPreviewQuery(open)
  const applyMutation = useApplyBootstrapMutation()

  const preview = previewQuery.data
  const isLoading = previewQuery.isLoading
  const isApplying = applyMutation.isPending

  const totalChanges = preview
    ? preview.unitsToCreate.length +
      preview.positionsToCreate.length +
      preview.positionsToResize.length +
      preview.assignmentsToCreate
    : 0
  const nothingToDo = !!preview && totalChanges === 0

  const handleApply = async () => {
    try {
      const result = await applyMutation.mutateAsync()
      const parts: string[] = []
      if (result.units > 0) parts.push(`${result.units} área${result.units === 1 ? '' : 's'}`)
      if (result.positions > 0) parts.push(`${result.positions} cargo${result.positions === 1 ? '' : 's'}`)
      if (result.assignments > 0)
        parts.push(`${result.assignments} asignación${result.assignments === 1 ? '' : 'es'}`)
      const summary = parts.length > 0 ? parts.join(' · ') : 'Sin cambios'
      toast.success(`Organigrama actualizado: ${summary}`)
      closeModal()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo aplicar el bootstrap')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Generar organigrama desde tu planilla"
      subtitle="Usa los cargos y áreas de tus trabajadores para poblar el organigrama"
      icon={<Wand2 className="h-4 w-4" />}
      width="lg"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            Es idempotente — puedes ejecutarlo varias veces sin duplicar nada.
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
              disabled={isLoading || isApplying || nothingToDo || !preview}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isApplying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5" />
              )}
              {nothingToDo ? 'Sin cambios pendientes' : 'Aplicar al organigrama'}
            </button>
          </div>
        </div>
      }
    >
      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Calculando preview…
        </div>
      )}

      {previewQuery.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Error al cargar el preview:{' '}
          {previewQuery.error instanceof Error ? previewQuery.error.message : 'desconocido'}
        </div>
      )}

      {preview && <PreviewBody preview={preview} nothingToDo={nothingToDo} />}
    </ModalShell>
  )
}

function PreviewBody({ preview, nothingToDo }: { preview: BootstrapPreviewDTO; nothingToDo: boolean }) {
  if (nothingToDo) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">
          El organigrama ya está sincronizado
        </h3>
        <p className="mt-1 max-w-sm text-xs text-slate-500">
          Todos los {preview.totalWorkers} trabajadores con cargo y área ya están vinculados.
          Cuando agregues más gente o cambies cargos, vuelve aquí para sincronizar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Áreas a crear"
          value={preview.unitsToCreate.length}
          tone={preview.unitsToCreate.length > 0 ? 'emerald' : 'slate'}
        />
        <SummaryCard
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="Cargos a crear"
          value={preview.positionsToCreate.length}
          tone={preview.positionsToCreate.length > 0 ? 'emerald' : 'slate'}
        />
        <SummaryCard
          icon={<UserPlus className="h-3.5 w-3.5" />}
          label="Asignaciones"
          value={preview.assignmentsToCreate}
          tone={preview.assignmentsToCreate > 0 ? 'emerald' : 'slate'}
        />
        <SummaryCard
          icon={<Briefcase className="h-3.5 w-3.5" />}
          label="Cupos a ampliar"
          value={preview.positionsToResize.length}
          tone={preview.positionsToResize.length > 0 ? 'amber' : 'slate'}
        />
      </div>

      {/* Workers sin datos — warning */}
      {(preview.workersWithoutDepartment > 0 || preview.workersWithoutPosition > 0) && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Algunos trabajadores no se incluirán</p>
            <ul className="mt-1 space-y-0.5">
              {preview.workersWithoutDepartment > 0 && (
                <li>
                  · {preview.workersWithoutDepartment} sin área asignada (ve a Equipo →
                  Trabajadores y completa el campo &quot;Área&quot;)
                </li>
              )}
              {preview.workersWithoutPosition > 0 && (
                <li>
                  · {preview.workersWithoutPosition} sin cargo asignado (completa el campo
                  &quot;Cargo&quot;)
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Áreas a crear */}
      {preview.unitsToCreate.length > 0 && (
        <Section title="Áreas nuevas" count={preview.unitsToCreate.length}>
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {preview.unitsToCreate.map((unit) => (
              <li
                key={unit.slug}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium text-slate-900">{unit.name}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Cargos a crear */}
      {preview.positionsToCreate.length > 0 && (
        <Section title="Cargos nuevos" count={preview.positionsToCreate.length}>
          <ul className="grid grid-cols-1 gap-1.5 md:grid-cols-2">
            {preview.positionsToCreate.map((position) => (
              <li
                key={`${position.unitSlug}::${position.title}`}
                className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs"
              >
                <Briefcase className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
                <div className="min-w-0">
                  <div className="truncate font-medium text-slate-900">{position.title}</div>
                  <div className="text-[10px] text-slate-500">en {humanizeSlug(position.unitSlug)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Posiciones a ampliar cupos */}
      {preview.positionsToResize.length > 0 && (
        <Section title="Cargos con cupos a ampliar" count={preview.positionsToResize.length}>
          <ul className="space-y-1.5">
            {preview.positionsToResize.map((position) => (
              <li
                key={`${position.unitSlug}::${position.title}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs"
              >
                <span className="font-medium text-slate-900">{position.title}</span>
                <span className="text-[11px] text-amber-800">
                  {position.currentSeats} → {position.requiredSeats} cupos
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Asignaciones */}
      {preview.assignmentsToCreate > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <UserPlus className="mr-1.5 inline h-3.5 w-3.5" />
          Se vincularán <strong>{preview.assignmentsToCreate}</strong> trabajador
          {preview.assignmentsToCreate === 1 ? '' : 'es'} a sus cargos correspondientes.
        </div>
      )}

      <p className="text-[11px] text-slate-400">
        Total de trabajadores activos en planilla: {preview.totalWorkers}
      </p>
    </div>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {title}
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600">
          {count}
        </span>
      </h3>
      {children}
    </section>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'emerald' | 'amber' | 'slate'
}) {
  const tones: Record<typeof tone, string> = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    slate: 'border-slate-200 bg-white text-slate-700',
  }
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function humanizeSlug(slug: string): string {
  return slug
    .split('-')
    .map((part) => (part.length > 0 ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}
