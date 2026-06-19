'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  History,
  Inbox,
  ListChecks,
  Loader2,
  Radar,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Target,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  UserCheck,
  XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSoles, formatSolesParts } from '@/lib/format/peruvian'

type TabKey = 'resumen' | 'diagnostico' | 'brechas' | 'plan' | 'radar' | 'inspecciones'
type Tone = 'red' | 'amber' | 'emerald' | 'cyan'

interface Riesgo {
  codigo: string
  categoria: string
  severidad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  titulo: string
  baseLegal: string
  multaEstimadaSoles: number
  multaConSubsanacionSoles: number
  ahorroSubsanacion: number
  accionInmediata: string
  urgencia: number
}

interface RiskReport {
  totalMultaSoles: number
  totalMultaConSubsanacionSoles: number
  ahorroTotalSoles: number
  resumen: {
    muyGraves: number
    graves: number
    leves: number
    totalRiesgos?: number
    areasMasRiesgosas: string[]
  }
  riesgos: Riesgo[]
}

interface RadarFinding {
  id: string
  categoria: string
  severidad: 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
  titulo: string
  descripcion: string
  multaPotencialSoles: number
  baseLegal: string
  fixSugerido: string
  fixUrl?: string
}

interface RadarOutput {
  scanFecha: string
  totalTrabajadoresEvaluados: number
  totalContratosEvaluados: number
  findings: RadarFinding[]
  exposicionTotalSoles: number
  scoreRiesgo: number
  desglosePorSeveridad: {
    CRITICO: number
    ALTO: number
    MEDIO: number
    BAJO: number
  }
}

interface RadarAction {
  id: string
  label: string
  description: string
}

interface RadarAgentResult {
  data: RadarOutput
  recommendedActions: RadarAction[]
  durationMs: number
}

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'

interface ComplianceTaskEvidenceSummary {
  id: string
  taskId: string
  sourceId: string | null
  title: string | null
  fileName: string | null
  fileUrl: string
  storagePath: string | null
  bucket: string | null
  mimeType: string | null
  sizeBytes: number | null
  hashSha256: string | null
  notes: string | null
  uploadedBy: string | null
  createdAt: string
  updatedAt: string
}

interface ComplianceTaskSummary {
  id: string
  sourceId: string | null
  area: string
  priority: number
  title: string
  description: string | null
  baseLegal: string | null
  gravedad: Riesgo['severidad']
  multaEvitable: number | null
  plazoSugerido: string | null
  dueDate: string | null
  assignedTo: string | null
  status: TaskStatus
  evidenceUrl: string | null
  notes: string | null
  completedAt: string | null
  createdAt: string
  evidences?: ComplianceTaskEvidenceSummary[]
}

interface TasksResponse {
  tasks: ComplianceTaskSummary[]
}

interface EvidenceRequirement {
  id: string
  label: string
  keywords: string[]
}

interface EvidenceRequirementStatus extends EvidenceRequirement {
  covered: boolean
  matchedEvidence?: ComplianceTaskEvidenceSummary
}

interface EvidenceCoverage {
  total: number
  covered: number
  percent: number
  statuses: EvidenceRequirementStatus[]
  missing: EvidenceRequirementStatus[]
}

interface ExpedienteHistoryItem {
  id: string
  format: 'pdf' | 'zip' | string
  filename: string
  score: number | null
  totalRisks: number
  tasksCount: number
  evidenceCount: number
  pdfHashSha256: string | null
  zipHashSha256: string | null
  sha256: string | null
  createdBy: string | null
  createdAt: string
}

interface ExpedienteHistoryResponse {
  exports: ExpedienteHistoryItem[]
  error?: string
}

interface ReadinessBlocker {
  id: string
  title: string
  reason: string
  action: string
  severity: Riesgo['severidad']
}

interface ExpeditionReadiness {
  score: number
  label: string
  tone: Tone
  totalRisks: number
  requiredEvidence: number
  coveredEvidence: number
  evidenceCoverage: number
  withTask: number
  inProgress: number
  completed: number
  withEvidence: number
  withoutTask: number
  blockers: ReadinessBlocker[]
}

const TABS: Array<{ key: TabKey; label: string; icon: typeof ShieldCheck }> = [
  { key: 'resumen', label: 'Resumen', icon: ShieldCheck },
  { key: 'diagnostico', label: 'Diagnostico', icon: ClipboardList },
  { key: 'brechas', label: 'Brechas', icon: ShieldAlert },
  { key: 'plan', label: 'Plan', icon: Target },
  { key: 'radar', label: 'Radar', icon: Radar },
  { key: 'inspecciones', label: 'Inspecciones', icon: Siren },
]

const PRIMARY_ACTIONS = [
  {
    title: 'Ejecutar diagnostico',
    description: 'Actualiza el score SUNAFIL y detecta brechas por area.',
    href: '/dashboard/diagnostico',
    icon: ClipboardList,
  },
  {
    title: 'Simular inspeccion',
    description: 'Ensayo preventivo con preguntas y acta orientativa.',
    href: '/dashboard/simulacro',
    icon: ShieldAlert,
  },
  {
    title: 'Activar inspeccion real',
    description: 'War room solo cuando ya hay carta, requerimiento o visita.',
    href: '/dashboard/inspeccion-en-vivo',
    icon: Siren,
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  RELACIONES_LABORALES: 'Relaciones laborales',
  SST: 'Seguridad y salud',
  SEGURIDAD_SOCIAL: 'Seguridad social',
  EMPLEO_COLOCACION: 'Empleo y colocacion',
  REMUNERACIONES: 'Remuneraciones',
  JORNADA_DESCANSO: 'Jornada y descanso',
  DOCUMENTOS_REGISTROS: 'Documentos y registros',
  IGUALDAD: 'Igualdad y no discriminacion',
  MODALIDADES_FORMATIVAS: 'Modalidades formativas',
}

const SEVERITY_STYLE: Record<Riesgo['severidad'], string> = {
  MUY_GRAVE: 'border-red-500/40 bg-red-500/10 text-red-200',
  GRAVE: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  LEVE: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
}

const RADAR_SEVERITY_STYLE: Record<RadarFinding['severidad'], string> = {
  CRITICO: 'border-red-500/40 bg-red-500/10 text-red-200',
  ALTO: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
  MEDIO: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  BAJO: 'border-cyan-500/40 bg-cyan-500/10 text-cyan-200',
}

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pendiente',
  IN_PROGRESS: 'En subsanacion',
  COMPLETED: 'Cerrada con evidencia',
  DISMISSED: 'Descartada',
}

const TASK_STATUS_STYLE: Record<TaskStatus, string> = {
  PENDING: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  IN_PROGRESS: 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
  COMPLETED: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  DISMISSED: 'border-slate-400/20 bg-slate-400/10 text-slate-200',
}

function formatSolesCompact(value: number) {
  return `S/ ${formatSolesParts(value).amount}`
}

interface NextMove {
  label: string
  body: string
  tab: TabKey
  tone: Tone
}

function isTabKey(value: string | null): value is TabKey {
  return Boolean(value && TABS.some((item) => item.key === value))
}

