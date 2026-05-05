/**
 * Shell v2 del módulo Organigrama.
 *
 * Es el componente top-level cuando el feature flag `orgchart_v2` está
 * activo. Layout grid 3 zonas:
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  Header (toolbar, layout-switcher, lens)     │
 *   ├──────────────────────────────────────────────┤
 *   │                                              │
 *   │  Canvas v2                       Inspector   │
 *   │  (xyflow + heatmap + nudges)     (sliding)   │
 *   │                                              │
 *   └──────────────────────────────────────────────┘
 *
 * Doctor + Modales viven dentro del shell pero se renderizan condicionales.
 */
'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Network,
  Sparkles,
  History,
  Loader2,
  Wand2,
  UsersRound,
  LayoutTemplate,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'

import {
  useTreeQuery,
  useSnapshotsQuery,
  useDoctorReportQuery,
  useCreateSnapshotMutation,
} from '../data'
import { useOrgStore } from '../state/org-store'
import { OrgCanvasV2 } from '../canvas/org-canvas-v2'
import { OrgToolbar } from '../header/org-toolbar'
import { ViewSwitcher } from '../header/view-switcher'
import { DisplayModeSwitcher } from '../header/display-mode-switcher'
import { InspectorPanel } from '../inspector/inspector-panel'
import { useKeyboardShortcuts } from '../canvas/hooks/use-keyboard-shortcuts'
import { OnboardingWizard } from '../onboarding/onboarding-wizard'
import { CopilotPanel } from '../copilot/copilot-panel'
import { TimeMachineDrawer } from '../timemachine/timemachine-drawer'
import { ModalsContainer } from '../modals/modals-container'
import { CommandPaletteV2 } from '../command/command-palette'
import { useIsMobile } from '../mobile/use-is-mobile'
import { MobileTreeView } from '../mobile/mobile-tree-view'
import { MobileInspectorSheet } from '../mobile/mobile-inspector-sheet'
import { buildCoverageReport } from '@/lib/orgchart/coverage-aggregator'
import type { OrgChartTree } from '@/lib/orgchart/types'
import {
  COMMISSION_FILTERS,
  classifyCommissionUnit,
  commissionTypeLabel,
  isCommissionUnit,
  matchesCommissionFilter,
} from '../utils/commission-classification'

