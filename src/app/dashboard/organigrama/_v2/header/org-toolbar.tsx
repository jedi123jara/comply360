/**
 * Toolbar v2 — separa lectura y edición.
 *
 * Vista normal: Buscar · Diseñar estructura · Agregar · Vista · Mas
 * Modo diseño: Reorganizar · Agregar área · Asignar · Validar · Listo
 */
'use client'

import {
  Activity,
  BookMarked,
  Camera,
  Check,
  ChevronDown,
  Crosshair,
  Download,
  Eye,
  FolderClock,
  History,
  Link2,
  ListChecks,
  ListTree,
  MoreHorizontal,
  Plus,
  Scale,
  ScrollText,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wand2,
  Zap,
} from 'lucide-react'
import { useRef, useState } from 'react'

import { Tooltip } from '@/components/ui/tooltip'
import { useClickOutside } from '@/hooks/use-click-outside'
import { useOrgStore } from '../state/org-store'
import { AlertsButton } from './alerts-button'
import { LensSelector } from './lens-selector'

interface OrgToolbarProps {
  /** href base para exports (PDF, MOF, RIT) — incluye snapshotId si aplica. */
  exportHref: (path: string) => string
  onCreateUnit?: () => void
  onCreatePosition?: () => void
  onSnapshot?: () => void
  onOpenAuditor?: () => void
  onOpenTimeMachine?: () => void
  onClearSnapshot?: () => void
  onReorganize?: () => void
  reorganizeDisabled?: boolean
  snapshotsCount?: number
  currentSnapshotId?: string | null
}