export default function CentroSunafilPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('resumen')
  const [report, setReport] = useState<RiskReport | null>(null)
  const [loadingRisk, setLoadingRisk] = useState(true)
  const [riskError, setRiskError] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [simulationScore, setSimulationScore] = useState<number | null>(null)

  function selectTab(tab: TabKey, syncUrl = true) {
    setActiveTab(tab)
    if (!syncUrl) return
    const url = new URL(window.location.href)
    if (tab === 'resumen') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  }

  const loadRisk = useCallback(async () => {
    setLoadingRisk(true)
    setRiskError(null)
    try {
      const res = await fetch('/api/compliance/scan', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'No se pudo calcular el riesgo.')
      setReport(data.report as RiskReport)
    } catch (error) {
      setRiskError(error instanceof Error ? error.message : 'No se pudo calcular el riesgo.')
    } finally {
      setLoadingRisk(false)
    }
  }, [])

  const syncTabFromUrl = useCallback(() => {
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (isTabKey(tab)) setActiveTab(tab)
  }, [])

  async function runQuickSimulation() {
    setSimulating(true)
    try {
      const res = await fetch('/api/simulacro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'PREVENTIVA' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo simular.')
      setSimulationScore(typeof data.scoreSimulacro === 'number' ? data.scoreSimulacro : null)
      selectTab('inspecciones')
    } catch {
      setSimulationScore(null)
    } finally {
      setSimulating(false)
    }
  }

  useEffect(() => {
    const syncTimer = window.setTimeout(syncTabFromUrl, 0)
    const loadTimer = window.setTimeout(() => {
      void loadRisk()
    }, 0)
    return () => {
      window.clearTimeout(syncTimer)
      window.clearTimeout(loadTimer)
    }
  }, [loadRisk, syncTabFromUrl])

  const topRisks = useMemo(
    () => [...(report?.riesgos ?? [])].sort((a, b) => b.urgencia - a.urgencia).slice(0, 5),
    [report],
  )

  const exposureLevel = report
    ? report.resumen.muyGraves > 0 || report.totalMultaSoles > 100_000
      ? 'CRITICO'
      : report.resumen.graves > 0
        ? 'ALTO'
        : 'CONTROLADO'
    : 'PENDIENTE'

  const nextMove = useMemo<NextMove>(() => {
    if (loadingRisk) {
      return {
        label: 'Actualizando radar',
        body: 'Se esta recalculando exposicion, brechas y ahorro por subsanacion.',
        tab: 'resumen',
        tone: 'cyan',
      }
    }
    if (!report) {
      return {
        label: 'Ejecutar diagnostico',
        body: 'Hace falta una foto legal completa para ordenar el riesgo.',
        tab: 'diagnostico',
        tone: 'amber',
      }
    }
    if (topRisks.length > 0) {
      return {
        label: 'Cerrar brechas criticas',
        body: `${topRisks.length} frentes deben pasar a tarea, responsable y evidencia.`,
        tab: 'brechas',
        tone: report.resumen.muyGraves > 0 ? 'red' : 'amber',
      }
    }
    if (simulationScore === null) {
      return {
        label: 'Validar con simulacro',
        body: 'El riesgo esta controlado; toca probar el expediente como lo miraria SUNAFIL.',
        tab: 'inspecciones',
        tone: 'cyan',
      }
    }
    return {
      label: 'Mantener radar activo',
      body: `Ultima simulacion: ${simulationScore}/100. Sigue el monitoreo preventivo.`,
      tab: 'radar',
      tone: simulationScore >= 80 ? 'emerald' : 'amber',
    }
  }, [loadingRisk, report, simulationScore, topRisks])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-cyan-400/20 bg-[#07111f] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase text-cyan-200">
              <ShieldCheck className="h-3.5 w-3.5" />
              Centro SUNAFIL
            </div>
            <h1 className="mt-4 text-3xl font-black text-white">Una cabina unica para riesgo, brechas e inspecciones.</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Diagnostico, riesgo monetario, radar preventivo, simulacion e inspecciones reales reunidos en un solo flujo operativo.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <Metric label="Exposicion" value={report ? formatSolesCompact(report.totalMultaSoles) : '...'} tone="red" />
            <Metric label="Ahorro subsanando" value={report ? formatSolesCompact(report.ahorroTotalSoles) : '...'} tone="emerald" />
            <Metric label="Brechas" value={report ? String(report.riesgos.length) : '...'} tone="amber" />
            <Metric label="Estado" value={exposureLevel} tone={exposureLevel === 'CRITICO' ? 'red' : exposureLevel === 'ALTO' ? 'amber' : 'emerald'} />
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {PRIMARY_ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-cyan-300/50 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-3">
                  <Icon className="h-5 w-5 text-cyan-300" />
                  <ArrowRight className="h-4 w-4 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-cyan-200" />
                </div>
                <p className="mt-3 text-sm font-bold text-white">{action.title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-400">{action.description}</p>
              </Link>
            )
          })}
        </div>

        <ExportStrip />

        <NextMoveCard move={nextMove} onSelectTab={selectTab} />
      </section>

      <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              className={cn(
                'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition',
                active ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {riskError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {riskError}
        </div>
      ) : null}

      {activeTab === 'resumen' ? (
        <ResumenTab
          report={report}
          loading={loadingRisk}
          topRisks={topRisks}
          simulationScore={simulationScore}
          onRefresh={loadRisk}
          onSelectTab={selectTab}
        />
      ) : null}
      {activeTab === 'diagnostico' ? <DiagnosticoTab /> : null}
      {activeTab === 'brechas' ? <BrechasTab report={report} loading={loadingRisk} topRisks={topRisks} onRefresh={loadRisk} /> : null}
      {activeTab === 'plan' ? <PlanTab topRisks={topRisks} /> : null}
      {activeTab === 'radar' ? <RadarTab onRefresh={loadRisk} loading={loadingRisk} /> : null}
      {activeTab === 'inspecciones' ? (
        <InspeccionesTab
          onSimulate={runQuickSimulation}
          simulating={simulating}
          simulationScore={simulationScore}
        />
      ) : null}
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone: Exclude<Tone, 'cyan'> }) {
  const toneClass = tone === 'red' ? 'text-red-300' : tone === 'amber' ? 'text-amber-300' : 'text-emerald-300'
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
      <p className="text-[10px] font-bold uppercase text-slate-500">{label}</p>
      <p className={cn('mt-1 break-words text-lg font-black leading-tight', toneClass)}>{value}</p>
    </div>
  )
}

function NextMoveCard({ move, onSelectTab }: { move: NextMove; onSelectTab: (tab: TabKey) => void }) {
  const toneClass = {
    red: 'border-red-400/30 bg-red-500/10 text-red-100',
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    cyan: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
  }[move.tone]

  return (
    <div className={cn('mt-4 flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between', toneClass)}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] opacity-70">Siguiente movimiento</p>
        <p className="mt-1 text-base font-black text-white">{move.label}</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">{move.body}</p>
      </div>
      <button
        type="button"
        onClick={() => onSelectTab(move.tab)}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-300"
      >
        Ver accion
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function ExportStrip() {
  const [history, setHistory] = useState<ExpedienteHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetch('/api/sunafil/expediente/history?take=3', { cache: 'no-store' })
      const data = (await res.json()) as ExpedienteHistoryResponse
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el historial.')
      setHistory(data.exports ?? [])
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'No se pudo cargar el historial.')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadHistory()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadHistory])

  function refreshAfterExport() {
    window.setTimeout(() => {
      void loadHistory()
    }, 2500)
  }

  return (
    <div className="mt-4 border-y border-white/10 py-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-sm font-black text-white">
            <FileText className="h-4 w-4 text-cyan-300" />
            Expediente SUNAFIL exportable
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            Consolida resumen, brechas, tareas, bitacoras y evidencias para revision legal o defensa inspectiva.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/sunafil/expediente?format=pdf"
            onClick={refreshAfterExport}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-100"
          >
            <FileText className="h-3.5 w-3.5" />
            Descargar PDF
          </a>
          <a
            href="/api/sunafil/expediente?format=zip"
            onClick={refreshAfterExport}
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/40 px-3 py-2 text-xs font-black text-cyan-100 transition hover:bg-cyan-400/10"
          >
            <Download className="h-3.5 w-3.5" />
            Paquete ZIP
          </a>
        </div>
      </div>
      <ExpedienteHistoryMini
        history={history}
        loading={historyLoading}
        error={historyError}
        onRefresh={loadHistory}
      />
    </div>
  )
}

function ExpedienteHistoryMini({
  history,
  loading,
  error,
  onRefresh,
}: {
  history: ExpedienteHistoryItem[]
  loading: boolean
  error: string | null
  onRefresh: () => void
}) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/30 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-200">
            <History className="h-3.5 w-3.5 text-cyan-300" />
            Historial de expedientes
          </p>
          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            Cada export queda registrado con score, volumen de evidencia y hash de integridad.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-bold text-slate-300 transition hover:bg-white/10 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Actualizar
        </button>
      </div>

      {error ? (
        <p className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 p-2 text-xs text-red-100">{error}</p>
      ) : null}

      {!loading && history.length === 0 && !error ? (
        <p className="mt-3 rounded-lg border border-dashed border-white/10 p-2 text-xs leading-5 text-slate-500">
          Aun no hay versiones registradas. Descarga un PDF o ZIP para crear la primera version auditada.
        </p>
      ) : null}

      {history.length > 0 ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-3">
          {history.map((item) => (
            <div key={item.id} className="rounded-lg border border-white/10 bg-black/15 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-white">{item.filename}</p>
                  <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">
                    {item.format.toUpperCase()} · {formatHistoryDate(item.createdAt)}
                  </p>
                </div>
                <span className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black',
                  (item.score ?? 0) >= 90
                    ? 'bg-emerald-400/15 text-emerald-200'
                    : (item.score ?? 0) >= 70
                      ? 'bg-cyan-400/15 text-cyan-200'
                      : 'bg-amber-400/15 text-amber-200',
                )}>
                  {item.score ?? '--'}%
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <HistoryKpi label="Brechas" value={item.totalRisks} />
                <HistoryKpi label="Tareas" value={item.tasksCount} />
                <HistoryKpi label="Evid." value={item.evidenceCount} />
              </div>
              <p className="mt-2 truncate font-mono text-[10px] text-slate-500">
                SHA {item.sha256 ? item.sha256.slice(0, 18) : 'pendiente'}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function HistoryKpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-white/[0.04] px-2 py-1.5">
      <p className="text-[9px] font-black uppercase text-slate-500">{label}</p>
      <p className="text-xs font-black text-slate-100">{value}</p>
    </div>
  )
}

