/**
 * Plantilla visual para revisar y aplicar la reorganización jerárquica.
 */
'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  GitBranch,
  Layers3,
  RefreshCw,
  Save,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'

import type { OrgChartTree, OrgPositionDTO, OrgUnitDTO } from '@/lib/orgchart/types'
import {
  buildUnitPath,
  inferPositionHierarchy,
  isParallelGovernanceUnit,
  type InferredPositionHierarchy,
} from '@/lib/orgchart/hierarchy-inference'

import { useOrgStore } from '../state/org-store'
import { useTreeQuery, treeKey } from '../data/queries/use-tree'
import { alertsKey } from '../data/queries/use-alerts'
import { doctorKey } from '../data/queries/use-doctor-report'
import { useReorganizeHierarchyMutation } from '../data/mutations/use-reorganize-hierarchy'
import { ModalShell } from './modal-shell'

const UNIT_KIND_LABELS: Record<string, string> = {
  GERENCIA: 'Gerencia',
  AREA: 'Área',
  DEPARTAMENTO: 'Departamento',
  EQUIPO: 'Equipo',
  COMITE_LEGAL: 'Comité',
  BRIGADA: 'Brigada',
  PROYECTO: 'Proyecto',
}

interface ManualParentInput {
  positionId: string
  reportsToPositionId: string | null
}

type ApiMutationError = Error & { status?: number }

async function buildApiMutationError(res: Response, fallback: string): Promise<ApiMutationError> {
  const err = await res.json().catch(() => ({}))
  const message =
    typeof err.error === 'string' && err.error !== 'Error interno del servidor'
      ? err.error
      : fallback
  const apiError = new Error(message) as ApiMutationError
  apiError.status = res.status
  return apiError
}

function shouldRetryServerError(failureCount: number, error: unknown) {
  const status = (error as ApiMutationError | undefined)?.status
  return failureCount < 2 && typeof status === 'number' && status >= 500
}

