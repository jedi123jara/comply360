'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  Filter,
  Flame,
  Gauge,
  GraduationCap,
  ListChecks,
  Loader2,
  Paperclip,
  RefreshCw,
  Save,
  ShieldCheck,
  Target,
  UploadCloud,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSoles, formatSolesParts } from '@/lib/format/peruvian'

type Source = 'task' | 'alert' | 'training'
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type Lane = 'today' | 'week' | 'month' | 'backlog'
type LaneFilter = Lane | 'all' | 'sprint'
type ExecutionFilter = 'all' | 'needs_evidence' | 'unassigned' | 'ready_to_close'
type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'

interface PlanItem {
  id: string
  source: Source
  entityId: string
  sourceId: string | null
  sourceLabel: string
  severity: Severity
  area: string
  title: string
  description: string | null
  dueDate: string | null
  multaEvitable: number | null
  link: string
  routeHref: string
  routeLabel: string
  riskScore: number
  daysLeft: number | null
  lane: Lane
  evidenceGoal: string
  nextAction: string
  status?: TaskStatus | string
  assignedTo?: string | null
  notes?: string | null
  evidenceUrl?: string | null
  evidenceCount?: number
  completedAt?: string | null
  workerName?: string
}

interface PlanResponse {
  items: PlanItem[]
  stats: {
    total: number
    critical: number
    overdue: number
    byCategory: { tasks: number; alerts: number; trainings: number }
    bySeverity: { critical: number; high: number; medium: number; low: number }
    byLane: { today: number; week: number; month: number; backlog: number }
    sprintActions: number
    sprintExposure: number
    sprintReductionPercent: number
    evidenceMissing: number
    readyToClose: number
    unassignedTasks: number
    completedLast30: number
    multaReducida30: number
    nextDueDate: string | null
    topExposure: Array<{ id: string; title: string; multaEvitable: number | null; routeHref: string }>
    multaEvitableTotal: number
  }
}

