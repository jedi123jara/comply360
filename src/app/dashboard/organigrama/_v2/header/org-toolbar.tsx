/**
 * Toolbar v2 — 5 botones primarios + overflow.
 *
 * Sustituye los 14 botones del header v1 por una jerarquía clara:
 *   Buscar · Crear · Lente · Vista · Compartir
 *
 * El menú "Más" agrupa: Plantillas, Importar Excel, Org Doctor, What-If,
 * Snapshot, Auditor Link.
 */
'use client'

import {
  Search,
  Plus,
  Share2,
  MoreHorizontal,
  Sparkles,
  Camera,
  ScrollText,
  Upload,
  Wand2,
  Link2,
  ListTree,
  Download,
  BookMarked,
  Users,
  MessageSquare,
  UserPlus,
  Zap,
  FolderClock,
  ShieldCheck,
  Activity,
  Scale,
  History,
} from 'lucide-react'
import { useState } from 'react'

import { useOrgStore } from '../state/org-store'
import { LayoutSwitcher } from './layout-switcher'
import { LensSelector } from './lens-selector'
import { AlertsButton } from './alerts-button'

interface OrgToolbarProps {
  /** href base para exports (PDF, MOF, RIT) — incluye snapshotId si aplica. */
  exportHref: (path: string) => string
  onCreateUnit?: () => void
  onCreatePosition?: () => void
  onSnapshot?: () => void
  onOpenAuditor?: () => void
}