export function ReorganizeHierarchyModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const currentSnapshotId = useOrgStore((s) => s.currentSnapshotId)
  const setDisplayMode = useOrgStore((s) => s.setDisplayMode)
  const open = activeModal === 'reorganize'

  const queryClient = useQueryClient()
  const treeQuery = useTreeQuery(currentSnapshotId)
  const reorganizeMutation = useReorganizeHierarchyMutation(null)
  const [manualPositionId, setManualPositionId] = useState('')
  const [manualParentOverride, setManualParentOverride] = useState<string | null>(null)

  const manualMutation = useMutation({
    mutationKey: ['orgchart', 'manual-parent-assignment'],
    mutationFn: async ({ positionId, reportsToPositionId }: ManualParentInput) => {
      const res = await fetch(`/api/orgchart/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsToPositionId }),
      })
      if (!res.ok) {
        throw await buildApiMutationError(
          res,
          'La base de datos está ocupada. Intentamos de nuevo, y si persiste prueba en unos segundos.',
        )
      }
      return res.json()
    },
    retry: shouldRetryServerError,
    retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 3000),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treeKey(currentSnapshotId) })
      queryClient.invalidateQueries({ queryKey: alertsKey, refetchType: 'none' })
      queryClient.invalidateQueries({ queryKey: doctorKey, refetchType: 'none' })
    },
  })

  const model = useMemo(() => {
    if (!treeQuery.data) return null
    return buildHierarchyModel(treeQuery.data)
  }, [treeQuery.data])

  const defaultPositionId = model?.changes[0]?.position.id ?? model?.positions[0]?.id ?? ''
  const selectedPositionId = manualPositionId || defaultPositionId
  const selectedPosition = selectedPositionId && model
    ? model.positionsById.get(selectedPositionId) ?? null
    : null
  const selectedParentId = manualParentOverride ?? selectedPosition?.reportsToPositionId ?? ''
  const selectedSuggestedParentId = selectedPositionId && model
    ? model.hierarchy.parentByPosition.get(selectedPositionId) ?? null
    : null
  const nextParentId = selectedParentId || null
  const manualChanged = Boolean(
    selectedPosition && selectedPosition.reportsToPositionId !== nextParentId,
  )

  const handleApplyTemplate = async () => {
    if (currentSnapshotId) {
      toast.error('No puedes reorganizar un snapshot histórico.')
      return
    }
    try {
      const result = await reorganizeMutation.mutateAsync()
      setDisplayMode('positions')
      if (result.changedCount === 0) {
        toast.info('La plantilla ya coincide con el organigrama actual.')
      } else {
        toast.success(
          `Plantilla aplicada: ${result.unitsChanged} proceso${result.unitsChanged === 1 ? '' : 's'} y ${result.positionsChanged} cargo${result.positionsChanged === 1 ? '' : 's'} reorganizado${result.changedCount === 1 ? '' : 's'}.`,
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aplicar la plantilla')
    }
  }

  const handleManualSave = async () => {
    if (!selectedPosition) return
    try {
      await manualMutation.mutateAsync({
        positionId: selectedPosition.id,
        reportsToPositionId: nextParentId,
      })
      setManualParentOverride(null)
      setDisplayMode('positions')
      toast.success('Línea de mando actualizada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el cambio')
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Plantilla de reorganización"
      subtitle="Revisa el árbol sugerido, aplica la plantilla o ajusta la jefatura cargo por cargo."
      icon={<GitBranch className="h-5 w-5" />}
      width="2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {model
              ? `${model.unitChanges.length + model.changes.length} cambio${model.unitChanges.length + model.changes.length === 1 ? '' : 's'} sugerido${model.unitChanges.length + model.changes.length === 1 ? '' : 's'}: ${model.unitChanges.length} proceso${model.unitChanges.length === 1 ? '' : 's'} y ${model.changes.length} cargo${model.changes.length === 1 ? '' : 's'}.`
              : 'Cargando plantilla...'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleApplyTemplate}
              disabled={
                Boolean(currentSnapshotId) ||
                !model ||
                model.positions.length === 0 ||
                reorganizeMutation.isPending
              }
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {reorganizeMutation.isPending ? 'Aplicando...' : 'Aplicar plantilla'}
            </button>
          </div>
        </div>
      }
    >
      {treeQuery.isLoading ? (
        <div className="flex min-h-[360px] items-center justify-center text-sm text-slate-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Preparando plantilla...
        </div>
      ) : treeQuery.error ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
          <div>
            <p className="text-sm font-medium text-slate-800">
              No pudimos cargar el organigrama
            </p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              {treeQuery.error instanceof Error
                ? treeQuery.error.message
                : 'Ocurrió un error al cargar el organigrama'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => treeQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      ) : !model || model.positions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Todavía no hay cargos para reorganizar.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <section className="min-w-0 rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-2xl">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Árbol sugerido con tus cargos actuales
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Dirección arriba, áreas al centro y cargos subordinados debajo.
                </p>
              </div>
              <span className="rounded-full bg-sky-500/15 px-2 py-1 text-xs font-semibold text-sky-200 ring-1 ring-sky-400/30">
                Vista previa
              </span>
            </div>

            <div className="max-h-[560px] overflow-auto rounded-lg bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_34%),#020617] p-4 ring-1 ring-slate-800">
              <TemplateTreePreview
                model={model}
                selectedPositionId={selectedPositionId}
                onSelect={(positionId) => {
                  setManualPositionId(positionId)
                  setManualParentOverride(null)
                }}
              />
            </div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                <h3 className="text-sm font-semibold text-white">Cambios sugeridos</h3>
              </div>
              {model.unitChanges.length === 0 && model.changes.length === 0 ? (
                <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                  La jerarquía guardada ya coincide con la plantilla sugerida.
                </p>
              ) : (
                <div className="max-h-[190px] space-y-2 overflow-y-auto pr-1">
                  {model.unitChanges.map(({ unit, suggestedParent }) => (
                    <div
                      key={`unit-${unit.id}`}
                      className="w-full rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2 text-left"
                    >
                      <div className="truncate text-xs font-semibold text-white">
                        {unit.name}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <span className="truncate">proceso raíz</span>
                        <ArrowRight className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate font-medium text-slate-200">
                          {suggestedParent?.name ?? 'Gerencia General'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {model.changes.map(({ position, suggestedParent }) => (
                    <button
                      key={position.id}
                      type="button"
                      onClick={() => {
                        setManualPositionId(position.id)
                        setManualParentOverride(null)
                      }}
                      className={`w-full rounded-lg border p-2 text-left transition ${
                        selectedPositionId === position.id
                          ? 'border-sky-400 bg-sky-500/15'
                          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="truncate text-xs font-semibold text-white">
                        {position.title}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <span className="truncate">sin jefatura clara</span>
                        <ArrowRight className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate font-medium text-slate-200">
                          {suggestedParent?.title ?? 'Nivel raíz'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/95 p-4 shadow-2xl">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-white">Ajuste manual</h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  Mueve un cargo asignándole otro jefe inmediato.
                </p>
              </div>

              <label className="block text-xs font-medium text-slate-300">
                Cargo a mover
              </label>
              <select
                value={selectedPositionId}
                onChange={(event) => {
                  setManualPositionId(event.target.value)
                  setManualParentOverride(null)
                }}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              >
                {model.positions.map((position) => (
                  <option key={position.id} value={position.id}>
                    {position.title} · {model.unitsById.get(position.orgUnitId)?.name ?? 'Sin unidad'}
                  </option>
                ))}
              </select>

              <label className="mt-3 block text-xs font-medium text-slate-300">
                Reporta a
              </label>
              <select
                value={selectedParentId}
                onChange={(event) => setManualParentOverride(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="">Nivel raíz / sin jefe inmediato</option>
                {model.positions
                  .filter((position) => position.id !== selectedPositionId)
                  .map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title} · {model.unitsById.get(position.orgUnitId)?.name ?? 'Sin unidad'}
                    </option>
                  ))}
              </select>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setManualParentOverride(selectedSuggestedParentId ?? '')}
                  disabled={!selectedPosition}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/30 bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Usar sugerencia
                </button>
                <button
                  type="button"
                  onClick={handleManualSave}
                  disabled={!selectedPosition || !manualChanged || manualMutation.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-3.5 w-3.5" />
                  {manualMutation.isPending ? 'Guardando...' : 'Guardar cambio'}
                </button>
              </div>

              {selectedPosition && (
                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-400">
                  <span className="font-semibold text-white">{selectedPosition.title}</span>
                  {' '}queda ubicado bajo{' '}
                  <span className="font-semibold text-white">
                    {nextParentId ? model.positionsById.get(nextParentId)?.title ?? 'cargo seleccionado' : 'nivel raíz'}
                  </span>.
                </div>
              )}
            </section>
          </aside>
        </div>
      )}
    </ModalShell>
  )
}

interface HierarchyModel {
  tree: OrgChartTree
  unitsById: Map<string, OrgUnitDTO>
  positions: OrgPositionDTO[]
  positionsById: Map<string, OrgPositionDTO>
  hierarchy: InferredPositionHierarchy<OrgPositionDTO>
  childrenByParent: Map<string | null, OrgPositionDTO[]>
  roots: OrgPositionDTO[]
  changes: Array<{ position: OrgPositionDTO; suggestedParent: OrgPositionDTO | null }>
  unitChanges: Array<{ unit: OrgUnitDTO; suggestedParent: OrgUnitDTO | null }>
  assignmentsByPosition: Map<string, OrgChartTree['assignments']>
}

function buildHierarchyModel(tree: OrgChartTree): HierarchyModel {
  const visibleUnits = tree.units.filter((unit) => !isParallelGovernanceUnit(unit))
  const visibleUnitIds = new Set(visibleUnits.map((unit) => unit.id))
  const positions = tree.positions
    .filter((position) => visibleUnitIds.has(position.orgUnitId))
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
  const visiblePositionIds = new Set(positions.map((position) => position.id))
  const visibleAssignments = tree.assignments.filter((assignment) =>
    visiblePositionIds.has(assignment.positionId),
  )
  const unitsById = new Map(visibleUnits.map((unit) => [unit.id, unit]))
  const positionsById = new Map(positions.map((position) => [position.id, position]))
  const assignmentsByPosition = new Map<string, OrgChartTree['assignments']>()
  for (const assignment of visibleAssignments) {
    assignmentsByPosition.set(assignment.positionId, [
      ...(assignmentsByPosition.get(assignment.positionId) ?? []),
      assignment,
    ])
  }
  const hierarchy = inferPositionHierarchy({
    units: visibleUnits,
    positions,
    assignments: visibleAssignments,
  })

  const childrenByParent = new Map<string | null, OrgPositionDTO[]>()
  for (const position of positions) {
    const parentId = hierarchy.parentByPosition.get(position.id) ?? null
    childrenByParent.set(parentId, [...(childrenByParent.get(parentId) ?? []), position])
  }
  for (const [parentId, children] of childrenByParent) {
    childrenByParent.set(parentId, sortHierarchyChildren(children, hierarchy))
  }

  const roots = sortHierarchyChildren(childrenByParent.get(null) ?? [], hierarchy)
  const unitChanges = visibleUnits
    .map((unit) => {
      const suggestedParentId = hierarchy.unitHierarchy.parentByUnit.get(unit.id) ?? null
      return {
        unit,
        suggestedParent: suggestedParentId ? unitsById.get(suggestedParentId) ?? null : null,
      }
    })
    .filter(({ unit, suggestedParent }) => {
      return unit.parentId !== (suggestedParent?.id ?? null)
    })
  const changes = positions
    .map((position) => {
      const suggestedParentId = hierarchy.parentByPosition.get(position.id) ?? null
      return {
        position,
        suggestedParent: suggestedParentId ? positionsById.get(suggestedParentId) ?? null : null,
      }
    })
    .filter(({ position, suggestedParent }) => {
      if (!suggestedParent) return false
      return position.reportsToPositionId !== suggestedParent.id
    })

  return {
    tree,
    unitsById,
    positions,
    positionsById,
    hierarchy,
    childrenByParent,
    roots,
    changes,
    unitChanges,
    assignmentsByPosition,
  }
}

function sortHierarchyChildren(
  positions: OrgPositionDTO[],
  hierarchy: InferredPositionHierarchy<OrgPositionDTO>,
) {
  return [...positions].sort((a, b) => {
    const leadDelta =
      Number(hierarchy.leadByUnit.get(b.orgUnitId)?.id === b.id) -
      Number(hierarchy.leadByUnit.get(a.orgUnitId)?.id === a.id)
    if (leadDelta !== 0) return leadDelta
    const managerDelta = Number(Boolean(b.isManagerial)) - Number(Boolean(a.isManagerial))
    if (managerDelta !== 0) return managerDelta
    return a.title.localeCompare(b.title, 'es')
  })
}

function TemplateTreePreview({
  model,
  selectedPositionId,
  onSelect,
}: {
  model: HierarchyModel
  selectedPositionId: string
  onSelect: (positionId: string) => void
}) {
  const roots = model.roots.length > 0 ? model.roots : model.positions.slice(0, 1)

  return (
    <div className="min-w-[780px] space-y-10 pb-2">
      {roots.map((root) => (
        <TemplateRootBlock
          key={root.id}
          root={root}
          model={model}
          selectedPositionId={selectedPositionId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}

function TemplateRootBlock({
  root,
  model,
  selectedPositionId,
  onSelect,
}: {
  root: OrgPositionDTO
  model: HierarchyModel
  selectedPositionId: string
  onSelect: (positionId: string) => void
}) {
  const children = model.childrenByParent.get(root.id) ?? []

  return (
    <div className="relative">
      <div className="flex justify-center">
        <TemplatePositionCard
          position={root}
          model={model}
          selectedPositionId={selectedPositionId}
          onSelect={onSelect}
          variant="root"
        />
      </div>

      {children.length > 0 ? (
        <div className="relative mt-10">
          <div className="absolute -top-10 left-1/2 h-10 w-px bg-sky-400/40" />
          {children.length > 1 && (
            <div className="absolute left-[110px] right-[110px] top-0 h-px bg-sky-400/35" />
          )}
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${children.length}, minmax(220px, 1fr))`,
            }}
          >
            {children.map((child) => (
              <div key={child.id} className="relative pt-6">
                <div className="absolute left-1/2 top-0 h-6 w-px bg-sky-400/35" />
                <TemplateAreaBlock
                  position={child}
                  model={model}
                  selectedPositionId={selectedPositionId}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mx-auto mt-6 w-fit rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
          Sin reportes bajo esta posición.
        </p>
      )}
    </div>
  )
}

function TemplateAreaBlock({
  position,
  model,
  selectedPositionId,
  onSelect,
}: {
  position: OrgPositionDTO
  model: HierarchyModel
  selectedPositionId: string
  onSelect: (positionId: string) => void
}) {
  const descendants = collectDescendants(model, position.id)
  const visibleDescendants = descendants.slice(0, 8)
  const hiddenCount = descendants.length - visibleDescendants.length

  return (
    <div
      className={`h-full rounded-xl border p-3 shadow-xl transition ${
        selectedPositionId === position.id
          ? 'border-sky-400 bg-sky-500/10 ring-2 ring-sky-500/25'
          : 'border-slate-800 bg-slate-900/85'
      }`}
    >
      <TemplatePositionCard
        position={position}
        model={model}
        selectedPositionId={selectedPositionId}
        onSelect={onSelect}
        variant="area"
      />

      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/80 p-2">
        <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase text-slate-400">
          <span>Línea del área</span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
            {descendants.length} cargo{descendants.length === 1 ? '' : 's'}
          </span>
        </div>

        {visibleDescendants.length > 0 ? (
          <div className="space-y-1.5">
            {visibleDescendants.map(({ position: descendant, depth }) => (
              <SubordinateRow
                key={descendant.id}
                position={descendant}
                depth={depth}
                model={model}
                selected={selectedPositionId === descendant.id}
                onSelect={onSelect}
              />
            ))}
            {hiddenCount > 0 && (
              <div className="rounded-md border border-dashed border-slate-700 px-2 py-1.5 text-center text-[11px] text-slate-400">
                +{hiddenCount} cargo{hiddenCount === 1 ? '' : 's'} adicional{hiddenCount === 1 ? '' : 'es'}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-700 px-2 py-2 text-center text-[11px] text-slate-500">
            Sin cargos subordinados
          </div>
        )}
      </div>
    </div>
  )
}

function TemplatePositionCard({
  position,
  model,
  selectedPositionId,
  onSelect,
  variant,
}: {
  position: OrgPositionDTO
  model: HierarchyModel
  selectedPositionId: string
  onSelect: (positionId: string) => void
  variant: 'root' | 'area'
}) {
  const unit = model.unitsById.get(position.orgUnitId) ?? null
  const childCount = collectDescendants(model, position.id).length
  const isLead = model.hierarchy.leadByUnit.get(position.orgUnitId)?.id === position.id
  const inferred = model.hierarchy.inferredPositionIds.has(position.id)
  const unitPath = buildUnitPath(unit?.id ?? null, model.unitsById)
  const selected = selectedPositionId === position.id
  const occupantLabel = getOccupantLabel(model, position)

  return (
    <button
      type="button"
      onClick={() => onSelect(position.id)}
      className={`w-full rounded-xl border text-left shadow-lg transition ${
        variant === 'root'
          ? `mx-auto max-w-[380px] p-4 ${
              selected
                ? 'border-cyan-300 bg-cyan-500/15 ring-2 ring-cyan-400/25'
                : 'border-cyan-400/45 bg-slate-900 hover:border-cyan-300/70'
            }`
          : `p-3 ${
              selected
                ? 'border-sky-300 bg-sky-500/15'
                : 'border-slate-700 bg-slate-950 hover:border-sky-400/60'
            }`
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-200 ring-1 ring-slate-700">
          <Layers3 className="h-3 w-3" />
          {unit ? UNIT_KIND_LABELS[unit.kind] ?? unit.kind : 'Unidad'}
        </span>
        {isLead && (
          <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-200 ring-1 ring-emerald-400/25">
            líder
          </span>
        )}
        {inferred && (
          <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200 ring-1 ring-sky-400/25">
            sugerido
          </span>
        )}
      </div>

      <div className={variant === 'root' ? 'mt-3 text-center' : 'mt-2'}>
        <div className="truncate text-sm font-semibold text-white" title={position.title}>
          {position.title}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-400" title={unitPath}>
          {unitPath || unit?.name || 'Sin unidad'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-slate-800/80 px-2 py-1 text-xs text-slate-300">
          <BriefcaseBusiness className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
          <span className="truncate">{occupantLabel}</span>
        </div>
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300 ring-1 ring-slate-700">
          {childCount} reporte{childCount === 1 ? '' : 's'}
        </span>
      </div>
    </button>
  )
}

function SubordinateRow({
  position,
  depth,
  model,
  selected,
  onSelect,
}: {
  position: OrgPositionDTO
  depth: number
  model: HierarchyModel
  selected: boolean
  onSelect: (positionId: string) => void
}) {
  const unit = model.unitsById.get(position.orgUnitId) ?? null
  const occupantLabel = getOccupantLabel(model, position)

  return (
    <button
      type="button"
      onClick={() => onSelect(position.id)}
      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border px-2 py-1.5 text-left transition ${
        selected
          ? 'border-sky-400 bg-sky-500/15'
          : 'border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900'
      }`}
      style={{ paddingLeft: 8 + Math.min(depth, 4) * 10 }}
    >
      <div className="min-w-0">
        <div className="truncate text-xs font-semibold text-slate-100" title={position.title}>
          {position.title}
        </div>
        <div className="truncate text-[11px] text-slate-500" title={occupantLabel}>
          {occupantLabel}
        </div>
      </div>
      <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
        {unit ? UNIT_KIND_LABELS[unit.kind] ?? unit.kind : 'Cargo'}
      </span>
    </button>
  )
}

function collectDescendants(
  model: HierarchyModel,
  parentId: string,
  depth = 1,
  seen = new Set<string>(),
): Array<{ position: OrgPositionDTO; depth: number }> {
  if (seen.has(parentId)) return []
  seen.add(parentId)

  const children = model.childrenByParent.get(parentId) ?? []
  return children.flatMap((child) => [
    { position: child, depth },
    ...collectDescendants(model, child.id, depth + 1, seen),
  ])
}

function getOccupantLabel(model: HierarchyModel, position: OrgPositionDTO) {
  const assignment = model.assignmentsByPosition.get(position.id)?.[0]
  const worker = assignment?.worker
  return worker ? `${worker.firstName} ${worker.lastName}` : 'Vacante'
}
