'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Building2,
  Network,
  ShieldCheck,
  Sparkles,
  Camera,
  Link2,
  History,
  Plus,
  Loader2,
  Wand2,
  CheckCircle2,
  X,
  Copy,
  UserPlus,
  Briefcase,
  ScrollText,
  Search,
  ListTree,
  FileSpreadsheet,
  AlertTriangle,
  Upload,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import OrgCanvas from './org-canvas'
import OrgDoctorPanel from './org-doctor-panel'
import { buildOrgCommandResults, type OrgCommandResult } from '@/lib/orgchart/command-search'
import {
  buildLegalResponsiblesSummary,
  type LegalResponsibilityItem,
  type LegalResponsibilityStatus,
} from '@/lib/orgchart/legal-responsibles'
import {
  buildStructureAnalytics,
  type SpanControlRecord,
  type SpanSeverity,
  type StructureHealth,
  type UnitStructureScore,
} from '@/lib/orgchart/structure-analytics'
import {
  analyzeMof,
  type MofCompletenessReport,
  type MofIssueSeverity,
  type MofReadinessStatus,
} from '@/lib/orgchart/mof-analysis'
import {
  buildWhatIfCostImpact,
  type WhatIfCostImpact,
} from '@/lib/orgchart/what-if-cost'
import type {
  SubordinationDossier,
  SubordinationSeverity,
} from '@/lib/orgchart/subordination-dossier'
import type {
  OrgChartTree,
  DoctorReport,
  OrgChartSnapshotDTO,
  OrgUnitDTO,
  ComplianceRoleType,
} from '@/lib/orgchart/types'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'

type View = 'hierarchy' | 'committees'
type OrgLens = 'general' | 'mof' | 'compliance' | 'contractual' | 'sst' | 'vacancies'
type ModuleTab = 'organigrama' | 'directorio' | 'areas-cargos' | 'responsables' | 'subordinacion' | 'analitica' | 'historial'
type PendingReparent = { positionId: string; newParentId: string }
type AssignRoleRequest = { unitId: string | null; roleType?: ComplianceRoleType }
type OrgAlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type OrgAlertCategory = 'MOF' | 'SST' | 'LEGAL_ROLE' | 'VACANCY' | 'SUBORDINATION' | 'SUCCESSION' | 'STRUCTURE'
type OrgDraftStatus = 'DRAFT' | 'REVIEWING' | 'APPLIED' | 'DISCARDED'

interface SubordinationRiskSyncReportDTO {
  generatedAt: string
  eventCode: string
  considered: number
  eventsCreated: number
  eventsSkipped: number
  scoresUpdated: number
  statusUpdated: number
  tasksCreated: number
  tasksSkipped: number
}

interface WhatIfRiskDTO {
  severity: OrgAlertSeverity
  title: string
  description: string
}

interface WhatIfImpactReportDTO {
  generatedAt: string
  blocked: boolean
  scenario: {
    positionId: string
    positionTitle: string
    unitId: string
    unitName: string | null
    fromParentId: string | null
    fromParentTitle: string | null
    toParentId: string
    toParentTitle: string
  }
  metrics: {
    occupants: number
    directReportsMoved: number
    projectedSpanOfControl: number
    risks: number
  }
  costImpact?: WhatIfCostImpact | null
  risks: WhatIfRiskDTO[]
}

interface OrgChartDraftDTO {
  id: string
  name: string
  status: OrgDraftStatus
  baseSnapshotId: string | null
  impactReport: WhatIfImpactReportDTO | null
  createdAt: string
  updatedAt: string
  appliedAt: string | null
  createdBy?: { name: string; email: string } | null
  appliedBy?: { name: string; email: string } | null
}

interface OrgAlertDTO {
  id: string
  category: OrgAlertCategory
  severity: OrgAlertSeverity
  title: string
  description: string
  baseLegal: string | null
  affectedUnitIds: string[]
  affectedWorkerIds: string[]
  suggestedTaskTitle: string | null
  suggestedFix: string | null
  sourceRule: string
  priority: number
}

interface OrgAlertsReportDTO {
  generatedAt: string
  scoreOrgHealth: number
  alerts: OrgAlertDTO[]
  totals: Record<'critical' | 'high' | 'medium' | 'low', number> & {
    open: number
    byCategory: Record<OrgAlertCategory, number>
  }
}

interface OrgAlertMonitorReportDTO {
  generatedAt: string
  scoreOrgHealth: number
  includedSeverities: OrgAlertSeverity[]
  considered: number
  created: number
  skipped: number
  bySeverity: Record<'critical' | 'high' | 'medium' | 'low', number>
}

