'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  FileCheck2,
  Filter,
  Flame,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Loader2,
  Paperclip,
  RefreshCw,
  Save,
  Scale,
  ShieldCheck,
  Target,
  UploadCloud,
  UserRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSoles, formatSolesParts } from '@/lib/format/peruvian'
import { cleanAlertDescription, describeDaysLeft } from '@/lib/alerts/alert-actions'
import { PendingFilters } from './_components/pending-filters'
import { PlanAreaLabel } from './_components/area-label'
import {
  DEFAULT_PLAN_FILTERS,
  LANE_LABELS,
  SEVERITY_LABELS,
  SOURCE_LABELS,
  friendlyError,
  friendlyHttpError,
  matchesPlanFilters,
  planAreaLabel,
  planWhyItMatters,
  planWorkerName,
  resolvePlanAction,
  type PlanAction,
  type PlanFilters,
  type PlanLane,
  type PlanSeverity,
  type PlanSource,
  type PlanWhy,
} from './_lib/plan-display'
import { EMPTY_ENRICHMENT, fetchPlanEnrichment, type PlanEnrichment } from './_lib/plan-enrichment'

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'

interface PlanItem {
  id: string
  source: PlanSource
  entityId: string
  sourceId: string | null
  sourceLabel: string
  severity: PlanSeverity
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
  lane: PlanLane
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

/** Lo que la UI necesita de cada pendiente, ya traducido a lenguaje simple. */
interface PlanItemView {
  areaLabel: string
  why: PlanWhy | null
  action: PlanAction
  workerName: string | null
  description: string
}

/** Mensaje de resultado de una acción: verde si salió bien, rojo si falló. */
type Notice = { tone: 'success' | 'error'; text: string }

type TaskPatch = { status?: TaskStatus; assignedTo?: string | null; dueDate?: string | null; notes?: string | null }

const SOURCE_STYLE: Record<PlanSource, { icon: typeof ListChecks; tone: string }> = {
  task: { icon: ListChecks, tone: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  alert: { icon: Bell, tone: 'text-amber-700 bg-amber-50 border-amber-200' },
  training: { icon: GraduationCap, tone: 'text-violet-700 bg-violet-50 border-violet-200' },
}

const SEVERITY_STYLE: Record<PlanSeverity, { tone: string; bar: string }> = {
  CRITICAL: { tone: 'border-red-200 bg-red-50 text-red-700', bar: 'bg-red-500' },
  HIGH: { tone: 'border-amber-200 bg-amber-50 text-amber-700', bar: 'bg-amber-500' },
  MEDIUM: { tone: 'border-yellow-200 bg-yellow-50 text-yellow-700', bar: 'bg-yellow-500' },
  LOW: { tone: 'border-blue-200 bg-blue-50 text-blue-700', bar: 'bg-blue-500' },
}

const LANE_TONE: Record<PlanLane, string> = {
  today: 'border-red-200 bg-red-50 text-red-700',
  week: 'border-orange-200 bg-orange-50 text-orange-700',
  month: 'border-sky-200 bg-sky-50 text-sky-700',
  backlog: 'border-slate-200 bg-slate-50 text-slate-600',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

function isOverdue(item: PlanItem) {
  return item.daysLeft !== null && item.daysLeft <= 0
}

function buildItemView(item: PlanItem, enrichment: PlanEnrichment): PlanItemView {
  return {
    areaLabel: planAreaLabel(item),
    why: planWhyItMatters(item, {
      baseLegal: item.source === 'task' ? enrichment.taskLegalBasis[item.entityId] : null,
    }),
    action: resolvePlanAction(item, item.source === 'alert' ? enrichment.alertWorkerIds[item.entityId] : null),
    workerName: planWorkerName(item),
    description: cleanAlertDescription(item.description),
  }
}

function loadErrorMessage(status: number) {
  if (status === 401 || status === 403) return friendlyHttpError(status)
  return 'Hubo un problema en el servidor. Intenta de nuevo en unos segundos.'
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
  if (!uploadRes.ok) {
    throw new Error(friendlyHttpError(uploadRes.status, uploadBody?.error, 'No pudimos subir el archivo. Intenta de nuevo.'))
  }
  if (!uploadBody?.data?.url) throw new Error('No pudimos subir el archivo. Intenta de nuevo.')
  return uploadBody.data
}

export default function PlanAccionPage() {
  const [data, setData] = useState<PlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<PlanFilters>(DEFAULT_PLAN_FILTERS)
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [enrichment, setEnrichment] = useState<PlanEnrichment>(EMPTY_ENRICHMENT)
  /** Pendientes cuyos datos extra (base legal, trabajador) ya se pidieron. */
  const enrichedIdsRef = useRef<Set<string>>(new Set())

  const enrich = useCallback(async (items: PlanItem[]) => {
    const missing = items.filter(
      (item) => (item.source === 'task' || item.source === 'alert') && !enrichedIdsRef.current.has(item.id),
    )
    if (missing.length === 0) return
    for (const item of missing) enrichedIdsRef.current.add(item.id)
    const extra = await fetchPlanEnrichment({
      tasks: missing.some((item) => item.source === 'task'),
      alerts: missing.some((item) => item.source === 'alert'),
    })
    setEnrichment((prev) => ({
      taskLegalBasis: { ...prev.taskLegalBasis, ...extra.taskLegalBasis },
      alertWorkerIds: { ...prev.alertWorkerIds, ...extra.alertWorkerIds },
    }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let res: Response
      try {
        res = await fetch('/api/plan-accion', { cache: 'no-store' })
      } catch {
        throw new Error('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.')
      }
      if (!res.ok) throw new Error(loadErrorMessage(res.status))
      const body = (await res.json()) as PlanResponse
      setData(body)
      setSelectedId((current) => current ?? body.items[0]?.id ?? null)
      void enrich(body.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.')
    } finally {
      setLoading(false)
    }
  }, [enrich])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled) void load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const views = useMemo(() => {
    const map = new Map<string, PlanItemView>()
    for (const item of data?.items ?? []) map.set(item.id, buildItemView(item, enrichment))
    return map
  }, [data, enrichment])

  const filtered = useMemo(
    () => (data?.items ?? []).filter((item) => matchesPlanFilters(item, filters)),
    [data, filters],
  )

  const countFor = useCallback(
    (patch: Partial<PlanFilters>) => {
      const next = { ...filters, ...patch }
      return (data?.items ?? []).filter((item) => matchesPlanFilters(item, next)).length
    },
    [data, filters],
  )

  const selectedItem = useMemo(() => {
    if (filtered.length === 0) return null
    return filtered.find((item) => item.id === selectedId) ?? filtered[0]
  }, [filtered, selectedId])

  const weekItems = filtered.filter((item) => item.lane === 'today' || item.lane === 'week').slice(0, 5)
  const stats = data?.stats

  function updateFilters(patch: Partial<PlanFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
  }

  function resetFilters() {
    setFilters(DEFAULT_PLAN_FILTERS)
  }

  function selectItem(id: string) {
    setSelectedId(id)
    setNotice(null)
  }

  function hrefFor(id: string, fallback: string) {
    return views.get(id)?.action.href ?? fallback
  }

  async function patchTask(item: PlanItem, patch: TaskPatch) {
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
        throw new Error(friendlyHttpError(res.status, body?.error))
      }
      await load()
      setNotice({
        tone: 'success',
        text: patch.status === 'COMPLETED' ? 'Listo: lo marcamos como resuelto.' : 'Avance guardado.',
      })
    } catch (e) {
      setNotice({ tone: 'error', text: friendlyError(e, 'No pudimos guardar el cambio. Intenta de nuevo.') })
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
        throw new Error(
          friendlyHttpError(evidenceRes.status, evidenceBody?.error, 'No pudimos registrar la prueba. Intenta de nuevo.'),
        )
      }

      if (closeAfterUpload) {
        await patchTask(item, { status: 'COMPLETED', notes: notes.trim() || item.notes || null })
      } else {
        await load()
        setNotice({ tone: 'success', text: 'Prueba subida. Quedó guardada en este pendiente.' })
      }
    } catch (e) {
      setNotice({ tone: 'error', text: friendlyError(e, 'No pudimos registrar la prueba. Intenta de nuevo.') })
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
      if (!res.ok) throw new Error(friendlyHttpError(res.status, body?.error))
      await load()
      setNotice({ tone: 'success', text: body?.message ?? 'Listo: lo marcamos como resuelto y guardamos la prueba.' })
    } catch (e) {
      setNotice({ tone: 'error', text: friendlyError(e, 'No pudimos cerrarlo. Intenta de nuevo.') })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5 text-[color:var(--text-primary)]">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Pendientes</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[color:var(--text-secondary)]">
              Todo lo que tienes que hacer para cumplir, ordenado por urgencia y multa.
            </p>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[color:var(--text-tertiary)]">
              Aquí se juntan las tareas del diagnóstico, las alertas de tus trabajadores y las capacitaciones
              obligatorias. Elige uno y pulsa <span className="font-semibold">Resolver</span>: te llevamos a la
              pantalla donde se corrige.
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

        <details className="group rounded-xl border border-[color:var(--border-default)] bg-white shadow-[var(--elevation-1)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[color:var(--text-secondary)] marker:hidden">
            <span>Resumen: qué cerrar primero</span>
            <span className="text-xs text-blue-700 group-open:hidden">Mostrar</span>
            <span className="hidden text-xs text-blue-700 group-open:inline">Ocultar</span>
          </summary>
          <div className="space-y-4 border-t border-[color:var(--border-subtle)] p-4">
            <ImpactBrief
              stats={stats}
              loading={loading}
              hrefFor={hrefFor}
              onFocusWeek={() => setFilters({ ...DEFAULT_PLAN_FILTERS, time: 'week' })}
              onFocusEvidence={() => {
                setFilters({ ...DEFAULT_PLAN_FILTERS, progress: 'needs_evidence' })
                setMoreFiltersOpen(true)
              }}
              onFocusUnassigned={() => {
                setFilters({ ...DEFAULT_PLAN_FILTERS, progress: 'unassigned' })
                setMoreFiltersOpen(true)
              }}
            />
            <WeekPanel items={weekItems} loading={loading} onSelect={selectItem} selectedId={selectedItem?.id ?? null} />
          </div>
        </details>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <PendingFilters
              filters={filters}
              onChange={updateFilters}
              onReset={resetFilters}
              countFor={countFor}
              moreOpen={moreFiltersOpen}
              onMoreOpenChange={setMoreFiltersOpen}
            />

            {loading ? (
              <LoadingPanel />
            ) : error ? (
              <ErrorPanel error={error} onRetry={load} />
            ) : filtered.length === 0 ? (
              <EmptyState total={stats?.total ?? 0} onReset={resetFilters} />
            ) : (
              <div className="space-y-2">
                {filtered.map((item) => (
                  <PlanRow
                    key={item.id}
                    item={item}
                    view={views.get(item.id) ?? buildItemView(item, enrichment)}
                    selected={selectedItem?.id === item.id}
                    onSelect={() => selectItem(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          <ActionPanel
            item={selectedItem}
            view={selectedItem ? views.get(selectedItem.id) ?? buildItemView(selectedItem, enrichment) : null}
            loading={loading}
            saving={saving}
            notice={notice}
            onPatchTask={patchTask}
            onUploadEvidence={uploadEvidence}
            onResolveExternal={resolveExternalAction}
          />
        </section>
    </div>
  )
}

function KpiGrid({ stats, loading }: { stats?: PlanResponse['stats']; loading: boolean }) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        icon={ListChecks}
        label="Pendientes"
        value={stats?.total ?? 0}
        loading={loading}
        tone="blue"
      />
      <KpiCard
        icon={Flame}
        label="Vencidos"
        value={stats?.overdue ?? 0}
        loading={loading}
        tone={stats?.overdue ? 'red' : 'slate'}
      />
      <KpiCard
        icon={Banknote}
        label="Multas que puedes evitar"
        value={<MoneyValue value={stats?.multaEvitableTotal ?? 0} />}
        loading={loading}
        tone="amber"
      />
      <KpiCard
        icon={ShieldCheck}
        label="Resueltos en 30 días"
        value={stats?.completedLast30 ?? 0}
        loading={loading}
        tone="emerald"
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
        <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', tones[tone])}>
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
  hrefFor,
  onFocusWeek,
  onFocusEvidence,
  onFocusUnassigned,
}: {
  stats?: PlanResponse['stats']
  loading: boolean
  hrefFor: (id: string, fallback: string) => string
  onFocusWeek: () => void
  onFocusEvidence: () => void
  onFocusUnassigned: () => void
}) {
  if (loading) {
    return (
      <section className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--text-secondary)]">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-700" />
          Calculando cuánto puedes ahorrar en multas...
        </div>
      </section>
    )
  }

  const weekCount = stats?.sprintActions ?? 0
  const weekExposure = stats?.sprintExposure ?? 0
  const hasWeek = weekCount > 0
  const headline = !hasWeek
    ? 'No tienes nada urgente para esta semana.'
    : weekExposure > 0
      ? `Si cierras lo de esta semana, reduces ${stats?.sprintReductionPercent ?? 0}% de las multas posibles.`
      : `Tienes ${plural(weekCount, 'pendiente', 'pendientes')} para esta semana.`
  const subline = !hasWeek
    ? 'Mantén al día a los responsables y las pruebas para estar listo ante una inspección.'
    : weekExposure > 0
      ? `${plural(weekCount, 'pendiente suma', 'pendientes suman')} ${formatSoles(weekExposure)} en multas posibles.`
      : 'Ciérralos primero: son los más urgentes por su plazo o su gravedad.'

  return (
    <section className="grid gap-3 lg:grid-cols-[1.15fr_0.9fr_0.95fr]">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-800">
              <Target className="h-3.5 w-3.5" />
              Empieza por aquí
            </div>
            <h2 className="mt-3 text-lg font-black leading-tight text-emerald-950">{headline}</h2>
            <p className="mt-1 text-sm leading-relaxed text-emerald-900">{subline}</p>
          </div>
          <button
            type="button"
            onClick={onFocusWeek}
            disabled={!hasWeek}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
          >
            Ver lo de esta semana
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-amber-700" />
          <h2 className="text-sm font-black">Lo que frena el avance</h2>
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
            <span className="text-[11px] font-bold text-blue-900">sin prueba subida</span>
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black">Las multas más altas</h2>
            <p className="text-xs text-[color:var(--text-tertiary)]">Si llega una inspección, esto es lo que más costaría.</p>
          </div>
          <span className="shrink-0 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-black text-violet-700">
            {plural(stats?.completedLast30 ?? 0, 'resuelto', 'resueltos')} en 30 días
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {(stats?.topExposure ?? []).length > 0 ? (
            stats?.topExposure.map((item) => (
              <Link
                key={item.id}
                href={hrefFor(item.id, item.routeHref)}
                className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-xs transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <span className="line-clamp-1 font-bold text-[color:var(--text-primary)]">{item.title}</span>
                <span className="shrink-0 font-black text-emerald-700">{formatSoles(item.multaEvitable ?? 0)}</span>
              </Link>
            ))
          ) : (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
              No hay multas estimadas abiertas.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

function WeekPanel({
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
          Ordenando tus pendientes...
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
          <CheckCircle2 className="h-4 w-4" />
          Nada urgente para esta semana
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-black">Para esta semana</h2>
          <p className="text-xs text-[color:var(--text-tertiary)]">Lo más urgente: hazlo en los próximos 7 días.</p>
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', LANE_TONE[item.lane])}>
                {LANE_LABELS[item.lane]}
              </span>
              {item.multaEvitable && item.multaEvitable > 0 ? (
                <span className="text-[11px] font-black tabular-nums text-emerald-700">{formatSoles(item.multaEvitable)}</span>
              ) : null}
            </div>
            <p className="mt-2 line-clamp-2 text-xs font-bold leading-snug">{item.title}</p>
            <p className={cn('mt-2 text-[11px]', isOverdue(item) ? 'font-bold text-red-700' : 'text-[color:var(--text-tertiary)]')}>
              {describeDaysLeft(item.daysLeft)}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

function WhyLine({ why, compact }: { why: PlanWhy; compact?: boolean }) {
  const Icon = why.kind === 'law' ? Scale : Lightbulb
  return (
    <span
      className={cn(
        'flex items-start gap-1.5 text-xs leading-relaxed text-[color:var(--text-secondary)]',
        compact && 'mt-1.5',
      )}
    >
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />
      <span className={cn(compact && 'line-clamp-2')}>
        <span className="font-bold text-[color:var(--text-primary)]">{why.label}:</span> {why.text}
      </span>
    </span>
  )
}

function PlanRow({
  item,
  view,
  selected,
  onSelect,
}: {
  item: PlanItem
  view: PlanItemView
  selected: boolean
  onSelect: () => void
}) {
  const SourceIcon = SOURCE_STYLE[item.source].icon
  const overdue = isOverdue(item)

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
          aria-pressed={selected}
          className="flex flex-1 items-start gap-3 text-left"
        >
          <span
            className={cn('mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', SOURCE_STYLE[item.source].tone)}
            title={SOURCE_LABELS[item.source]}
          >
            <SourceIcon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="mb-1 flex flex-wrap items-center gap-2">
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', SEVERITY_STYLE[item.severity].tone)}>
                {SEVERITY_LABELS[item.severity]}
              </span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black', LANE_TONE[item.lane])}>
                {LANE_LABELS[item.lane]}
              </span>
              {item.source === 'task' && !item.assignedTo?.trim() ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">
                  Sin responsable
                </span>
              ) : null}
              {item.source === 'task' && (item.evidenceCount ?? 0) > 0 ? (
                <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-700">
                  Prueba subida
                </span>
              ) : null}
            </span>
            <span className="block text-sm font-black leading-snug text-[color:var(--text-primary)]">
              {item.title}
            </span>
            {view.description ? (
              <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-[color:var(--text-secondary)]">
                {view.description}
              </span>
            ) : null}
            {view.why ? <WhyLine why={view.why} compact /> : null}
            <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[color:var(--text-tertiary)]">
              <span className="rounded bg-[color:var(--neutral-100)] px-1.5 py-0.5 font-semibold text-[color:var(--text-secondary)]">
                {view.areaLabel}
              </span>
              <span>
                {SOURCE_LABELS[item.source]}
                {view.workerName ? ` · ${view.workerName}` : ''}
              </span>
              <span className={cn('inline-flex items-center gap-1', overdue && 'font-bold text-red-700')}>
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                {describeDaysLeft(item.daysLeft)}
              </span>
              {item.multaEvitable && item.multaEvitable > 0 ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <Banknote className="h-3 w-3" aria-hidden="true" />
                  Multa si no se corrige: {formatSoles(item.multaEvitable)}
                </span>
              ) : null}
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center md:justify-end">
          <Link
            href={view.action.href}
            title={view.action.destination ? `Te lleva a: ${view.action.destination}` : undefined}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-emerald-700"
          >
            Resolver
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  )
}

function NoticeBanner({ notice }: { notice: Notice }) {
  if (notice.tone === 'error') {
    return (
      <div role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{notice.text}</span>
      </div>
    )
  }
  return (
    <div role="status" className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-900">
      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{notice.text}</span>
    </div>
  )
}

function ActionPanel({
  item,
  view,
  loading,
  saving,
  notice,
  onPatchTask,
  onUploadEvidence,
  onResolveExternal,
}: {
  item: PlanItem | null
  view: PlanItemView | null
  loading: boolean
  saving: boolean
  notice: Notice | null
  onPatchTask: (item: PlanItem, patch: TaskPatch) => Promise<void>
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

  if (!item || !view) {
    return (
      <aside className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-white p-6 text-center shadow-sm lg:sticky lg:top-24 lg:self-start">
        <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" />
        <p className="mt-3 text-sm font-black">Nada pendiente aquí</p>
        <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">No hay pendientes con estos filtros.</p>
        {notice ? <NoticeBanner notice={notice} /> : null}
      </aside>
    )
  }

  return (
    <aside className="rounded-xl border border-[color:var(--border-default)] bg-white p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest', SEVERITY_STYLE[item.severity].tone)}>
              {SEVERITY_LABELS[item.severity]}
            </span>
            <PlanAreaLabel label={view.areaLabel} className="text-[11px] font-semibold text-[color:var(--text-tertiary)]" />
          </div>
          <h2 className="mt-3 text-lg font-black leading-tight">{item.title}</h2>
          {view.workerName ? (
            <p className="mt-1 text-xs text-[color:var(--text-secondary)]">Trabajador: {view.workerName}</p>
          ) : null}
        </div>
        <div
          className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] px-3 py-2 text-center"
          title="Se calcula con la urgencia, el plazo y la multa posible. Más alto = atender antes."
        >
          <p className="text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">Prioridad</p>
          <p className="text-2xl font-black tabular-nums">{item.riskScore}</p>
          <p className="text-[10px] text-[color:var(--text-tertiary)]">de 100</p>
        </div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <DetailLine
          icon={Clock3}
          label="Plazo"
          value={item.dueDate ? `${describeDaysLeft(item.daysLeft)} · ${fmtDate(item.dueDate)}` : describeDaysLeft(item.daysLeft)}
          danger={isOverdue(item)}
        />
        <DetailLine
          icon={Banknote}
          label="Multa si no se corrige"
          value={item.multaEvitable && item.multaEvitable > 0 ? formatSoles(item.multaEvitable) : 'Sin multa estimada'}
        />
        {view.why ? (
          <DetailLine icon={view.why.kind === 'law' ? Scale : Lightbulb} label={view.why.label} value={view.why.text} />
        ) : null}
        <DetailLine icon={Target} label="Qué hacer" value={item.nextAction} />
        <DetailLine icon={FileCheck2} label="Qué guardar como prueba" value={item.evidenceGoal} />
        {item.source === 'task' ? (
          <DetailLine icon={Paperclip} label="Pruebas subidas" value={plural(item.evidenceCount ?? 0, 'archivo', 'archivos')} />
        ) : null}
      </div>

      {view.description ? (
        <div className="mt-4 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-3">
          <p className="text-[11px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">Detalle</p>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-secondary)]">{view.description}</p>
        </div>
      ) : null}

      <InspectionChecklist item={item} action={view.action} />

      {notice ? <NoticeBanner notice={notice} /> : null}

      {/* La `key` reinicia cada formulario al cambiar de pendiente o cuando el
          servidor devuelve otros valores (después de guardar). */}
      {item.source === 'task' ? (
        <TaskManagementPanel
          key={`${item.id}|${item.assignedTo ?? ''}|${item.dueDate ?? ''}|${item.notes ?? ''}`}
          item={item}
          action={view.action}
          saving={saving}
          onPatchTask={onPatchTask}
          onUploadEvidence={onUploadEvidence}
        />
      ) : (
        <ExternalResolutionPanel
          key={item.id}
          item={item}
          action={view.action}
          saving={saving}
          onResolveExternal={onResolveExternal}
        />
      )}
    </aside>
  )
}

function InspectionChecklist({ item, action }: { item: PlanItem; action: PlanAction }) {
  const evidenceCount = item.evidenceCount ?? 0
  const rows = [
    {
      label: 'Responsable asignado',
      done: item.source !== 'task' || Boolean(item.assignedTo?.trim()),
      hint: item.source !== 'task' ? 'Se resuelve en su propia pantalla' : item.assignedTo || 'Falta asignar a alguien',
    },
    {
      label: 'Fecha límite',
      done: Boolean(item.dueDate),
      hint: item.dueDate ? fmtDate(item.dueDate) : 'Define hasta cuándo se corrige',
    },
    {
      label: 'Prueba subida',
      done: item.source === 'task' ? evidenceCount > 0 : false,
      hint: item.source === 'task'
        ? evidenceCount > 0 ? plural(evidenceCount, 'archivo', 'archivos') : 'Aún no hay archivos'
        : 'Te la pediremos al cerrar',
    },
    {
      label: 'Dónde se corrige',
      done: Boolean(action.href),
      hint: action.destination ?? action.label,
    },
  ]

  return (
    <div className="mt-4 rounded-xl border border-[color:var(--border-default)] bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <ClipboardCheck className="h-4 w-4 text-emerald-700" />
        <p className="text-xs font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">Lista para la inspección</p>
      </div>
      <p className="mb-2 text-[11px] leading-relaxed text-[color:var(--text-tertiary)]">
        Lo que SUNAFIL espera ver cuando des esto por resuelto.
      </p>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start gap-2 text-xs">
            <span className={cn(
              'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
              row.done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            )}>
              {row.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
              <span className="sr-only">{row.done ? 'Listo' : 'Pendiente'}</span>
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

function GoToFixLink({ action }: { action: PlanAction }) {
  return (
    <Link
      href={action.href}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2.5 text-sm font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--neutral-50)]"
    >
      {action.label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}

function TaskManagementPanel({
  item,
  action,
  saving,
  onPatchTask,
  onUploadEvidence,
}: {
  item: PlanItem
  action: PlanAction
  saving: boolean
  onPatchTask: (item: PlanItem, patch: TaskPatch) => Promise<void>
  onUploadEvidence: (item: PlanItem, file: File, notes: string, closeAfterUpload: boolean) => Promise<void>
}) {
  const [assignedTo, setAssignedTo] = useState(item.assignedTo ?? '')
  const [dueDate, setDueDate] = useState(dateInputValue(item.dueDate))
  const [notes, setNotes] = useState(item.notes ?? '')
  const [file, setFile] = useState<File | null>(null)

  const normalizedNotes = notes.trim() || null
  const normalizedAssignedTo = assignedTo.trim() || null
  const normalizedDueDate = dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null
  const canClose = Boolean(file || (item.evidenceCount ?? 0) > 0)

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
      <div>
        <h3 className="text-sm font-black">Resuélvelo desde aquí</h3>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-tertiary)]">
          Asigna a un responsable, anota el avance y sube la prueba. Quedará guardada por si llega una inspección.
        </p>
      </div>

      <GoToFixLink action={action} />

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
            <UserRound className="h-3 w-3" />
            Responsable
          </span>
          <input
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            placeholder="Ej.: María Torres (RRHH)"
            className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-medium outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
          />
        </label>

        <label className="block">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
            <Clock3 className="h-3 w-3" />
            Fecha límite
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
            Notas de lo que se hizo
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Qué se hizo, qué falta y dónde está el documento..."
            className="w-full resize-none rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
          />
        </label>

        <label className="block rounded-lg border border-dashed border-emerald-300 bg-white p-3">
          <span className="flex items-center gap-2 text-xs font-black text-emerald-800">
            <UploadCloud className="h-4 w-4" />
            Adjuntar prueba
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
          Subir prueba
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
          Marcar como resuelto
        </button>
      </div>

      {!canClose ? (
        <p className="text-[11px] leading-relaxed text-[color:var(--text-tertiary)]">
          Para marcarlo como resuelto, primero adjunta una prueba (por ejemplo, el documento firmado o la constancia).
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
          Ver la última prueba
        </a>
      ) : null}
    </div>
  )
}

function ExternalResolutionPanel({
  item,
  action,
  saving,
  onResolveExternal,
}: {
  item: PlanItem
  action: PlanAction
  saving: boolean
  onResolveExternal: (item: PlanItem, file: File, notes: string) => Promise<void>
}) {
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const sourceLabel = item.source === 'alert' ? 'la alerta' : 'la capacitación'

  return (
    <div className="mt-5 space-y-4 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
      <div>
        <h3 className="text-sm font-black">Cómo resolverlo</h3>
        <p className="mt-1 text-xs leading-relaxed text-[color:var(--text-tertiary)]">
          Son dos pasos: corrígelo en su pantalla y luego sube la prueba aquí para cerrar {sourceLabel}.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-black text-[color:var(--text-secondary)]">1. Corrígelo</p>
        <GoToFixLink action={action} />
        {item.link !== action.href ? (
          <Link
            href={item.link}
            className="inline-flex items-center gap-1 text-xs font-bold text-[color:var(--text-secondary)] hover:underline"
          >
            {item.source === 'alert' ? 'Ver en Alertas' : 'Ver seguimiento'}
            <ArrowRight className="h-3 w-3" />
          </Link>
        ) : null}
      </div>

      <p className="text-[11px] font-black text-[color:var(--text-secondary)]">2. Sube la prueba y ciérralo</p>

      <label className="block">
        <span className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[color:var(--text-tertiary)]">
          <FileCheck2 className="h-3 w-3" />
          Notas de lo que se hizo
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder={item.source === 'alert' ? 'Qué se corrigió y dónde está el documento...' : 'Qué capacitación se dio, en qué fecha y quiénes asistieron...'}
          className="w-full resize-none rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm leading-relaxed outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10"
        />
      </label>

      <label className="block rounded-lg border border-dashed border-emerald-300 bg-white p-3">
        <span className="flex items-center gap-2 text-xs font-black text-emerald-800">
          <UploadCloud className="h-4 w-4" />
          Archivo de prueba (obligatorio)
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
        Marcar como resuelto
      </button>

      {!file ? (
        <p className="text-[11px] leading-relaxed text-[color:var(--text-tertiary)]">
          Adjunta un archivo para cerrarlo: así queda la prueba guardada por si llega una inspección.
        </p>
      ) : null}
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
      <p className="mt-3 text-sm font-bold text-[color:var(--text-secondary)]">Cargando tus pendientes...</p>
    </div>
  )
}

function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" />
        <div>
          <p className="text-sm font-black text-red-900">No pudimos cargar tus pendientes</p>
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

/**
 * Qué hay detrás de una bandeja vacía:
 *  - checking: aún estamos consultando si hay diagnóstico y trabajadores.
 *  - ready: hay diagnóstico → sí es "todo al día".
 *  - no-diagnostic: hay trabajadores pero nunca se hizo el diagnóstico.
 *  - no-data: ni diagnóstico ni trabajadores → no hay nada que evaluar todavía.
 *  - unknown: no se pudo verificar; no celebramos.
 */
type EmptyPlanStatus = 'checking' | 'ready' | 'no-diagnostic' | 'no-data' | 'unknown'

function EmptyState({ total, onReset }: { total: number; onReset: () => void }) {
  const [status, setStatus] = useState<EmptyPlanStatus>('checking')

  useEffect(() => {
    if (total !== 0) return
    let cancelled = false
    void (async () => {
      try {
        const [diagnosticsRes, workersRes] = await Promise.all([
          fetch('/api/diagnostics', { cache: 'no-store' }),
          fetch('/api/workers?limit=1&status=ACTIVE,ON_LEAVE,SUSPENDED', { cache: 'no-store' }).catch(() => null),
        ])
        if (!diagnosticsRes.ok) throw new Error(`HTTP ${diagnosticsRes.status}`)
        const diagnosticsBody = (await diagnosticsRes.json()) as {
          diagnostics?: Array<{ completedAt: string | null }>
        }
        const hasDiagnostic = (diagnosticsBody.diagnostics ?? []).some((d) => Boolean(d.completedAt))
        let hasWorkers = false
        if (workersRes?.ok) {
          const workersBody = (await workersRes.json()) as { pagination?: { total?: number } }
          hasWorkers = (workersBody.pagination?.total ?? 0) > 0
        }
        if (!cancelled) setStatus(hasDiagnostic ? 'ready' : hasWorkers ? 'no-diagnostic' : 'no-data')
      } catch {
        if (!cancelled) setStatus('unknown')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [total])

  if (total > 0) {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-white p-12 text-center">
        <Filter className="mx-auto h-9 w-9 text-[color:var(--text-tertiary)]" />
        <p className="mt-3 text-base font-black text-[color:var(--text-primary)]">Nada coincide con estos filtros</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">
          Prueba con otro plazo o quita los filtros para ver todos tus pendientes.
        </p>
        <button
          type="button"
          onClick={onReset}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2 text-sm font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--neutral-50)]"
        >
          Ver todos los pendientes
        </button>
      </div>
    )
  }

  if (status === 'checking') {
    return (
      <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-white p-12 text-center" aria-live="polite">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[color:var(--text-tertiary)]" />
        <p className="mt-3 text-sm font-bold text-[color:var(--text-secondary)]">Revisando tu información...</p>
      </div>
    )
  }

  if (status === 'ready') {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 p-12 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <p className="mt-3 text-base font-black text-emerald-950">Todo al día</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-emerald-800">
          No hay tareas abiertas, alertas activas ni capacitaciones obligatorias atrasadas.
        </p>
      </div>
    )
  }

  const title =
    status === 'no-data'
      ? 'Todavía no tenemos datos para armar tu lista'
      : status === 'no-diagnostic'
        ? 'Tus pendientes salen del diagnóstico'
        : 'No tienes pendientes en este momento'
  const description =
    status === 'no-data'
      ? 'Haz el diagnóstico o registra a tus trabajadores. Con eso te diremos qué corregir y en qué orden.'
      : status === 'no-diagnostic'
        ? 'Tus trabajadores no tienen alertas abiertas, pero aún no haces el diagnóstico. Con él sabremos qué corregir y en qué orden.'
        : 'Si todavía no haces el diagnóstico, empieza por ahí: con él armamos tu lista de pendientes.'

  return (
    <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-white p-10 text-center">
      <ListChecks className="mx-auto h-10 w-10 text-[color:var(--text-tertiary)]" />
      <p className="mt-3 text-base font-black text-[color:var(--text-primary)]">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[color:var(--text-secondary)]">{description}</p>
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        <Link
          href="/dashboard/diagnostico"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          Hacer el diagnóstico express
          <ArrowRight className="h-4 w-4" />
        </Link>
        {status === 'no-data' ? (
          <Link
            href="/dashboard/trabajadores/nuevo"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2.5 text-sm font-bold text-[color:var(--text-primary)] transition-colors hover:bg-[color:var(--neutral-50)]"
          >
            Agregar trabajadores
          </Link>
        ) : null}
      </div>
    </div>
  )
}