const SOURCE_CONFIG: Record<Source, { label: string; icon: typeof ListChecks; tone: string }> = {
  task: { label: 'Tareas', icon: ListChecks, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  alert: { label: 'Alertas', icon: Bell, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  training: { label: 'Capacitaciones', icon: GraduationCap, tone: 'text-violet-700 bg-violet-50 border-violet-200' },
}

const SEVERITY_CONFIG: Record<Severity, { label: string; tone: string; bar: string }> = {
  CRITICAL: { label: 'Crítica', tone: 'border-red-200 bg-red-50 text-red-700', bar: 'bg-red-500' },
  HIGH: { label: 'Alta', tone: 'border-amber-200 bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  MEDIUM: { label: 'Media', tone: 'border-yellow-200 bg-yellow-50 text-yellow-700', bar: 'bg-yellow-500' },
  LOW: { label: 'Baja', tone: 'border-blue-200 bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
}

const LANE_CONFIG: Record<Lane, { label: string; short: string; tone: string }> = {
  today: { label: 'Cerrar hoy', short: 'Hoy', tone: 'border-red-200 bg-red-50 text-red-700' },
  week: { label: 'Sprint 7 días', short: '7 días', tone: 'border-orange-200 bg-orange-50 text-orange-700' },
  month: { label: 'Este mes', short: 'Mes', tone: 'border-sky-200 bg-sky-50 text-sky-700' },
  backlog: { label: 'Backlog controlado', short: 'Backlog', tone: 'border-slate-200 bg-slate-50 text-slate-600' },
}

const SOURCE_FILTERS: Array<Source | 'all'> = ['all', 'task', 'alert', 'training']
const SEVERITY_FILTERS: Array<Severity | 'all'> = ['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const LANE_FILTERS: LaneFilter[] = ['all', 'sprint', 'today', 'week', 'month', 'backlog']
const LANE_FILTER_CONFIG: Record<LaneFilter, { label: string }> = {
  all: { label: 'Todos los plazos' },
  sprint: { label: 'Sprint crítico' },
  today: { label: 'Hoy' },
  week: { label: '7 días' },
  month: { label: 'Mes' },
  backlog: { label: 'Backlog' },
}
const EXECUTION_FILTERS: ExecutionFilter[] = ['all', 'needs_evidence', 'unassigned', 'ready_to_close']
const EXECUTION_FILTER_CONFIG: Record<ExecutionFilter, { label: string }> = {
  all: { label: 'Toda ejecución' },
  needs_evidence: { label: 'Sin evidencia' },
  unassigned: { label: 'Sin responsable' },
  ready_to_close: { label: 'Listas para cerrar' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function deadlineText(item: PlanItem) {
  if (item.daysLeft === null) return 'Sin fecha límite'
  if (item.daysLeft < 0) return `Vencida hace ${Math.abs(item.daysLeft)} día(s)`
  if (item.daysLeft === 0) return 'Vence hoy'
  return `${item.daysLeft} día(s) restantes`
}

function sourceCount(stats: PlanResponse['stats'] | undefined, source: Source | 'all') {
  if (!stats) return 0
  if (source === 'all') return stats.total
  if (source === 'task') return stats.byCategory.tasks
  if (source === 'alert') return stats.byCategory.alerts
  return stats.byCategory.trainings
}

function severityCount(stats: PlanResponse['stats'] | undefined, severity: Severity | 'all') {
  if (!stats) return 0
  if (severity === 'all') return stats.total
  if (severity === 'CRITICAL') return stats.bySeverity.critical
  if (severity === 'HIGH') return stats.bySeverity.high
  if (severity === 'MEDIUM') return stats.bySeverity.medium
  return stats.bySeverity.low
}

function laneCount(items: PlanItem[] | undefined, lane: LaneFilter) {
  if (!items) return 0
  if (lane === 'all') return items.length
  if (lane === 'sprint') return items.filter((item) => item.lane === 'today' || item.lane === 'week').length
  return items.filter((item) => item.lane === lane).length
}

function matchesLaneFilter(item: PlanItem, lane: LaneFilter) {
  if (lane === 'all') return true
  if (lane === 'sprint') return item.lane === 'today' || item.lane === 'week'
  return item.lane === lane
}

function matchesExecutionFilter(item: PlanItem, filter: ExecutionFilter) {
  if (filter === 'all') return true
  if (filter === 'needs_evidence') return item.source !== 'task' || (item.evidenceCount ?? 0) === 0
  if (filter === 'unassigned') return item.source === 'task' && !item.assignedTo?.trim()
  return item.source === 'task' && (item.evidenceCount ?? 0) > 0
}

function executionCount(items: PlanItem[] | undefined, filter: ExecutionFilter) {
  if (!items) return 0
  return items.filter((item) => matchesExecutionFilter(item, filter)).length
}

async function uploadPlanFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', 'documents')
  formData.append('subfolder', 'compliance-evidence')

  const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData })
  const uploadBody = await uploadRes.json().catch(() => null) as {
    data?: { url: string; path: string; bucket: string; size: number; mimeType: string; hashSha256?: string }
    error?: string
  } | null
  if (!uploadRes.ok || !uploadBody?.data?.url) {
    throw new Error(uploadBody?.error ?? 'No se pudo subir el archivo.')
  }
  return uploadBody.data
}

export default function PlanAccionPage() {
  const [data, setData] = useState<PlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<Source | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')
  const [laneFilter, setLaneFilter] = useState<LaneFilter>('all')
  const [executionFilter, setExecutionFilter] = useState<ExecutionFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/plan-accion', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as PlanResponse
      setData(body)
      setSelectedId((current) => current ?? body.items[0]?.id ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.items.filter((item) => {
      if (sourceFilter !== 'all' && item.source !== sourceFilter) return false
      if (severityFilter !== 'all' && item.severity !== severityFilter) return false
      if (!matchesLaneFilter(item, laneFilter)) return false
      if (!matchesExecutionFilter(item, executionFilter)) return false
      return true
    })
  }, [data, sourceFilter, severityFilter, laneFilter, executionFilter])

  const selectedItem = useMemo(() => {
    if (filtered.length === 0) return null
    return filtered.find((item) => item.id === selectedId) ?? filtered[0]
  }, [filtered, selectedId])

  const sprintItems = filtered.filter((item) => item.lane === 'today' || item.lane === 'week').slice(0, 5)
  const stats = data?.stats
  const hasFilters = sourceFilter !== 'all' || severityFilter !== 'all' || laneFilter !== 'all' || executionFilter !== 'all'

  function resetFilters() {
    setSourceFilter('all')
    setSeverityFilter('all')
    setLaneFilter('all')
    setExecutionFilter('all')
  }

  async function patchTask(item: PlanItem, patch: {
    status?: TaskStatus
    assignedTo?: string | null
    dueDate?: string | null
    notes?: string | null
  }) {
    if (item.source !== 'task') return
    setSaving(true)
    setNotice(null)
    try {
      const res = await fetch('/api/compliance-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.entityId, ...patch }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null) as { error?: string } | null
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }
      await load()
      setNotice('Cambio guardado.')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo guardar el cambio.')
    } finally {
      setSaving(false)
    }
  }

  async function uploadEvidence(item: PlanItem, file: File, notes: string, closeAfterUpload: boolean) {
    if (item.source !== 'task') return
    setSaving(true)
    setNotice(null)
    try {
      const uploaded = await uploadPlanFile(file)

      const evidenceRes = await fetch(`/api/compliance-tasks/${item.entityId}/evidences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.evidenceGoal,
          fileName: file.name,
          fileUrl: uploaded.url,
          storagePath: uploaded.path,
          bucket: uploaded.bucket,
          mimeType: uploaded.mimeType,
          sizeBytes: uploaded.size,
          hashSha256: uploaded.hashSha256,
          notes,
        }),
      })
      const evidenceBody = await evidenceRes.json().catch(() => null) as { error?: string } | null
      if (!evidenceRes.ok) {
        throw new Error(evidenceBody?.error ?? 'No se pudo registrar la evidencia.')
      }

      if (closeAfterUpload) {
        await patchTask(item, { status: 'COMPLETED', notes: notes.trim() || item.notes || null })
      } else {
        await load()
        setNotice('Evidencia registrada.')
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo registrar la evidencia.')
    } finally {
      setSaving(false)
    }
  }

  async function resolveExternalAction(item: PlanItem, file: File, notes: string) {
    if (item.source !== 'alert' && item.source !== 'training') return
    setSaving(true)
    setNotice(null)
    try {
      const uploaded = await uploadPlanFile(file)
      const res = await fetch('/api/plan-accion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: item.source,
          entityId: item.entityId,
          notes,
          evidence: {
            title: item.evidenceGoal,
            fileName: file.name,
            fileUrl: uploaded.url,
            storagePath: uploaded.path,
            bucket: uploaded.bucket,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.size,
            hashSha256: uploaded.hashSha256,
          },
        }),
      })
      const body = await res.json().catch(() => null) as { error?: string; message?: string } | null
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
      await load()
      setNotice(body?.message ?? 'Acción cerrada con evidencia.')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'No se pudo cerrar la acción.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] px-4 py-7 text-[color:var(--text-primary)] sm:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-800">
              <ShieldCheck className="h-3.5 w-3.5" />
              Control anti-multas
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Plan de acción <span className="ml-2 inline-block whitespace-nowrap">SUNAFIL</span>
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--text-secondary)]">
              Prioridad, dinero expuesto, plazo y evidencia exigible en una sola cola de trabajo.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3.5 py-2 text-sm font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--neutral-50)] disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Actualizar
          </button>
        </header>

        <KpiGrid stats={stats} loading={loading} />

        <ImpactBrief
          stats={stats}
          loading={loading}
          onFocusSprint={() => {
            setSourceFilter('all')
            setSeverityFilter('all')
            setLaneFilter('sprint')
            setExecutionFilter('all')
          }}
          onFocusEvidence={() => {
            setSourceFilter('all')
            setSeverityFilter('all')
            setLaneFilter('all')
            setExecutionFilter('needs_evidence')
          }}
          onFocusUnassigned={() => {
            setSourceFilter('all')
            setSeverityFilter('all')
            setLaneFilter('all')
            setExecutionFilter('unassigned')
          }}
        />

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                {SOURCE_FILTERS.map((source) => (
                  <FilterChip
                    key={source}
                    active={sourceFilter === source}
                    onClick={() => setSourceFilter(source)}
                    label={source === 'all' ? 'Todo' : SOURCE_CONFIG[source].label}
                    count={sourceCount(stats, source)}
                  />
                ))}
                <span className="mx-1 hidden h-5 w-px bg-[color:var(--border-default)] sm:inline-block" />
                {SEVERITY_FILTERS.map((severity) => (
                  <FilterChip
                    key={severity}
                    active={severityFilter === severity}
                    onClick={() => setSeverityFilter(severity)}
                    label={severity === 'all' ? 'Toda gravedad' : SEVERITY_CONFIG[severity].label}
                    count={severityCount(stats, severity)}
                  />
                ))}
                {hasFilters ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3 w-3" />
                    Limpiar
                  </button>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--border-default)] pt-3">
                <CalendarClock className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                {LANE_FILTERS.map((lane) => (
                  <FilterChip
                    key={lane}
                    active={laneFilter === lane}
                    onClick={() => setLaneFilter(lane)}
                    label={LANE_FILTER_CONFIG[lane].label}
                    count={laneCount(data?.items, lane)}
                  />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[color:var(--border-default)] pt-3">
                <ClipboardCheck className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                {EXECUTION_FILTERS.map((filter) => (
                  <FilterChip
                    key={filter}
                    active={executionFilter === filter}
                    onClick={() => setExecutionFilter(filter)}
                    label={EXECUTION_FILTER_CONFIG[filter].label}
                    count={executionCount(data?.items, filter)}
                  />
                ))}
              </div>
            </div>

            <SprintPanel items={sprintItems} loading={loading} onSelect={setSelectedId} selectedId={selectedItem?.id ?? null} />

            {loading ? (
              <LoadingPanel />
            ) : error ? (
              <ErrorPanel error={error} onRetry={load} />
            ) : filtered.length === 0 ? (
              <EmptyState total={stats?.total ?? 0} />
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <PlanRow
                    key={item.id}
                    item={item}
                    selected={selectedItem?.id === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <ActionPanel
            item={selectedItem}
            loading={loading}
            saving={saving}
            notice={notice}
            onPatchTask={patchTask}
            onUploadEvidence={uploadEvidence}
            onResolveExternal={resolveExternalAction}
          />
        </section>
      </div>
    </main>
  )
}

function KpiGrid({ stats, loading }: { stats?: PlanResponse['stats']; loading: boolean }) {
  const nextDue = stats?.nextDueDate ? fmtDate(stats.nextDueDate) : 'Sin fecha'
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <KpiCard
        icon={Banknote}
        label="Multa evitable"
        value={<MoneyValue value={stats?.multaEvitableTotal ?? 0} />}
        loading={loading}
        tone="emerald"
      />
      <KpiCard
        icon={Flame}
        label="Críticas"
        value={stats?.critical ?? 0}
        loading={loading}
        tone={stats?.critical ? 'red' : 'slate'}
      />
      <KpiCard
        icon={Clock3}
        label="Vencidas"
        value={stats?.overdue ?? 0}
        loading={loading}
        tone={stats?.overdue ? 'amber' : 'slate'}
      />
      <KpiCard
        icon={ShieldCheck}
        label="Reducido 30d"
        value={<MoneyValue value={stats?.multaReducida30 ?? 0} />}
        loading={loading}
        tone="violet"
      />
      <KpiCard
        icon={CalendarClock}
        label="Próximo cierre"
        value={nextDue}
        loading={loading}
        tone="blue"
      />
    </section>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  loading,
  tone,
}: {
  icon: typeof ListChecks
  label: string
  value: ReactNode
  loading: boolean
  tone: 'emerald' | 'red' | 'amber' | 'blue' | 'violet' | 'slate'
}) {
  const tones = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    violet: 'text-violet-700 bg-violet-50 border-violet-200',
    slate: 'text-slate-600 bg-slate-50 border-slate-200',
  }
  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg border', tones[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)]">
          {label}
        </p>
      </div>
      <p className="mt-3 min-h-[2rem] text-2xl font-black tabular-nums tracking-tight">
        {loading ? <span className="text-[color:var(--text-tertiary)]">...</span> : value}
      </p>
    </div>
  )
}

function MoneyValue({ value }: { value: number }) {
  const parts = formatSolesParts(value)
  return (
    <span className="inline-flex min-w-0 flex-wrap items-baseline gap-x-1">
      <span>{parts.amount}</span>
      <span className="text-sm font-bold text-[color:var(--text-tertiary)]">{parts.currency}</span>
    </span>
  )
}

function ImpactBrief({
  stats,
  loading,
  onFocusSprint,
  onFocusEvidence,
  onFocusUnassigned,
}: {
  stats?: PlanResponse['stats']
  loading: boolean
  onFocusSprint: () => void
  onFocusEvidence: () => void
  onFocusUnassigned: () => void
}) {
  if (loading) {
    return (
      <section className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
          Calculando impacto anti-multas...
        </div>
      </section>
    )
  }

  const hasSprint = (stats?.sprintActions ?? 0) > 0

  return (
    <section className="grid gap-3 lg:grid-cols-[1.15fr_0.9fr_0.95fr]">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
              <Gauge className="h-3.5 w-3.5" />
              Impacto inmediato
            </div>
            <h2 className="mt-3 text-lg font-black leading-tight text-emerald-950">
              {hasSprint
                ? `Cerrar el sprint puede bajar ${stats?.sprintReductionPercent ?? 0}% de la exposición abierta.`
                : 'No hay ruta crítica inmediata abierta.'}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900">
              {hasSprint
                ? `${stats?.sprintActions ?? 0} acciones concentran ${formatSoles(stats?.sprintExposure ?? 0)} de multa evitable.`
                : 'Mantén evidencia y responsables al día para sostener el blindaje.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onFocusSprint}
            disabled={!hasSprint}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
          >
            Ver sprint crítico
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-700" />
          <h2 className="text-sm font-black">Bloqueos de ejecución</h2>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onFocusUnassigned}
            className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-left transition-colors hover:bg-amber-100"
          >
            <span className="block text-2xl font-black tabular-nums text-amber-800">{stats?.unassignedTasks ?? 0}</span>
            <span className="text-[11px] font-bold text-amber-900">sin responsable</span>
          </button>
          <button
            type="button"
            onClick={onFocusEvidence}
            className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-left transition-colors hover:bg-blue-100"
          >
            <span className="block text-2xl font-black tabular-nums text-blue-800">{stats?.evidenceMissing ?? 0}</span>
            <span className="text-[11px] font-bold text-blue-900">sin evidencia</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black">Mayor exposición</h2>
            <p className="text-xs text-[color:var(--text-tertiary)]">Prioriza donde más duele una inspección.</p>
          </div>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">
            {stats?.completedLast30 ?? 0} cerradas 30d
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {(stats?.topExposure ?? []).length > 0 ? (
            stats?.topExposure.map((item) => (
              <Link
                key={item.id}
                href={item.routeHref}
                className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <span className="line-clamp-1 font-bold text-[color:var(--text-primary)]">{item.title}</span>
                <span className="shrink-0 font-black text-emerald-700">{formatSoles(item.multaEvitable ?? 0)}</span>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
              Sin multas estimadas abiertas.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
        active
          ? 'border-emerald-300 bg-emerald-600 text-white'
          : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-emerald-300'
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 text-[10px]', active ? 'bg-white/20' : 'bg-[color:var(--neutral-100)]')}>
        {count}
      </span>
    </button>
  )
}

function SprintPanel({
  items,
  loading,
  selectedId,
  onSelect,
}: {
  items: PlanItem[]
  loading: boolean
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
          Armando sprint de cierre...
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          Sin cierres críticos para esta semana
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black">Sprint de 7 días</h2>
          <p className="text-xs text-[color:var(--text-tertiary)]">Las acciones que más bajan exposición inmediata.</p>
        </div>
        <Target className="h-5 w-5 text-emerald-700" />
      </div>
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              'min-h-[116px] rounded-lg border p-3 text-left transition-all hover:border-emerald-300 hover:bg-emerald-50/30',
              selectedId === item.id ? 'border-emerald-300 bg-emerald-50/50' : 'border-[color:var(--border-default)]'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', LANE_CONFIG[item.lane].tone)}>
                {LANE_CONFIG[item.lane].short}
              </span>
              <span className="text-xs font-black tabular-nums text-[color:var(--text-primary)]">{item.riskScore}</span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug">{item.title}</p>
            <p className="mt-2 text-[11px] text-[color:var(--text-tertiary)]">{deadlineText(item)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

function PlanRow({ item, selected, onSelect }: { item: PlanItem; selected: boolean; onSelect: () => void }) {
  const SourceIcon = SOURCE_CONFIG[item.source].icon
  const severity = SEVERITY_CONFIG[item.severity]
  const lane = LANE_CONFIG[item.lane]
  const overdue = item.daysLeft !== null && item.daysLeft <= 0

  return (
    <article
      className={cn(
        'rounded-xl border bg-white p-4 shadow-sm transition-all',
        selected ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-[color:var(--border-default)] hover:border-emerald-300'
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <button
          type="button"
          onClick={onSelect}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <span className={cn('mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', SOURCE_CONFIG[item.source].tone)}>
            <SourceIcon className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="mb-1 flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', severity.tone)}>
                {severity.label}
              </span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', lane.tone)}>
                {lane.label}
              </span>
              {item.workerName ? (
                <span className="text-[10px] font-medium text-[color:var(--text-tertiary)]">{item.workerName}</span>
              ) : null}
              {item.source === 'task' && !item.assignedTo?.trim() ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                  Sin responsable
                </span>
              ) : null}
              {item.source === 'task' && (item.evidenceCount ?? 0) > 0 ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                  Evidencia lista
                </span>
              ) : null}
            </span>
            <span className="block text-sm font-black leading-snug text-[color:var(--text-primary)]">
              {item.title}
            </span>
            {item.description ? (
              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-[color:var(--text-secondary)]">
                {item.description}
              </span>
            ) : null}
            <span className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[color:var(--text-tertiary)]">
              <span className="rounded bg-[color:var(--neutral-100)] px-1.5 py-0.5 font-mono uppercase">
                {item.area.replace(/_/g, ' ')}
              </span>
              <span className={cn('inline-flex items-center gap-1', overdue && 'font-bold text-red-700')}>
                <Clock3 className="h-3 w-3" />
                {deadlineText(item)}
              </span>
              {item.multaEvitable && item.multaEvitable > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <Banknote className="h-3 w-3" />
                  {formatSoles(item.multaEvitable)}
                </span>
              ) : null}
            </span>
          </span>
        </button>

        <div className="flex items-center gap-3 md:w-52 md:justify-end">
          <RiskMeter value={item.riskScore} severity={item.severity} />
          <Link
            href={item.routeHref}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-700"
          >
            Resolver
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function RiskMeter({ value, severity }: { value: number; severity: Severity }) {
  return (
    <div className="w-24 shrink-0">
      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
        Riesgo
        <span className="text-[color:var(--text-primary)]">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-[color:var(--neutral-100)]">
        <div className={cn('h-full rounded-full', SEVERITY_CONFIG[severity].bar)} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function ActionPanel({
  item,
  loading,
  saving,
  notice,
  onPatchTask,
  onUploadEvidence,
  onResolveExternal,
}: {
  item: PlanItem | null
  loading: boolean
  saving: boolean
  notice: string | null
  onPatchTask: (item: PlanItem, patch: { status?: TaskStatus; assignedTo?: string | null; dueDate?: string | null; notes?: string | null }) => Promise<void>
  onUploadEvidence: (item: PlanItem, file: File, notes: string, closeAfterUpload: boolean) => Promise<void>
  onResolveExternal: (item: PlanItem, file: File, notes: string) => Promise<void>
}) {
  if (loading) {
    return (
      <aside className="rounded-xl border border-[color:var(--border-default)] bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
        <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
          Cargando detalle...
        </div>
      </aside>
    )
  }

  if (!item) {
    return (
      <aside className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-white p-6 text-center shadow-sm lg:sticky lg:top-24 lg:self-start">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
        <p className="mt-3 text-sm font-black">Sin brechas activas</p>
        <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">El plan está limpio para los filtros actuales.</p>
      </aside>
    )
  }

  return (
    <aside className="rounded-xl border border-[color:var(--border-default)] bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', SEVERITY_CONFIG[item.severity].tone)}>
            {SEVERITY_CONFIG[item.severity].label}
          </span>
          <h2 className="mt-3 text-lg font-black leading-tight">{item.title}</h2>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] px-3 py-2 text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">Riesgo</p>
          <p className="text-2xl font-black tabular-nums">{item.riskScore}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <DetailLine icon={Clock3} label="Plazo" value={item.dueDate ? `${deadlineText(item)} · ${fmtDate(item.dueDate)}` : deadlineText(item)} danger={item.daysLeft !== null && item.daysLeft <= 0} />
        <DetailLine icon={Banknote} label="Exposición" value={item.multaEvitable && item.multaEvitable > 0 ? formatSoles(item.multaEvitable) : 'Sin multa estimada'} />
        <DetailLine icon={Target} label="Siguiente acción" value={item.nextAction} />
        <DetailLine icon={FileCheck2} label="Evidencia esperada" value={item.evidenceGoal} />
        {item.source === 'task' ? (
          <DetailLine icon={Paperclip} label="Evidencias" value={`${item.evidenceCount ?? 0} archivo(s) registrados`} />
        ) : null}
      </div>

      {item.description ? (
        <div className="mt-4 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">Contexto</p>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-secondary)]">{item.description}</p>
        </div>
      ) : null}

      <ClosureChecklist item={item} />

      {notice ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
          {notice}
        </div>
      ) : null}

      {item.source === 'task' ? (
        <TaskManagementPanel
          item={item}
          saving={saving}
          onPatchTask={onPatchTask}
          onUploadEvidence={onUploadEvidence}
        />
      ) : (
        <ExternalResolutionPanel item={item} saving={saving} onResolveExternal={onResolveExternal} />
      )}
    </aside>
  )
}

function ClosureChecklist({ item }: { item: PlanItem }) {
  const rows = [
    {
      label: 'Responsable asignado',
      done: item.source !== 'task' || Boolean(item.assignedTo?.trim()),
      hint: item.source !== 'task' ? 'Se cierra en el módulo origen' : item.assignedTo || 'Pendiente',
    },
    {
      label: 'Fecha compromiso',
      done: Boolean(item.dueDate),
      hint: item.dueDate ? fmtDate(item.dueDate) : 'Define fecha de cierre',
    },
    {
      label: 'Evidencia documental',
      done: item.source === 'task' ? (item.evidenceCount ?? 0) > 0 : false,
      hint: item.source === 'task'
        ? `${item.evidenceCount ?? 0} archivo(s)`
        : 'Se exigirá al cerrar',
    },
    {
      label: 'Ruta de subsanación',
      done: Boolean(item.routeHref),
      hint: item.routeLabel,
    },
  ]

  return (
    <div className="mt-4 rounded-xl border border-[color:var(--border-default)] bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-emerald-700" />
        <p className="text-xs font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">Checklist de blindaje</p>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-2 text-xs">
            <span className={cn(
              'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              row.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            )}>
              {row.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-[color:var(--text-primary)]">{row.label}</span>
              <span className="block truncate text-[color:var(--text-tertiary)]">{row.hint}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TaskManagementPanel({
  item,
  saving,
  onPatchTask,
  onUploadEvidence,
}: {
  item: PlanItem
  saving: boolean
  onPatchTask: (item: PlanItem, patch: { status?: TaskStatus; assignedTo?: string | null; dueDate?: string | null; notes?: string | null }) => Promise<void>
  onUploadEvidence: (item: PlanItem, file: File, notes: string, closeAfterUpload: boolean) => Promise<void>
}) {
  const [assignedTo, setAssignedTo] = useState(item.assignedTo ?? '')
  const [dueDate, setDueDate] = useState(dateInputValue(item.dueDate))
  const [notes, setNotes] = useState(item.notes ?? '')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    setAssignedTo(item.assignedTo ?? '')
    setDueDate(dateInputValue(item.dueDate))
    setNotes(item.notes ?? '')
    setFile(null)
  }, [item.id, item.assignedTo, item.dueDate, item.notes])

  const normalizedNotes = notes.trim() || null
  const normalizedAssignedTo = assignedTo.trim() || null
  const normalizedDueDate = dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null
  const canClose = Boolean(file || (item.evidenceCount ?? 0) > 0)

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
      <div>
        <h3 className="text-sm font-black">Cerrar brecha desde aquí</h3>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-tertiary)]">
          Asigna responsable, registra avance y adjunta la evidencia que quedará en el expediente.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
            <UserRound className="h-3 w-3" />
            Responsable
          </span>
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="RRHH, SST, Legal..."
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
            <Clock3 className="h-3 w-3" />
            Fecha compromiso
          </span>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
            <FileCheck2 className="h-3 w-3" />
            Bitácora de subsanación
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Qué se hizo, qué falta y dónde está el sustento..."
            className="w-full resize-none rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
          />
        </label>

        <label className="block rounded-lg border border-dashed border-emerald-300 bg-white p-3">
          <span className="flex items-center gap-2 text-xs font-black text-emerald-800">
            <UploadCloud className="h-4 w-4" />
            Adjuntar evidencia
          </span>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-2 block w-full text-xs text-[color:var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
          />
          {file ? (
            <span className="mt-2 block truncate text-[11px] font-bold text-[color:var(--text-secondary)]">
              {file.name}
            </span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onPatchTask(item, {
            status: item.status === 'PENDING' ? 'IN_PROGRESS' : undefined,
            assignedTo: normalizedAssignedTo,
            dueDate: normalizedDueDate,
            notes: normalizedNotes,
          })}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-black text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--neutral-50)] disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Guardar avance
        </button>
        <button
          type="button"
          disabled={saving || !file}
          onClick={() => file && onUploadEvidence(item, file, notes, false)}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition-colors hover:bg-emerald-100 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          Subir evidencia
        </button>
        <button
          type="button"
          disabled={saving || !canClose}
          onClick={() => {
            if (file) {
              void onUploadEvidence(item, file, notes, true)
            } else {
              void onPatchTask(item, {
                status: 'COMPLETED',
                assignedTo: normalizedAssignedTo,
                dueDate: normalizedDueDate,
                notes: normalizedNotes,
              })
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          Cerrar con evidencia
        </button>
      </div>

      {!canClose ? (
        <p className="text-[11px] leading-relaxed text-[color:var(--text-tertiary)]">
          Para cerrar una brecha crítica, primero adjunta evidencia o registra un archivo ya validado.
        </p>
      ) : null}

      {item.evidenceUrl ? (
        <a
          href={item.evidenceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Ver última evidencia
        </a>
      ) : null}
    </div>
  )
}

function ExternalResolutionPanel({
  item,
  saving,
  onResolveExternal,
}: {
  item: PlanItem
  saving: boolean
  onResolveExternal: (item: PlanItem, file: File, notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    setNotes('')
    setFile(null)
  }, [item.id])

  const sourceLabel = item.source === 'alert' ? 'alerta' : 'capacitación'

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
      <div>
        <h3 className="text-sm font-black">Cerrar {sourceLabel} con evidencia</h3>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-tertiary)]">
          El cierre registra un respaldo documental en el expediente anti-multas y actualiza el estado del origen.
        </p>
      </div>

      <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
          <FileCheck2 className="h-3 w-3" />
          Bitácora de cierre
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder={item.source === 'alert' ? 'Qué se corrigió y dónde está el sustento...' : 'Qué capacitación se completó, fecha, asistencia y sustento...'}
          className="w-full resize-none rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
        />
      </label>

      <label className="block rounded-lg border border-dashed border-emerald-300 bg-white p-3">
        <span className="flex items-center gap-2 text-xs font-black text-emerald-800">
          <UploadCloud className="h-4 w-4" />
          Evidencia obligatoria
        </span>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-2 block w-full text-xs text-[color:var(--text-secondary)] file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white"
        />
        {file ? (
          <span className="mt-2 block truncate text-[11px] font-bold text-[color:var(--text-secondary)]">
            {file.name}
          </span>
        ) : null}
      </label>

      <button
        type="button"
        disabled={saving || !file}
        onClick={() => file && onResolveExternal(item, file, notes)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
        Cerrar con evidencia
      </button>

      {!file ? (
        <p className="text-[11px] leading-relaxed text-[color:var(--text-tertiary)]">
          Adjunta un archivo para cerrar esta acción sin perder trazabilidad.
        </p>
      ) : null}

      <Link
        href={item.routeHref}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2.5 text-sm font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--neutral-50)]"
      >
        {item.routeLabel}
        <ArrowRight className="h-4 w-4" />
      </Link>
      {item.link !== item.routeHref ? (
        <Link
          href={item.link}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2.5 text-sm font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--neutral-50)]"
        >
          Ver seguimiento
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        También puedes abrir el módulo si necesitas corregir datos antes del cierre.
      </p>
    </div>
  )
}

function dateInputValue(value: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function DetailLine({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: typeof ListChecks
  label: string
  value: string
  danger?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <span className={cn('mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-slate-200 bg-slate-50 text-slate-600')}>
        <Icon className="h-4 w-4" />
      </span>
      <span>
        <span className="block text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">{label}</span>
        <span className={cn('block text-sm leading-snug', danger ? 'font-bold text-red-700' : 'text-[color:var(--text-secondary)]')}>
          {value}
        </span>
      </span>
    </div>
  )
}

function LoadingPanel() {
  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-10 text-center shadow-sm">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-700" />
      <p className="mt-3 text-sm font-bold text-[color:var(--text-secondary)]">Cargando plan...</p>
    </div>
  )
}

function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
        <div>
          <p className="text-sm font-black text-red-900">No se pudo cargar el plan</p>
          <p className="mt-1 text-xs text-red-800">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reintentar
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ total }: { total: number }) {
  return (
    <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-12 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
      <p className="mt-3 text-base font-black text-emerald-950">
        {total === 0 ? 'Plan limpio' : 'Sin coincidencias'}
      </p>
      <p className="mx-auto mt-1 max-w-md text-sm text-emerald-800">
        {total === 0
          ? 'No hay tareas abiertas, alertas activas ni capacitaciones obligatorias atrasadas.'
          : 'Ajusta los filtros para ver otras acciones pendientes.'}
      </p>
    </div>
  )
}