export default function OrganigramaClient() {
  const [tree, setTree] = useState<OrgChartTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [view, setView] = useState<View>('hierarchy')
  const [lens, setLens] = useState<OrgLens>('general')
  const [activeTab, setActiveTab] = useState<ModuleTab>('organigrama')
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)
  const [showDoctor, setShowDoctor] = useState(false)
  const [doctorReport, setDoctorReport] = useState<DoctorReport | null>(null)
  const [doctorLoading, setDoctorLoading] = useState(false)
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertsReport, setAlertsReport] = useState<OrgAlertsReportDTO | null>(null)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsError, setAlertsError] = useState<string | null>(null)
  const [alertMonitorReport, setAlertMonitorReport] = useState<OrgAlertMonitorReportDTO | null>(null)
  const [alertMonitorLoading, setAlertMonitorLoading] = useState(false)

  const [snapshots, setSnapshots] = useState<OrgChartSnapshotDTO[]>([])
  const [asOf, setAsOf] = useState<string | null>(null)

  const [showSeedWizard, setShowSeedWizard] = useState(false)
  const [showImportExcel, setShowImportExcel] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSnapshotDiff, setShowSnapshotDiff] = useState(false)
  const [showWhatIf, setShowWhatIf] = useState(false)
  const [showDrafts, setShowDrafts] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showAuditorModal, setShowAuditorModal] = useState(false)
  const [showCreateUnit, setShowCreateUnit] = useState(false)
  const [createPositionForUnitId, setCreatePositionForUnitId] = useState<string | null>(null)
  const [editPositionId, setEditPositionId] = useState<string | null>(null)
  const [assignWorkerForPositionId, setAssignWorkerForPositionId] = useState<string | null>(null)
  const [assignRoleRequest, setAssignRoleRequest] = useState<AssignRoleRequest | null>(null)
  const [pendingReparent, setPendingReparent] = useState<PendingReparent | null>(null)
  const [reparenting, setReparenting] = useState(false)

  const fetchTree = useCallback(async (asOfStr: string | null) => {
    setLoading(true)
    setError(null)
    try {
      const url = asOfStr ? `/api/orgchart?asOf=${encodeURIComponent(asOfStr)}` : '/api/orgchart'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const data = (await res.json()) as OrgChartTree
      setTree(data)
      // si vacío, sugerir wizard
      if (data.units.length === 0 && !asOfStr) {
        setShowSeedWizard(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar el organigrama')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSnapshots = useCallback(async () => {
    try {
      const res = await fetch('/api/orgchart/snapshots', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { snapshots: OrgChartSnapshotDTO[] }
      setSnapshots(data.snapshots)
    } catch {
      /* ignore */
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    setAlertsLoading(true)
    setAlertsError(null)
    try {
      const res = await fetch('/api/orgchart/alerts', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Error al cargar alertas')
      setAlertsReport(data as OrgAlertsReportDTO)
    } catch (err) {
      setAlertsError(err instanceof Error ? err.message : 'Error al cargar alertas')
    } finally {
      setAlertsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTree(asOf)
  }, [asOf, fetchTree])

  useEffect(() => {
    fetchSnapshots()
  }, [fetchSnapshots])

  useEffect(() => {
    if (!asOf) fetchAlerts()
  }, [asOf, fetchAlerts])

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (isModuleTab(tab)) setActiveTab(tab)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setShowCommandPalette(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const changeTab = useCallback((tab: ModuleTab) => {
    setActiveTab(tab)
    setSelectedUnitId(null)
    setPendingReparent(null)
    const url = new URL(window.location.href)
    if (tab === 'organigrama') {
      url.searchParams.delete('tab')
    } else {
      url.searchParams.set('tab', tab)
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const applyCommandResult = useCallback((result: OrgCommandResult) => {
    setShowCommandPalette(false)
    changeTab(result.tab)
    setLens(result.lens)
    setShowDoctor(false)
    setShowAlerts(false)
    setPendingReparent(null)
    setSelectedUnitId(result.unitId)
  }, [changeTab])

  const openAssignRole = useCallback((unitId: string | null, roleType?: ComplianceRoleType) => {
    setAssignRoleRequest({ unitId, roleType })
  }, [])

  const runDoctor = useCallback(async () => {
    setDoctorLoading(true)
    try {
      const res = await fetch('/api/orgchart/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createTasks: false }),
      })
      if (!res.ok) throw new Error('Error al diagnosticar')
      const data = (await res.json()) as DoctorReport
      setDoctorReport(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al correr el diagnóstico')
    } finally {
      setDoctorLoading(false)
    }
  }, [])

  const runAlertMonitor = useCallback(async () => {
    setAlertMonitorLoading(true)
    try {
      const res = await fetch('/api/orgchart/alerts/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeMedium: false }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Error al crear tareas')
      const report = data as OrgAlertMonitorReportDTO
      setAlertMonitorReport(report)
      toast.success(`${report.created} tareas nuevas; ${report.skipped} ya estaban abiertas.`)
      await fetchAlerts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setAlertMonitorLoading(false)
    }
  }, [fetchAlerts])

  const takeSnapshot = useCallback(async () => {
    const label = window.prompt('Nombre del snapshot:', `Snapshot ${new Date().toLocaleDateString('es-PE')}`)
    if (!label) return
    const reason = window.prompt('Motivo (opcional):', '') || null
    try {
      const res = await fetch('/api/orgchart/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label, reason }),
      })
      if (!res.ok) throw new Error('Error al tomar snapshot')
      toast.success('Snapshot tomado y firmado con hash sha256.')
      fetchSnapshots()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }, [fetchSnapshots])

  const selectedUnit = useMemo(() => {
    if (!selectedUnitId || !tree) return null
    return tree.units.find(u => u.id === selectedUnitId) ?? null
  }, [selectedUnitId, tree])
  const structureAnalytics = useMemo(() => (tree ? buildStructureAnalytics(tree) : null), [tree])
  const isHistorical = Boolean(asOf)

  const requestReparentPosition = useCallback((positionId: string, newParentId: string) => {
    if (isHistorical || !tree) return
    if (positionId === newParentId) return
    const position = tree.positions.find(p => p.id === positionId)
    const newParent = tree.positions.find(p => p.id === newParentId)
    if (!position || !newParent) return
    if (wouldCreatePositionCycle(tree, positionId, newParentId)) {
      toast.error('No se puede mover: el destino es descendiente del cargo.')
      return
    }
    setPendingReparent({ positionId, newParentId })
  }, [isHistorical, tree])

  const confirmReparentPosition = useCallback(async () => {
    if (!pendingReparent || !tree) return
    setReparenting(true)
    try {
      const res = await fetch(`/api/orgchart/positions/${pendingReparent.positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsToPositionId: pendingReparent.newParentId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'No se pudo mover el cargo')
      }
      toast.success('Línea de mando actualizada')
      setPendingReparent(null)
      await fetchTree(asOf)
      fetchAlerts()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al mover el cargo')
    } finally {
      setReparenting(false)
    }
  }, [asOf, fetchAlerts, fetchTree, pendingReparent, tree])

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex h-full items-center justify-center text-slate-500">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      )
    }
    if (error) {
      return <div className="flex h-full items-center justify-center text-rose-600">{error}</div>
    }
    if (tree && tree.units.length === 0) {
      return (
        <EmptyState
          onSeed={() => setShowSeedWizard(true)}
          onCreate={() => setShowCreateUnit(true)}
          onImport={() => setShowImportExcel(true)}
          onTemplates={() => setShowTemplates(true)}
        />
      )
    }
    if (!tree) return null

    if (activeTab === 'directorio') {
      return <DirectoryView tree={tree} />
    }
    if (activeTab === 'areas-cargos') {
      return (
        <AreasPositionsView
          tree={tree}
          selectedUnitId={selectedUnitId}
          onSelectUnit={setSelectedUnitId}
          onCreateUnit={() => setShowCreateUnit(true)}
          onCreatePosition={setCreatePositionForUnitId}
          onEditPosition={setEditPositionId}
          lens={lens}
          readOnly={isHistorical}
        />
      )
    }
    if (activeTab === 'responsables') {
      return (
        <LegalResponsiblesView
          tree={tree}
          readOnly={isHistorical}
          onAssignRole={(roleType) => openAssignRole(null, roleType)}
        />
      )
    }
    if (activeTab === 'subordinacion') {
      return <SubordinationDossierView onFocusUnit={(unitId) => {
        setSelectedUnitId(unitId)
        changeTab('organigrama')
      }} />
    }
    if (activeTab === 'analitica') {
      return (
        <StructureAnalyticsView
          summary={structureAnalytics ?? buildStructureAnalytics(tree)}
          onFocusUnit={(unitId) => {
            setSelectedUnitId(unitId)
            changeTab('organigrama')
          }}
        />
      )
    }
    if (activeTab === 'historial') {
      return <ChangeHistoryView />
    }

    const canvas = (
      <OrgCanvas
        tree={tree}
        view={view}
        lens={lens}
        onSelectUnit={setSelectedUnitId}
        selectedUnitId={selectedUnitId}
        readOnly={isHistorical}
        onRequestReparentPosition={requestReparentPosition}
      />
    )

    if (view === 'committees') {
      return (
        <div className="flex h-full flex-col bg-slate-50">
          <CsstGovernancePanel tree={tree} />
          <div className="min-h-0 flex-1">{canvas}</div>
        </div>
      )
    }

    return canvas
  }

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Network className="h-5 w-5 text-emerald-600" />
            <h1 className="text-lg font-semibold text-slate-900">Organigrama</h1>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
              Compliance-First
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ViewToggle value={view} onChange={setView} />
            <LensToggle value={lens} onChange={setLens} />
            <button
              onClick={() => setShowCommandPalette(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
            <button
              onClick={() => setShowCreateUnit(true)}
              disabled={isHistorical}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
            >
              <Plus className="h-4 w-4" />
              Nueva unidad
            </button>
            <button
              onClick={() => setShowImportExcel(true)}
              disabled={isHistorical}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Importar Excel
            </button>
            <button
              onClick={() => setShowTemplates(true)}
              disabled={isHistorical}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              Plantillas
            </button>
            <button
              onClick={() => {
                setShowAlerts(true)
                setShowDoctor(false)
                setSelectedUnitId(null)
                fetchAlerts()
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100"
            >
              <AlertTriangle className="h-4 w-4" />
              Alertas
              {alertsReport && alertsReport.totals.open > 0 && (
                <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                  {alertsReport.totals.open > 99 ? '99+' : alertsReport.totals.open}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setShowDoctor(true)
                setShowAlerts(false)
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="h-4 w-4 text-emerald-600" />
              Org Doctor
            </button>
            <button
              onClick={() => setShowWhatIf(true)}
              disabled={isHistorical || !tree?.positions.length}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ListTree className="h-4 w-4" />
              What-If
            </button>
            <button
              onClick={() => setShowDrafts(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ScrollText className="h-4 w-4" />
              Escenarios
            </button>
            <button
              onClick={takeSnapshot}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Camera className="h-4 w-4" />
              Snapshot
            </button>
            <a
              href={`/api/orgchart/export-pdf${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ''}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              PDF
            </a>
            <a
              href={`/api/orgchart/rit${asOf ? `?asOf=${encodeURIComponent(asOf)}` : ''}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <ScrollText className="h-4 w-4" />
              RIT
            </a>
            <button
              onClick={() => setShowAuditorModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Link2 className="h-4 w-4" />
              Auditor Link
            </button>
          </div>
        </div>
        {/* Time travel */}
        {snapshots.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <History className="h-3.5 w-3.5" />
            <span>Time travel:</span>
            <select
              className="rounded-md border border-slate-200 px-2 py-1 text-xs"
              value={asOf ?? ''}
              onChange={e => setAsOf(e.target.value || null)}
            >
              <option value="">Estado actual</option>
              {snapshots.map(s => (
                <option key={s.id} value={s.createdAt}>
                  {new Date(s.createdAt).toLocaleDateString('es-PE')} · {s.label}
                </option>
              ))}
            </select>
            {asOf && (
              <button onClick={() => setAsOf(null)} className="text-emerald-600 hover:underline">
                Volver al actual
              </button>
            )}
            <button
              onClick={() => setShowSnapshotDiff(true)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-50"
            >
              <History className="h-3.5 w-3.5" />
              Comparar
            </button>
          </div>
        )}
        {isHistorical && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
            Vista histórica al {new Date(asOf!).toLocaleDateString('es-PE')} — solo lectura.
          </div>
        )}
        <ModuleTabs
          value={activeTab}
          onChange={changeTab}
          counts={{
            assigned: tree?.assignments.length ?? 0,
            units: tree?.units.length ?? 0,
            positions: tree?.positions.length ?? 0,
            roles: tree?.complianceRoles.length ?? 0,
            structureScore: structureAnalytics?.score ?? 100,
          }}
        />
      </div>

      {/* Body */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">{renderMainContent()}</div>
        {/* Drawer Alertas */}
        {showAlerts && (
          <div className="w-[420px] border-l border-slate-200">
            <OrgAlertsPanel
              report={alertsReport}
              loading={alertsLoading}
              error={alertsError}
              monitorReport={alertMonitorReport}
              monitorLoading={alertMonitorLoading}
              onRefresh={fetchAlerts}
              onCreateTasks={runAlertMonitor}
              onClose={() => setShowAlerts(false)}
            />
          </div>
        )}
        {/* Drawer Org Doctor */}
        {showDoctor && !showAlerts && (
          <div className="w-[380px] border-l border-slate-200">
            <OrgDoctorPanel
              report={doctorReport}
              loading={doctorLoading}
              onRun={runDoctor}
              onCreateTasks={runAlertMonitor}
              onClose={() => setShowDoctor(false)}
            />
          </div>
        )}
        {/* Drawer Unit Inspector */}
        {selectedUnit && !showDoctor && !showAlerts && (
          <UnitInspector
            unit={selectedUnit}
            tree={tree!}
            onClose={() => setSelectedUnitId(null)}
            onChanged={() => {
              fetchTree(asOf)
              fetchAlerts()
            }}
            onCreatePosition={(unitId) => setCreatePositionForUnitId(unitId)}
            onEditPosition={setEditPositionId}
            onAssignWorker={(positionId) => setAssignWorkerForPositionId(positionId)}
            onAssignRole={(unitId) => openAssignRole(unitId)}
            readOnly={isHistorical}
          />
        )}
      </div>

      {showCommandPalette && tree && (
        <CommandPaletteModal
          tree={tree}
          onClose={() => setShowCommandPalette(false)}
          onSelect={applyCommandResult}
        />
      )}
      {showSeedWizard && (
        <SeedWizard
          onClose={() => setShowSeedWizard(false)}
          onDone={() => {
            fetchTree(null)
            fetchAlerts()
          }}
        />
      )}
      {showImportExcel && !isHistorical && (
        <ImportExcelModal
          onClose={() => setShowImportExcel(false)}
          onDone={() => {
            setShowImportExcel(false)
            fetchTree(null)
            fetchSnapshots()
            fetchAlerts()
          }}
        />
      )}
      {showTemplates && !isHistorical && (
        <TemplateLibraryModal
          onClose={() => setShowTemplates(false)}
          onDone={() => {
            setShowTemplates(false)
            fetchTree(null)
            fetchSnapshots()
            fetchAlerts()
          }}
        />
      )}
      {showSnapshotDiff && snapshots.length > 0 && (
        <SnapshotDiffModal snapshots={snapshots} onClose={() => setShowSnapshotDiff(false)} />
      )}
      {showWhatIf && tree && !isHistorical && (
        <WhatIfModal
          tree={tree}
          onClose={() => setShowWhatIf(false)}
          onSaved={() => setShowDrafts(true)}
          onApply={(positionId, newParentId) => {
            setShowWhatIf(false)
            setPendingReparent({ positionId, newParentId })
          }}
        />
      )}
      {showDrafts && (
        <WhatIfDraftsModal
          onClose={() => setShowDrafts(false)}
          onApplied={() => {
            setShowDrafts(false)
            fetchTree(null)
            fetchAlerts()
            fetchSnapshots()
          }}
        />
      )}
      {showAuditorModal && tree && <AuditorLinkModal onClose={() => setShowAuditorModal(false)} />}
      {showCreateUnit && tree && !isHistorical && (
        <CreateUnitModal
          existingUnits={tree.units}
          onClose={() => setShowCreateUnit(false)}
          onCreated={() => {
            setShowCreateUnit(false)
            fetchTree(asOf)
            fetchAlerts()
          }}
        />
      )}
      {createPositionForUnitId && tree && !isHistorical && (
        <PositionFormModal
          unitId={createPositionForUnitId}
          unitName={tree.units.find(u => u.id === createPositionForUnitId)?.name ?? 'unidad'}
          allPositions={tree.positions}
          units={tree.units}
          onClose={() => setCreatePositionForUnitId(null)}
          onCreated={() => {
            setCreatePositionForUnitId(null)
            fetchTree(asOf)
            fetchAlerts()
          }}
        />
      )}
      {editPositionId && tree && !isHistorical && (
        <PositionFormModal
          unitId={tree.positions.find(p => p.id === editPositionId)?.orgUnitId ?? ''}
          unitName={tree.units.find(u => u.id === tree.positions.find(p => p.id === editPositionId)?.orgUnitId)?.name ?? 'unidad'}
          position={tree.positions.find(p => p.id === editPositionId) ?? null}
          allPositions={tree.positions}
          units={tree.units}
          onClose={() => setEditPositionId(null)}
          onCreated={() => {
            setEditPositionId(null)
            fetchTree(asOf)
            fetchAlerts()
          }}
        />
      )}
      {assignWorkerForPositionId && tree && !isHistorical && (
        <AssignWorkerModal
          positionId={assignWorkerForPositionId}
          positionTitle={tree.positions.find(p => p.id === assignWorkerForPositionId)?.title ?? 'cargo'}
          onClose={() => setAssignWorkerForPositionId(null)}
          onAssigned={() => {
            setAssignWorkerForPositionId(null)
            fetchTree(asOf)
            fetchAlerts()
          }}
        />
      )}
      {assignRoleRequest && tree && !isHistorical && (
        <AssignComplianceRoleModal
          unitId={assignRoleRequest.unitId}
          unitName={assignRoleRequest.unitId ? tree.units.find(u => u.id === assignRoleRequest.unitId)?.name ?? 'unidad' : 'organizacion'}
          initialRoleType={assignRoleRequest.roleType}
          onClose={() => setAssignRoleRequest(null)}
          onAssigned={() => {
            setAssignRoleRequest(null)
            fetchTree(asOf)
            fetchAlerts()
          }}
        />
      )}
      {pendingReparent && tree && (
        <ReparentPositionModal
          tree={tree}
          request={pendingReparent}
          loading={reparenting}
          onCancel={() => setPendingReparent(null)}
          onConfirm={confirmReparentPosition}
        />
      )}
    </div>
  )
}

// ─── ViewToggle ──────────────────────────────────────────────────────────────
function ViewToggle({ value, onChange }: { value: View; onChange: (v: View) => void }) {
  const items: { key: View; label: string; icon: typeof Network }[] = [
    { key: 'hierarchy', label: 'Jerárquica', icon: Network },
    { key: 'committees', label: 'Comités legales', icon: ShieldCheck },
  ]
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {items.map(it => {
        const Icon = it.icon
        const active = value === it.key
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition ${
              active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {it.label}
          </button>
        )
      })}
    </div>
  )
}

function LensToggle({ value, onChange }: { value: OrgLens; onChange: (v: OrgLens) => void }) {
  const items: { key: OrgLens; label: string; icon: typeof Network }[] = [
    { key: 'general', label: 'General', icon: Network },
    { key: 'mof', label: 'MOF', icon: ScrollText },
    { key: 'compliance', label: 'Compliance', icon: CheckCircle2 },
    { key: 'contractual', label: 'Contractual', icon: Briefcase },
    { key: 'sst', label: 'SST', icon: ShieldCheck },
    { key: 'vacancies', label: 'Vacantes', icon: AlertTriangle },
  ]
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
      {items.map(item => {
        const Icon = item.icon
        const active = value === item.key
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition ${
              active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

function isModuleTab(value: string | null): value is ModuleTab {
  return (
    value === 'organigrama' ||
    value === 'directorio' ||
    value === 'areas-cargos' ||
    value === 'responsables' ||
    value === 'subordinacion' ||
    value === 'analitica' ||
    value === 'historial'
  )
}

function ModuleTabs({
  value,
  onChange,
  counts,
}: {
  value: ModuleTab
  onChange: (tab: ModuleTab) => void
  counts: { assigned: number; units: number; positions: number; roles: number; structureScore: number }
}) {
  const items: Array<{ key: ModuleTab; label: string; meta: string; icon: typeof Network }> = [
    { key: 'organigrama', label: 'Organigrama', meta: `${counts.units} áreas`, icon: Network },
    { key: 'directorio', label: 'Directorio', meta: `${counts.assigned} asignados`, icon: FileSpreadsheet },
    { key: 'areas-cargos', label: 'Áreas y cargos', meta: `${counts.positions} cargos`, icon: ListTree },
    { key: 'responsables', label: 'Responsables', meta: `${counts.roles} roles`, icon: ShieldCheck },
    { key: 'subordinacion', label: 'Subordinación', meta: 'Civil', icon: AlertTriangle },
    { key: 'analitica', label: 'Analítica', meta: `${counts.structureScore}/100`, icon: Sparkles },
    { key: 'historial', label: 'Historial', meta: 'Auditoría', icon: History },
  ]

  return (
    <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">
      {items.map(item => {
        const Icon = item.icon
        const active = value === item.key
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex min-w-fit items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition ${
              active
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              {item.meta}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function CsstGovernancePanel({ tree }: { tree: OrgChartTree }) {
  const workerIds = new Set(tree.assignments.map(assignment => assignment.workerId))
  const roles = tree.complianceRoles.filter(role => {
    const def = COMPLIANCE_ROLES[role.roleType]
    return def.committeeKind === 'COMITE_SST' || role.roleType === 'SUPERVISOR_SST'
  })
  const count = (roleType: ComplianceRoleType) => roles.filter(role => role.roleType === roleType).length
  const president = count('PRESIDENTE_COMITE_SST')
  const secretary = count('SECRETARIO_COMITE_SST')
  const workerReps = count('REPRESENTANTE_TRABAJADORES_SST')
  const employerReps = count('REPRESENTANTE_EMPLEADOR_SST')
  const supervisors = count('SUPERVISOR_SST')
  const generatedAtMs = new Date(tree.generatedAt).getTime()
  const nowMs = Number.isNaN(generatedAtMs) ? 0 : generatedAtMs
  const expired = roles.filter(role => role.endsAt && new Date(role.endsAt).getTime() < nowMs).length
  const expiring = roles.filter(role => {
    if (!role.endsAt) return false
    const diff = new Date(role.endsAt).getTime() - nowMs
    return diff >= 0 && diff <= 60 * 24 * 60 * 60 * 1000
  }).length
  const needsCommittee = workerIds.size > 20
  const missing = needsCommittee
    ? [
        president === 0 ? 'Presidente' : null,
        secretary === 0 ? 'Secretario' : null,
        workerReps === 0 ? 'Representantes de trabajadores' : null,
        employerReps === 0 ? 'Representantes del empleador' : null,
        workerReps < employerReps ? 'Paridad trabajador/empleador' : null,
      ].filter(Boolean)
    : [supervisors === 0 ? 'Supervisor SST' : null].filter(Boolean)
  const statusOk = missing.length === 0 && expired === 0

  return (
    <div className="border-b border-slate-200 bg-white px-6 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h2 className="text-sm font-semibold text-slate-900">CSST</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusOk ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
              {statusOk ? 'Completo' : 'Incompleto'}
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {needsCommittee ? 'Comité SST requerido' : 'Supervisor SST requerido'} · {workerIds.size} trabajador(es) en organigrama
          </div>
        </div>

        <CsstMetric label="Pres." value={president} />
        <CsstMetric label="Sec." value={secretary} />
        <CsstMetric label="Rep. trab." value={workerReps} highlight={workerReps < employerReps} />
        <CsstMetric label="Rep. emp." value={employerReps} />
        <CsstMetric label="Supervisor" value={supervisors} highlight={!needsCommittee && supervisors === 0} />
        <CsstMetric label="Vencidos" value={expired} highlight={expired > 0} />
        <CsstMetric label="Por vencer" value={expiring} highlight={expiring > 0} />

        {missing.length > 0 && (
          <div className="ml-auto max-w-md rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Falta: {missing.join(', ')}
          </div>
        )}
      </div>
    </div>
  )
}

function CsstMetric({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className={`text-sm font-bold ${highlight ? 'text-amber-800' : 'text-slate-900'}`}>{value}</div>
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
    </div>
  )
}

function StructureAnalyticsView({
  summary,
  onFocusUnit,
}: {
  summary: ReturnType<typeof buildStructureAnalytics>
  onFocusUnit: (unitId: string) => void
}) {
  const [spanFilter, setSpanFilter] = useState<'all' | SpanSeverity>('all')
  const [unitFilter, setUnitFilter] = useState<'all' | StructureHealth>('all')
  const visibleSpans = summary.spanRecords.filter(record => spanFilter === 'all' || record.severity === spanFilter)
  const visibleUnits = summary.unitScores.filter(unit => unitFilter === 'all' || unit.health === unitFilter)

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Analítica estructural</h2>
          <div className="mt-1 text-xs text-slate-500">
            Score ejecutivo, span de control, vacantes, MOF y salud por área.
          </div>
        </div>
        <div className={`ml-auto rounded-lg border px-4 py-3 ${structureHealthSurface(summary.health)}`}>
          <div className="text-2xl font-semibold">{summary.score}/100</div>
          <div className="text-xs font-medium opacity-75">{structureHealthLabel(summary.health)}</div>
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <AnalyticsMetric label="Jefaturas" value={summary.totals.managers} detail={`${summary.totals.averageSpan} reportes promedio`} />
        <AnalyticsMetric
          label="Span alto"
          value={summary.totals.overloadedManagers}
          detail={`${summary.totals.criticalManagers} crítico(s)`}
          tone={summary.totals.overloadedManagers ? 'amber' : 'emerald'}
        />
        <AnalyticsMetric
          label="Vacantes"
          value={summary.totals.vacancies}
          detail={`${formatPercent(summary.totals.vacancyRate)} de cupos`}
          tone={summary.totals.vacancies ? 'amber' : 'emerald'}
        />
        <AnalyticsMetric
          label="MOF pendiente"
          value={summary.totals.missingMof}
          detail={`${formatPercent(summary.totals.missingMofRate)} de cargos`}
          tone={summary.totals.missingMof ? 'rose' : 'emerald'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Riesgos prioritarios</h3>
              <div className="mt-0.5 text-xs text-slate-500">{summary.topRisks.length} riesgo(s) estructurales priorizados</div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {summary.topRisks.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">Sin riesgos estructurales relevantes.</div>
            ) : (
              summary.topRisks.map(risk => (
                <div key={risk.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${spanSeverityClass(risk.severity)}`}>
                      {spanSeverityLabel(risk.severity)}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">{risk.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{risk.description}</p>
                  {risk.unitId && (
                    <button
                      onClick={() => onFocusUnit(risk.unitId!)}
                      className="mt-2 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                    >
                      Ver área
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Span de control</h3>
              <div className="mt-0.5 text-xs text-slate-500">Jefaturas ordenadas por reportes directos.</div>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {(['all', 'watch', 'high', 'critical'] as Array<'all' | SpanSeverity>).map(item => (
                <button
                  key={item}
                  onClick={() => setSpanFilter(item)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    spanFilter === item
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {item === 'all' ? 'Todos' : spanSeverityLabel(item)}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {visibleSpans.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-slate-500">Sin jefaturas para este filtro.</div>
            ) : (
              visibleSpans.map(record => (
                <SpanControlRow key={record.positionId} record={record} onFocusUnit={onFocusUnit} />
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Score por área</h3>
            <div className="mt-0.5 text-xs text-slate-500">Áreas ordenadas por menor salud estructural.</div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            {(['all', 'critical', 'attention', 'stable', 'excellent'] as Array<'all' | StructureHealth>).map(item => (
              <button
                key={item}
                onClick={() => setUnitFilter(item)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  unitFilter === item
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item === 'all' ? 'Todas' : structureHealthLabel(item)}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {visibleUnits.map(unit => (
            <UnitStructureScoreRow key={unit.unitId} unit={unit} onFocusUnit={onFocusUnit} />
          ))}
        </div>
      </section>
    </div>
  )
}

function AnalyticsMetric({
  label,
  value,
  detail,
  tone = 'slate',
}: {
  label: string
  value: number | string
  detail: string
  tone?: 'emerald' | 'amber' | 'rose' | 'slate'
}) {
  const classes = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-white text-slate-800',
  }[tone]
  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium opacity-75">{label}</div>
      <div className="mt-2 text-[11px] opacity-70">{detail}</div>
    </div>
  )
}

function SpanControlRow({ record, onFocusUnit }: { record: SpanControlRecord; onFocusUnit: (unitId: string) => void }) {
  return (
    <div className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{record.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${spanSeverityClass(record.severity)}`}>
            {spanSeverityLabel(record.severity)}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {record.unitName} · {record.occupantNames.length ? record.occupantNames.join(', ') : 'Sin ocupante'} · profundidad {record.depth}
        </div>
        <p className="mt-2 text-xs text-slate-600">{record.recommendation}</p>
      </div>
      <div className="flex items-center justify-between gap-4 md:justify-end">
        <div className="text-right">
          <div className="text-lg font-semibold text-slate-900">{record.directReports}</div>
          <div className="text-[10px] font-medium uppercase text-slate-500">directos</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold text-slate-900">{record.totalSubtree}</div>
          <div className="text-[10px] font-medium uppercase text-slate-500">subárbol</div>
        </div>
        <button
          onClick={() => onFocusUnit(record.unitId)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Ver
        </button>
      </div>
    </div>
  )
}

function UnitStructureScoreRow({ unit, onFocusUnit }: { unit: UnitStructureScore; onFocusUnit: (unitId: string) => void }) {
  return (
    <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(240px,1fr)_2fr_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{unit.unitName}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${structureHealthPill(unit.health)}`}>
            {structureHealthLabel(unit.health)}
          </span>
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {unit.positions} cargos · {unit.occupants} ocupantes · nivel {unit.level}
        </div>
      </div>
      <div className="grid gap-2 text-xs sm:grid-cols-4">
        <UnitMiniMetric label="Score" value={`${unit.score}/100`} />
        <UnitMiniMetric label="Vacantes" value={`${unit.vacancies} (${formatPercent(unit.vacancyRate)})`} />
        <UnitMiniMetric label="MOF" value={`${unit.missingMof} pend.`} />
        <UnitMiniMetric label="Span máx." value={unit.maxSpan} />
      </div>
      <div className="flex flex-col items-start gap-2 lg:items-end">
        {unit.flags.length > 0 ? (
          <div className="max-w-md text-xs text-slate-500">{unit.flags.join(' · ')}</div>
        ) : (
          <div className="text-xs text-emerald-700">Sin alertas estructurales.</div>
        )}
        <button
          onClick={() => onFocusUnit(unit.unitId)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          Ver área
        </button>
      </div>
    </div>
  )
}

function UnitMiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="font-semibold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase text-slate-500">{label}</div>
    </div>
  )
}

function structureHealthLabel(health: StructureHealth) {
  if (health === 'excellent') return 'Excelente'
  if (health === 'stable') return 'Estable'
  if (health === 'attention') return 'Atención'
  return 'Crítico'
}

function structureHealthPill(health: StructureHealth) {
  if (health === 'excellent') return 'bg-emerald-100 text-emerald-700'
  if (health === 'stable') return 'bg-sky-100 text-sky-700'
  if (health === 'attention') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

function structureHealthSurface(health: StructureHealth) {
  if (health === 'excellent') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  if (health === 'stable') return 'border-sky-200 bg-sky-50 text-sky-800'
  if (health === 'attention') return 'border-amber-200 bg-amber-50 text-amber-800'
  return 'border-rose-200 bg-rose-50 text-rose-800'
}

function spanSeverityLabel(severity: SpanSeverity) {
  if (severity === 'healthy') return 'Saludable'
  if (severity === 'watch') return 'Vigilar'
  if (severity === 'high') return 'Alto'
  return 'Crítico'
}

function spanSeverityClass(severity: SpanSeverity) {
  if (severity === 'healthy') return 'bg-emerald-100 text-emerald-700'
  if (severity === 'watch') return 'bg-sky-100 text-sky-700'
  if (severity === 'high') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function LegalResponsiblesView({
  tree,
  readOnly,
  onAssignRole,
}: {
  tree: OrgChartTree
  readOnly: boolean
  onAssignRole: (roleType: ComplianceRoleType) => void
}) {
  const [filter, setFilter] = useState<'all' | LegalResponsibilityStatus>('all')
  const [search, setSearch] = useState('')
  const summary = useMemo(() => buildLegalResponsiblesSummary(tree), [tree])
  const filters: Array<{ key: 'all' | LegalResponsibilityStatus; label: string; count: number }> = [
    { key: 'all', label: 'Todos', count: summary.totals.catalogRoleTypes },
    { key: 'missing', label: 'Sin titular', count: summary.totals.missingRoleTypes },
    { key: 'expiring', label: 'Por vencer', count: summary.totals.expiringSoon },
    { key: 'orphaned', label: 'Sin cargo', count: summary.totals.orphaned },
  ]

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Responsables legales</h2>
          <div className="mt-1 text-xs text-slate-500">
            Matriz viva de comites, brigadas y responsables individuales del organigrama.
          </div>
        </div>
        <div className="relative ml-auto min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar rol, titular, base legal..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-4">
        <ResponsiblesMetric label="Designaciones" value={summary.totals.assignedRoles} tone="emerald" />
        <ResponsiblesMetric label="Roles cubiertos" value={`${summary.totals.coveredRoleTypes}/${summary.totals.catalogRoleTypes}`} tone="sky" />
        <ResponsiblesMetric label="Por vencer 30d" value={summary.totals.expiringSoon} tone={summary.totals.expiringSoon ? 'amber' : 'slate'} />
        <ResponsiblesMetric label="Sin cargo activo" value={summary.totals.orphaned} tone={summary.totals.orphaned ? 'rose' : 'slate'} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filter === item.key
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {item.label}
            <span className="ml-1 text-[10px] opacity-70">{item.count}</span>
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {summary.groups.map(group => {
          const items = group.items.filter(item => matchesResponsibility(item, search, filter))
          if (items.length === 0) return null
          return (
            <section key={group.key} className="rounded-lg border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{group.label}</h3>
                  <div className="mt-0.5 text-xs text-slate-500">{group.description}</div>
                </div>
                <div className="ml-auto flex gap-2 text-[10px] font-semibold uppercase text-slate-500">
                  <span>{group.totals.covered} cubiertos</span>
                  <span>{group.totals.missing} sin titular</span>
                  <span>{group.totals.expiring} por vencer</span>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map(item => (
                  <LegalResponsibilityRow
                    key={item.roleType}
                    item={item}
                    readOnly={readOnly}
                    onAssignRole={onAssignRole}
                  />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function ResponsiblesMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate'
}) {
  const classes = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-white text-slate-800',
  }[tone]
  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium opacity-75">{label}</div>
    </div>
  )
}

function LegalResponsibilityRow({
  item,
  readOnly,
  onAssignRole,
}: {
  item: LegalResponsibilityItem
  readOnly: boolean
  onAssignRole: (roleType: ComplianceRoleType) => void
}) {
  return (
    <div className="grid gap-3 px-4 py-3 lg:grid-cols-[minmax(260px,1fr)_minmax(320px,1.5fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{item.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${responsibilityStatusClass(item.status)}`}>
            {responsibilityStatusLabel(item.status)}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.description}</p>
        <div className="mt-2 font-mono text-[10px] text-slate-500">{item.baseLegal}</div>
      </div>

      <div className="min-w-0 space-y-2">
        {item.holders.length === 0 ? (
          <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Sin titular registrado para este rol.
          </div>
        ) : (
          item.holders.map(holder => (
            <div key={holder.roleId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-800">{holder.workerName}</span>
                <span className="text-slate-500">{holder.unitName ?? 'Alcance organizacion'}</span>
                {!holder.hasActivePosition && (
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                    Sin cargo activo
                  </span>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-slate-500">
                <span>Desde {formatResponsibilityDate(holder.startsAt)}</span>
                <span>{holder.endsAt ? `Vence ${formatResponsibilityDate(holder.endsAt)}` : 'Sin vencimiento'}</span>
                {holder.daysToExpiry !== null && holder.daysToExpiry <= 30 && holder.daysToExpiry >= 0 && (
                  <span className="font-semibold text-amber-700">{holder.daysToExpiry} dias restantes</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex items-start justify-end">
        {!readOnly && (
          <button
            onClick={() => onAssignRole(item.roleType)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Asignar
          </button>
        )}
      </div>
    </div>
  )
}

function matchesResponsibility(
  item: LegalResponsibilityItem,
  search: string,
  filter: 'all' | LegalResponsibilityStatus,
) {
  if (filter !== 'all' && item.status !== filter) return false
  const query = search.trim().toLowerCase()
  if (!query) return true
  const text = [
    item.label,
    item.shortLabel,
    item.description,
    item.baseLegal,
    item.roleType,
    ...item.holders.flatMap(holder => [holder.workerName, holder.unitName ?? '']),
  ].join(' ').toLowerCase()
  return text.includes(query)
}

function responsibilityStatusLabel(status: LegalResponsibilityStatus) {
  if (status === 'covered') return 'Cubierto'
  if (status === 'missing') return 'Sin titular'
  if (status === 'expiring') return 'Por vencer'
  if (status === 'expired') return 'Vencido'
  return 'Sin cargo'
}

function responsibilityStatusClass(status: LegalResponsibilityStatus) {
  if (status === 'covered') return 'bg-emerald-100 text-emerald-700'
  if (status === 'missing') return 'bg-amber-100 text-amber-700'
  if (status === 'expiring') return 'bg-orange-100 text-orange-700'
  if (status === 'expired') return 'bg-rose-100 text-rose-700'
  return 'bg-slate-200 text-slate-700'
}

function formatResponsibilityDate(value: string) {
  return new Date(value).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SubordinationDossierView({ onFocusUnit }: { onFocusUnit: (unitId: string) => void }) {
  const [dossier, setDossier] = useState<SubordinationDossier | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncReport, setSyncReport] = useState<SubordinationRiskSyncReportDTO | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | SubordinationSeverity>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/orgchart/subordination', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo cargar el expediente')
      setDossier(data as SubordinationDossier)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar subordinacion')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const syncRiskEngine = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/orgchart/subordination/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createTasks: true }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo sincronizar con Risk Engine')
      setSyncReport(data as SubordinationRiskSyncReportDTO)
      toast.success(`Risk Engine actualizado: ${data.eventsCreated} evento(s), ${data.tasksCreated} tarea(s)`)
      await load()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al sincronizar subordinacion'
      setError(message)
      toast.error(message)
    } finally {
      setSyncing(false)
    }
  }, [load])

  const cases = dossier?.cases.filter(item => filter === 'all' || item.severity === filter) ?? []
  const filters: Array<{ key: 'all' | SubordinationSeverity; label: string; count: number }> = [
    { key: 'all', label: 'Todos', count: dossier?.summary.providers ?? 0 },
    { key: 'CRITICAL', label: 'Critico', count: dossier?.summary.critical ?? 0 },
    { key: 'HIGH', label: 'Alto', count: dossier?.summary.high ?? 0 },
    { key: 'MEDIUM', label: 'Medio', count: dossier?.summary.medium ?? 0 },
    { key: 'LOW', label: 'Bajo', count: dossier?.summary.low ?? 0 },
    { key: 'CLEAR', label: 'Sin senal', count: dossier?.summary.clear ?? 0 },
  ]

  return (
    <div className="h-full overflow-y-auto bg-slate-50 p-6">
      <div className="mb-5 flex flex-wrap items-start gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Expediente de subordinación</h2>
          <div className="mt-1 text-xs text-slate-500">
            Prestadores civiles cruzados con organigrama, indicadores laborales y payload para riesgo.
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
          Actualizar
        </button>
        <button
          onClick={syncRiskEngine}
          disabled={loading || syncing || !dossier?.summary.providers}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Enviar a riesgo
        </button>
      </div>

      {loading ? (
        <div className="flex h-56 items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Construyendo expediente...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : !dossier ? null : (
        <>
          {syncReport && (
            <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Risk Engine {syncReport.eventCode}: {syncReport.considered} caso(s) evaluado(s), {syncReport.eventsCreated} evento(s)
              nuevo(s), {syncReport.scoresUpdated} score(s) persistido(s) y {syncReport.tasksCreated} tarea(s) de remediacion.
            </div>
          )}

          <div className="mb-5 grid gap-3 md:grid-cols-4">
            <SubordinationMetric label="Prestadores" value={dossier.summary.providers} tone="slate" />
            <SubordinationMetric label="Críticos/altos" value={dossier.summary.critical + dossier.summary.high} tone={dossier.summary.critical + dossier.summary.high ? 'rose' : 'emerald'} />
            <SubordinationMetric label="Mapeados a áreas" value={`${dossier.summary.mappedToOrgUnits}/${dossier.summary.providers}`} tone="sky" />
            <SubordinationMetric label="Gasto civil en riesgo" value={formatCurrency(dossier.summary.estimatedMonthlyCivilSpendAtRisk)} tone={dossier.summary.estimatedMonthlyCivilSpendAtRisk ? 'amber' : 'slate'} />
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {filters.map(item => (
              <button
                key={item.key}
                onClick={() => setFilter(item.key)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  filter === item.key
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {item.label}
                <span className="ml-1 text-[10px] opacity-70">{item.count}</span>
              </button>
            ))}
          </div>

          {cases.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
              No hay prestadores para este filtro.
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map(item => (
                <SubordinationCaseRow key={item.providerId} item={item} onFocusUnit={onFocusUnit} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function SubordinationMetric({
  label,
  value,
  tone,
}: {
  label: string
  value: number | string
  tone: 'emerald' | 'sky' | 'amber' | 'rose' | 'slate'
}) {
  const classes = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    sky: 'border-sky-200 bg-sky-50 text-sky-800',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
    slate: 'border-slate-200 bg-white text-slate-800',
  }[tone]
  return (
    <div className={`rounded-lg border p-4 ${classes}`}>
      <div className="text-xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-medium opacity-75">{label}</div>
    </div>
  )
}

function SubordinationCaseRow({
  item,
  onFocusUnit,
}: {
  item: SubordinationDossier['cases'][number]
  onFocusUnit: (unitId: string) => void
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">{item.providerName}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${subordinationSeverityClass(item.severity)}`}>
              {subordinationSeverityLabel(item.severity)}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {item.score}/100
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{item.document} · {item.serviceDescription}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-medium text-slate-500">
            <span>{item.areaName ?? 'Sin area declarada'}</span>
            <span>{formatCurrency(item.monthlyAmount)} / mes</span>
            <span>{item.evidence.invoiceCount} RH</span>
            {!item.evidence.hasContractFile && <span className="text-amber-700">Sin contrato adjunto</span>}
          </div>
        </div>

        {item.unitId && (
          <button
            onClick={() => onFocusUnit(item.unitId!)}
            className="ml-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver área
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)]">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Indicadores probatorios</div>
          <div className="flex flex-wrap gap-2">
            {item.indicators.map(indicator => (
              <span
                key={indicator.code}
                title={indicator.legalMeaning}
                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                  indicator.present ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {indicator.label}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase text-slate-500">Acción inmediata</div>
          <ul className="space-y-1 text-xs text-slate-600">
            {item.recommendedActions.slice(0, 3).map(action => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function subordinationSeverityLabel(severity: SubordinationSeverity) {
  if (severity === 'CRITICAL') return 'Crítico'
  if (severity === 'HIGH') return 'Alto'
  if (severity === 'MEDIUM') return 'Medio'
  if (severity === 'LOW') return 'Bajo'
  return 'Sin señal'
}

function subordinationSeverityClass(severity: SubordinationSeverity) {
  if (severity === 'CRITICAL') return 'bg-rose-100 text-rose-700'
  if (severity === 'HIGH') return 'bg-orange-100 text-orange-700'
  if (severity === 'MEDIUM') return 'bg-amber-100 text-amber-800'
  if (severity === 'LOW') return 'bg-sky-100 text-sky-700'
  return 'bg-emerald-100 text-emerald-700'
}

function CommandPaletteModal({
  tree,
  onClose,
  onSelect,
}: {
  tree: OrgChartTree
  onClose: () => void
  onSelect: (result: OrgCommandResult) => void
}) {
  const [query, setQuery] = useState('')
  const results = useMemo(() => buildOrgCommandResults(tree, query, 14), [query, tree])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/35 px-4 pt-[12vh] backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            autoFocus
            placeholder="Buscar persona, cargo, area, responsables, analitica, MOF, SST..."
            className="min-w-0 flex-1 border-0 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">Sin resultados.</div>
          ) : (
            results.map(result => (
              <button
                key={result.id}
                onClick={() => onSelect(result)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${commandIconClass(result.kind)}`}>
                  {commandKindIcon(result.kind)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-900">{result.title}</span>
                  <span className="block truncate text-xs text-slate-500">{result.subtitle}</span>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
                  {commandLensLabel(result.lens)}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function commandKindIcon(kind: OrgCommandResult['kind']) {
  if (kind === 'worker') return <UserPlus className="h-4 w-4" />
  if (kind === 'position') return <Briefcase className="h-4 w-4" />
  if (kind === 'unit') return <Building2 className="h-4 w-4" />
  if (kind === 'role') return <ShieldCheck className="h-4 w-4" />
  return <Sparkles className="h-4 w-4" />
}

function commandIconClass(kind: OrgCommandResult['kind']) {
  if (kind === 'worker') return 'bg-sky-50 text-sky-700'
  if (kind === 'position') return 'bg-emerald-50 text-emerald-700'
  if (kind === 'unit') return 'bg-violet-50 text-violet-700'
  if (kind === 'role') return 'bg-indigo-50 text-indigo-700'
  return 'bg-amber-50 text-amber-700'
}

function commandLensLabel(lens: OrgCommandResult['lens']) {
  if (lens === 'mof') return 'MOF'
  if (lens === 'compliance') return 'Compliance'
  if (lens === 'contractual') return 'Contractual'
  if (lens === 'sst') return 'SST'
  if (lens === 'vacancies') return 'Vacantes'
  return 'General'
}

function OrgAlertsPanel({
  report,
  loading,
  error,
  monitorReport,
  monitorLoading,
  onRefresh,
  onCreateTasks,
  onClose,
}: {
  report: OrgAlertsReportDTO | null
  loading: boolean
  error: string | null
  monitorReport: OrgAlertMonitorReportDTO | null
  monitorLoading: boolean
  onRefresh: () => void
  onCreateTasks: () => Promise<void>
  onClose: () => void
}) {
  const alerts = report?.alerts ?? []
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <h2 className="text-sm font-semibold text-slate-900">Alertas organizacionales</h2>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {report ? `${report.totals.open} abiertas · salud ${report.scoreOrgHealth}/100` : 'Sin diagnóstico cargado'}
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200 px-4 py-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
          Actualizar
        </button>
        <button
          onClick={() => {
            void onCreateTasks()
          }}
          disabled={alerts.length === 0 || monitorLoading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {monitorLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Generar tareas
        </button>
      </div>

      {monitorReport && (
        <div className="border-b border-slate-200 bg-emerald-50 px-4 py-2 text-xs text-emerald-800">
          Ultimo monitor: {monitorReport.created} nueva(s), {monitorReport.skipped} ya abierta(s), {monitorReport.considered} evaluada(s).
        </div>
      )}

      {report && (
        <div className="grid grid-cols-4 gap-2 border-b border-slate-200 px-4 py-3">
          <AlertTotal label="Críticas" value={report.totals.critical} tone="critical" />
          <AlertTotal label="Altas" value={report.totals.high} tone="high" />
          <AlertTotal label="Medias" value={report.totals.medium} tone="medium" />
          <AlertTotal label="Bajas" value={report.totals.low} tone="low" />
        </div>
      )}

      <div className="flex-1 overflow-auto bg-slate-50 p-3">
        {error && <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        {loading && !report ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando alertas...
          </div>
        ) : alerts.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500">
            No hay alertas activas.
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${alertSeverityClass(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {alertCategoryLabel(alert.category)}
                  </span>
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">{alert.title}</div>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{alert.description}</p>
                {alert.suggestedFix && (
                  <div className="mt-2 rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-800">
                    {alert.suggestedFix}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-400">
                  <span>{alert.sourceRule}</span>
                  {alert.affectedUnitIds.length > 0 && <span>{alert.affectedUnitIds.length} unidad(es)</span>}
                  {alert.affectedWorkerIds.length > 0 && <span>{alert.affectedWorkerIds.length} trabajador(es)</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AlertTotal({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'critical' | 'high' | 'medium' | 'low'
}) {
  const toneClass = {
    critical: 'text-rose-700',
    high: 'text-orange-700',
    medium: 'text-amber-700',
    low: 'text-slate-700',
  }[tone]
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-2 text-center">
      <div className={`text-base font-bold ${toneClass}`}>{value}</div>
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
    </div>
  )
}

function alertSeverityClass(severity: OrgAlertSeverity) {
  if (severity === 'CRITICAL') return 'bg-rose-100 text-rose-700'
  if (severity === 'HIGH') return 'bg-orange-100 text-orange-700'
  if (severity === 'MEDIUM') return 'bg-amber-100 text-amber-800'
  return 'bg-slate-100 text-slate-700'
}

function alertCategoryLabel(category: OrgAlertCategory) {
  const labels: Record<OrgAlertCategory, string> = {
    MOF: 'MOF',
    SST: 'SST',
    LEGAL_ROLE: 'Rol legal',
    VACANCY: 'Vacante',
    SUBORDINATION: 'Subordinación',
    SUCCESSION: 'Sucesión',
    STRUCTURE: 'Estructura',
  }
  return labels[category]
}

function ReparentPositionModal({
  tree,
  request,
  loading,
  onCancel,
  onConfirm,
}: {
  tree: OrgChartTree
  request: PendingReparent
  loading: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))
  const unitsById = new Map(tree.units.map(unit => [unit.id, unit]))
  const moved = positionsById.get(request.positionId)
  const newParent = positionsById.get(request.newParentId)
  const currentParent = moved?.reportsToPositionId ? positionsById.get(moved.reportsToPositionId) : null
  const movedAssignment = tree.assignments.find(assignment => assignment.positionId === request.positionId && assignment.isPrimary)
    ?? tree.assignments.find(assignment => assignment.positionId === request.positionId)
  const directReports = tree.positions.filter(position => position.reportsToPositionId === request.positionId).length
  const hasCivilContractRisk = movedAssignment
    ? isCivilContractLike(movedAssignment.worker.tipoContrato)
    : false

  if (!moved || !newParent) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-50 p-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Confirmar cambio de línea de mando</h2>
            <p className="mt-1 text-sm text-slate-600">
              Moverás <strong>{moved.title}</strong> para que reporte a <strong>{newParent.title}</strong>.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3">
            <span className="font-medium text-slate-500">Cargo</span>
            <span className="text-slate-800">{moved.title}</span>
            <span className="font-medium text-slate-500">Área</span>
            <span className="text-slate-800">{unitsById.get(moved.orgUnitId)?.name ?? '—'}</span>
            <span className="font-medium text-slate-500">Jefe actual</span>
            <span className="text-slate-800">{currentParent?.title ?? 'Sin jefe inmediato'}</span>
            <span className="font-medium text-slate-500">Nuevo jefe</span>
            <span className="text-slate-800">{newParent.title}</span>
            <span className="font-medium text-slate-500">Reportes afectados</span>
            <span className="text-slate-800">{directReports}</span>
          </div>
        </div>

        {hasCivilContractRisk && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Este movimiento puede documentar subordinación sobre una relación civil. Debe quedar revisado por compliance.
          </div>
        )}

        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          Se registrará un cambio estructural con antes/después para auditoría.
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  )
}

function WhatIfDraftsModal({
  onClose,
  onApplied,
}: {
  onClose: () => void
  onApplied: () => void
}) {
  const [drafts, setDrafts] = useState<OrgChartDraftDTO[]>([])
  const [loading, setLoading] = useState(true)
  const [mutatingId, setMutatingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orgchart/drafts?limit=50', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudieron cargar los escenarios')
      setDrafts(data.drafts ?? [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar escenarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const mutateDraft = async (draftId: string, action: 'APPLY' | 'DISCARD') => {
    setMutatingId(draftId)
    try {
      const res = await fetch(`/api/orgchart/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo actualizar el escenario')
      toast.success(action === 'APPLY' ? 'Escenario aplicado al organigrama.' : 'Escenario descartado.')
      if (action === 'APPLY') {
        onApplied()
      } else {
        load()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setMutatingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Escenarios What-If</h2>
              <div className="text-xs text-slate-500">Borradores estructurales con snapshot base e impacto.</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
              Actualizar
            </button>
            <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
              <X className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="overflow-auto bg-slate-50 p-5">
          {loading ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando escenarios...
            </div>
          ) : drafts.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-500">
              Todavía no hay escenarios guardados.
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {drafts.map(draft => (
                <div key={draft.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-900">{draft.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {new Date(draft.createdAt).toLocaleString('es-PE')} · {draft.createdBy?.name ?? 'Usuario'}
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${draftStatusClass(draft.status)}`}>
                      {draftStatusLabel(draft.status)}
                    </span>
                  </div>

                  {draft.impactReport && (
                    <>
                      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                        <div className="font-medium text-slate-900">{draft.impactReport.scenario.positionTitle}</div>
                        <div className="mt-1 text-xs text-slate-600">
                          {draft.impactReport.scenario.fromParentTitle ?? 'Sin jefe'} {'->'} {draft.impactReport.scenario.toParentTitle}
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        <MiniMetric label="Ocup." value={draft.impactReport.metrics.occupants} />
                        <MiniMetric label="Reportes" value={draft.impactReport.metrics.directReportsMoved} />
                        <MiniMetric label="Span" value={draft.impactReport.metrics.projectedSpanOfControl} />
                        <MiniMetric label="Riesgos" value={draft.impactReport.metrics.risks} highlight={draft.impactReport.metrics.risks > 0} />
                      </div>
                      {draft.impactReport.costImpact && (
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <MoneyMetric label="Nómina mes" value={draft.impactReport.costImpact.estimatedMonthlyPayroll} />
                          <MoneyMetric label="Vacantes mes" value={draft.impactReport.costImpact.estimatedMonthlyVacancyBudget} />
                          <MoneyMetric
                            label="Indem. ref."
                            value={draft.impactReport.costImpact.estimatedSeveranceExposure}
                            highlight={draft.impactReport.costImpact.estimatedSeveranceExposure > 0}
                          />
                        </div>
                      )}
                      {draft.impactReport.risks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {draft.impactReport.risks.slice(0, 4).map(risk => (
                            <span key={`${draft.id}-${risk.title}`} className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${alertSeverityClass(risk.severity)}`}>
                              {risk.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-4 flex justify-end gap-2">
                    <button
                      onClick={() => mutateDraft(draft.id, 'DISCARD')}
                      disabled={mutatingId === draft.id || draft.status === 'APPLIED' || draft.status === 'DISCARDED'}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={() => mutateDraft(draft.id, 'APPLY')}
                      disabled={mutatingId === draft.id || draft.status === 'APPLIED' || draft.status === 'DISCARDED'}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {mutatingId === draft.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Aplicar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniMetric({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'}`}>
      <div className={`text-sm font-bold ${highlight ? 'text-amber-800' : 'text-slate-900'}`}>{value}</div>
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
    </div>
  )
}

function MoneyMetric({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg border px-2 py-2 text-center ${highlight ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'}`}>
      <div className={`text-sm font-bold ${highlight ? 'text-amber-800' : 'text-slate-900'}`}>{formatCurrency(value)}</div>
      <div className="text-[10px] font-medium text-slate-500">{label}</div>
    </div>
  )
}

function draftStatusClass(status: OrgDraftStatus) {
  if (status === 'APPLIED') return 'bg-emerald-100 text-emerald-700'
  if (status === 'DISCARDED') return 'bg-slate-100 text-slate-500'
  if (status === 'REVIEWING') return 'bg-amber-100 text-amber-800'
  return 'bg-sky-100 text-sky-700'
}

function draftStatusLabel(status: OrgDraftStatus) {
  const labels: Record<OrgDraftStatus, string> = {
    DRAFT: 'Borrador',
    REVIEWING: 'En revisión',
    APPLIED: 'Aplicado',
    DISCARDED: 'Descartado',
  }
  return labels[status]
}

function WhatIfModal({
  tree,
  onClose,
  onSaved,
  onApply,
}: {
  tree: OrgChartTree
  onClose: () => void
  onSaved: () => void
  onApply: (positionId: string, newParentId: string) => void
}) {
  const [positionId, setPositionId] = useState(tree.positions[0]?.id ?? '')
  const [selectedNewParentId, setSelectedNewParentId] = useState(tree.positions.find(position => position.id !== tree.positions[0]?.id)?.id ?? '')
  const [scenarioName, setScenarioName] = useState(() => `Escenario What-If ${new Date().toLocaleDateString('es-PE')}`)
  const [saving, setSaving] = useState(false)
  const position = tree.positions.find(candidate => candidate.id === positionId) ?? null
  const availableParents = useMemo(
    () => tree.positions.filter(candidate => candidate.id !== positionId),
    [positionId, tree.positions],
  )
  const newParentId = availableParents.some(candidate => candidate.id === selectedNewParentId)
    ? selectedNewParentId
    : availableParents[0]?.id ?? ''

  const unitsById = useMemo(() => new Map(tree.units.map(unit => [unit.id, unit])), [tree.units])
  const positionsById = useMemo(() => new Map(tree.positions.map(item => [item.id, item])), [tree.positions])
  const newParent = newParentId ? positionsById.get(newParentId) ?? null : null
  const oldParent = position?.reportsToPositionId ? positionsById.get(position.reportsToPositionId) ?? null : null
  const assignments = position ? tree.assignments.filter(assignment => assignment.positionId === position.id) : []
  const directReports = position ? tree.positions.filter(candidate => candidate.reportsToPositionId === position.id) : []
  const projectedSpan = newParentId
    ? tree.positions.filter(candidate => candidate.reportsToPositionId === newParentId && candidate.id !== positionId).length + 1
    : 0
  const cycle = Boolean(positionId && newParentId && wouldCreatePositionCycle(tree, positionId, newParentId))
  const civilContractRisk = assignments.some(assignment => isCivilContractLike(assignment.worker.tipoContrato))
  const sensitivePosition = Boolean(
    position?.isManagerial ||
      position?.isCritical ||
      position?.requiresSctr ||
      position?.requiresMedicalExam ||
      ['ALTO', 'CRITICO', 'CRÍTICO'].includes((position?.riskCategory ?? '').toUpperCase()),
  )
  const risks = buildWhatIfRisks({
    cycle,
    civilContractRisk,
    sensitivePosition,
    missingMof: position ? !hasMof(position) : false,
    directReports: directReports.length,
    projectedSpan,
  })
  const costImpact = useMemo(
    () => (position ? buildWhatIfCostImpact(tree, position.id) : null),
    [position, tree],
  )
  const canApply = Boolean(position && newParent && !cycle)

  const saveScenario = async () => {
    if (!position || !newParent || !scenarioName.trim() || cycle) return
    setSaving(true)
    try {
      const res = await fetch('/api/orgchart/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scenarioName.trim(),
          positionId: position.id,
          newParentId: newParent.id,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo guardar el escenario')
      toast.success('Escenario What-If guardado con snapshot base.')
      onSaved()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar escenario')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <ListTree className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">What-If organizacional</h2>
              <div className="text-xs text-slate-500">Simulación previa de cambio de línea de mando.</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        {tree.positions.length < 2 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">
            Necesitas al menos dos cargos para simular una nueva línea de mando.
          </div>
        ) : (
          <div className="overflow-auto px-6 py-5">
            <label className="mb-4 block text-xs font-medium text-slate-600">
              Nombre del escenario
              <input
                value={scenarioName}
                onChange={event => setScenarioName(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                placeholder="Ej. Reubicar Coordinación SST bajo Gerencia General"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-xs font-medium text-slate-600">
                Cargo a mover
                <select
                  value={positionId}
                  onChange={event => setPositionId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {tree.positions.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title} · {unitsById.get(candidate.orgUnitId)?.name ?? 'Sin área'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                Nuevo jefe inmediato
                <select
                  value={newParentId}
                  onChange={event => setSelectedNewParentId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
                >
                  {availableParents.map(candidate => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.title} · {unitsById.get(candidate.orgUnitId)?.name ?? 'Sin área'}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Stat label="Ocupantes" value={assignments.length} highlight={assignments.length > 0} />
              <Stat label="Reportes movidos" value={directReports.length} highlight={directReports.length > 0} />
              <Stat label="Span destino" value={projectedSpan} highlight={projectedSpan >= 12} />
              <Stat label="Riesgos" value={risks.length} highlight={risks.length > 0} />
            </div>

            {costImpact && (
              <section className="mt-5 rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">Impacto económico referencial</h3>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    {costImpact.salaryBandCoverage.positionsMissingBand === 0 ? 'Bandas completas' : 'Bandas incompletas'}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-4">
                  <MoneyMetric label="Nómina mensual" value={costImpact.estimatedMonthlyPayroll} />
                  <MoneyMetric label="Nómina anual" value={costImpact.estimatedAnnualPayroll} />
                  <MoneyMetric label="Vacantes mes" value={costImpact.estimatedMonthlyVacancyBudget} highlight={costImpact.estimatedMonthlyVacancyBudget > 0} />
                  <MoneyMetric label="Indem. ref." value={costImpact.estimatedSeveranceExposure} highlight={costImpact.estimatedSeveranceExposure > 0} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <MiniMetric label="Puestos" value={costImpact.positionsAffected} />
                  <MiniMetric label="Trabajadores" value={costImpact.workersAffected} />
                  <MiniMetric label="Vacantes" value={costImpact.vacantSeatsAffected} highlight={costImpact.vacantSeatsAffected > 0} />
                </div>
                {costImpact.salaryBandCoverage.positionsMissingBand > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    {costImpact.salaryBandCoverage.positionsMissingBand} cargo(s) sin banda salarial dentro de la rama afectada.
                  </div>
                )}
              </section>
            )}

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-900">Antes / después</h3>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
                    <span className="font-medium text-slate-500">Cargo</span>
                    <span className="text-slate-900">{position?.title ?? 'Sin cargo'}</span>
                    <span className="font-medium text-slate-500">Área</span>
                    <span className="text-slate-900">{position ? unitsById.get(position.orgUnitId)?.name ?? 'Sin área' : 'Sin área'}</span>
                    <span className="font-medium text-slate-500">Jefe actual</span>
                    <span className="text-slate-900">{oldParent?.title ?? 'Sin jefe inmediato'}</span>
                    <span className="font-medium text-slate-500">Nuevo jefe</span>
                    <span className="text-slate-900">{newParent?.title ?? 'Sin jefe inmediato'}</span>
                  </div>
                </div>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900">Matriz de riesgo</h3>
                {risks.length === 0 ? (
                  <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                    No se detectan riesgos estructurales relevantes en esta simulación.
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    {risks.map(risk => (
                      <div key={risk.title} className="rounded-lg border border-slate-200 bg-white p-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${whatIfRiskClass(risk.severity)}`}>
                          {risk.severity}
                        </span>
                        <div className="mt-2 text-sm font-semibold text-slate-900">{risk.title}</div>
                        <div className="mt-1 text-xs text-slate-600">{risk.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                onClick={saveScenario}
                disabled={!canApply || saving || !scenarioName.trim()}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScrollText className="h-4 w-4" />}
                Guardar escenario
              </button>
              <button
                onClick={() => position && newParent && onApply(position.id, newParent.id)}
                disabled={!canApply}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                Enviar a confirmación
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DirectoryView({ tree }: { tree: OrgChartTree }) {
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('all')
  const [contractFilter, setContractFilter] = useState('all')

  const unitsById = useMemo(() => new Map(tree.units.map(u => [u.id, u])), [tree.units])
  const positionsById = useMemo(() => new Map(tree.positions.map(p => [p.id, p])), [tree.positions])
  const assignmentsByPosition = useMemo(() => {
    const map = new Map<string, OrgChartTree['assignments']>()
    for (const assignment of tree.assignments) {
      const list = map.get(assignment.positionId) ?? []
      list.push(assignment)
      map.set(assignment.positionId, list)
    }
    return map
  }, [tree.assignments])

  const rows = useMemo(() => {
    return tree.assignments.map(assignment => {
      const position = positionsById.get(assignment.positionId)
      const unit = position ? unitsById.get(position.orgUnitId) : null
      const managerPosition = position?.reportsToPositionId ? positionsById.get(position.reportsToPositionId) : null
      const managerAssignment = managerPosition
        ? assignmentsByPosition.get(managerPosition.id)?.find(a => a.isPrimary) ?? null
        : null
      return {
        assignment,
        position,
        unit,
        managerName: managerAssignment
          ? `${managerAssignment.worker.firstName} ${managerAssignment.worker.lastName}`
          : '—',
      }
    })
  }, [assignmentsByPosition, positionsById, tree.assignments, unitsById])

  const areaOptions = useMemo(
    () => Array.from(new Set(rows.map(row => row.unit?.name).filter(Boolean) as string[])).sort(),
    [rows],
  )
  const contractOptions = useMemo(
    () => Array.from(new Set(rows.map(row => row.assignment.worker.tipoContrato))).sort(),
    [rows],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(row => {
      const worker = row.assignment.worker
      const haystack = [
        worker.firstName,
        worker.lastName,
        worker.dni,
        row.position?.title,
        row.unit?.name,
        row.managerName,
        worker.regimenLaboral,
        worker.tipoContrato,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (
        (!q || haystack.includes(q)) &&
        (areaFilter === 'all' || row.unit?.name === areaFilter) &&
        (contractFilter === 'all' || worker.tipoContrato === contractFilter)
      )
    })
  }, [areaFilter, contractFilter, rows, search])

  const exportCsv = () => {
    const header = ['Nombre', 'Documento', 'Cargo', 'Área', 'Régimen', 'Modalidad', 'Jefe directo', 'Estado', 'Riesgo']
    const data = filteredRows.map(row => {
      const worker = row.assignment.worker
      return [
        `${worker.firstName} ${worker.lastName}`,
        worker.dni,
        row.position?.title ?? '',
        row.unit?.name ?? '',
        worker.regimenLaboral,
        worker.tipoContrato,
        row.managerName,
        worker.status,
        worker.legajoScore ?? '',
      ]
    })
    const csv = [header, ...data]
      .map(cols => cols.map(col => `"${String(col).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'directorio-organigrama.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full overflow-auto bg-slate-50 p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[260px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar trabajador, DNI, cargo, área..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={areaFilter}
          onChange={e => setAreaFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">Todas las áreas</option>
          {areaOptions.map(area => (
            <option key={area} value={area}>
              {area}
            </option>
          ))}
        </select>
        <select
          value={contractFilter}
          onChange={e => setContractFilter(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">Todas las modalidades</option>
          {contractOptions.map(contract => (
            <option key={contract} value={contract}>
              {formatEnum(contract)}
            </option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <FileSpreadsheet className="h-4 w-4" />
          CSV
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Trabajador</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Cargo</th>
              <th className="px-4 py-3">Área</th>
              <th className="px-4 py-3">Régimen</th>
              <th className="px-4 py-3">Modalidad</th>
              <th className="px-4 py-3">Jefe directo</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Riesgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-slate-500">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              filteredRows.map(row => {
                const worker = row.assignment.worker
                const score = worker.legajoScore ?? null
                return (
                  <tr key={row.assignment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <WorkerAvatar worker={worker} />
                        <div>
                          <div className="font-medium text-slate-900">
                            {worker.firstName} {worker.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{worker.email ?? '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{worker.dni}</td>
                    <td className="px-4 py-3 text-slate-700">{row.position?.title ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-700">{row.unit?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{formatEnum(worker.regimenLaboral)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatEnum(worker.tipoContrato)}</td>
                    <td className="px-4 py-3 text-slate-600">{row.managerName}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {formatEnum(worker.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {score === null ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${riskBadgeClass(score)}`}>
                          {score}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AreasPositionsView({
  tree,
  selectedUnitId,
  onSelectUnit,
  onCreateUnit,
  onCreatePosition,
  onEditPosition,
  lens,
  readOnly,
}: {
  tree: OrgChartTree
  selectedUnitId: string | null
  onSelectUnit: (unitId: string) => void
  onCreateUnit: () => void
  onCreatePosition: (unitId: string) => void
  onEditPosition: (positionId: string) => void
  lens: OrgLens
  readOnly: boolean
}) {
  const [search, setSearch] = useState('')
  const unitsById = useMemo(() => new Map(tree.units.map(u => [u.id, u])), [tree.units])
  const selectedUnit = selectedUnitId ? unitsById.get(selectedUnitId) ?? null : null
  const selectedScopeIds = useMemo(() => {
    if (!selectedUnit) return new Set(tree.units.map(u => u.id))
    const ids = new Set<string>([selectedUnit.id])
    let changed = true
    while (changed) {
      changed = false
      for (const unit of tree.units) {
        if (unit.parentId && ids.has(unit.parentId) && !ids.has(unit.id)) {
          ids.add(unit.id)
          changed = true
        }
      }
    }
    return ids
  }, [selectedUnit, tree.units])

  const assignmentsByPosition = useMemo(() => {
    const map = new Map<string, number>()
    for (const assignment of tree.assignments) {
      map.set(assignment.positionId, (map.get(assignment.positionId) ?? 0) + 1)
    }
    return map
  }, [tree.assignments])

  const filteredPositions = tree.positions
    .filter(position => selectedScopeIds.has(position.orgUnitId))
    .filter(position => {
      const q = search.trim().toLowerCase()
      if (!q) return true
      const unit = unitsById.get(position.orgUnitId)
      return `${position.title} ${position.code ?? ''} ${unit?.name ?? ''}`.toLowerCase().includes(q)
    })

  return (
    <div className="grid h-full grid-cols-[300px_minmax(0,1fr)] overflow-hidden bg-slate-50">
      <aside className="overflow-y-auto border-r border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Áreas</h2>
          {!readOnly && (
            <button
              onClick={onCreateUnit}
              className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-3 w-3" />
              Nueva
            </button>
          )}
        </div>
        <div className="space-y-1">
          <button
            onClick={() => onSelectUnit('')}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
              !selectedUnitId ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todas las áreas
          </button>
          {tree.units.map(unit => {
            const active = selectedUnitId === unit.id
            const positions = tree.positions.filter(p => p.orgUnitId === unit.id)
            return (
              <button
                key={unit.id}
                onClick={() => onSelectUnit(unit.id)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  active ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
                style={{ paddingLeft: 12 + unit.level * 14 }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{unit.name}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                    {positions.length}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>
      <section className="overflow-auto p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {selectedUnit ? selectedUnit.name : 'Catálogo de cargos'}
            </h2>
            <div className="text-xs text-slate-500">
              {filteredPositions.length} cargos · {tree.assignments.length} asignaciones vigentes
            </div>
          </div>
          <div className="relative ml-auto min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar cargo o código..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          {!readOnly && selectedUnit && (
            <button
              onClick={() => onCreatePosition(selectedUnit.id)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Nuevo cargo
            </button>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPositions.map(position => {
            const unit = unitsById.get(position.orgUnitId)
            const occupied = assignmentsByPosition.get(position.id) ?? 0
            const vacant = Math.max(0, position.seats - occupied)
            const lensMeta = positionLensMeta(lens, position, occupied)
            return (
              <div
                key={position.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectUnit(position.orgUnitId)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') onSelectUnit(position.orgUnitId)
                }}
                className={`rounded-lg border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${positionLensCardClass(lensMeta)}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{position.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{unit?.name ?? '—'}</div>
                  </div>
                  {position.isCritical && (
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold text-rose-700">
                      Crítico
                    </span>
                  )}
                  {lensMeta && (
                    <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${lensMeta.badgeClass}`}>
                      {lensMeta.label}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  {position.code && (
                    <span className="rounded bg-slate-100 px-2 py-1 font-mono text-slate-600">
                      {position.code}
                    </span>
                  )}
                  {position.level && (
                    <span className="rounded bg-slate-100 px-2 py-1 text-slate-600">
                      {position.level}
                    </span>
                  )}
                  <span className="rounded bg-emerald-50 px-2 py-1 text-emerald-700">
                    {occupied}/{position.seats} cubiertos
                  </span>
                  {vacant > 0 && (
                    <span className="rounded bg-amber-50 px-2 py-1 text-amber-700">
                      {vacant} vacante{vacant === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-500">
                  <div className="rounded bg-slate-50 px-2 py-1">
                    MOF {hasMof(position) ? 'OK' : '—'}
                  </div>
                  <div className="rounded bg-slate-50 px-2 py-1">
                    SST {position.riskCategory ? formatEnum(position.riskCategory) : '—'}
                  </div>
                  <div className="rounded bg-slate-50 px-2 py-1">
                    SCTR {position.requiresSctr ? 'Sí' : 'No'}
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  {!readOnly && (
                    <button
                      onClick={event => {
                        event.stopPropagation()
                        onEditPosition(position.id)
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Briefcase className="h-3 w-3" />
                      Editar
                    </button>
                  )}
                  <a
                    href={`/api/orgchart/positions/${position.id}/mof`}
                    onClick={event => event.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                  >
                    <Download className="h-3 w-3" />
                    MOF
                  </a>
                  {!readOnly && (
                    <a
                      href={`/dashboard/contratos/nuevo?positionId=${encodeURIComponent(position.id)}`}
                      onClick={event => event.stopPropagation()}
                      className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100"
                    >
                      <ScrollText className="h-3 w-3" />
                      Contrato
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

interface StructureChangeRow {
  id: string
  type: string
  entityType: string
  entityId: string
  reason: string | null
  ipAddress: string | null
  createdAt: string
  summary: string
  actor: { id: string; name: string; email: string } | null
}

function ChangeHistoryView() {
  const [changes, setChanges] = useState<StructureChangeRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/orgchart/change-log?limit=100', { cache: 'no-store' })
      if (!res.ok) throw new Error('No se pudo cargar el historial')
      const data = (await res.json()) as { changes: StructureChangeRow[] }
      setChanges(data.changes)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar historial')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const entityOptions = useMemo(
    () => Array.from(new Set(changes.map(change => change.entityType))).sort(),
    [changes],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return changes.filter(change => {
      const haystack = [
        change.type,
        change.entityType,
        change.summary,
        change.reason,
        change.actor?.name,
        change.actor?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return (!q || haystack.includes(q)) && (entityFilter === 'all' || change.entityType === entityFilter)
    })
  }, [changes, entityFilter, search])

  return (
    <div className="h-full overflow-auto bg-slate-50 p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Historial estructural</h2>
          <div className="text-xs text-slate-500">{changes.length} eventos registrados en auditoría</div>
        </div>
        <div className="relative ml-auto min-w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar cambio, actor, motivo..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </div>
        <select
          value={entityFilter}
          onChange={event => setEntityFilter(event.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="all">Todas las entidades</option>
          {entityOptions.map(entity => (
            <option key={entity} value={entity}>
              {entityLabel(entity)}
            </option>
          ))}
        </select>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          <History className="h-4 w-4" />
          Actualizar
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Cargando historial…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">Sin cambios para los filtros actuales.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(change => (
              <div key={change.id} className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 lg:grid-cols-[170px_minmax(0,1fr)_220px]">
                <div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${changeTypeClass(change.type)}`}>
                    {formatEnum(change.type)}
                  </span>
                  <div className="mt-2 text-xs text-slate-500">
                    {new Date(change.createdAt).toLocaleString('es-PE')}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-slate-900">{change.summary}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{entityLabel(change.entityType)}</span>
                    <span className="font-mono">{change.entityId.slice(0, 12)}</span>
                    {change.reason && <span>{change.reason}</span>}
                  </div>
                </div>
                <div className="text-xs text-slate-500 lg:text-right">
                  <div className="font-medium text-slate-700">{change.actor?.name ?? 'Sistema'}</div>
                  <div>{change.actor?.email ?? change.ipAddress ?? 'Sin IP registrada'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function entityLabel(entityType: string) {
  const labels: Record<string, string> = {
    OrgUnit: 'Unidad',
    OrgPosition: 'Cargo',
    OrgAssignment: 'Asignación',
    OrgComplianceRole: 'Rol legal',
    OrgChartSnapshot: 'Snapshot',
    OrgChartDraft: 'Escenario What-If',
    OrgTemplate: 'Plantilla',
    OrgChartImport: 'Importación',
  }
  return labels[entityType] ?? entityType
}

function changeTypeClass(type: string) {
  if (type.includes('DELETE') || type.includes('END')) return 'bg-rose-100 text-rose-700'
  if (type.includes('MOVE') || type.includes('REPARENT') || type.includes('REASSIGN')) return 'bg-amber-100 text-amber-800'
  if (type.includes('CREATE')) return 'bg-emerald-100 text-emerald-700'
  return 'bg-slate-100 text-slate-700'
}

function positionLensMeta(lens: OrgLens, position: OrgChartTree['positions'][number], occupied: number) {
  const vacant = occupied < position.seats
  const missingMof = !hasMof(position)
  const sstSensitive = Boolean(
    position.requiresSctr ||
    position.requiresMedicalExam ||
    position.isCritical ||
    ['ALTO', 'CRITICO', 'CRÍTICO'].includes((position.riskCategory ?? '').toUpperCase()),
  )

  if (lens === 'mof' && missingMof) {
    return { label: 'MOF pendiente', badgeClass: 'bg-rose-100 text-rose-700', tone: 'danger' as const }
  }
  if (lens === 'compliance') {
    if (position.isCritical) return { label: 'Cargo critico', badgeClass: 'bg-rose-100 text-rose-700', tone: 'danger' as const }
    if (sstSensitive) return { label: 'Riesgo', badgeClass: 'bg-amber-100 text-amber-800', tone: 'warning' as const }
  }
  if (lens === 'contractual' && vacant) {
    return { label: 'Vacante', badgeClass: 'bg-sky-100 text-sky-700', tone: 'info' as const }
  }
  if (lens === 'sst' && sstSensitive) {
    return { label: 'SST', badgeClass: 'bg-amber-100 text-amber-800', tone: 'warning' as const }
  }
  if (lens === 'vacancies' && vacant) {
    return { label: 'Vacante', badgeClass: 'bg-sky-100 text-sky-700', tone: 'info' as const }
  }
  return null
}

function positionLensCardClass(meta: ReturnType<typeof positionLensMeta>) {
  if (!meta) return 'border-slate-200'
  if (meta.tone === 'danger') return 'border-rose-300 ring-2 ring-rose-100'
  if (meta.tone === 'warning') return 'border-amber-300 ring-2 ring-amber-100'
  return 'border-sky-300 ring-2 ring-sky-100'
}

function WorkerAvatar({
  worker,
}: {
  worker: OrgChartTree['assignments'][number]['worker']
}) {
  if (worker.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={worker.photoUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
      {worker.firstName.charAt(0)}
      {worker.lastName.charAt(0)}
    </span>
  )
}

function formatEnum(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function riskBadgeClass(score: number) {
  if (score >= 90) return 'bg-rose-100 text-rose-700'
  if (score >= 70) return 'bg-amber-100 text-amber-800'
  if (score >= 40) return 'bg-yellow-100 text-yellow-800'
  return 'bg-emerald-100 text-emerald-700'
}

function hasMof(position: OrgChartTree['positions'][number]) {
  return Boolean(position.purpose && position.functions && position.responsibilities && position.requirements)
}

function wouldCreatePositionCycle(tree: OrgChartTree, positionId: string, newParentId: string) {
  let cursor: string | null = newParentId
  const seen = new Set<string>()
  const positionsById = new Map(tree.positions.map(position => [position.id, position]))

  while (cursor) {
    if (cursor === positionId) return true
    if (seen.has(cursor)) return true
    seen.add(cursor)
    cursor = positionsById.get(cursor)?.reportsToPositionId ?? null
  }

  return false
}

function isCivilContractLike(contractType: string) {
  return contractType.includes('LOCACION') || contractType.includes('SERVICIO') || contractType.includes('CIVIL')
}

function buildWhatIfRisks({
  cycle,
  civilContractRisk,
  sensitivePosition,
  missingMof,
  directReports,
  projectedSpan,
}: {
  cycle: boolean
  civilContractRisk: boolean
  sensitivePosition: boolean
  missingMof: boolean
  directReports: number
  projectedSpan: number
}) {
  const risks: Array<{ severity: OrgAlertSeverity; title: string; description: string }> = []
  if (cycle) {
    risks.push({
      severity: 'CRITICAL',
      title: 'Ciclo jerárquico',
      description: 'El cambio haría que el cargo dependa de sí mismo directa o indirectamente.',
    })
  }
  if (civilContractRisk) {
    risks.push({
      severity: 'CRITICAL',
      title: 'Subordinación civil',
      description: 'El cargo tiene ocupantes con contrato civil o de servicios; documentar una jefatura puede elevar el riesgo laboral.',
    })
  }
  if (projectedSpan >= 25) {
    risks.push({
      severity: 'HIGH',
      title: 'Span de control alto',
      description: `El nuevo jefe quedaría con ${projectedSpan} reportes directos.`,
    })
  } else if (projectedSpan >= 12) {
    risks.push({
      severity: 'MEDIUM',
      title: 'Span de control exigente',
      description: `El nuevo jefe quedaría con ${projectedSpan} reportes directos.`,
    })
  }
  if (sensitivePosition) {
    risks.push({
      severity: 'HIGH',
      title: 'Cargo sensible',
      description: 'El cargo es gerencial, crítico o tiene marcadores SST; el cambio debe quedar sustentado.',
    })
  }
  if (missingMof) {
    risks.push({
      severity: 'MEDIUM',
      title: 'MOF incompleto',
      description: 'Conviene completar el MOF antes de usar esta relación como evidencia formal.',
    })
  }
  if (directReports > 0) {
    risks.push({
      severity: 'LOW',
      title: 'Arrastre de equipo',
      description: `El cambio movería indirectamente a ${directReports} reporte(s) del cargo seleccionado.`,
    })
  }
  return risks
}

function whatIfRiskClass(severity: OrgAlertSeverity) {
  return alertSeverityClass(severity)
}

// ─── Snapshot diff modal ────────────────────────────────────────────────────
type SnapshotDiffRecord = {
  id?: string
  name?: string | null
  title?: string | null
  workerId?: string | null
  positionId?: string | null
  roleType?: string | null
  unitId?: string | null
  reportsToPositionId?: string | null
  orgUnitId?: string | null
  worker?: {
    firstName?: string | null
    lastName?: string | null
    dni?: string | null
  }
}

interface SnapshotChangedRecord {
  id: string
  before: SnapshotDiffRecord
  after: SnapshotDiffRecord
  changedFields: string[]
}

interface SnapshotReassignment {
  workerId: string
  beforePositionId: string
  afterPositionId: string
  workerName: string | null
  dni: string | null
}

interface SnapshotDiffResult {
  from: { id: string; label: string; createdAt: string; hash: string }
  to: { id: string; label: string; createdAt: string; hash: string }
  diff: {
    addedUnits: SnapshotDiffRecord[]
    removedUnits: SnapshotDiffRecord[]
    changedUnits: SnapshotChangedRecord[]
    addedPositions: SnapshotDiffRecord[]
    removedPositions: SnapshotDiffRecord[]
    changedPositions: SnapshotChangedRecord[]
    movedPositions: SnapshotChangedRecord[]
    addedAssignments: SnapshotDiffRecord[]
    removedAssignments: SnapshotDiffRecord[]
    reassignedWorkers: SnapshotReassignment[]
    addedComplianceRoles: SnapshotDiffRecord[]
    removedComplianceRoles: SnapshotDiffRecord[]
    totals: Record<string, number>
  }
}

function SnapshotDiffModal({
  snapshots,
  onClose,
}: {
  snapshots: OrgChartSnapshotDTO[]
  onClose: () => void
}) {
  const [fromId, setFromId] = useState(() => snapshots[1]?.id ?? snapshots[0]?.id ?? '')
  const [toId, setToId] = useState('current')
  const [result, setResult] = useState<SnapshotDiffResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDiff = useCallback(async () => {
    if (!fromId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/orgchart/snapshots/diff?from=${encodeURIComponent(fromId)}&to=${encodeURIComponent(toId)}`,
        { cache: 'no-store' },
      )
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'Error al comparar snapshots')
      setResult(data as SnapshotDiffResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al comparar snapshots')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [fromId, toId])

  useEffect(() => {
    loadDiff()
  }, [loadDiff])

  const totals = result?.diff.totals

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Time Machine</h2>
              <div className="text-xs text-slate-500">Comparación estructural firmada entre snapshots.</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 lg:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs font-medium text-slate-600">
            Desde
            <select
              value={fromId}
              onChange={event => setFromId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              {snapshots.map(snapshot => (
                <option key={snapshot.id} value={snapshot.id}>
                  {new Date(snapshot.createdAt).toLocaleString('es-PE')} · {snapshot.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Hasta
            <select
              value={toId}
              onChange={event => setToId(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800"
            >
              <option value="current">Estado actual</option>
              {snapshots.map(snapshot => (
                <option key={snapshot.id} value={snapshot.id}>
                  {new Date(snapshot.createdAt).toLocaleString('es-PE')} · {snapshot.label}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={loadDiff}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 lg:self-end"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            Comparar
          </button>
        </div>

        <div className="overflow-auto px-6 py-5">
          {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}

          {loading && !result ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando diferencias...
            </div>
          ) : result ? (
            <div className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2">
                <SnapshotStamp label="Origen" snapshot={result.from} />
                <SnapshotStamp label="Destino" snapshot={result.to} />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Stat label="Unidades +/-" value={(totals?.addedUnits ?? 0) + (totals?.removedUnits ?? 0)} highlight />
                <Stat label="Cargos +/-" value={(totals?.addedPositions ?? 0) + (totals?.removedPositions ?? 0)} highlight />
                <Stat label="Movimientos" value={totals?.movedPositions ?? 0} highlight />
                <Stat label="Reasignaciones" value={totals?.reassignedWorkers ?? 0} highlight />
              </div>

              <div className="grid gap-3 xl:grid-cols-2">
                <SnapshotDiffSection title="Unidades agregadas" items={result.diff.addedUnits} />
                <SnapshotDiffSection title="Unidades removidas" items={result.diff.removedUnits} />
                <SnapshotChangedSection title="Unidades modificadas" items={result.diff.changedUnits} />
                <SnapshotDiffSection title="Cargos agregados" items={result.diff.addedPositions} />
                <SnapshotDiffSection title="Cargos removidos" items={result.diff.removedPositions} />
                <SnapshotChangedSection title="Cargos modificados / MOF / SST" items={result.diff.changedPositions} />
                <SnapshotChangedSection title="Movimientos jerárquicos" items={result.diff.movedPositions} />
                <SnapshotReassignmentSection items={result.diff.reassignedWorkers} />
                <SnapshotDiffSection title="Asignaciones agregadas" items={result.diff.addedAssignments} kind="assignment" />
                <SnapshotDiffSection title="Asignaciones removidas" items={result.diff.removedAssignments} kind="assignment" />
                <SnapshotDiffSection title="Roles legales agregados" items={result.diff.addedComplianceRoles} kind="role" />
                <SnapshotDiffSection title="Roles legales removidos" items={result.diff.removedComplianceRoles} kind="role" />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SnapshotStamp({
  label,
  snapshot,
}: {
  label: string
  snapshot: SnapshotDiffResult['from']
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-bold uppercase text-slate-400">{label}</div>
      <div className="mt-1 font-medium text-slate-900">{snapshot.label}</div>
      <div className="mt-1 text-xs text-slate-500">{new Date(snapshot.createdAt).toLocaleString('es-PE')}</div>
      <div className="mt-2 font-mono text-[11px] text-slate-500">{snapshot.hash.slice(0, 24)}</div>
    </div>
  )
}

function SnapshotDiffSection({
  title,
  items,
  kind = 'entity',
}: {
  title: string
  items: SnapshotDiffRecord[]
  kind?: 'entity' | 'assignment' | 'role'
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-5 text-sm text-slate-400">Sin cambios.</div>
      ) : (
        <div className="max-h-48 divide-y divide-slate-100 overflow-auto">
          {items.map((item, index) => (
            <div key={item.id ?? `${title}-${index}`} className="px-4 py-3 text-sm">
              <div className="font-medium text-slate-900">{snapshotDiffLabel(item, kind)}</div>
              <div className="mt-1 font-mono text-[11px] text-slate-400">{item.id ?? item.workerId ?? item.roleType}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SnapshotChangedSection({ title, items }: { title: string; items: SnapshotChangedRecord[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-5 text-sm text-slate-400">Sin cambios.</div>
      ) : (
        <div className="max-h-56 divide-y divide-slate-100 overflow-auto">
          {items.map(item => (
            <div key={`${title}-${item.id}`} className="px-4 py-3 text-sm">
              <div className="font-medium text-slate-900">{snapshotDiffLabel(item.after)}</div>
              <div className="mt-1 text-xs text-slate-500">{item.changedFields.map(snapshotFieldLabel).join(', ')}</div>
              {(item.before.reportsToPositionId !== item.after.reportsToPositionId ||
                item.before.orgUnitId !== item.after.orgUnitId) && (
                <div className="mt-1 font-mono text-[11px] text-amber-700">
                  {shortId(item.before.orgUnitId)} / {shortId(item.before.reportsToPositionId)} {'->'} {shortId(item.after.orgUnitId)} / {shortId(item.after.reportsToPositionId)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SnapshotReassignmentSection({ items }: { items: SnapshotReassignment[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Trabajadores reasignados</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-5 text-sm text-slate-400">Sin cambios.</div>
      ) : (
        <div className="max-h-48 divide-y divide-slate-100 overflow-auto">
          {items.map(item => (
            <div key={`${item.workerId}-${item.afterPositionId}`} className="px-4 py-3 text-sm">
              <div className="font-medium text-slate-900">{item.workerName ?? item.workerId}</div>
              <div className="mt-1 font-mono text-[11px] text-slate-500">
                {shortId(item.beforePositionId)} {'->'} {shortId(item.afterPositionId)}
              </div>
              {item.dni && <div className="mt-1 text-xs text-slate-400">DNI {item.dni}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function snapshotDiffLabel(item: SnapshotDiffRecord, kind: 'entity' | 'assignment' | 'role' = 'entity') {
  if (kind === 'assignment') {
    return `${snapshotWorkerLabel(item)} -> ${shortId(item.positionId)}`
  }
  if (kind === 'role') {
    return `${formatEnum(item.roleType ?? 'ROL')} · ${snapshotWorkerLabel(item)}`
  }
  return item.title ?? item.name ?? item.workerId ?? item.id ?? 'Sin nombre'
}

function snapshotWorkerLabel(item: SnapshotDiffRecord) {
  const firstName = item.worker?.firstName?.trim()
  const lastName = item.worker?.lastName?.trim()
  const name = [firstName, lastName].filter(Boolean).join(' ').trim()
  return name || item.workerId || 'Trabajador'
}

function snapshotFieldLabel(field: string) {
  const labels: Record<string, string> = {
    name: 'nombre',
    parentId: 'unidad superior',
    orgUnitId: 'unidad',
    title: 'cargo',
    reportsToPositionId: 'jefatura',
    backupPositionId: 'suplencia',
    purpose: 'propósito MOF',
    functions: 'funciones MOF',
    responsibilities: 'responsabilidades MOF',
    requirements: 'requisitos MOF',
    riskCategory: 'riesgo SST',
    requiresSctr: 'SCTR',
    requiresMedicalExam: 'examen médico',
    isCritical: 'cargo crítico',
    isManagerial: 'jefatura',
    seats: 'plazas',
  }
  return labels[field] ?? field
}

function shortId(value: string | null | undefined) {
  return value ? value.slice(0, 8) : 'sin-id'
}

// ─── Empty state ─────────────────────────────────────────────────────────────
function EmptyState({
  onSeed,
  onCreate,
  onImport,
  onTemplates,
}: {
  onSeed: () => void
  onCreate: () => void
  onImport: () => void
  onTemplates: () => void
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-4 rounded-full bg-emerald-50 p-4">
        <Network className="h-12 w-12 text-emerald-600" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">Tu organigrama está vacío</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">
        Puedes auto-generarlo desde los <strong>cargos y áreas</strong> que ya tienes cargados en
        Trabajadores, o empezar de cero creando una unidad.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          onClick={onSeed}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          <Wand2 className="h-4 w-4" />
          Auto-generar desde Trabajadores
        </button>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-4 w-4" />
          Crear primera unidad
        </button>
        <button
          onClick={onImport}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Upload className="h-4 w-4" />
          Importar Excel
        </button>
        <button
          onClick={onTemplates}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Wand2 className="h-4 w-4" />
          Usar plantilla
        </button>
      </div>
    </div>
  )
}

// ─── Template Library modal ──────────────────────────────────────────────────
interface OrgTemplateSummary {
  id: string
  name: string
  description: string
  sector: string
  unitCount: number
  positionCount: number
  recommendedFor: string[]
}

interface OrgTemplatePreview {
  template: OrgTemplateSummary
  totals: {
    units: number
    positions: number
    managerialPositions: number
    sstSensitivePositions: number
    unitsToCreate: number
    unitsToReactivate: number
    positionsToCreate: number
    positionsToLink: number
    reusedUnits: number
    reusedPositions: number
    warnings: number
  }
  units: Array<{
    key: string
    name: string
    kind: string
    parentKey: string | null
    status: 'CREATE' | 'REACTIVATE' | 'REUSE'
  }>
  positions: Array<{
    key: string
    title: string
    unitName: string
    reportsToKey: string | null
    status: 'CREATE' | 'REUSE'
    willLinkManager: boolean
    warning: string | null
  }>
}

interface OrgTemplateApplyResult extends OrgTemplatePreview {
  applied: true
  created: { units: number; positions: number }
  updated: { unitsReactivated: number; positionsLinked: number }
}

function TemplateLibraryModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const [templates, setTemplates] = useState<OrgTemplateSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [preview, setPreview] = useState<OrgTemplatePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/orgchart/templates', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('No se pudieron cargar las plantillas')
        return res.json()
      })
      .then((data: { templates?: OrgTemplateSummary[] }) => {
        if (cancelled) return
        const items = data.templates ?? []
        setTemplates(items)
        setSelectedId(items[0]?.id ?? null)
      })
      .catch(err => toast.error(err instanceof Error ? err.message : 'Error al cargar plantillas'))
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    setLoadingPreview(true)
    fetch(`/api/orgchart/templates?templateId=${encodeURIComponent(selectedId)}`, { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('No se pudo previsualizar la plantilla')
        return res.json()
      })
      .then((data: OrgTemplatePreview) => {
        if (!cancelled) setPreview(data)
      })
      .catch(err => toast.error(err instanceof Error ? err.message : 'Error al previsualizar'))
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })
    return () => {
      cancelled = true
    }
  }, [selectedId])

  const apply = async () => {
    if (!selectedId || !preview) return
    setApplying(true)
    try {
      const res = await fetch('/api/orgchart/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: selectedId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo aplicar la plantilla')
      const result = data as OrgTemplateApplyResult
      toast.success(
        `Plantilla aplicada: ${result.created.units} áreas, ${result.created.positions} cargos, ${result.updated.positionsLinked} líneas de mando.`,
      )
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aplicar plantilla')
    } finally {
      setApplying(false)
    }
  }

  const selectedTemplate = templates.find(template => template.id === selectedId) ?? null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Plantillas organizacionales</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[320px_minmax(0,1fr)] overflow-hidden">
          <aside className="overflow-y-auto border-r border-slate-200 bg-slate-50 p-4">
            {loading ? (
              <div className="py-8 text-center text-sm text-slate-500">Cargando plantillas…</div>
            ) : (
              <div className="space-y-2">
                {templates.map(template => {
                  const active = template.id === selectedId
                  return (
                    <button
                      key={template.id}
                      onClick={() => setSelectedId(template.id)}
                      className={`w-full rounded-lg border p-3 text-left transition ${
                        active
                          ? 'border-emerald-300 bg-white shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">{template.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{template.sector}</div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {template.positionCount} cargos
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">{template.description}</p>
                    </button>
                  )
                })}
              </div>
            )}
          </aside>

          <section className="overflow-y-auto p-6">
            {loadingPreview || !preview || !selectedTemplate ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Preparando preview…
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{selectedTemplate.name}</h3>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600">{selectedTemplate.description}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedTemplate.recommendedFor.map(item => (
                        <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  {preview.totals.warnings > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {preview.totals.warnings} conflicto(s) no destructivos
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat label="Áreas nuevas" value={preview.totals.unitsToCreate} highlight />
                  <Stat label="Cargos nuevos" value={preview.totals.positionsToCreate} highlight />
                  <Stat label="Líneas de mando" value={preview.totals.positionsToLink} highlight />
                  <Stat label="Cargos SST" value={preview.totals.sstSensitivePositions} />
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Áreas
                    </div>
                    <div className="max-h-64 divide-y divide-slate-100 overflow-auto">
                      {preview.units.map(unit => (
                        <div key={unit.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                          <div>
                            <div className="font-medium text-slate-800">{unit.name}</div>
                            <div className="text-xs text-slate-500">{formatEnum(unit.kind)}</div>
                          </div>
                          <TemplateStatusBadge status={unit.status} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Cargos
                    </div>
                    <div className="max-h-64 divide-y divide-slate-100 overflow-auto">
                      {preview.positions.map(position => (
                        <div key={position.key} className="px-3 py-2 text-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-medium text-slate-800">{position.title}</div>
                              <div className="text-xs text-slate-500">{position.unitName}</div>
                            </div>
                            <TemplateStatusBadge status={position.status} />
                          </div>
                          {position.warning && (
                            <div className="mt-1 text-xs text-amber-700">{position.warning}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  Se creará un snapshot automático y se registrará la aplicación de la plantilla en auditoría.
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={applying}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={apply}
            disabled={!preview || applying}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aplicar plantilla
          </button>
        </div>
      </div>
    </div>
  )
}

function TemplateStatusBadge({ status }: { status: 'CREATE' | 'REACTIVATE' | 'REUSE' }) {
  if (status === 'CREATE') {
    return <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">Crear</span>
  }
  if (status === 'REACTIVATE') {
    return <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-800">Reactivar</span>
  }
  return <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">Usar</span>
}

// ─── Import Excel modal ──────────────────────────────────────────────────────
type ImportRowStatus = 'READY' | 'WARNING' | 'ERROR'
interface ImportPreview {
  fileName: string | null
  sheetName: string | null
  totals: {
    rows: number
    ready: number
    warnings: number
    errors: number
    workersMatched: number
    vacantPositions: number
    unitsToCreate: number
    unitsToReactivate: number
    positionsToCreate: number
    positionsToReparent: number
    assignmentsToCreate: number
    assignmentsToClose: number
  }
  rows: Array<{
    rowNumber: number
    dni: string | null
    workerName: string | null
    workerMatchedName: string | null
    areaName: string | null
    positionTitle: string | null
    managerRef: string | null
    resolvedManager: string | null
    status: ImportRowStatus
    messages: string[]
  }>
  errors: string[]
}

interface ImportApplyResult extends ImportPreview {
  applied: true
  created: { units: number; positions: number; assignments: number }
  updated: { unitsReactivated: number; positionsReparented: number }
  closedAssignments: number
}

function ImportExcelModal({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [applying, setApplying] = useState(false)

  const submit = async (nextFile: File, apply: boolean) => {
    const formData = new FormData()
    formData.append('file', nextFile)
    formData.append('apply', apply ? 'true' : 'false')

    const res = await fetch('/api/orgchart/import-excel', {
      method: 'POST',
      body: formData,
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (isImportPreviewPayload(payload)) setPreview(payload)
      throw new Error(payload?.error ?? 'No se pudo procesar el archivo')
    }
    return payload
  }

  const analyze = async (nextFile: File | null = file) => {
    if (!nextFile) return
    setLoadingPreview(true)
    try {
      const data = await submit(nextFile, false)
      if (isImportPreviewPayload(data)) {
        setPreview(data)
        if (data.totals.errors > 0) {
          toast.error(`${data.totals.errors} filas necesitan corrección antes de aplicar.`)
        } else {
          toast.success('Preview listo para revisión.')
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al analizar')
    } finally {
      setLoadingPreview(false)
    }
  }

  const apply = async () => {
    if (!file || !preview || preview.totals.errors > 0) return
    setApplying(true)
    try {
      const data = await submit(file, true)
      if (isImportApplyResult(data)) {
        toast.success(
          `Importación aplicada: ${data.created.units} áreas, ${data.created.positions} cargos, ${data.created.assignments} asignaciones.`,
        )
      } else {
        toast.success('Importación aplicada.')
      }
      onDone()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al aplicar importación')
    } finally {
      setApplying(false)
    }
  }

  const canApply = Boolean(file && preview && preview.totals.errors === 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Importar estructura desde Excel</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Upload className="h-4 w-4" />
              Seleccionar archivo
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={event => {
                  const nextFile = event.target.files?.[0] ?? null
                  setFile(nextFile)
                  setPreview(null)
                  if (nextFile) analyze(nextFile)
                }}
              />
            </label>
            <a
              href="/api/orgchart/import-excel"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Plantilla CSV
            </a>
            {file && (
              <span className="truncate text-sm text-slate-600">
                {file.name} · {Math.max(1, Math.round(file.size / 1024))} KB
              </span>
            )}
            <button
              onClick={() => analyze()}
              disabled={!file || loadingPreview}
              className="ml-auto inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Analizar
            </button>
          </div>

          {preview && (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Filas" value={preview.totals.rows} />
                <Stat label="Errores" value={preview.totals.errors} highlight={preview.totals.errors > 0} />
                <Stat label="Áreas nuevas" value={preview.totals.unitsToCreate} highlight />
                <Stat label="Cargos nuevos" value={preview.totals.positionsToCreate} highlight />
                <Stat label="Asignaciones" value={preview.totals.assignmentsToCreate} highlight />
                <Stat label="Reasignaciones" value={preview.totals.assignmentsToClose} highlight={preview.totals.assignmentsToClose > 0} />
                <Stat label="Vacantes" value={preview.totals.vacantPositions} />
                <Stat label="Cambios de jefe" value={preview.totals.positionsToReparent} highlight={preview.totals.positionsToReparent > 0} />
              </div>

              {preview.totals.errors > 0 && (
                <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <AlertTriangle className="h-4 w-4" />
                    Corrige el archivo antes de aplicar
                  </div>
                  <div className="max-h-24 overflow-auto text-xs">
                    {preview.errors.slice(0, 8).map(error => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 overflow-hidden rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Estado</th>
                      <th className="px-3 py-2">Trabajador</th>
                      <th className="px-3 py-2">Área</th>
                      <th className="px-3 py-2">Cargo</th>
                      <th className="px-3 py-2">Jefe</th>
                      <th className="px-3 py-2">Observación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {preview.rows.map(row => (
                      <tr key={row.rowNumber} className="align-top">
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{row.rowNumber}</td>
                        <td className="px-3 py-2">
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${importStatusClass(row.status)}`}>
                            {importStatusLabel(row.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">
                            {row.workerMatchedName ?? row.workerName ?? 'Vacante'}
                          </div>
                          <div className="font-mono text-xs text-slate-400">{row.dni ?? '—'}</div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">{row.areaName ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-700">{row.positionTitle ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{row.resolvedManager ?? row.managerRef ?? '—'}</td>
                        <td className="max-w-[280px] px-3 py-2 text-xs text-slate-600">
                          {row.messages.length > 0 ? row.messages.join(' ') : 'Sin observaciones.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={applying}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={apply}
            disabled={!canApply || applying}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aplicar importación
          </button>
        </div>
      </div>
    </div>
  )
}

function importStatusClass(status: ImportRowStatus) {
  if (status === 'ERROR') return 'bg-rose-100 text-rose-700'
  if (status === 'WARNING') return 'bg-amber-100 text-amber-800'
  return 'bg-emerald-100 text-emerald-700'
}

function importStatusLabel(status: ImportRowStatus) {
  if (status === 'ERROR') return 'Error'
  if (status === 'WARNING') return 'Revisar'
  return 'Listo'
}

function isImportPreviewPayload(value: unknown): value is ImportPreview {
  return (
    typeof value === 'object' &&
    value !== null &&
    'totals' in value &&
    'rows' in value &&
    Array.isArray((value as { rows?: unknown }).rows)
  )
}

function isImportApplyResult(value: unknown): value is ImportApplyResult {
  return isImportPreviewPayload(value) && (value as { applied?: unknown }).applied === true
}

// ─── Wizard de seed legacy ───────────────────────────────────────────────────
interface SeedPreview {
  unitsToCreate: Array<{ slug: string; name: string }>
  positionsToCreate: Array<{ unitSlug: string; title: string }>
  assignmentsToCreate: number
  totalWorkers: number
  workersWithoutDepartment: number
  workersWithoutPosition: number
}
function SeedWizard({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [preview, setPreview] = useState<SeedPreview | null>(null)
  const [applying, setApplying] = useState(false)

  useEffect(() => {
    fetch('/api/orgchart/seed-from-legacy')
      .then(r => r.json())
      .then(setPreview)
      .catch(() => toast.error('Error al cargar preview'))
  }, [])

  const apply = async () => {
    setApplying(true)
    try {
      const res = await fetch('/api/orgchart/seed-from-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      })
      if (!res.ok) throw new Error('Error al aplicar')
      const data = await res.json()
      toast.success(`Listo: ${data.units} áreas, ${data.positions} cargos, ${data.assignments} asignaciones.`)
      onDone()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Auto-generar organigrama</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Detectaremos áreas y cargos desde los datos de tus trabajadores. Es idempotente — puedes
          editar después.
        </p>
        {preview === null ? (
          <div className="mt-6 text-center text-sm text-slate-500">Analizando…</div>
        ) : (
          <div className="mt-5 space-y-3">
            <Stat label="Trabajadores activos" value={preview.totalWorkers} />
            <Stat label="Áreas a crear" value={preview.unitsToCreate.length} highlight />
            <Stat label="Cargos a crear" value={preview.positionsToCreate.length} highlight />
            <Stat label="Asignaciones" value={preview.assignmentsToCreate} highlight />
            {preview.workersWithoutDepartment > 0 && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                ⚠️ {preview.workersWithoutDepartment} trabajadores sin área asignada quedarán en
                &quot;Sin área&quot;.
              </div>
            )}
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={apply}
            disabled={applying || !preview}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Generar organigrama
          </button>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-base font-semibold ${highlight ? 'text-emerald-700' : 'text-slate-900'}`}>
        {value}
      </span>
    </div>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(value)
}

// ─── Auditor Link modal ──────────────────────────────────────────────────────
type AuditorHours = 24 | 48 | 72 | 168 | 360
function AuditorLinkModal({ onClose }: { onClose: () => void }) {
  const [hours, setHours] = useState<AuditorHours>(48)
  const [includeWorkers, setIncludeWorkers] = useState(true)
  const [includeRoles, setIncludeRoles] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [link, setLink] = useState<{ url: string; expiresAt: string; hash: string } | null>(null)

  const generate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/orgchart/public-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expiresInHours: hours,
          includeWorkers,
          includeComplianceRoles: includeRoles,
        }),
      })
      if (!res.ok) throw new Error('Error al generar')
      const data = await res.json()
      setLink(data)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setGenerating(false)
    }
  }

  const copy = () => {
    if (!link) return
    navigator.clipboard.writeText(link.url)
    toast.success('Enlace copiado')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Auditor Link</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          Genera un enlace temporal firmado para entregarle al inspector SUNAFIL, auditor externo
          o due diligence. Sin sueldos ni DNI. Verificable por hash sha256.
        </p>
        {!link ? (
          <>
            <div className="mt-5 space-y-3">
              <label className="block text-sm">
                <span className="text-slate-700">Vigencia</span>
                <select
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={hours}
                  onChange={e => setHours(Number(e.target.value) as AuditorHours)}
                >
                  <option value={24}>24 horas — inspección sorpresa</option>
                  <option value={48}>48 horas — recomendado SUNAFIL</option>
                  <option value={72}>72 horas — fin de semana incluido</option>
                  <option value={168}>7 días — homologación cliente/proveedor</option>
                  <option value={360}>15 días — due diligence M&amp;A</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={includeWorkers} onChange={e => setIncludeWorkers(e.target.checked)} />
                Mostrar nombres de los ocupantes
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={includeRoles} onChange={e => setIncludeRoles(e.target.checked)} />
                Incluir comités y roles legales
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={generate}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                Generar enlace
              </button>
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="mb-1 h-4 w-4" />
              Enlace generado. Vence el{' '}
              <strong>{new Date(link.expiresAt).toLocaleString('es-PE')}</strong>.
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={link.url}
                className="flex-1 truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={copy}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                <Copy className="h-3 w-3" />
                Copiar
              </button>
            </div>
            <div className="text-xs text-slate-500">
              Hash del snapshot: <span className="font-mono">{link.hash.slice(0, 16)}…</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CreateUnit modal ────────────────────────────────────────────────────────
function CreateUnitModal({
  existingUnits,
  onClose,
  onCreated,
}: {
  existingUnits: OrgUnitDTO[]
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState<OrgUnitDTO['kind']>('AREA')
  const [parentId, setParentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, kind, parentId }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al crear')
      }
      toast.success('Unidad creada')
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Nueva unidad</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-700">Nombre</span>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej. Gerencia de Operaciones"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Tipo</span>
            <select
              value={kind}
              onChange={e => setKind(e.target.value as OrgUnitDTO['kind'])}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="GERENCIA">Gerencia</option>
              <option value="AREA">Área</option>
              <option value="DEPARTAMENTO">Departamento</option>
              <option value="EQUIPO">Equipo</option>
              <option value="COMITE_LEGAL">Comité legal</option>
              <option value="BRIGADA">Brigada</option>
              <option value="PROYECTO">Proyecto</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">Reporta a (opcional)</span>
            <select
              value={parentId ?? ''}
              onChange={e => setParentId(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— Sin padre (raíz) —</option>
              {existingUnits.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !name.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Crear unidad
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── UnitInspector ───────────────────────────────────────────────────────────
function UnitInspector({
  unit,
  tree,
  onClose,
  onChanged,
  onCreatePosition,
  onEditPosition,
  onAssignWorker,
  onAssignRole,
  readOnly,
}: {
  unit: OrgUnitDTO
  tree: OrgChartTree
  onClose: () => void
  onChanged: () => void
  onCreatePosition: (unitId: string) => void
  onEditPosition: (positionId: string) => void
  onAssignWorker: (positionId: string) => void
  onAssignRole: (unitId: string) => void
  readOnly: boolean
}) {
  const positions = tree.positions.filter(p => p.orgUnitId === unit.id)
  const positionIds = new Set(positions.map(p => p.id))
  const occupants = tree.assignments.filter(a => positionIds.has(a.positionId))
  const roles = tree.complianceRoles.filter(r => r.unitId === unit.id)

  const deleteUnit = async () => {
    if (!confirm(`¿Eliminar "${unit.name}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await fetch(`/api/orgchart/units/${unit.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error')
      }
      toast.success('Unidad eliminada')
      onClose()
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const removeAssignment = async (assignmentId: string) => {
    if (!confirm('¿Cesar esta asignación? El historial se preserva pero la persona deja de ocupar el cargo.')) return
    try {
      const res = await fetch(`/api/orgchart/assignments/${assignmentId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al cesar asignación')
      toast.success('Asignación cesada')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  const removePosition = async (positionId: string) => {
    if (!confirm('¿Eliminar este cargo? No puede tener ocupantes vigentes.')) return
    try {
      const res = await fetch(`/api/orgchart/positions/${positionId}`, { method: 'DELETE' })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error')
      }
      toast.success('Cargo eliminado')
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div className="w-[400px] overflow-y-auto border-l border-slate-200 bg-white">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-emerald-600" />
          <div>
            <div className="text-sm font-semibold text-slate-900">{unit.name}</div>
            <div className="text-[10px] uppercase tracking-wide text-slate-500">{unit.kind}</div>
          </div>
        </div>
        <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
          <X className="h-4 w-4 text-slate-500" />
        </button>
      </div>

      <div className="space-y-5 p-5">
        {/* Cargos */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Cargos ({positions.length}) · {occupants.length} ocupantes
              </span>
            </div>
            {!readOnly && (
              <button
                onClick={() => onCreatePosition(unit.id)}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
              >
                <Plus className="h-3 w-3" />
                Nuevo cargo
              </button>
            )}
          </div>
          <div className="space-y-2">
            {positions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500">
                Sin cargos definidos en esta unidad.
                {!readOnly && (
                  <button
                    onClick={() => onCreatePosition(unit.id)}
                    className="mt-2 block w-full text-emerald-700 underline hover:text-emerald-800"
                  >
                    Crear el primero
                  </button>
                )}
              </div>
            ) : (
              positions.map(p => {
                const occ = tree.assignments.filter(a => a.positionId === p.id)
                return (
                  <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                          {p.title}
                          {p.isManagerial && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                              Jefatura
                            </span>
                          )}
                        </div>
                        {p.code && <div className="mt-0.5 text-[10px] font-mono text-slate-400">#{p.code}</div>}
                      </div>
                      <div className="flex items-center gap-1">
                        {!readOnly && (
                          <button
                            onClick={() => onEditPosition(p.id)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                            title="Editar cargo y MOF"
                          >
                            <Briefcase className="h-3 w-3" />
                            Editar
                          </button>
                        )}
                        <a
                          href={`/api/orgchart/positions/${p.id}/mof`}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50"
                          title="Descargar MOF"
                        >
                          <Download className="h-3 w-3" />
                          MOF
                        </a>
                        {!readOnly && (
                          <a
                            href={`/dashboard/contratos/nuevo?positionId=${encodeURIComponent(p.id)}`}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-medium text-sky-700 hover:bg-sky-50"
                            title="Generar contrato con datos del cargo"
                          >
                            <ScrollText className="h-3 w-3" />
                            Contrato
                          </a>
                        )}
                        {!readOnly && (
                          <button
                            onClick={() => removePosition(p.id)}
                            className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Eliminar cargo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {occ.length === 0 ? (
                        <div className="text-[11px] text-amber-700">Vacante</div>
                      ) : (
                        occ.map(o => (
                          <div key={o.id} className="flex items-center justify-between gap-1 rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-700">
                            <span className="truncate">
                              {o.worker.firstName} {o.worker.lastName}
                              {o.isInterim && <span className="ml-1 text-amber-600">(interino)</span>}
                            </span>
                            {!readOnly && (
                              <button
                                onClick={() => removeAssignment(o.id)}
                                className="rounded p-0.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                                title="Cesar asignación"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            )}
                          </div>
                        ))
                      )}
                      {!readOnly && (
                        <button
                          onClick={() => onAssignWorker(p.id)}
                          className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded border border-dashed border-emerald-300 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50"
                        >
                          <UserPlus className="h-3 w-3" />
                          Asignar trabajador
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {/* Roles legales */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ScrollText className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Roles legales ({roles.length})
              </span>
            </div>
            {!readOnly && (
              <button
                onClick={() => onAssignRole(unit.id)}
                className="inline-flex items-center gap-1 rounded-md border border-violet-300 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-100"
              >
                <Plus className="h-3 w-3" />
                Asignar rol
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {roles.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-500">
                Sin roles legales asignados.
                <div className="mt-1 text-[10px] text-slate-400">
                  Comité SST, DPO, brigadas, etc.
                </div>
              </div>
            ) : (
              roles.map(r => {
                const def = COMPLIANCE_ROLES[r.roleType]
                return (
                  <div key={r.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                    <div className="font-medium text-slate-800">{def.label}</div>
                    <div className="text-[11px] text-slate-600">
                      {r.worker.firstName} {r.worker.lastName}
                    </div>
                    {r.endsAt && (
                      <div className="mt-0.5 text-[10px] text-slate-400">
                        Vigencia hasta {new Date(r.endsAt).toLocaleDateString('es-PE')}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] font-mono text-slate-400">{def.baseLegal}</div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        {!readOnly && (
          <button
            onClick={deleteUnit}
            className="w-full rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            Eliminar unidad
          </button>
        )}
      </div>
    </div>
  )
}

// ─── PositionForm modal ──────────────────────────────────────────────────────
function PositionFormModal({
  unitId,
  unitName,
  position,
  allPositions,
  units,
  onClose,
  onCreated,
}: {
  unitId: string
  unitName: string
  position?: OrgChartTree['positions'][number] | null
  allPositions: OrgChartTree['positions']
  units: OrgUnitDTO[]
  onClose: () => void
  onCreated: () => void
}) {
  const isEditing = Boolean(position)
  const [title, setTitle] = useState(position?.title ?? '')
  const [code, setCode] = useState(position?.code ?? '')
  const [description, setDescription] = useState(position?.description ?? '')
  const [level, setLevel] = useState(position?.level ?? '')
  const [category, setCategory] = useState(position?.category ?? '')
  const [purpose, setPurpose] = useState(position?.purpose ?? '')
  const [functionsText, setFunctionsText] = useState(listToText(position?.functions))
  const [responsibilitiesText, setResponsibilitiesText] = useState(listToText(position?.responsibilities))
  const requirements = requirementsToForm(position?.requirements)
  const [education, setEducation] = useState(requirements.education)
  const [experience, setExperience] = useState(requirements.experience)
  const [competenciesText, setCompetenciesText] = useState(requirements.competencies)
  const [riskCategory, setRiskCategory] = useState(position?.riskCategory ?? '')
  const [requiresSctr, setRequiresSctr] = useState(Boolean(position?.requiresSctr))
  const [requiresMedicalExam, setRequiresMedicalExam] = useState(Boolean(position?.requiresMedicalExam))
  const [isCritical, setIsCritical] = useState(Boolean(position?.isCritical))
  const [isManagerial, setIsManagerial] = useState(Boolean(position?.isManagerial))
  const [reportsToPositionId, setReportsToPositionId] = useState(position?.reportsToPositionId ?? '')
  const [backupPositionId, setBackupPositionId] = useState(position?.backupPositionId ?? '')
  const [seats, setSeats] = useState(position?.seats ?? 1)
  const [salaryBandMin, setSalaryBandMin] = useState(position?.salaryBandMin ?? '')
  const [salaryBandMax, setSalaryBandMax] = useState(position?.salaryBandMax ?? '')
  const [submitting, setSubmitting] = useState(false)
  const functions = useMemo(() => splitMultiline(functionsText), [functionsText])
  const responsibilities = useMemo(() => splitMultiline(responsibilitiesText), [responsibilitiesText])
  const requirementsPayload = useMemo(
    () => buildRequirementsPayload(education, experience, competenciesText),
    [education, experience, competenciesText],
  )
  const mofReport = useMemo(
    () =>
      analyzeMof({
        title,
        description,
        level,
        category,
        purpose,
        functions,
        responsibilities,
        requirements: requirementsPayload,
        riskCategory,
        requiresSctr,
        requiresMedicalExam,
        isCritical,
        isManagerial,
        reportsToPositionId: reportsToPositionId || null,
        backupPositionId: backupPositionId || null,
      }),
    [
      title,
      description,
      level,
      category,
      purpose,
      functions,
      responsibilities,
      requirementsPayload,
      riskCategory,
      requiresSctr,
      requiresMedicalExam,
      isCritical,
      isManagerial,
      reportsToPositionId,
      backupPositionId,
    ],
  )

  const submit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const payload = {
        orgUnitId: unitId,
        title: title.trim(),
        code: code.trim() || null,
        description: description.trim() || null,
        level: level.trim() || null,
        category: category.trim() || null,
        purpose: purpose.trim() || null,
        functions,
        responsibilities,
        requirements: requirementsPayload,
        salaryBandMin: parseOptionalMoney(salaryBandMin),
        salaryBandMax: parseOptionalMoney(salaryBandMax),
        riskCategory: riskCategory.trim() || null,
        requiresSctr,
        requiresMedicalExam,
        isCritical,
        isManagerial,
        reportsToPositionId: reportsToPositionId || null,
        backupPositionId: backupPositionId || null,
        seats,
      }
      const res = await fetch(isEditing ? `/api/orgchart/positions/${position!.id}` : '/api/orgchart/positions', {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? (isEditing ? 'Error al actualizar cargo' : 'Error al crear cargo'))
      }
      toast.success(isEditing ? 'Cargo y MOF actualizados' : 'Cargo creado')
      onCreated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const selectablePositions = allPositions.filter(item => item.id !== position?.id)
  const unitsById = new Map(units.map(unit => [unit.id, unit]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {isEditing ? 'Editar cargo y MOF' : `Nuevo cargo en ${unitName}`}
              </h2>
              <div className="text-xs text-slate-500">{unitName}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm md:col-span-2">
                  <span className="text-slate-700">Título del cargo</span>
                  <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej. Gerente de Operaciones, Jefe de Tienda, Vendedor"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    autoFocus
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="text-slate-700">Descripción general</span>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Resume el alcance del cargo, su aporte principal y el contexto operativo."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-700">Código</span>
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Ej. GER-001"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-700">Nivel</span>
                  <input
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    placeholder="Ej. Gerencia, Jefatura, Operativo"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-700">Categoría</span>
                  <input
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Ej. Administrativo, Operativo, SST"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-700">Cupos</span>
                  <input
                    type="number"
                    min={1}
                    value={seats}
                    onChange={e => setSeats(parseInt(e.target.value) || 1)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="text-slate-700">Propósito del cargo</span>
                <textarea
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  rows={3}
                  placeholder="Describe por qué existe este cargo dentro de la organización."
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-slate-700">Funciones principales</span>
                  <textarea
                    value={functionsText}
                    onChange={e => setFunctionsText(e.target.value)}
                    rows={6}
                    placeholder="Una función por línea"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-700">Responsabilidades</span>
                  <textarea
                    value={responsibilitiesText}
                    onChange={e => setResponsibilitiesText(e.target.value)}
                    rows={6}
                    placeholder="Una responsabilidad por línea"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-slate-700">Formación requerida</span>
                  <textarea
                    value={education}
                    onChange={e => setEducation(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-700">Experiencia requerida</span>
                  <textarea
                    value={experience}
                    onChange={e => setExperience(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm md:col-span-2">
                  <span className="text-slate-700">Competencias</span>
                  <textarea
                    value={competenciesText}
                    onChange={e => setCompetenciesText(e.target.value)}
                    rows={3}
                    placeholder="Una competencia por línea"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4">
                <MofCompletenessPanel report={mofReport} />
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-900">Línea de mando</div>
                <label className="block text-sm">
                  <span className="text-slate-700">Reporta a</span>
                  <select
                    value={reportsToPositionId}
                    onChange={e => setReportsToPositionId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Sin jefe inmediato</option>
                    {selectablePositions.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title} · {unitsById.get(item.orgUnitId)?.name ?? 'Área'}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="mt-3 block text-sm">
                  <span className="text-slate-700">Backup</span>
                  <select
                    value={backupPositionId}
                    onChange={e => setBackupPositionId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Sin backup</option>
                    {selectablePositions.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.title} · {unitsById.get(item.orgUnitId)?.name ?? 'Área'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-900">Banda salarial</div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <label className="block text-sm">
                    <span className="text-slate-700">Mínimo</span>
                    <input
                      type="number"
                      min={0}
                      value={salaryBandMin}
                      onChange={e => setSalaryBandMin(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-slate-700">Máximo</span>
                    <input
                      type="number"
                      min={0}
                      value={salaryBandMax}
                      onChange={e => setSalaryBandMax(e.target.value)}
                      placeholder="0.00"
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Útil para cuadro de categorías, equidad salarial y auditoría de compensaciones.
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="mb-3 text-sm font-semibold text-slate-900">SST y criticidad</div>
                <label className="block text-sm">
                  <span className="text-slate-700">Riesgo SST</span>
                  <select
                    value={riskCategory}
                    onChange={e => setRiskCategory(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Sin clasificar</option>
                    <option value="BAJO">Bajo</option>
                    <option value="MEDIO">Medio</option>
                    <option value="ALTO">Alto</option>
                    <option value="CRITICO">Crítico</option>
                  </select>
                </label>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={isManagerial} onChange={e => setIsManagerial(e.target.checked)} />
                    Cargo con mando
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} />
                    Cargo crítico
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={requiresSctr} onChange={e => setRequiresSctr(e.target.checked)} />
                    Requiere SCTR
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" checked={requiresMedicalExam} onChange={e => setRequiresMedicalExam(e.target.checked)} />
                    Requiere examen médico
                  </label>
                </div>
              </div>

              {isEditing && (
                <a
                  href={`/api/orgchart/positions/${position!.id}/mof`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
                >
                  <Download className="h-4 w-4" />
                  Descargar MOF
                </a>
              )}
            </aside>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !title.trim() || !unitId}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {isEditing ? 'Guardar cambios' : 'Crear cargo'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MofCompletenessPanel({ report }: { report: MofCompletenessReport }) {
  const topIssues = report.issues.slice(0, 5)
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">Completitud MOF</div>
          <div className="mt-1 text-xs text-slate-500">
            {report.completed}/{report.total} criterios completos
          </div>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${mofStatusClass(report.status)}`}>
          {mofStatusLabel(report.status)}
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-slate-700">{report.score}/100</span>
          <span className="text-slate-500">listo para auditoría</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${mofProgressClass(report.status)}`} style={{ width: `${report.score}%` }} />
        </div>
      </div>

      {topIssues.length > 0 ? (
        <div className="mt-4 space-y-2">
          {topIssues.map(item => (
            <div key={item.key} className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${mofIssueDotClass(item.severity)}`} />
                <span className="text-xs font-semibold text-slate-800">{item.label}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-500">{item.detail}</div>
            </div>
          ))}
          {report.issues.length > topIssues.length && (
            <div className="text-[11px] text-slate-500">+{report.issues.length - topIssues.length} pendiente(s) adicional(es).</div>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          MOF completo para descarga y evidencia.
        </div>
      )}

      {report.strengths.length > 0 && (
        <div className="mt-4 space-y-1">
          {report.strengths.slice(0, 3).map(item => (
            <div key={item} className="flex items-center gap-2 text-[11px] text-emerald-700">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function mofStatusLabel(status: MofReadinessStatus) {
  if (status === 'complete') return 'Completo'
  if (status === 'usable') return 'Usable'
  if (status === 'incomplete') return 'Incompleto'
  return 'Crítico'
}

function mofStatusClass(status: MofReadinessStatus) {
  if (status === 'complete') return 'bg-emerald-100 text-emerald-700'
  if (status === 'usable') return 'bg-sky-100 text-sky-700'
  if (status === 'incomplete') return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
}

function mofProgressClass(status: MofReadinessStatus) {
  if (status === 'complete') return 'bg-emerald-500'
  if (status === 'usable') return 'bg-sky-500'
  if (status === 'incomplete') return 'bg-amber-500'
  return 'bg-rose-500'
}

function mofIssueDotClass(severity: MofIssueSeverity) {
  if (severity === 'high') return 'bg-rose-500'
  if (severity === 'medium') return 'bg-amber-500'
  return 'bg-slate-400'
}

function splitMultiline(value: string) {
  const items = value
    .split(/\r?\n|;/g)
    .map(item => item.trim())
    .filter(Boolean)
  return items.length > 0 ? items : null
}

function parseOptionalMoney(value: string) {
  const normalized = value.trim()
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function listToText(value: unknown) {
  if (!value) return ''
  if (Array.isArray(value)) return value.map(item => String(item)).join('\n')
  if (typeof value === 'string') return value
  return ''
}

function requirementsToForm(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { education: '', experience: '', competencies: '' }
  }
  const record = value as { education?: unknown; experience?: unknown; competencies?: unknown }
  return {
    education: typeof record.education === 'string' ? record.education : '',
    experience: typeof record.experience === 'string' ? record.experience : '',
    competencies: Array.isArray(record.competencies) ? record.competencies.map(item => String(item)).join('\n') : '',
  }
}

function buildRequirementsPayload(education: string, experience: string, competenciesText: string) {
  const competencies = splitMultiline(competenciesText)
  const payload = {
    education: education.trim() || null,
    experience: experience.trim() || null,
    ...(competencies ? { competencies } : {}),
  }
  return payload.education || payload.experience || competencies ? payload : null
}

// ─── AssignWorkerModal ───────────────────────────────────────────────────────
interface WorkerOption {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
  department: string | null
}
function AssignWorkerModal({
  positionId,
  positionTitle,
  onClose,
  onAssigned,
}: {
  positionId: string
  positionTitle: string
  onClose: () => void
  onAssigned: () => void
}) {
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [search, setSearch] = useState('')
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null)
  const [isInterim, setIsInterim] = useState(false)
  const [isPrimary, setIsPrimary] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/workers?limit=500')
      .then(r => r.json())
      .then(data => {
        setWorkers(data.workers ?? data.items ?? data)
        setLoading(false)
      })
      .catch(() => {
        toast.error('No se pudieron cargar los trabajadores')
        setLoading(false)
      })
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers.slice(0, 50)
    return workers
      .filter(w =>
        `${w.firstName} ${w.lastName} ${w.dni} ${w.position ?? ''} ${w.department ?? ''}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 50)
  }, [workers, search])

  const submit = async () => {
    if (!selectedWorkerId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId: selectedWorkerId,
          positionId,
          isPrimary,
          isInterim,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al asignar')
      }
      toast.success('Trabajador asignado al cargo')
      onAssigned()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Asignar trabajador a {positionTitle}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, DNI, área, cargo legacy..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200">
            {loading ? (
              <div className="p-4 text-center text-xs text-slate-500">Cargando trabajadores…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">Sin resultados</div>
            ) : (
              filtered.map(w => (
                <button
                  key={w.id}
                  onClick={() => setSelectedWorkerId(w.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-slate-50 ${
                    selectedWorkerId === w.id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-slate-800">
                      {w.firstName} {w.lastName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      DNI {w.dni}
                      {w.position && ` · ${w.position}`}
                      {w.department && ` · ${w.department}`}
                    </div>
                  </div>
                  {selectedWorkerId === w.id && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                </button>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isPrimary} onChange={e => setIsPrimary(e.target.checked)} />
              Cargo titular (cierra otras asignaciones primarias del trabajador)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isInterim} onChange={e => setIsInterim(e.target.checked)} />
              Es interino / encargado temporal
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !selectedWorkerId}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Asignar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── AssignComplianceRoleModal ───────────────────────────────────────────────
function AssignComplianceRoleModal({
  unitId,
  unitName,
  initialRoleType,
  onClose,
  onAssigned,
}: {
  unitId: string | null
  unitName: string
  initialRoleType?: ComplianceRoleType
  onClose: () => void
  onAssigned: () => void
}) {
  const [workers, setWorkers] = useState<WorkerOption[]>([])
  const [roleType, setRoleType] = useState<ComplianceRoleType>(initialRoleType ?? 'PRESIDENTE_COMITE_SST')
  const [workerId, setWorkerId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/workers?limit=500')
      .then(r => r.json())
      .then(data => setWorkers(data.workers ?? data.items ?? data))
      .catch(() => toast.error('No se pudieron cargar los trabajadores'))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers.slice(0, 30)
    return workers
      .filter(w => `${w.firstName} ${w.lastName} ${w.dni}`.toLowerCase().includes(q))
      .slice(0, 30)
  }, [workers, search])

  const submit = async () => {
    if (!workerId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/orgchart/compliance-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          roleType,
          unitId,
        }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error')
      }
      toast.success('Rol legal asignado')
      onAssigned()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setSubmitting(false)
    }
  }

  const def = COMPLIANCE_ROLES[roleType]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText className="h-5 w-5 text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">Asignar rol legal en {unitName}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-700">Tipo de rol legal</span>
            <select
              value={roleType}
              onChange={e => setRoleType(e.target.value as ComplianceRoleType)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              {Object.entries(COMPLIANCE_ROLES).map(([key, d]) => (
                <option key={key} value={key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <div className="rounded-lg bg-slate-50 p-3 text-xs">
            <div className="font-medium text-slate-700">{def.label}</div>
            <div className="mt-1 text-slate-600">{def.description}</div>
            <div className="mt-1 font-mono text-[10px] text-slate-500">📜 {def.baseLegal}</div>
            {def.defaultDurationMonths && (
              <div className="mt-1 text-[10px] text-slate-500">
                Vigencia por defecto: {def.defaultDurationMonths} meses
              </div>
            )}
          </div>
          <div>
            <span className="text-sm text-slate-700">Trabajador a designar</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o DNI..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-500">Sin resultados</div>
            ) : (
              filtered.map(w => (
                <button
                  key={w.id}
                  onClick={() => setWorkerId(w.id)}
                  className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-slate-50 ${
                    workerId === w.id ? 'bg-violet-50' : ''
                  }`}
                >
                  <div>
                    <div className="font-medium text-slate-800">
                      {w.firstName} {w.lastName}
                    </div>
                    <div className="text-[10px] text-slate-500">DNI {w.dni}</div>
                  </div>
                  {workerId === w.id && <CheckCircle2 className="h-4 w-4 text-violet-600" />}
                </button>
              ))
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || !workerId}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Asignar rol legal
          </button>
        </div>
      </div>
    </div>
  )
}