function ResumenTab({
  report,
  loading,
  topRisks,
  simulationScore,
  onRefresh,
  onSelectTab,
}: {
  report: RiskReport | null
  loading: boolean
  topRisks: Riesgo[]
  simulationScore: number | null
  onRefresh: () => void
  onSelectTab: (tab: TabKey) => void
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Resumen ejecutivo" icon={ShieldCheck} action={<RefreshButton loading={loading} onClick={onRefresh} />}>
          {loading ? <LoadingState label="Calculando exposicion SUNAFIL..." /> : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <SeverityBox label="Muy graves" value={report?.resumen.muyGraves ?? 0} className="border-red-500/30 bg-red-500/10 text-red-200" />
                <SeverityBox label="Graves" value={report?.resumen.graves ?? 0} className="border-orange-500/30 bg-orange-500/10 text-orange-200" />
                <SeverityBox label="Leves" value={report?.resumen.leves ?? 0} className="border-amber-500/30 bg-amber-500/10 text-amber-200" />
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Lectura gerencial</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {topRisks.length > 0
                    ? 'La prioridad es reducir exposicion monetaria documentando subsanaciones, responsables y evidencia antes de cualquier fiscalizacion.'
                    : 'No se detectaron brechas criticas en el ultimo escaneo automatico. Mantener monitoreo semanal y evidencias actualizadas.'}
                </p>
              </div>
            </div>
          )}
        </Panel>
        <Panel title="Acciones de alto impacto" icon={Target}>
          <div className="space-y-3">
            <ActionRow href="/dashboard/tareas" title="Cerrar brechas priorizadas" body="Convertir hallazgos en tareas con responsable y fecha." icon={ClipboardList} />
            <ActionRow href="/dashboard/sunafil-ready" title="Completar expediente SUNAFIL-Ready" body="Revisar los 28 documentos base antes de una visita." icon={FileCheck2} />
            <ActionRow href="/dashboard/casilla-sunafil" title="Revisar Casilla SUNAFIL" body="Separada como canal externo de notificaciones." icon={Inbox} />
          </div>
        </Panel>
      </div>
      <OperatingFlow
        loading={loading}
        report={report}
        topRisks={topRisks}
        simulationScore={simulationScore}
        onSelectTab={onSelectTab}
      />
      <ImpactSimulator report={report} loading={loading} onSelectTab={onSelectTab} />
    </div>
  )
}

function OperatingFlow({
  loading,
  report,
  topRisks,
  simulationScore,
  onSelectTab,
}: {
  loading: boolean
  report: RiskReport | null
  topRisks: Riesgo[]
  simulationScore: number | null
  onSelectTab: (tab: TabKey) => void
}) {
  return (
    <Panel title="Flujo operativo" icon={Target}>
      <div className="grid gap-3 md:grid-cols-5">
        <FlowStep
          step="01"
          title="Diagnostico"
          status={loading ? 'Calculando' : report ? 'Vigente' : 'Pendiente'}
          tone={report ? 'emerald' : 'amber'}
          icon={ClipboardList}
          onClick={() => onSelectTab('diagnostico')}
        />
        <FlowStep
          step="02"
          title="Brechas"
          status={loading ? 'Escaneando' : topRisks.length > 0 ? `${topRisks.length} prioritarias` : 'Controlado'}
          tone={topRisks.length > 0 ? 'red' : 'emerald'}
          icon={ShieldAlert}
          onClick={() => onSelectTab('brechas')}
        />
        <FlowStep
          step="03"
          title="Plan"
          status={topRisks.length > 0 ? 'Accion requerida' : 'Sin urgencia'}
          tone={topRisks.length > 0 ? 'amber' : 'emerald'}
          icon={Target}
          onClick={() => onSelectTab('plan')}
        />
        <FlowStep
          step="04"
          title="Simulacro"
          status={simulationScore === null ? 'Por validar' : `${simulationScore}/100`}
          tone={simulationScore === null ? 'cyan' : simulationScore >= 80 ? 'emerald' : 'amber'}
          icon={ShieldCheck}
          onClick={() => onSelectTab('inspecciones')}
        />
        <FlowStep
          step="05"
          title="Inspeccion real"
          status="Solo con carta"
          tone="cyan"
          icon={Siren}
          onClick={() => onSelectTab('inspecciones')}
        />
      </div>
    </Panel>
  )
}

