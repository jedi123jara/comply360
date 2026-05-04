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

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Network, Sparkles, History, Loader2, Wand2 } from 'lucide-react'
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

  // --- Onboarding wizard ---
  const [showOnboarding, setShowOnboarding] = useState(false)

  // --- Data ---
  const treeQuery = useTreeQuery(currentSnapshotId)
  const snapshotsQuery = useSnapshotsQuery()
  const doctorQuery = useDoctorReportQuery(true) // arranca enabled para tener heatmap/nudges desde el inicio
  const createSnapshotMutation = useCreateSnapshotMutation()

  const tree = treeQuery.data ?? null
  const doctorReport = doctorQuery.data ?? null

  // Coverage report consolidado para inspector y heatmap.
  const coverage = useMemo(() => {
    if (!tree) return null
    return buildCoverageReport(tree, doctorReport?.findings ?? [])
  }, [tree, doctorReport])

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
            <OrgToolbar
              exportHref={exportHref}
              onSnapshot={handleSnapshot}
              onCreateUnit={() => useOrgStore.getState().openModal('create-unit')}
              onCreatePosition={() => useOrgStore.getState().openModal('create-position')}
              onOpenAuditor={() => useOrgStore.getState().openModal('auditor-link')}
            />
          </div>
        </div>

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
            <EmptyOnboarding onStart={() => setShowOnboarding(true)} />
          ) : isMobile && tree ? (
            <MobileTreeView tree={tree} coverage={coverage} />
          ) : (
            <OrgCanvasV2
              tree={tree}
              doctorReport={doctorReport}
              readOnly={Boolean(currentSnapshotId)}
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
function AnimatePresenceWrapper({ children }: { children: React.ReactNode }) {
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