export function OrganigramaShellV2() {
  // --- Hooks de teclado ---
  useKeyboardShortcuts()
  const isMobile = useIsMobile()

  // --- State ---
  const currentSnapshotId = useOrgStore((s) => s.currentSnapshotId)
  const setCurrentSnapshotId = useOrgStore((s) => s.setCurrentSnapshotId)
  const doctorOpen = useOrgStore((s) => s.doctorOpen)
  const setDoctorOpen = useOrgStore((s) => s.setDoctorOpen)
  const inspectorOpen = useOrgStore((s) => s.inspectorOpen)
  const copilotOpen = useOrgStore((s) => s.copilotOpen)
  const setCopilotOpen = useOrgStore((s) => s.setCopilotOpen)
  const timemachineOpen = useOrgStore((s) => s.timemachineOpen)
  const setTimemachineOpen = useOrgStore((s) => s.setTimemachineOpen)
  const view = useOrgStore((s) => s.view)
  const commissionFilter = useOrgStore((s) => s.commissionFilter)
  const setCommissionFilter = useOrgStore((s) => s.setCommissionFilter)
  const displayMode = useOrgStore((s) => s.displayMode)
  const setDisplayMode = useOrgStore((s) => s.setDisplayMode)

  // --- Onboarding wizard ---
  const [showOnboarding, setShowOnboarding] = useState(false)

  // --- Data ---
  const treeQuery = useTreeQuery(currentSnapshotId)
  const snapshotsQuery = useSnapshotsQuery()
  const doctorQuery = useDoctorReportQuery(true) // arranca enabled para tener heatmap/nudges desde el inicio
  const createSnapshotMutation = useCreateSnapshotMutation()

  const rawTree = treeQuery.data ?? null
  const tree = useMemo(
    () => filterTreeByView(rawTree, view, commissionFilter),
    [commissionFilter, rawTree, view],
  )
  const doctorReport = doctorQuery.data ?? null

  // Coverage report consolidado para inspector y heatmap.
  const coverage = useMemo(() => {
    if (!tree) return null
    return buildCoverageReport(tree, doctorReport?.findings ?? [])
  }, [tree, doctorReport])

  const operationalSummary = useMemo(() => {
    if (!tree) return null
    const assignmentsByPosition = new Map<string, number>()
    for (const assignment of tree.assignments) {
      assignmentsByPosition.set(
        assignment.positionId,
        (assignmentsByPosition.get(assignment.positionId) ?? 0) + 1,
      )
    }
    const criticalVacancies = tree.positions.filter((position) => {
      const occupants = assignmentsByPosition.get(position.id) ?? 0
      const vacant = occupants < (position.seats ?? 1)
      return vacant && (position.isCritical || position.isManagerial)
    })
    const duplicateRoleKeys = new Set<string>()
    const seenRoleKeys = new Set<string>()
    for (const role of tree.complianceRoles) {
      const key = `${role.roleType}:${role.unitId ?? 'global'}`
      if (seenRoleKeys.has(key)) duplicateRoleKeys.add(key)
      seenRoleKeys.add(key)
    }
    const commissionUnits = tree.units.filter(isCommissionUnit)
    const rolesByUnit = new Map<string, typeof tree.complianceRoles>()
    for (const role of tree.complianceRoles) {
      if (!role.unitId) continue
      rolesByUnit.set(role.unitId, [...(rolesByUnit.get(role.unitId) ?? []), role])
    }
    const committeesWithoutActa = commissionUnits.filter((unit) => {
      if (unit.kind === 'PROYECTO') return false
      const roles = rolesByUnit.get(unit.id) ?? []
      return roles.length > 0 && roles.some((role) => !role.actaUrl)
    })
    const expiringCommissions = commissionUnits.filter((unit) => {
      const roles = rolesByUnit.get(unit.id) ?? []
      return roles.some((role) => role.endsAt && daysUntil(role.endsAt) <= 60 && daysUntil(role.endsAt) >= 0)
    })
    const temporaryWithoutLeader = commissionUnits.filter((unit) => {
      if (classifyCommissionUnit(unit) !== 'temporary') return false
      const unitPositions = tree.positions.filter((position) => position.orgUnitId === unit.id)
      const leader = unitPositions.find((position) => position.isManagerial || /líder|lider|responsable/i.test(position.title))
      if (!leader) return true
      return (assignmentsByPosition.get(leader.id) ?? 0) === 0
    })
    const countsByCommissionType = commissionUnits.reduce(
      (acc, unit) => {
        acc[classifyCommissionUnit(unit)]++
        return acc
      },
      { sst: 0, legal: 0, brigade: 0, temporary: 0 },
    )
    return {
      criticalVacancies,
      duplicateRoles: duplicateRoleKeys.size,
      committeesWithoutActa,
      expiringCommissions,
      temporaryWithoutLeader,
      countsByCommissionType,
    }
  }, [tree])

  // --- Actions ---
  const exportHref = useCallback(
    (path: string) => {
      if (currentSnapshotId) {
        const u = new URL(path, 'http://internal')
        u.searchParams.set('snapshotId', currentSnapshotId)
        return u.pathname + u.search
      }
      return path
    },
    [currentSnapshotId],
  )

  const handleSnapshot = useCallback(async () => {
    const label = window.prompt(
      'Nombre del snapshot:',
      `Snapshot ${new Date().toLocaleDateString('es-PE')}`,
    )
    if (!label) return
    const reason = window.prompt('Motivo (opcional):', '') || null
    try {
      await createSnapshotMutation.mutateAsync({ label, reason })
      toast.success('Snapshot tomado y firmado con SHA-256.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al tomar snapshot')
    }
  }, [createSnapshotMutation])

  // --- Side effects ---
  // Abrir doctor automáticamente si hay findings críticos
  useEffect(() => {
    if (doctorReport && doctorReport.totals.critical > 0 && !doctorOpen) {
      // No lo abrimos forzosamente; solo lo señalizamos via UI.
      // Mejor mantener el estado del usuario.
    }
  }, [doctorReport, doctorOpen])

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-3 md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-emerald-600" />
            <h1 className="text-base font-semibold text-slate-900">Organigrama</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              v2 · Compliance Heatmap
            </span>
          </div>
          <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2">
            <ViewSwitcher />
            <DisplayModeSwitcher />
            {view === 'committees' && (
              <button
                type="button"
                onClick={() => useOrgStore.getState().openModal('templates')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-800 transition hover:bg-teal-100"
              >
                <LayoutTemplate className="h-4 w-4" />
                <span className="hidden sm:inline">Plantillas</span>
              </button>
            )}
            <OrgToolbar
              exportHref={exportHref}
              onSnapshot={handleSnapshot}
              onCreateUnit={() => useOrgStore.getState().openModal('create-unit')}
              onCreatePosition={() => useOrgStore.getState().openModal('create-position')}
              onOpenAuditor={() => useOrgStore.getState().openModal('auditor-link')}
            />
          </div>
        </div>

        {view === 'committees' && operationalSummary && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {COMMISSION_FILTERS.map((filter) => {
              const active = commissionFilter === filter.id
              const count =
                filter.id === 'all'
                  ? Object.values(operationalSummary.countsByCommissionType).reduce((sum, item) => sum + item, 0)
                  : operationalSummary.countsByCommissionType[filter.id]
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() => setCommissionFilter(filter.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'border-teal-300 bg-teal-50 text-teal-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                  title={filter.description}
                >
                  {filter.label}
                  <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] tabular-nums ring-1 ring-black/5">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Time machine — botón que abre drawer cinemático */}
        {(snapshotsQuery.data?.length ?? 0) > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTimemachineOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              title="Abrir Time Machine (scrubber visual)"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              Time Machine
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums text-slate-600">
                {snapshotsQuery.data?.length}
              </span>
            </button>
            {currentSnapshotId && (
              <>
                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Vista histórica · solo lectura
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentSnapshotId(null)}
                  className="text-emerald-700 hover:underline"
                >
                  Volver al actual
                </button>
              </>
            )}
          </div>
        )}

        {operationalSummary &&
          (operationalSummary.criticalVacancies.length > 0 ||
            operationalSummary.duplicateRoles > 0 ||
            operationalSummary.committeesWithoutActa.length > 0 ||
            operationalSummary.expiringCommissions.length > 0 ||
            operationalSummary.temporaryWithoutLeader.length > 0) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {operationalSummary.criticalVacancies.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {operationalSummary.criticalVacancies.length} cargo
                  {operationalSummary.criticalVacancies.length === 1 ? '' : 's'} crítico
                  {operationalSummary.criticalVacancies.length === 1 ? '' : 's'} vacante
                </span>
              )}
              {operationalSummary.duplicateRoles > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {operationalSummary.duplicateRoles} rol
                  {operationalSummary.duplicateRoles === 1 ? '' : 'es'} legal
                  {operationalSummary.duplicateRoles === 1 ? '' : 'es'} duplicado
                  {operationalSummary.duplicateRoles === 1 ? '' : 's'}
                </span>
              )}
              {operationalSummary.committeesWithoutActa.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {operationalSummary.committeesWithoutActa.length} comisión
                  {operationalSummary.committeesWithoutActa.length === 1 ? '' : 'es'} sin acta completa
                </span>
              )}
              {operationalSummary.expiringCommissions.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {operationalSummary.expiringCommissions.length} comisión
                  {operationalSummary.expiringCommissions.length === 1 ? '' : 'es'} por vencer
                </span>
              )}
              {operationalSummary.temporaryWithoutLeader.length > 0 && (
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <UsersRound className="h-3.5 w-3.5" />
                  {operationalSummary.temporaryWithoutLeader.length} equipo temporal sin líder asignado
                </span>
              )}
              {operationalSummary.criticalVacancies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDisplayMode('positions')}
                  className="ml-auto rounded-md bg-white px-2 py-1 font-semibold text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  Ver cargos
                </button>
              )}
            </div>
          )}
      </header>

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Canvas principal (desktop) o vista mobile colapsable */}
        <div className="flex-1 overflow-hidden">
          {treeQuery.isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : treeQuery.error ? (
            <div className="flex h-full items-center justify-center text-sm text-rose-600">
              Error al cargar: {String(treeQuery.error)}
            </div>
          ) : tree && tree.units.length === 0 ? (
            view === 'committees' ? (
              <EmptyCommittees
                onCreateCommission={() => useOrgStore.getState().openModal('templates')}
                filterLabel={commissionTypeLabel(commissionFilter)}
              />
            ) : (
              <EmptyOnboarding onStart={() => setShowOnboarding(true)} />
            )
          ) : isMobile && tree ? (
            <MobileTreeView tree={tree} coverage={coverage} />
          ) : (
            <OrgCanvasV2
              tree={tree}
              doctorReport={doctorReport}
              readOnly={Boolean(currentSnapshotId)}
              positionMode={displayMode === 'positions'}
            />
          )}
        </div>

        {/* Inspector lateral — desktop. En mobile usamos bottom-sheet aparte. */}
        {!isMobile && inspectorOpen && tree && (
          <InspectorPanel tree={tree} coverage={coverage} />
        )}

        {/* Inspector mobile — bottom-sheet draggable */}
        {isMobile && tree && <MobileInspectorSheet tree={tree} coverage={coverage} />}

        {/* Doctor drawer (placeholder mínimo — la versión completa vive en v1) */}
        {doctorOpen && (
          <aside className="w-[380px] border-l border-slate-200 bg-white">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-slate-900">AI Org Doctor</h2>
              </div>
              <button
                type="button"
                onClick={() => setDoctorOpen(false)}
                className="rounded p-1 text-slate-400 transition hover:bg-slate-100"
              >
                ✕
              </button>
            </header>
            <div className="space-y-3 p-4 text-sm">
              {doctorQuery.isLoading && <p className="text-slate-500">Diagnosticando…</p>}
              {doctorReport && (
                <>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-[10px] font-medium uppercase text-slate-500">
                      Salud del organigrama
                    </div>
                    <div className="text-2xl font-bold text-slate-900">
                      {doctorReport.scoreOrgHealth}
                      <span className="text-sm font-normal text-slate-500"> / 100</span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                      <div>
                        Crítico:{' '}
                        <span className="font-bold">{doctorReport.totals.critical}</span>
                      </div>
                      <div>
                        Alto: <span className="font-bold">{doctorReport.totals.high}</span>
                      </div>
                      <div>
                        Medio: <span className="font-bold">{doctorReport.totals.medium}</span>
                      </div>
                      <div>
                        Bajo: <span className="font-bold">{doctorReport.totals.low}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">
                    {doctorReport.findings.length} hallazgos visibles como nudges flotantes
                    sobre el canvas. El detalle completo por unidad está en el inspector
                    lateral, tab Cumplimiento.
                  </p>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Onboarding wizard modal */}
      {showOnboarding && (
        <OnboardingWizard
          onClose={() => setShowOnboarding(false)}
          onApplied={() => {
            setShowOnboarding(false)
            treeQuery.refetch()
            snapshotsQuery.refetch()
            doctorQuery.refetch()
          }}
        />
      )}

      {/* Copiloto IA panel */}
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />

      {/* Time Machine drawer */}
      <AnimatePresenceWrapper>
        {timemachineOpen && <TimeMachineDrawer />}
      </AnimatePresenceWrapper>

      {/* Modales centrales (CreateUnit, CreatePosition, AssignWorker, EditPosition, AssignRole) */}
      <ModalsContainer />

      {/* Command palette (cmdk) — atajo K */}
      <CommandPaletteV2 />
    </div>
  )
}

// Lightweight wrapper to keep the import side clean
function AnimatePresenceWrapper({ children }: { children: ReactNode }) {
  return <>{children}</>
}

function EmptyOnboarding({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200">
        <Wand2 className="h-7 w-7 text-white" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">
        Tu organigrama en 60 segundos
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Cuéntanos tres datos básicos de tu empresa y la IA te propone un organigrama
        completo, con roles legales sugeridos según la ley peruana. Lo ajustas como
        quieras antes de aplicar.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-lg"
      >
        <Sparkles className="h-4 w-4" />
        Crear con IA
      </button>
      <p className="mt-3 text-[11px] text-slate-400">
        ¿Ya tienes datos? Importa desde Excel o usa una plantilla del menú.
      </p>
    </div>
  )
}

function EmptyCommittees({
  filterLabel,
  onCreateCommission,
}: {
  filterLabel: string
  onCreateCommission: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-sky-50/50 p-8 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-emerald-700 shadow-lg shadow-slate-200 ring-1 ring-emerald-100">
        <UsersRound className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">
        Crea comisiones fuera de la jerarquía
      </h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        No hay registros en {filterLabel}. Usa plantillas para Comité SST,
        brigadas, comisión investigadora o equipos temporales. Los miembros pueden
        venir de distintas gerencias sin alterar la línea principal de mando.
      </p>
      <button
        type="button"
        onClick={onCreateCommission}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-700 hover:shadow-lg"
      >
        <LayoutTemplate className="h-4 w-4" />
        Ver plantillas de comisiones
      </button>
    </div>
  )
}

function filterTreeByView(
  tree: OrgChartTree | null,
  view: 'hierarchy' | 'committees',
  commissionFilter: Parameters<typeof matchesCommissionFilter>[1],
) {
  if (!tree) return null

  const unitIds = new Set(
    tree.units
      .filter((unit) =>
        view === 'committees'
          ? matchesCommissionFilter(unit, commissionFilter)
          : !isCommissionUnit(unit),
      )
      .map((unit) => unit.id),
  )
  const positionIds = new Set(
    tree.positions
      .filter((position) => unitIds.has(position.orgUnitId))
      .map((position) => position.id),
  )

  const units = tree.units
    .filter((unit) => unitIds.has(unit.id))
    .map((unit) => ({
      ...unit,
      parentId: unit.parentId && unitIds.has(unit.parentId) ? unit.parentId : null,
      level: unit.parentId && unitIds.has(unit.parentId) ? unit.level : 0,
    }))

  return {
    ...tree,
    rootUnitIds: units.filter((unit) => !unit.parentId).map((unit) => unit.id),
    units,
    positions: tree.positions.filter((position) => positionIds.has(position.id)),
    assignments: tree.assignments.filter((assignment) => positionIds.has(assignment.positionId)),
    complianceRoles: tree.complianceRoles.filter(
      (role) => !role.unitId || unitIds.has(role.unitId),
    ),
  } satisfies OrgChartTree
}

function daysUntil(date: string) {
  const target = new Date(date).getTime()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target - today.getTime()) / (1000 * 60 * 60 * 24))
}