function ImpactSimulator({
  report,
  loading,
  onSelectTab,
}: {
  report: RiskReport | null
  loading: boolean
  onSelectTab: (tab: TabKey) => void
}) {
  const [scope, setScope] = useState<'top1' | 'top3' | 'top5' | 'all'>('top3')
  const sortedRisks = useMemo(
    () => [...(report?.riesgos ?? [])].sort((a, b) => b.urgencia - a.urgencia || b.multaEstimadaSoles - a.multaEstimadaSoles),
    [report],
  )
  const selectedCount =
    scope === 'all'
      ? sortedRisks.length
      : Math.min(sortedRisks.length, scope === 'top1' ? 1 : scope === 'top3' ? 3 : 5)
  const selectedRisks = sortedRisks.slice(0, selectedCount)
  const totalExposure = report?.totalMultaSoles ?? 0
  const selectedExposure = selectedRisks.reduce((sum, risk) => sum + risk.multaEstimadaSoles, 0)
  const selectedSavings = selectedRisks.reduce((sum, risk) => sum + risk.ahorroSubsanacion, 0)
  const remainingExposure = Math.max(0, totalExposure - selectedSavings)
  const reductionPct = totalExposure > 0 ? Math.round((selectedSavings / totalExposure) * 100) : 0
  const selectedSharePct = totalExposure > 0 ? Math.round((selectedExposure / totalExposure) * 100) : 0
  const remainingPct = totalExposure > 0 ? Math.round((remainingExposure / totalExposure) * 100) : 0

  const options: Array<{ key: typeof scope; label: string; helper: string }> = [
    { key: 'top1', label: '1 brecha', helper: 'primer golpe' },
    { key: 'top3', label: '3 brechas', helper: '7 dias' },
    { key: 'top5', label: '5 brechas', helper: '30 dias' },
    { key: 'all', label: 'todas', helper: 'cierre total' },
  ]

  return (
    <Panel
      title="Simulador anti-multas"
      icon={TrendingDown}
      action={
        <button
          type="button"
          onClick={() => onSelectTab('brechas')}
          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-300/30 px-3 py-1.5 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/10"
        >
          Abrir brechas
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      }
    >
      {loading ? (
        <LoadingState label="Calculando escenarios de reduccion de multa..." />
      ) : !report || sortedRisks.length === 0 ? (
        <EmptyState
          title="No hay multa evitable pendiente"
          body="El escaneo actual no detecta brechas con exposicion monetaria. Mantener radar preventivo."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {options.map((option) => {
              const active = scope === option.key
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setScope(option.key)}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition',
                    active
                      ? 'border-cyan-300 bg-cyan-300 text-slate-950'
                      : 'border-white/10 bg-slate-950/30 text-slate-300 hover:border-cyan-300/40 hover:bg-cyan-400/10 hover:text-white',
                  )}
                >
                  <span className="block text-xs font-black uppercase">{option.label}</span>
                  <span className={cn('mt-0.5 block text-[10px] font-bold', active ? 'text-slate-700' : 'text-slate-500')}>
                    {option.helper}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <ScenarioKpi label="Exposicion actual" value={formatSolesCompact(totalExposure)} tone="red" />
            <ScenarioKpi label="Ahorro posible" value={formatSolesCompact(selectedSavings)} tone="emerald" />
            <ScenarioKpi label="Reduccion" value={`${reductionPct}%`} tone={reductionPct >= 70 ? 'emerald' : reductionPct >= 40 ? 'cyan' : 'amber'} />
            <ScenarioKpi label="Luego de subsanar" value={formatSolesCompact(remainingExposure)} tone={remainingExposure === 0 ? 'emerald' : 'amber'} />
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
            <div className="flex items-center justify-between gap-3 text-xs font-black uppercase text-slate-400">
              <span>Impacto sobre exposicion total</span>
              <span>{selectedCount} de {sortedRisks.length} brecha(s)</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-emerald-300" style={{ width: `${Math.min(100, reductionPct)}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-400">
              <span className="text-emerald-200">{reductionPct}% bajaria por subsanacion voluntaria</span>
              <span>{selectedSharePct}% de la exposicion esta en el bloque elegido</span>
              <span>{remainingPct}% quedaria por gestionar</span>
            </div>
          </div>

          <div className="space-y-2">
            {selectedRisks.slice(0, 5).map((risk, index) => (
              <div
                key={`${risk.codigo}-scenario-${index}`}
                className="grid gap-3 rounded-xl border border-white/10 bg-slate-950/30 p-3 md:grid-cols-[auto_1fr_auto]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', SEVERITY_STYLE[risk.severidad])}>
                      {risk.severidad.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">{risk.codigo}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-white">{risk.titulo}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">{risk.accionInmediata}</p>
                </div>
                <div className="text-left md:text-right">
                  <p className="text-xs font-bold uppercase text-slate-500">Ahorro</p>
                  <p className="text-sm font-black text-emerald-200">{formatSolesCompact(risk.ahorroSubsanacion)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  )
}

function ScenarioKpi({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  const toneClass = {
    red: 'text-red-300',
    amber: 'text-amber-300',
    emerald: 'text-emerald-300',
    cyan: 'text-cyan-300',
  }[tone]

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3">
      <p className="text-[10px] font-black uppercase text-slate-500">{label}</p>
      <p className={cn('mt-1 truncate text-xl font-black', toneClass)}>{value}</p>
    </div>
  )
}

function FlowStep({
  step,
  title,
  status,
  tone,
  icon: Icon,
  onClick,
}: {
  step: string
  title: string
  status: string
  tone: Tone
  icon: typeof ShieldCheck
  onClick: () => void
}) {
  const dotClass = {
    red: 'bg-red-400',
    amber: 'bg-amber-300',
    emerald: 'bg-emerald-300',
    cyan: 'bg-cyan-300',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-white/10 bg-slate-950/30 p-4 text-left transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] font-black text-slate-500">{step}</span>
        <span className={cn('h-2 w-2 rounded-full', dotClass)} />
      </div>
      <Icon className="mt-4 h-5 w-5 text-cyan-300" />
      <p className="mt-3 text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs font-bold text-slate-400">{status}</p>
    </button>
  )
}

function DiagnosticoTab() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel title="Diagnostico SUNAFIL" icon={ClipboardList}>
        <p className="text-sm leading-6 text-slate-300">
          El diagnostico es la foto legal de la empresa. Desde aqui se actualiza el score, se detectan brechas y se alimentan el plan de accion, el radar y la simulacion.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryLink href="/dashboard/diagnostico">Iniciar diagnostico</PrimaryLink>
          <SecondaryLink href="/dashboard/configuracion/diagnostico">Configurar criterio</SecondaryLink>
        </div>
      </Panel>
      <Panel title="Que debe producir" icon={FileText}>
        <Checklist items={[
          'Score por area y peso de riesgo.',
          'Brechas con norma, gravedad y multa estimada.',
          'Evidencia requerida para subsanar.',
          'Plan de accion priorizado y trazable.',
        ]} />
      </Panel>
    </div>
  )
}

function BrechasTab({ report, loading, topRisks, onRefresh }: { report: RiskReport | null; loading: boolean; topRisks: Riesgo[]; onRefresh: () => void }) {
  const [showAll, setShowAll] = useState(false)
  const [tasks, setTasks] = useState<ComplianceTaskSummary[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [creatingSourceId, setCreatingSourceId] = useState<string | null>(null)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const allRisks = useMemo(
    () => [...(report?.riesgos ?? [])].sort((a, b) => b.urgencia - a.urgencia),
    [report],
  )
  const visibleRisks = showAll ? allRisks : topRisks
  const taskBySourceId = useMemo(() => {
    const map = new Map<string, ComplianceTaskSummary>()
    for (const task of tasks) {
      if (task.sourceId) map.set(task.sourceId, task)
    }
    return map
  }, [tasks])
  const readiness = useMemo(
    () => buildExpedienteReadiness(allRisks, taskBySourceId),
    [allRisks, taskBySourceId],
  )

  const loadTasks = useCallback(async () => {
    setTasksLoading(true)
    setTaskError(null)
    try {
      const params = new URLSearchParams({ status: 'PENDING,IN_PROGRESS,COMPLETED,DISMISSED' })
      const res = await fetch(`/api/compliance-tasks?${params.toString()}`, { cache: 'no-store' })
      const data = (await res.json()) as TasksResponse & { error?: string }
      if (!res.ok) throw new Error(data.error || 'No se pudo cargar el expediente de tareas.')
      setTasks(data.tasks ?? [])
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'No se pudo cargar el expediente de tareas.')
    } finally {
      setTasksLoading(false)
    }
  }, [])

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadTasks()
    }, 0)
    return () => window.clearTimeout(loadTimer)
  }, [loadTasks])

  async function createTaskFromRisk(risk: Riesgo, priority: number) {
    const sourceId = sourceIdForRisk(risk)
    setCreatingSourceId(sourceId)
    setTaskError(null)
    try {
      const evidence = evidenceForRisk(risk)
      const owner = ownerForRisk(risk)
      const res = await fetch('/api/compliance-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          title: risk.titulo,
          area: risk.categoria.toLowerCase(),
          description: [
            `Accion inmediata: ${risk.accionInmediata}`,
            `Responsable sugerido: ${owner}`,
            `Evidencia requerida: ${evidence.join('; ')}`,
            `Riesgo SUNAFIL: ${risk.severidad.replace('_', ' ')} (${risk.codigo}).`,
          ].join('\n'),
          baseLegal: risk.baseLegal,
          gravedad: risk.severidad,
          multaEvitable: risk.ahorroSubsanacion,
          priority,
          plazoSugerido: plazoSugeridoForRisk(risk),
          dueDate: dueDateForRisk(risk).toISOString(),
        }),
      })
      const data = (await res.json()) as { task?: ComplianceTaskSummary; error?: string }
      if (!res.ok || !data.task) throw new Error(data.error || 'No se pudo crear la tarea.')
      setTasks((current) => [
        data.task as ComplianceTaskSummary,
        ...current.filter((task) => task.id !== data.task?.id && task.sourceId !== data.task?.sourceId),
      ])
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'No se pudo crear la tarea.')
    } finally {
      setCreatingSourceId(null)
    }
  }

  async function patchTask(taskId: string, patch: Partial<Pick<ComplianceTaskSummary, 'status' | 'evidenceUrl' | 'notes' | 'assignedTo' | 'dueDate'>>) {
    setUpdatingTaskId(taskId)
    setTaskError(null)
    try {
      const res = await fetch('/api/compliance-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, ...patch }),
      })
      const data = (await res.json()) as { task?: ComplianceTaskSummary; error?: string }
      if (!res.ok || !data.task) throw new Error(data.error || 'No se pudo actualizar la tarea.')
      setTasks((current) => current.map((task) => (task.id === data.task?.id ? data.task as ComplianceTaskSummary : task)))
      return data.task
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'No se pudo actualizar la tarea.')
      throw error
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function saveProgress(task: ComplianceTaskSummary, notes: string) {
    await patchTask(task.id, {
      status: task.status === 'PENDING' ? 'IN_PROGRESS' : task.status,
      notes: notes.trim() || null,
    })
  }

  async function uploadEvidenceForTask(task: ComplianceTaskSummary, file: File, notes: string, title?: string) {
    setUpdatingTaskId(task.id)
    setTaskError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'documents')
      formData.append('subfolder', 'sunafil-brechas')
      const uploadRes = await fetch('/api/storage/upload', {
        method: 'POST',
        body: formData,
      })
      const uploadData = (await uploadRes.json()) as {
        data?: {
          url?: string
          path?: string
          bucket?: string
          size?: number
          mimeType?: string
          hashSha256?: string
        }
        error?: string
      }
      if (!uploadRes.ok || !uploadData.data?.url) throw new Error(uploadData.error || 'No se pudo subir la evidencia.')
      const evidenceRes = await fetch(`/api/compliance-tasks/${task.id}/evidences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title?.trim() || file.name,
          fileName: file.name,
          fileUrl: uploadData.data.url,
          storagePath: uploadData.data.path,
          bucket: uploadData.data.bucket,
          mimeType: uploadData.data.mimeType,
          sizeBytes: uploadData.data.size,
          hashSha256: uploadData.data.hashSha256,
          notes: notes.trim() || null,
        }),
      })
      const evidenceData = (await evidenceRes.json()) as { task?: ComplianceTaskSummary; error?: string }
      if (!evidenceRes.ok || !evidenceData.task) throw new Error(evidenceData.error || 'No se pudo registrar la evidencia.')
      setTasks((current) => current.map((item) => (item.id === evidenceData.task?.id ? evidenceData.task as ComplianceTaskSummary : item)))
      return evidenceData.task
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : 'No se pudo registrar la evidencia.')
      throw error
    } finally {
      setUpdatingTaskId(null)
    }
  }

  async function completeWithEvidence(task: ComplianceTaskSummary, file: File | null, notes: string) {
    const nextTask = file ? await uploadEvidenceForTask(task, file, notes) : task
    const evidenceUrl = primaryEvidenceUrl(nextTask)
    if (!evidenceUrl) throw new Error('Sube un archivo de evidencia antes de cerrar la brecha.')
    await patchTask(nextTask.id, {
      status: 'COMPLETED',
      evidenceUrl,
      notes: notes.trim() || nextTask.notes,
    })
  }

  return (
    <Panel title="Brechas priorizadas" icon={ShieldAlert} action={<RefreshButton loading={loading} onClick={onRefresh} />}>
      <div className="space-y-3">
        <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-black text-white">Expediente de subsanacion</p>
              <p className="mt-1 text-xs leading-5 text-cyan-100/80">
                Cada brecha puede convertirse en tarea con plazo, responsable sugerido, evidencia y trazabilidad para auditoria.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {tasksLoading ? (
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cargando tareas
                </span>
              ) : null}
              <Link
                href="/dashboard/tareas"
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-200"
              >
                Ver tablero de tareas
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <a
                href="/api/sunafil/expediente?format=pdf"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                <FileText className="h-3.5 w-3.5" />
                PDF
              </a>
              <a
                href="/api/sunafil/expediente?format=zip"
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
              >
                <Download className="h-3.5 w-3.5" />
                ZIP
              </a>
            </div>
          </div>
        </div>
        {!loading ? <ReadinessPanel readiness={readiness} /> : null}
        {taskError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
            {taskError}
          </div>
        ) : null}
        {loading ? <LoadingState label="Escaneando trabajadores, contratos y documentos..." /> : topRisks.length === 0 ? (
          <EmptyState title="Sin brechas criticas detectadas" body="Mantener radar activo y evidencias actualizadas." />
        ) : (
          <>
          {visibleRisks.map((risk, index) => {
            const sourceId = sourceIdForRisk(risk)
            return (
              <RiskCard
                key={`${risk.codigo}-${risk.titulo}`}
                risk={risk}
                task={taskBySourceId.get(sourceId)}
                creating={creatingSourceId === sourceId}
                updating={updatingTaskId === taskBySourceId.get(sourceId)?.id}
                onCreateTask={() => createTaskFromRisk(risk, index + 1)}
                onSaveProgress={saveProgress}
                onUploadEvidence={async (task, file, notes, title) => {
                  await uploadEvidenceForTask(task, file, notes, title)
                }}
                onCompleteWithEvidence={completeWithEvidence}
                onReopenTask={async (task) => {
                  await patchTask(task.id, { status: 'PENDING' })
                }}
              />
            )
          })}
          {allRisks.length > topRisks.length ? (
            <button
              type="button"
              onClick={() => setShowAll((value) => !value)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/10"
            >
              {showAll ? 'Ver solo prioritarias' : `Ver todas las brechas (${allRisks.length})`}
              <ArrowRight className={cn('h-3.5 w-3.5 transition', showAll && 'rotate-180')} />
            </button>
          ) : null}
          </>
        )}
      </div>
    </Panel>
  )
}

function ReadinessPanel({ readiness }: { readiness: ExpeditionReadiness }) {
  const toneClass = {
    red: 'border-red-400/30 bg-red-500/10 text-red-100',
    amber: 'border-amber-400/30 bg-amber-500/10 text-amber-100',
    emerald: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100',
    cyan: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100',
  }[readiness.tone]
  const barClass = {
    red: 'bg-red-300',
    amber: 'bg-amber-300',
    emerald: 'bg-emerald-300',
    cyan: 'bg-cyan-300',
  }[readiness.tone]

  return (
    <div className={cn('rounded-xl border p-4', toneClass)}>
      <div className="grid gap-4 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] opacity-75">
            <FileCheck2 className="h-4 w-4" />
            Score inspectivo
          </p>
          <div className="mt-3 flex items-end gap-2">
            <p className="text-5xl font-black text-white">{readiness.score}%</p>
            <p className="mb-2 text-sm font-bold">{readiness.label}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/25">
            <div className={cn('h-full rounded-full transition-all', barClass)} style={{ width: `${readiness.score}%` }} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <ReadinessKpi label="Brechas" value={readiness.totalRisks} />
          <ReadinessKpi label="Con tarea" value={readiness.withTask} />
          <ReadinessKpi label="Con archivos" value={readiness.withEvidence} />
          <ReadinessKpi label="Evid. cubiertas" value={`${readiness.coveredEvidence}/${readiness.requiredEvidence}`} />
          <ReadinessKpi label="Cobertura evid." value={`${readiness.evidenceCoverage}%`} />
          <ReadinessKpi label="En subsanacion" value={readiness.inProgress} />
          <ReadinessKpi label="Cerradas" value={readiness.completed} />
          <ReadinessKpi label="Sin tarea" value={readiness.withoutTask} />
        </div>
      </div>

      {readiness.blockers.length > 0 ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-slate-950/35 p-3">
          <p className="text-xs font-black uppercase text-white">Prioridades antes de enfrentar una inspeccion</p>
          <div className="mt-3 space-y-2">
            {readiness.blockers.map((item) => (
              <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-black/15 p-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', SEVERITY_STYLE[item.severity])}>
                      {item.severity.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-bold text-slate-400">{item.reason}</span>
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-white">{item.title}</p>
                </div>
                <p className="shrink-0 text-xs font-bold text-cyan-100">{item.action}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-3 text-xs font-bold text-emerald-100">
          Todas las brechas detectadas tienen tratamiento documental suficiente para revision interna.
        </div>
      )}
    </div>
  )
}

function ReadinessKpi({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/35 p-3">
      <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function PlanTab({ topRisks }: { topRisks: Riesgo[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.85fr]">
      <Panel title="Plan de accion" icon={Target}>
        <div className="space-y-3">
          {(topRisks.length > 0 ? topRisks.slice(0, 4) : []).map((risk, index) => (
            <div key={`${risk.codigo}-plan`} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
              <p className="text-xs font-black text-cyan-200">Paso {index + 1}</p>
              <p className="mt-1 text-sm font-bold text-white">{risk.accionInmediata}</p>
              <p className="mt-1 text-xs text-slate-500">{risk.baseLegal}</p>
            </div>
          ))}
          {topRisks.length === 0 ? <EmptyState title="Plan sin urgencias criticas" body="Puedes usar Tareas de compliance para mantener controles recurrentes." /> : null}
          <PrimaryLink href="/dashboard/tareas">Abrir tareas de compliance</PrimaryLink>
        </div>
      </Panel>
      <Panel title="Evidencia minima" icon={FileCheck2}>
        <Checklist items={[
          'Documento firmado o registro oficial.',
          'Responsable asignado y fecha de cierre.',
          'Sustento normativo y trazabilidad.',
          'Archivo listo para inspeccion o requerimiento.',
        ]} />
      </Panel>
    </div>
  )
}

function RadarTab({ onRefresh, loading }: { onRefresh: () => void; loading: boolean }) {
  const [radarLoading, setRadarLoading] = useState(false)
  const [radarError, setRadarError] = useState<string | null>(null)
  const [radarResult, setRadarResult] = useState<RadarAgentResult | null>(null)

  async function runRadar() {
    setRadarLoading(true)
    setRadarError(null)
    try {
      const res = await fetch('/api/agents/risk-monitor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'json' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'No se pudo ejecutar el radar.')
      setRadarResult(data as RadarAgentResult)
    } catch (error) {
      setRadarError(error instanceof Error ? error.message : 'No se pudo ejecutar el radar.')
    } finally {
      setRadarLoading(false)
    }
  }

  const data = radarResult?.data

  return (
    <Panel title="Radar preventivo" icon={Radar} action={<RefreshButton loading={loading} onClick={onRefresh} />}>
      <div className="grid gap-3 md:grid-cols-3">
        <RadarSignal title="Vencimientos" body="Contratos, vacaciones, documentos y plazos cercanos." icon={Bell} />
        <RadarSignal title="Brechas nuevas" body="Cambios en trabajadores o legajos que elevan exposicion." icon={AlertTriangle} />
        <RadarSignal title="Fiscalizacion probable" body="Areas con historial de alto impacto o multa mayor." icon={ShieldAlert} />
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/35 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-white">Barrido inteligente</p>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              Revisa trabajadores, contratos, vacaciones, documentos y alertas que pueden convertirse en fiscalizacion.
            </p>
          </div>
          <button
            type="button"
            onClick={runRadar}
            disabled={radarLoading}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {radarLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {radarLoading ? 'Escaneando...' : data ? 'Re-escanear' : 'Ejecutar radar'}
          </button>
        </div>
      </div>

      {radarError ? (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {radarError}
        </div>
      ) : null}

      {radarLoading && !data ? (
        <div className="mt-4">
          <LoadingState label="Ejecutando barrido sobre trabajadores, contratos y documentos..." />
        </div>
      ) : null}

      {data ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
              <p className="text-xs font-bold uppercase text-slate-500">Score de radar</p>
              <div className="mt-2 flex items-end gap-2">
                <p className={cn('text-4xl font-black', data.scoreRiesgo >= 80 ? 'text-emerald-300' : data.scoreRiesgo >= 50 ? 'text-amber-300' : 'text-red-300')}>
                  {data.scoreRiesgo}
                </p>
                <span className="mb-1 text-sm text-slate-500">/100</span>
                {data.scoreRiesgo >= 80 ? <TrendingUp className="mb-1 h-5 w-5 text-emerald-300" /> : <TrendingDown className="mb-1 h-5 w-5 text-red-300" />}
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4 lg:col-span-2">
              <p className="text-xs font-bold uppercase text-slate-500">Exposicion preventiva</p>
              <p className="mt-2 text-3xl font-black text-red-300">{formatSoles(data.exposicionTotalSoles)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {data.totalTrabajadoresEvaluados} trabajadores y {data.totalContratosEvaluados} contratos evaluados.
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <SeverityBox label="Criticos" value={data.desglosePorSeveridad.CRITICO} className={RADAR_SEVERITY_STYLE.CRITICO} />
            <SeverityBox label="Altos" value={data.desglosePorSeveridad.ALTO} className={RADAR_SEVERITY_STYLE.ALTO} />
            <SeverityBox label="Medios" value={data.desglosePorSeveridad.MEDIO} className={RADAR_SEVERITY_STYLE.MEDIO} />
            <SeverityBox label="Bajos" value={data.desglosePorSeveridad.BAJO} className={RADAR_SEVERITY_STYLE.BAJO} />
          </div>
          <div className="space-y-2">
            {data.findings.length === 0 ? (
              <EmptyState title="Radar sin hallazgos" body="El barrido no encontro riesgos preventivos nuevos." />
            ) : (
              data.findings.map((finding) => <RadarFindingRow key={finding.id} finding={finding} />)
            )}
          </div>
          {radarResult.recommendedActions.length > 0 ? (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4">
              <p className="text-sm font-black text-white">Proximos pasos sugeridos</p>
              <div className="mt-3 space-y-2">
                {radarResult.recommendedActions.map((action) => (
                  <div key={action.id} className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                    <p className="text-sm font-bold text-cyan-100">{action.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{action.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <p className="text-center text-xs text-slate-500">
            Ultimo radar: {new Date(data.scanFecha).toLocaleString('es-PE')} · Duracion: {radarResult.durationMs}ms
          </p>
        </div>
      ) : null}
    </Panel>
  )
}

function RadarFindingRow({ finding }: { finding: RadarFinding }) {
  return (
    <div className={cn('rounded-xl border p-4', RADAR_SEVERITY_STYLE[finding.severidad])}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">{finding.severidad}</span>
            <span className="text-[11px] text-slate-400">{finding.categoria}</span>
          </div>
          <p className="mt-2 text-sm font-bold text-white">{finding.titulo}</p>
          <p className="mt-1 text-xs leading-5 text-slate-300">{finding.descripcion}</p>
          <p className="mt-2 text-[11px] leading-5 text-slate-500">{finding.baseLegal}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-300">Fix: {finding.fixSugerido}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <p className="text-[10px] font-bold uppercase text-slate-500">Multa potencial</p>
          <p className="text-sm font-black text-red-200">{formatSoles(finding.multaPotencialSoles)}</p>
          {finding.fixUrl ? (
            <Link href={finding.fixUrl} className="mt-2 inline-flex text-[11px] font-bold text-cyan-200 hover:text-cyan-100">
              Resolver
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function InspeccionesTab({ onSimulate, simulating, simulationScore }: { onSimulate: () => void; simulating: boolean; simulationScore: number | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Simular inspeccion" icon={ShieldAlert}>
        <p className="text-sm leading-6 text-slate-300">
          Usa simulacion como prueba preventiva. El valor es saber que observaria SUNAFIL si revisara hoy.
        </p>
        <button
          type="button"
          onClick={onSimulate}
          disabled={simulating}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
        >
          {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {simulating ? 'Simulando...' : 'Simular ahora'}
        </button>
        {simulationScore !== null ? (
          <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3">
            <p className="text-xs font-bold uppercase text-cyan-200">Resultado preventivo</p>
            <p className="mt-1 text-3xl font-black text-white">{simulationScore}/100</p>
            <Link href="/dashboard/simulacro" className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-cyan-200">
              Abrir simulacro completo <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}
      </Panel>
      <Panel title="Inspeccion real" icon={Siren}>
        <p className="text-sm leading-6 text-slate-300">
          Activalo solo cuando ya exista carta inductiva, requerimiento, orden inspectiva o visita. En ese caso se trabaja con expediente, plazos, respuestas y evidencia.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <PrimaryLink href="/dashboard/inspeccion-en-vivo">Activar caso inspectivo</PrimaryLink>
          <SecondaryLink href="/dashboard/casilla-sunafil">Revisar casilla</SecondaryLink>
        </div>
      </Panel>
    </div>
  )
}

function Panel({ title, icon: Icon, action, children }: { title: string; icon: typeof ShieldCheck; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#091323] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-lg font-black text-white">
          <Icon className="h-5 w-5 text-cyan-300" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function RefreshButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
      Actualizar
    </button>
  )
}

function SeverityBox({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={cn('rounded-xl border p-3 text-center', className)}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-bold">{label}</p>
    </div>
  )
}

function buildExpedienteReadiness(
  risks: Riesgo[],
  taskBySourceId: Map<string, ComplianceTaskSummary>,
): ExpeditionReadiness {
  if (risks.length === 0) {
    return {
      score: 100,
      label: 'Sin brechas criticas',
      tone: 'emerald',
      totalRisks: 0,
      requiredEvidence: 0,
      coveredEvidence: 0,
      evidenceCoverage: 100,
      withTask: 0,
      inProgress: 0,
      completed: 0,
      withEvidence: 0,
      withoutTask: 0,
      blockers: [],
    }
  }

  let totalScore = 0
  let requiredEvidence = 0
  let coveredEvidence = 0
  let withTask = 0
  let inProgress = 0
  let completed = 0
  let withEvidence = 0
  let withoutTask = 0
  const blockers: ReadinessBlocker[] = []

  for (const risk of risks) {
    const task = taskBySourceId.get(sourceIdForRisk(risk))
    const coverage = evidenceCoverageForRisk(risk, task)
    totalScore += readinessScoreForRisk(risk, task)
    requiredEvidence += coverage.total
    coveredEvidence += coverage.covered

    if (!task) {
      withoutTask += 1
      blockers.push({
        id: `${risk.codigo}-task`,
        title: risk.titulo,
        reason: 'Sin tarea',
        action: 'Crear tarea y asignar responsable',
        severity: risk.severidad,
      })
      continue
    }

    withTask += 1
    if (task.status === 'IN_PROGRESS') inProgress += 1
    if (task.status === 'COMPLETED') completed += 1
    if (hasTaskEvidence(task)) withEvidence += 1

    if (task.status === 'DISMISSED' && !task.notes && !hasTaskEvidence(task)) {
      blockers.push({
        id: `${risk.codigo}-dismissed`,
        title: risk.titulo,
        reason: 'Descarte sin sustento',
        action: 'Agregar nota o evidencia de no aplicabilidad',
        severity: risk.severidad,
      })
    } else if (coverage.covered < coverage.total && task.status !== 'DISMISSED') {
      blockers.push({
        id: `${risk.codigo}-evidence-coverage`,
        title: risk.titulo,
        reason: coverage.covered === 0 ? 'Sin evidencia' : 'Evidencia incompleta',
        action: coverage.missing[0]?.label ?? 'Completar evidencia requerida',
        severity: risk.severidad,
      })
    } else if (task.status !== 'COMPLETED' && task.status !== 'DISMISSED') {
      blockers.push({
        id: `${risk.codigo}-close`,
        title: risk.titulo,
        reason: 'Cierre pendiente',
        action: 'Cerrar etapa con evidencia',
        severity: risk.severidad,
      })
    }
  }

  const score = Math.round(totalScore / risks.length)
  const evidenceCoverage = requiredEvidence > 0 ? Math.round((coveredEvidence / requiredEvidence) * 100) : 100
  const tone: Tone = score >= 90 ? 'emerald' : score >= 70 ? 'cyan' : score >= 50 ? 'amber' : 'red'
  const label = score >= 90
    ? 'Listo para revision'
    : score >= 70
      ? 'En preparacion'
      : score >= 50
        ? 'Subsanacion activa'
        : 'Expediente critico'

  return {
    score,
    label,
    tone,
    totalRisks: risks.length,
    requiredEvidence,
    coveredEvidence,
    evidenceCoverage,
    withTask,
    inProgress,
    completed,
    withEvidence,
    withoutTask,
    blockers: blockers.slice(0, 4),
  }
}

function readinessScoreForRisk(risk: Riesgo, task?: ComplianceTaskSummary) {
  if (!task) return 20
  const coverage = evidenceCoverageForRisk(risk, task)
  const fullyCovered = coverage.covered >= coverage.total
  if (task.status === 'COMPLETED') return fullyCovered ? 100 : coverage.covered > 0 ? 86 : 75
  if (task.status === 'DISMISSED') return hasTaskEvidence(task) || task.notes ? 90 : 70
  if (fullyCovered) return 88
  if (coverage.covered > 0) return 72
  if (task.status === 'IN_PROGRESS') return 62
  return 42
}

function normalizeSourcePart(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72)
}

function sourceIdForRisk(risk: Riesgo) {
  return `sunafil-gap:${risk.codigo}:${normalizeSourcePart(risk.titulo)}`
}

function plazoSugeridoForRisk(risk: Riesgo) {
  if (risk.severidad === 'MUY_GRAVE') return 'Inmediato (7 dias)'
  if (risk.severidad === 'GRAVE') return 'Corto plazo (30 dias)'
  return 'Mediano plazo (60 dias)'
}

function dueDateForRisk(risk: Riesgo) {
  const days = risk.severidad === 'MUY_GRAVE' ? 7 : risk.severidad === 'GRAVE' ? 30 : 60
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(17, 0, 0, 0)
  return date
}

function formatTargetDate(date: Date) {
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatEvidenceDate(value: string) {
  return new Date(value).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatHistoryDate(value: string) {
  return new Date(value).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function deadlineLabel(date: Date, status?: TaskStatus) {
  if (status === 'COMPLETED') return 'Cerrada'
  if (status === 'DISMISSED') return 'Descartada'
  const diffMs = date.getTime() - Date.now()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `Vencida hace ${Math.abs(diffDays)} dia(s)`
  if (diffDays === 0) return 'Vence hoy'
  return `${diffDays} dia(s) restantes`
}

function dossierProgress(task: ComplianceTaskSummary | undefined, coverage: EvidenceCoverage) {
  if (!task) return { value: 20, label: 'Hallazgo detectado' }
  if (task.status === 'DISMISSED') return { value: 100, label: 'Descartado con registro' }
  if (task.status === 'COMPLETED' && coverage.percent === 100) return { value: 100, label: 'Cerrado con evidencia completa' }
  if (task.status === 'COMPLETED') return { value: 86, label: `Cerrado con ${coverage.covered}/${coverage.total} evidencias requeridas` }
  if (coverage.percent === 100) return { value: 88, label: 'Checklist documental completo' }
  if (coverage.covered > 0) return { value: 72, label: `${coverage.covered}/${coverage.total} evidencias requeridas cubiertas` }
  if (task.status === 'IN_PROGRESS') return { value: 65, label: 'Subsanacion en curso' }
  return { value: 40, label: 'Tarea creada' }
}

function evidenceItemsForTask(task?: ComplianceTaskSummary): ComplianceTaskEvidenceSummary[] {
  if (!task) return []
  const evidences = [...(task.evidences ?? [])]
  if (evidences.length === 0 && task.evidenceUrl) {
    return [{
      id: `${task.id}-legacy-evidence`,
      taskId: task.id,
      sourceId: task.sourceId,
      title: 'Evidencia registrada',
      fileName: null,
      fileUrl: task.evidenceUrl,
      storagePath: null,
      bucket: null,
      mimeType: null,
      sizeBytes: null,
      hashSha256: null,
      notes: null,
      uploadedBy: null,
      createdAt: task.completedAt ?? task.createdAt,
      updatedAt: task.completedAt ?? task.createdAt,
    }]
  }
  return evidences
}

function evidenceCount(task?: ComplianceTaskSummary) {
  return evidenceItemsForTask(task).length
}

function hasTaskEvidence(task?: ComplianceTaskSummary) {
  return evidenceCount(task) > 0
}

function primaryEvidenceUrl(task?: ComplianceTaskSummary) {
  return evidenceItemsForTask(task)[0]?.fileUrl ?? task?.evidenceUrl ?? null
}

function ownerForRisk(risk: Riesgo) {
  const text = `${risk.categoria} ${risk.titulo}`.toLowerCase()
  if (text.includes('seguridad_social') || text.includes('essalud') || text.includes('seguro social')) return 'Planillas + RRHH'
  if (text.includes('sst') || text.includes('seguridad') || text.includes('salud')) return 'Comite/Supervisor SST'
  if (text.includes('remuner') || text.includes('beneficio') || text.includes('planilla')) return 'Planillas + RRHH'
  if (text.includes('contrato') || text.includes('registro') || text.includes('tercer')) return 'RRHH + Legal laboral'
  if (text.includes('hostig') || text.includes('igualdad') || text.includes('discrimin')) return 'RRHH + Comite/Delegado'
  if (text.includes('jornada') || text.includes('descanso')) return 'RRHH operativo'
  return 'Responsable de compliance'
}

function evidenceForRisk(risk: Riesgo) {
  return evidenceRequirementsForRisk(risk).map((item) => item.label)
}

function evidenceRequirementsForRisk(risk: Riesgo): EvidenceRequirement[] {
  const text = `${risk.categoria} ${risk.titulo} ${risk.baseLegal}`.toLowerCase()
  if (text.includes('seguridad_social') || text.includes('essalud') || text.includes('seguro social')) {
    return [
      {
        id: 'essalud-afiliacion',
        label: 'Constancia de afiliacion a EsSalud',
        keywords: ['essalud', 'afiliacion', 'seguro social'],
      },
      {
        id: 'tregistro-actualizacion',
        label: 'Alta o actualizacion en T-Registro',
        keywords: ['t-registro', 't registro', 'alta', 'actualizacion'],
      },
      {
        id: 'aportes-planilla',
        label: 'Sustento de aportes y regularizacion en planilla',
        keywords: ['aporte', 'planilla', 'regularizacion', 'pago'],
      },
    ]
  }
  if (text.includes('sst') || text.includes('seguridad') || text.includes('salud')) {
    return [
      {
        id: 'sst-registro-base',
        label: 'IPERC/RISST o registro SST actualizado',
        keywords: ['iperc', 'risst', 'sst', 'registro'],
      },
      {
        id: 'sst-acta-comite',
        label: 'Acta del Comite o Supervisor SST',
        keywords: ['acta', 'comite', 'supervisor', 'sst'],
      },
      {
        id: 'sst-capacitacion-medidas',
        label: 'Constancias de capacitacion y medidas correctivas',
        keywords: ['capacitacion', 'constancia', 'medida correctiva', 'medidas correctivas'],
      },
    ]
  }
  if (text.includes('remuner') || text.includes('beneficio') || text.includes('planilla')) {
    return [
      {
        id: 'remu-boletas-planillas',
        label: 'Boletas y planillas corregidas',
        keywords: ['boleta', 'planilla', 'corregida', 'corregidas'],
      },
      {
        id: 'remu-calculo-reintegro',
        label: 'Calculo de reintegro o beneficio',
        keywords: ['calculo', 'reintegro', 'beneficio', 'liquidacion'],
      },
      {
        id: 'remu-constancia-pago',
        label: 'Constancia de pago o regularizacion',
        keywords: ['constancia', 'pago', 'regularizacion', 'deposito'],
      },
    ]
  }
  if (text.includes('contrato') || text.includes('registro') || text.includes('tercer')) {
    return [
      {
        id: 'contrato-adenda-firmada',
        label: 'Contrato o adenda firmada',
        keywords: ['contrato', 'adenda', 'firmada', 'firmado'],
      },
      {
        id: 'contrato-tregistro',
        label: 'Alta/actualizacion en T-Registro',
        keywords: ['t-registro', 't registro', 'alta', 'actualizacion'],
      },
      {
        id: 'contrato-cargo-comunicacion',
        label: 'Cargo de entrega o comunicacion al trabajador',
        keywords: ['cargo', 'entrega', 'comunicacion', 'trabajador'],
      },
    ]
  }
  if (text.includes('hostig') || text.includes('igualdad') || text.includes('discrimin')) {
    return [
      {
        id: 'igualdad-politica-protocolo',
        label: 'Politica o protocolo vigente',
        keywords: ['politica', 'protocolo', 'hostigamiento', 'igualdad'],
      },
      {
        id: 'igualdad-actas-comite',
        label: 'Actas del Comite/Delegado',
        keywords: ['acta', 'comite', 'delegado', 'delegada'],
      },
      {
        id: 'igualdad-capacitacion-comunicaciones',
        label: 'Capacitacion y comunicaciones internas',
        keywords: ['capacitacion', 'comunicacion', 'difusion', 'charla'],
      },
    ]
  }
  if (text.includes('jornada') || text.includes('descanso')) {
    return [
      {
        id: 'jornada-asistencia',
        label: 'Registro de asistencia',
        keywords: ['asistencia', 'marcacion', 'registro'],
      },
      {
        id: 'jornada-horas-extra',
        label: 'Control de horas extra',
        keywords: ['horas extra', 'sobretiempo', 'control'],
      },
      {
        id: 'jornada-descansos',
        label: 'Cronograma de descansos o vacaciones',
        keywords: ['cronograma', 'descanso', 'vacacion', 'vacaciones'],
      },
    ]
  }
  return [
    {
      id: 'generico-documento-subsanacion',
      label: 'Documento de subsanacion firmado',
      keywords: ['documento', 'subsanacion', 'firmado', 'firmada'],
    },
    {
      id: 'generico-sustento-legal',
      label: 'Sustento legal o administrativo',
      keywords: ['sustento', 'legal', 'administrativo', 'informe'],
    },
    {
      id: 'generico-evidencia-inspeccion',
      label: 'Evidencia cargada lista para inspeccion',
      keywords: ['evidencia', 'inspeccion', 'sunafil', 'expediente'],
    },
  ]
}

function evidenceCoverageForRisk(risk: Riesgo, task?: ComplianceTaskSummary): EvidenceCoverage {
  const requirements = evidenceRequirementsForRisk(risk)
  const evidences = evidenceItemsForTask(task)
  const statuses = requirements.map<EvidenceRequirementStatus>((requirement) => {
    const matchedEvidence = evidences.find((evidence) => evidenceMatchesRequirement(evidence, requirement))
    return {
      ...requirement,
      covered: Boolean(matchedEvidence),
      matchedEvidence,
    }
  })
  const covered = statuses.filter((item) => item.covered).length

  return {
    total: statuses.length,
    covered,
    percent: statuses.length > 0 ? Math.round((covered / statuses.length) * 100) : 100,
    statuses,
    missing: statuses.filter((item) => !item.covered),
  }
}

function evidenceMatchesRequirement(evidence: ComplianceTaskEvidenceSummary, requirement: EvidenceRequirement) {
  const haystack = normalizeEvidenceSearch([
    evidence.title,
    evidence.fileName,
    evidence.notes,
    evidence.fileUrl,
  ].filter(Boolean).join(' '))

  return requirement.keywords.some((keyword) => haystack.includes(normalizeEvidenceSearch(keyword)))
}

function normalizeEvidenceSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function RiskCard({
  risk,
  task,
  creating,
  updating,
  onCreateTask,
  onSaveProgress,
  onUploadEvidence,
  onCompleteWithEvidence,
  onReopenTask,
}: {
  risk: Riesgo
  task?: ComplianceTaskSummary
  creating: boolean
  updating: boolean
  onCreateTask: () => void
  onSaveProgress: (task: ComplianceTaskSummary, notes: string) => Promise<void>
  onUploadEvidence: (task: ComplianceTaskSummary, file: File, notes: string, title?: string) => Promise<void>
  onCompleteWithEvidence: (task: ComplianceTaskSummary, file: File | null, notes: string) => Promise<void>
  onReopenTask: (task: ComplianceTaskSummary) => Promise<void>
}) {
  const coverage = evidenceCoverageForRisk(risk, task)
  const owner = ownerForRisk(risk)
  const dueDate = task?.dueDate ? new Date(task.dueDate) : dueDateForRisk(risk)
  const taskStatusLabel = task ? TASK_STATUS_LABEL[task.status] : 'Sin tarea creada'
  const taskStatusStyle = task ? TASK_STATUS_STYLE[task.status] : 'border-slate-400/20 bg-slate-400/10 text-slate-200'
  const evidenceCountValue = evidenceCount(task)
  const hasEvidence = evidenceCountValue > 0
  const progress = dossierProgress(task, coverage)
  const nextRequirement = coverage.missing[0]?.label

  return (
    <div className={cn('rounded-xl border p-4', SEVERITY_STYLE[risk.severidad])}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-black">{risk.severidad.replace('_', ' ')}</span>
            <span className="text-[11px] text-slate-400">{CATEGORY_LABELS[risk.categoria] ?? risk.categoria}</span>
            <span className="font-mono text-[11px] text-slate-500">{risk.codigo}</span>
          </div>
          <p className="mt-2 text-sm font-bold text-white">{risk.titulo}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{risk.baseLegal}</p>
        </div>
        <div className="shrink-0 text-left md:text-right">
          <p className="text-lg font-black text-red-300">{formatSoles(risk.multaEstimadaSoles)}</p>
          <p className="text-[11px] text-emerald-300">Subsanando: {formatSoles(risk.multaConSubsanacionSoles)}</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg bg-black/20 p-3 text-xs leading-5 text-slate-200">
        {risk.accionInmediata}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-200">
              <ListChecks className="h-4 w-4 text-cyan-300" />
              Expediente accionable
            </p>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', taskStatusStyle)}>
              {taskStatusLabel}
            </span>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <DossierMeta icon={UserCheck} label="Responsable" value={owner} />
            <DossierMeta icon={CalendarClock} label="Fecha objetivo" value={formatTargetDate(dueDate)} />
            <DossierMeta icon={UploadCloud} label="Evidencia" value={hasEvidence ? `${coverage.covered}/${coverage.total} cubiertas` : 'Pendiente'} />
            <DossierMeta icon={ClipboardList} label="Plazo" value={deadlineLabel(dueDate, task?.status)} />
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-black/15 p-3">
            <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-slate-400">
              <span>Progreso documental</span>
              <span>{progress.value}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  progress.value >= 100 ? 'bg-emerald-300' : progress.value >= 65 ? 'bg-cyan-300' : 'bg-amber-300',
                )}
                style={{ width: `${progress.value}%` }}
              />
            </div>
            <p className="mt-2 text-xs font-bold text-slate-200">{progress.label}</p>
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase text-slate-200">Checklist de evidencia</p>
            <span className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-black',
              coverage.percent === 100
                ? 'bg-emerald-400/15 text-emerald-200'
                : coverage.covered > 0
                  ? 'bg-cyan-400/15 text-cyan-200'
                  : 'bg-amber-400/15 text-amber-200',
            )}>
              {coverage.covered}/{coverage.total}
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {coverage.statuses.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-2 rounded-md border border-white/10 bg-black/10 p-2 text-xs leading-5 text-slate-300">
                <span className="flex min-w-0 gap-2">
                  {item.covered ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                  )}
                  <span>{item.label}</span>
                </span>
                <span className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black',
                  item.covered ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200',
                )}>
                  {item.covered ? 'Acreditada' : 'Pendiente'}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {task ? (
              <>
                <Link
                  href="/dashboard/tareas"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-200"
                >
                  Gestionar tarea
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {task.status === 'COMPLETED' || task.status === 'DISMISSED' ? (
                  <button
                    type="button"
                    onClick={() => onReopenTask(task)}
                    disabled={updating}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Reabrir
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                onClick={onCreateTask}
                disabled={creating}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-60"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
                {creating ? 'Creando tarea...' : 'Crear tarea'}
              </button>
            )}
            <span className="text-[11px] leading-5 text-slate-500">
              {task ? `ID: ${task.id.slice(0, 8)}` : 'Queda trazada en Tareas de compliance.'}
            </span>
          </div>
        </div>
      </div>
      {task ? (
        <EvidenceWorkspace
          key={task.id}
          task={task}
          updating={updating}
          onSaveProgress={(notes) => onSaveProgress(task, notes)}
          onUploadEvidence={(file, notes, title) => onUploadEvidence(task, file, notes, title)}
          onCompleteWithEvidence={(file, notes) => onCompleteWithEvidence(task, file, notes)}
          suggestedTitle={nextRequirement}
        />
      ) : (
        <div className="mt-3 rounded-lg border border-dashed border-white/15 bg-slate-950/30 p-3 text-xs leading-5 text-slate-400">
          Crea la tarea para habilitar bitacora, carga de informes y cierre con evidencia.
        </div>
      )}
    </div>
  )
}

function EvidenceWorkspace({
  task,
  updating,
  onSaveProgress,
  onUploadEvidence,
  onCompleteWithEvidence,
  suggestedTitle,
}: {
  task: ComplianceTaskSummary
  updating: boolean
  onSaveProgress: (notes: string) => Promise<void>
  onUploadEvidence: (file: File, notes: string, title?: string) => Promise<void>
  onCompleteWithEvidence: (file: File | null, notes: string) => Promise<void>
  suggestedTitle?: string
}) {
  const [notes, setNotes] = useState(task.notes ?? '')
  const [file, setFile] = useState<File | null>(null)
  const [evidenceTitle, setEvidenceTitle] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const evidences = evidenceItemsForTask(task)

  async function saveProgress() {
    setLocalError(null)
    try {
      await onSaveProgress(notes)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo guardar el avance.')
    }
  }

  async function uploadOnly() {
    setLocalError(null)
    if (!file) {
      setLocalError('Selecciona un informe, acta o documento para cargarlo al expediente.')
      return
    }
    try {
      await onUploadEvidence(file, notes, evidenceTitle)
      setFile(null)
      setEvidenceTitle('')
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo subir la evidencia.')
    }
  }

  async function complete() {
    setLocalError(null)
    if (!file && evidences.length === 0) {
      setLocalError('Sube un informe, acta o documento antes de cerrar la brecha.')
      return
    }
    try {
      await onCompleteWithEvidence(file, notes)
      setFile(null)
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'No se pudo cerrar con evidencia.')
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/45 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1">
          <label className="text-xs font-black uppercase text-slate-200">Bitacora de avance</label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Registra la actuacion: documento emitido, responsable, fecha, sustento y pendiente."
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
          />
          {localError ? (
            <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-red-200">
              <XCircle className="h-3.5 w-3.5" />
              {localError}
            </p>
          ) : null}
        </div>
        <div className="w-full rounded-lg border border-white/10 bg-black/15 p-3 lg:w-[320px]">
          <p className="text-xs font-black uppercase text-slate-200">Informes y evidencias</p>
          {evidences.length > 0 ? (
            <div className="mt-2 space-y-2">
              {evidences.slice(0, 5).map((evidence) => (
                <a
                  key={evidence.id}
                  href={evidence.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg border border-emerald-300/20 bg-emerald-400/10 p-2 text-xs transition hover:bg-emerald-400/15"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-bold text-emerald-100">
                      {evidence.title || evidence.fileName || 'Evidencia cargada'}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-emerald-200" />
                  </span>
                  <span className="mt-1 block text-[10px] text-emerald-100/70">
                    {formatEvidenceDate(evidence.createdAt)}
                    {evidence.hashSha256 ? ` · SHA ${evidence.hashSha256.slice(0, 10)}` : ''}
                  </span>
                </a>
              ))}
              {evidences.length > 5 ? (
                <p className="text-[10px] font-bold text-slate-500">+{evidences.length - 5} evidencia(s) adicionales en el expediente.</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 rounded-lg border border-dashed border-white/10 p-2 text-xs leading-5 text-slate-500">
              Aun no hay archivos cargados para esta brecha.
            </p>
          )}
          {suggestedTitle ? (
            <p className="mt-3 rounded-lg border border-amber-300/20 bg-amber-400/10 p-2 text-[11px] leading-5 text-amber-100">
              Siguiente evidencia recomendada: <span className="font-black">{suggestedTitle}</span>
            </p>
          ) : null}
          <input
            value={evidenceTitle}
            onChange={(event) => setEvidenceTitle(event.target.value)}
            placeholder={suggestedTitle ? `Titulo recomendado: ${suggestedTitle}` : 'Titulo opcional: Acta, informe, constancia...'}
            className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300/60"
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="mt-2 w-full text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {task.status !== 'COMPLETED' && task.status !== 'DISMISSED' ? (
              <button
                type="button"
                onClick={saveProgress}
                disabled={updating}
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
              >
                {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Guardar avance
              </button>
            ) : null}
            <button
              type="button"
              onClick={uploadOnly}
              disabled={updating || !file}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-bold text-cyan-100 transition hover:bg-cyan-400/10 disabled:opacity-60"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              Subir evidencia
            </button>
            <button
              type="button"
              onClick={complete}
              disabled={updating || task.status === 'COMPLETED'}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-300 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-200 disabled:opacity-60"
            >
              {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
              {task.status === 'COMPLETED' ? 'Cerrada' : 'Cerrar con evidencia'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DossierMeta({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-2">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
        <Icon className="h-3.5 w-3.5 text-cyan-300" />
        {label}
      </p>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-200">{value}</p>
    </div>
  )
}

function ActionRow({ href, title, body, icon: Icon }: { href: string; title: string; body: string; icon: typeof ShieldCheck }) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl border border-white/10 bg-slate-950/35 p-3 transition hover:border-cyan-300/40 hover:bg-cyan-400/10">
      <Icon className="mt-0.5 h-4 w-4 text-cyan-300" />
      <span>
        <span className="block text-sm font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-slate-400">{body}</span>
      </span>
    </Link>
  )
}

function RadarSignal({ title, body, icon: Icon }: { title: string; body: string; icon: typeof ShieldCheck }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/35 p-4">
      <Icon className="h-5 w-5 text-cyan-300" />
      <p className="mt-3 text-sm font-bold text-white">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{body}</p>
    </div>
  )
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
          <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-cyan-300">
      {children}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function SecondaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-slate-200 transition hover:bg-white/10">
      {children}
    </Link>
  )
}

function LoadingState({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-slate-950/35 p-4 text-sm text-slate-300">
      <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
      {label}
    </div>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
      <p className="text-sm font-bold text-emerald-200">{title}</p>
      <p className="mt-1 text-xs leading-5 text-emerald-100/80">{body}</p>
    </div>
  )
}