export function OrgToolbar({
  exportHref,
  onCreateUnit,
  onCreatePosition,
  onSnapshot,
  onOpenAuditor,
}: OrgToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const setCommandPaletteOpen = useOrgStore((s) => s.setCommandPaletteOpen)
  const setDoctorOpen = useOrgStore((s) => s.setDoctorOpen)
  const setCopilotOpen = useOrgStore((s) => s.setCopilotOpen)
  const openModal = useOrgStore((s) => s.openModal)
  const selectedUnitId = useOrgStore((s) => s.selectedUnitId)
  const selectedPositionId = useOrgStore((s) => s.selectedPositionId)

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

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Buscar */}
      <button
        type="button"
        onClick={() => setCommandPaletteOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        title="Buscar (K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline">Buscar</span>
        <kbd className="hidden rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-500 md:inline">
          K
        </kbd>
      </button>

      {/* Crear */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setCreateOpen((o) => !o)}
          onBlur={() => setTimeout(() => setCreateOpen(false), 120)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
        >
          <Plus className="h-4 w-4" />
          Crear
        </button>
        {createOpen && (
          <div className="absolute left-0 top-[calc(100%+4px)] z-30 min-w-[180px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onCreateUnit?.()
                setCreateOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva unidad
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onCreatePosition?.()
                setCreateOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Nuevo cargo
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openContextualAssignment()
                setCreateOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Asignar trabajador
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('bootstrap-from-workers')
                setCreateOpen(false)
              }}
              className="flex w-full items-start gap-2 rounded-md bg-emerald-50/60 px-2 py-1.5 text-left text-sm text-emerald-800 transition hover:bg-emerald-100"
              title="Crea áreas, cargos y asignaciones automáticamente desde la planilla"
            >
              <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
              <span className="flex-1">
                <span className="block font-semibold">Generar desde planilla</span>
                <span className="block text-[10px] font-normal text-emerald-700">
                  Usa cargos y áreas de tus trabajadores
                </span>
              </span>
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault()
          openContextualAssignment()
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        title="Asignar trabajador a un cargo"
      >
        <UserPlus className="h-4 w-4" />
        <span className="hidden md:inline">Asignar</span>
      </button>

      {/* Copiloto IA — destacado */}
      <button
        type="button"
        onClick={() => setCopilotOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-gradient-to-r from-emerald-50 to-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:from-emerald-100 hover:to-emerald-200"
        title="Abrir Copiloto IA"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="hidden md:inline">Copiloto IA</span>
        <Sparkles className="h-3 w-3 text-emerald-600" />
      </button>

      {/* Alertas */}
      <AlertsButton />

      {/* Lente */}
      <LensSelector />

      {/* Vista (layout switcher) */}
      <LayoutSwitcher />

      {/* Compartir */}
      <div className="relative ml-auto">
        <button
          type="button"
          onClick={() => setShareOpen((o) => !o)}
          onBlur={() => setTimeout(() => setShareOpen(false), 120)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Share2 className="h-4 w-4" />
          <span className="hidden md:inline">Compartir</span>
        </button>
        {shareOpen && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[240px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            {/* Memoria Anual — destacada con accent */}
            <a
              href={`/api/orgchart/memoria-anual?year=${new Date().getFullYear()}`}
              onMouseDown={() => setShareOpen(false)}
              className="group flex w-full items-start gap-2 rounded-md border border-emerald-100 bg-emerald-50 px-2 py-2 text-left text-sm text-emerald-900 transition hover:bg-emerald-100"
              title="PDF institucional con score, estructura, MOF y certificado"
            >
              <BookMarked className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span className="flex-1">
                <span className="block font-semibold">Memoria Anual</span>
                <span className="block text-[10px] font-normal text-emerald-700">
                  PDF firmado · entregable a Directorio o SUNAFIL
                </span>
              </span>
            </a>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onSnapshot?.()
                setShareOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Camera className="h-3.5 w-3.5" />
              Tomar snapshot
            </button>
            <a
              href={exportHref('/api/orgchart/export-pdf')}
              onMouseDown={() => setShareOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              Descargar gráfico PDF
            </a>
            <a
              href={exportHref('/api/orgchart/mof')}
              onMouseDown={() => setShareOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Generar MOF
            </a>
            <a
              href={exportHref('/api/orgchart/rit')}
              onMouseDown={() => setShareOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Generar RIT
            </a>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                onOpenAuditor?.()
                setShareOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Link2 className="h-3.5 w-3.5" />
              Auditor Link
            </button>
          </div>
        )}
      </div>

      {/* Más (overflow) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setMoreOpen((o) => !o)}
          onBlur={() => setTimeout(() => setMoreOpen(false), 120)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
          title="Más opciones"
          aria-label="Más opciones"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
        {moreOpen && (
          <div className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-[200px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('reorganize')
                setMoreOpen(false)
              }}
              className="flex w-full items-start gap-2 rounded-md bg-emerald-50/60 px-2 py-1.5 text-left text-sm text-emerald-800 transition hover:bg-emerald-100"
              title="Detecta la Gerencia y cuelga las demás áreas debajo"
            >
              <Wand2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
              <span className="flex-1">
                <span className="block font-semibold">Reorganizar jerarquía</span>
                <span className="block text-[10px] font-normal text-emerald-700">
                  Pon a Gerencia arriba y las áreas debajo
                </span>
              </span>
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                setDoctorOpen(true)
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              Org Doctor
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('what-if')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <ListTree className="h-3.5 w-3.5" />
              What-If
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('drafts')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <FolderClock className="h-3.5 w-3.5" />
              Escenarios guardados
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('legal-responsibles')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Responsables legales
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('structure-analytics')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Activity className="h-3.5 w-3.5" />
              Analítica
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('directory')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Users className="h-3.5 w-3.5" />
              Directorio
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('subordination')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Scale className="h-3.5 w-3.5" />
              Subordinación
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('change-history')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <History className="h-3.5 w-3.5" />
              Historial
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('templates')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Wand2 className="h-3.5 w-3.5" />
              Plantillas
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                openModal('import-excel')
                setMoreOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Upload className="h-3.5 w-3.5" />
              Importar Excel
            </button>
            <a
              href="/dashboard/organigrama/people"
              onMouseDown={() => setMoreOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
            >
              <Users className="h-3.5 w-3.5" />
              Trombinoscopio
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