export function OrgToolbar({
  exportHref,
  onCreateUnit,
  onCreatePosition,
  onSnapshot,
  onOpenAuditor,
  onOpenTimeMachine,
  onClearSnapshot,
  onReorganize,
  reorganizeDisabled = false,
  snapshotsCount = 0,
  currentSnapshotId = null,
}: OrgToolbarProps) {
  const [designMode, setDesignMode] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const setCommandPaletteOpen = useOrgStore((s) => s.setCommandPaletteOpen)
  const setDoctorOpen = useOrgStore((s) => s.setDoctorOpen)
  const setCopilotOpen = useOrgStore((s) => s.setCopilotOpen)
  const toggleFocus = useOrgStore((s) => s.toggleFocus)
  const openModal = useOrgStore((s) => s.openModal)
  const selectedUnitId = useOrgStore((s) => s.selectedUnitId)
  const selectedPositionId = useOrgStore((s) => s.selectedPositionId)

  const hasSelection = Boolean(selectedPositionId || selectedUnitId)

  const openContextualAssignment = () => {
    if (selectedPositionId) {
      openModal('assign-worker', { positionId: selectedPositionId })
      return
    }
    if (selectedUnitId) {
      openModal('assign-worker', { unitId: selectedUnitId })
      return
    }
    openModal('assign-worker')
  }

  const closeMenus = () => {
    setMoreOpen(false)
    setCreateOpen(false)
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {currentSnapshotId && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
          Vista histórica
          <button
            type="button"
            onClick={onClearSnapshot}
            className="rounded-md bg-white px-2 py-0.5 text-amber-800 ring-1 ring-amber-200 transition hover:bg-amber-100"
          >
            Actual
          </button>
        </div>
      )}

      {!designMode ? (
        <>
          <Tooltip content="Buscar en el organigrama (K)">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Buscar</span>
              <kbd className="hidden rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-500 md:inline">
                K
              </kbd>
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={() => {
              closeMenus()
              setDesignMode(true)
            }}
            disabled={Boolean(currentSnapshotId)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-55"
            title="Diseñar estructura"
          >
            <ListTree className="h-4 w-4" />
            <span>Diseñar estructura</span>
          </button>

          <CreateMenu
            open={createOpen}
            setOpen={setCreateOpen}
            onCreateUnit={onCreateUnit}
            onCreatePosition={onCreatePosition}
            onAssign={openContextualAssignment}
            onBootstrap={() => openModal('bootstrap-from-workers')}
          />

          <AlertsButton />

          <MoreMenu
            open={moreOpen}
            setOpen={setMoreOpen}
            snapshotsCount={snapshotsCount}
            exportHref={exportHref}
            onOpenCopilot={() => setCopilotOpen(true)}
            onOpenTimeMachine={onOpenTimeMachine}
            onSnapshot={onSnapshot}
            onOpenAuditor={onOpenAuditor}
            onOpenDoctor={() => setDoctorOpen(true)}
            onToggleFocus={toggleFocus}
            onOpenModal={openModal}
          />
        </>
      ) : (
        <>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800">
            <Wand2 className="h-4 w-4" />
            Modo diseño
          </div>

          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              onReorganize?.()
            }}
            disabled={reorganizeDisabled}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-800 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-55"
            title="Reorganizar la jerarquía"
          >
            <Wand2 className="h-4 w-4" />
            <span>Reorganizar…</span>
          </button>

          <button
            type="button"
            onClick={onCreateUnit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            title="Agregar área"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar área</span>
          </button>

          {hasSelection && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openContextualAssignment()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              title="Asignar"
            >
              <UserPlus className="h-4 w-4" />
              <span>Asignar</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setDoctorOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            title="Validar"
          >
            <Check className="h-4 w-4" />
            <span>Validar</span>
          </button>

          <button
            type="button"
            onClick={() => setDesignMode(false)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            title="Cerrar modo diseño"
          >
            <Check className="h-4 w-4" />
            Listo
          </button>
        </>
      )}
    </div>
  )
}

function CreateMenu({
  open,
  setOpen,
  onCreateUnit,
  onCreatePosition,
  onAssign,
  onBootstrap,
}: {
  open: boolean
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void
  onCreateUnit?: () => void
  onCreatePosition?: () => void
  onAssign: () => void
  onBootstrap: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        title="Agregar"
      >
        <Plus className="h-4 w-4" />
        Agregar
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[220px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          <MenuButton
            icon={Plus}
            label="Nueva unidad"
            onSelect={() => {
              onCreateUnit?.()
              setOpen(false)
            }}
          />
          <MenuButton
            icon={ScrollText}
            label="Nuevo cargo"
            onSelect={() => {
              onCreatePosition?.()
              setOpen(false)
            }}
          />
          <MenuButton
            icon={UserPlus}
            label="Asignar trabajador"
            onSelect={() => {
              onAssign()
              setOpen(false)
            }}
          />
          <div className="my-1 border-t border-slate-100" />
          <MenuButton
            icon={Zap}
            label="Generar desde planilla"
            tone="emerald"
            onSelect={() => {
              onBootstrap()
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

function MoreMenu({
  open,
  setOpen,
  snapshotsCount,
  exportHref,
  onOpenCopilot,
  onOpenTimeMachine,
  onSnapshot,
  onOpenAuditor,
  onOpenDoctor,
  onToggleFocus,
  onOpenModal,
}: {
  open: boolean
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void
  snapshotsCount: number
  exportHref: (path: string) => string
  onOpenCopilot: () => void
  onOpenTimeMachine?: () => void
  onSnapshot?: () => void
  onOpenAuditor?: () => void
  onOpenDoctor: () => void
  onToggleFocus: () => void
  onOpenModal: ReturnType<typeof useOrgStore.getState>['openModal']
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  useClickOutside(containerRef, () => setOpen(false), open)

  return (
    <div ref={containerRef} className="relative ml-auto">
      <Tooltip content="Más opciones">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          aria-label="Más opciones"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </Tooltip>
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] z-30 grid max-h-[70vh] w-[280px] gap-0.5 overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          {/* ── Inteligencia ── */}
          <MenuSectionHeading label="Inteligencia" />
          <MenuButton
            icon={Sparkles}
            label="Sugerencias IA"
            onSelect={() => {
              onOpenCopilot()
              setOpen(false)
            }}
          />
          <MenuButton
            icon={Sparkles}
            label="Org Doctor"
            onSelect={() => {
              onOpenDoctor()
              setOpen(false)
            }}
          />
          <MenuButton
            icon={ListTree}
            label="What-If"
            onSelect={() => {
              onOpenModal('what-if')
              setOpen(false)
            }}
          />
          <MenuButton
            icon={Crosshair}
            label="Resaltar relacionados (Foco)"
            onSelect={() => {
              onToggleFocus()
              setOpen(false)
            }}
          />
          <div className="rounded-md px-2 py-1">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium text-slate-500">
              <Eye className="h-3.5 w-3.5" />
              Lente
            </div>
            <LensSelector />
          </div>

          {/* ── Histórico ── */}
          <MenuSectionHeading label="Histórico" />
          {snapshotsCount > 0 && (
            <MenuButton
              icon={History}
              label="Time Machine"
              badge={String(snapshotsCount)}
              onSelect={() => {
                onOpenTimeMachine?.()
                setOpen(false)
              }}
            />
          )}
          <MenuButton
            icon={Camera}
            label="Tomar snapshot"
            onSelect={() => {
              onSnapshot?.()
              setOpen(false)
            }}
          />
          <MenuButton
            icon={FolderClock}
            label="Escenarios guardados"
            onSelect={() => {
              onOpenModal('drafts')
              setOpen(false)
            }}
          />
          <MenuButton
            icon={History}
            label="Historial"
            onSelect={() => {
              onOpenModal('change-history')
              setOpen(false)
            }}
          />

          {/* ── Exportar ── */}
          <MenuSectionHeading label="Exportar" />
          <MenuLink
            icon={BookMarked}
            label="Memoria Anual"
            href={`/api/orgchart/memoria-anual?year=${new Date().getFullYear()}`}
          />
          <MenuLink
            icon={Download}
            label="Descargar gráfico PDF"
            href={exportHref('/api/orgchart/export-pdf')}
          />
          <MenuLink
            icon={ScrollText}
            label="Generar MOF"
            href={exportHref('/api/orgchart/mof')}
          />
          <MenuLink
            icon={ScrollText}
            label="Generar RIT"
            href={exportHref('/api/orgchart/rit')}
          />
          <MenuLink icon={Users} label="Trombinoscopio" href="/dashboard/organigrama/people" />

          {/* ── Gestión ── */}
          <MenuSectionHeading label="Gestión" />
          <MenuButton
            icon={Link2}
            label="Auditor Link"
            onSelect={() => {
              onOpenAuditor?.()
              setOpen(false)
            }}
          />
          <MenuButton
            icon={ShieldCheck}
            label="Responsables legales"
            onSelect={() => {
              onOpenModal('legal-responsibles')
              setOpen(false)
            }}
          />
          <MenuButton
            icon={Activity}
            label="Analítica"
            onSelect={() => {
              onOpenModal('structure-analytics')
              setOpen(false)
            }}
          />
          <MenuButton
            icon={Users}
            label="Directorio"
            onSelect={() => {
              onOpenModal('directory')
              setOpen(false)
            }}
          />
          <MenuButton
            icon={Scale}
            label="Subordinación"
            onSelect={() => {
              onOpenModal('subordination')
              setOpen(false)
            }}
          />
          <MenuButton
            icon={ListChecks}
            label="Tareas delegadas"
            onSelect={() => {
              onOpenModal('delegated-tasks')
              setOpen(false)
            }}
          />
          <MenuButton
            icon={Wand2}
            label="Plantillas"
            onSelect={() => {
              onOpenModal('templates')
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}

/** Encabezado de sección dentro del MoreMenu (agrupa los 20+ items). */
function MenuSectionHeading({ label }: { label: string }) {
  return (
    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400 first:pt-1">
      {label}
    </div>
  )
}

function MenuButton({
  icon: Icon,
  label,
  badge,
  tone = 'default',
  onSelect,
}: {
  icon: typeof Search
  label: string
  badge?: string
  tone?: 'default' | 'emerald'
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onSelect()
      }}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
        tone === 'emerald'
          ? 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100'
          : 'text-slate-700 hover:bg-slate-50'
      }`}
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

function MenuLink({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Search
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{label}</span>
    </a>
  )
}
