'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ListChecks,
  GraduationCap,
  Bell,
  Loader2,
  ArrowRight,
  Filter,
  X,
  Banknote,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * /dashboard/plan-accion — Vista agregadora de acciones pendientes.
 *
 * Combina 3 fuentes en una sola lista priorizada:
 *   - ComplianceTask (de diagnóstico/simulacro SUNAFIL)
 *   - WorkerAlert (alert engine)
 *   - Capacitaciones obligatorias vencidas (>30 días sin completar)
 *
 * Cada item linkea a su módulo origen para resolverlo. Esta vista NO duplica
 * funcionalidad: orquesta las acciones que ya existen distribuidas por la app.
 */

type Source = 'task' | 'alert' | 'training'
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface PlanItem {
  id: string
  source: Source
  sourceLabel: string
  severity: Severity
  area: string
  title: string
  description: string | null
  dueDate: string | null
  multaEvitable: number | null
  link: string
  workerName?: string
}

interface PlanResponse {
  items: PlanItem[]
  stats: {
    total: number
    critical: number
    overdue: number
    byCategory: { tasks: number; alerts: number; trainings: number }
    multaEvitableTotal: number
  }
}

const SOURCE_CONFIG: Record<Source, { label: string; icon: typeof ListChecks; color: string }> = {
  task: { label: 'Tareas', icon: ListChecks, color: 'text-emerald-700' },
  alert: { label: 'Alertas', icon: Bell, color: 'text-amber-700' },
  training: { label: 'Capacitaciones', icon: GraduationCap, color: 'text-purple-700' },
}

const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string }> = {
  CRITICAL: { label: 'Crítica', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  HIGH: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { label: 'Media', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  LOW: { label: 'Baja', bg: 'bg-blue-50', text: 'text-emerald-700', border: 'border-blue-200' },
}

function fmtSoles(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isOverdue(iso: string | null) {
  if (!iso) return false
  return new Date(iso).getTime() < Date.now()
}

export default function PlanAccionPage() {
  const [data, setData] = useState<PlanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sourceFilter, setSourceFilter] = useState<Source | 'all'>('all')
  const [severityFilter, setSeverityFilter] = useState<Severity | 'all'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/plan-accion', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = (await res.json()) as PlanResponse
      setData(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    if (!data) return []
    return data.items.filter((i) => {
      if (sourceFilter !== 'all' && i.source !== sourceFilter) return false
      if (severityFilter !== 'all' && i.severity !== severityFilter) return false
      return true
    })
  }, [data, sourceFilter, severityFilter])

  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Plan de Acción</h1>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Todas las acciones pendientes en un solo lugar: tareas de compliance, alertas críticas y
          capacitaciones obligatorias atrasadas. Click en cada item para resolverlo en su módulo.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Pendientes totales"
          value={stats?.total ?? 0}
          loading={loading}
        />
        <KpiCard
          label="Críticas"
          value={stats?.critical ?? 0}
          loading={loading}
          accent="red"
        />
        <KpiCard
          label="Atrasadas (vencidas)"
          value={stats?.overdue ?? 0}
          loading={loading}
          accent="amber"
        />
        <KpiCard
          label="Multa evitable"
          value={stats ? fmtSoles(stats.multaEvitableTotal) : 'S/ 0'}
          loading={loading}
          accent="emerald"
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-[color:var(--text-tertiary)]" />

        <FilterChip
          active={sourceFilter === 'all'}
          onClick={() => setSourceFilter('all')}
          label={`Todas (${stats?.total ?? 0})`}
        />
        <FilterChip
          active={sourceFilter === 'task'}
          onClick={() => setSourceFilter('task')}
          icon={<ListChecks className="h-3 w-3" />}
          label={`Tareas (${stats?.byCategory.tasks ?? 0})`}
        />
        <FilterChip
          active={sourceFilter === 'alert'}
          onClick={() => setSourceFilter('alert')}
          icon={<Bell className="h-3 w-3" />}
          label={`Alertas (${stats?.byCategory.alerts ?? 0})`}
        />
        <FilterChip
          active={sourceFilter === 'training'}
          onClick={() => setSourceFilter('training')}
          icon={<GraduationCap className="h-3 w-3" />}
          label={`Capacitaciones (${stats?.byCategory.trainings ?? 0})`}
        />

        <span className="mx-2 text-[color:var(--text-tertiary)]">·</span>

        <FilterChip
          active={severityFilter === 'all'}
          onClick={() => setSeverityFilter('all')}
          label="Toda gravedad"
        />
        {(['CRITICAL', 'HIGH', 'MEDIUM'] as Severity[]).map((s) => (
          <FilterChip
            key={s}
            active={severityFilter === s}
            onClick={() => setSeverityFilter(s)}
            label={SEVERITY_CONFIG[s].label}
          />
        ))}

        {(sourceFilter !== 'all' || severityFilter !== 'all') && (
          <button
            onClick={() => {
              setSourceFilter('all')
              setSeverityFilter('all')
            }}
            className="ml-auto flex items-center gap-1 text-xs text-red-600 hover:underline"
          >
            <X className="h-3 w-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-emerald-700" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-800">No se pudo cargar el plan de acción: {error}</p>
          <button onClick={load} className="mt-2 text-xs font-semibold text-red-700 hover:underline">
            Reintentar
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState totalItems={stats?.total ?? 0} />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Components ─────────────────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  loading,
  accent = 'default',
}: {
  label: string
  value: number | string
  loading: boolean
  accent?: 'default' | 'red' | 'amber' | 'emerald'
}) {
  const accentColor = {
    default: 'text-[color:var(--text-primary)]',
    red: 'text-red-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  }[accent]

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
      <p className="text-[11px] uppercase tracking-wide text-[color:var(--text-tertiary)]">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', accentColor)}>
        {loading ? <span className="opacity-30">—</span> : value}
      </p>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon?: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        active
          ? 'bg-emerald-600 text-white'
          : 'border border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-emerald-300'
      )}
    >
      {icon}
      {label}
    </button>
  )
}

function ItemRow({ item }: { item: PlanItem }) {
  const sourceCfg = SOURCE_CONFIG[item.source]
  const sevCfg = SEVERITY_CONFIG[item.severity]
  const SourceIcon = sourceCfg.icon
  const overdue = isOverdue(item.dueDate)

  return (
    <Link
      href={item.link}
      className="group block rounded-xl border border-[color:var(--border-default)] bg-white p-4 transition-colors hover:border-emerald-300 hover:bg-emerald-50/30"
    >
      <div className="flex items-start gap-3">
        <div className={cn('rounded-lg bg-[color:var(--neutral-50)] p-2 shrink-0', sourceCfg.color)}>
          <SourceIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                sevCfg.bg,
                sevCfg.text,
                sevCfg.border
              )}
            >
              {sevCfg.label}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              {item.sourceLabel}
            </span>
            {overdue && item.dueDate && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                <AlertTriangle className="h-2.5 w-2.5" />
                Vencida
              </span>
            )}
            {item.workerName && (
              <span className="text-[10px] text-[color:var(--text-tertiary)]">
                · {item.workerName}
              </span>
            )}
          </div>

          <p className="text-sm font-semibold text-[color:var(--text-primary)] leading-snug">
            {item.title}
          </p>

          {item.description && (
            <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)] line-clamp-2">
              {item.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-3 text-[11px] text-[color:var(--text-tertiary)]">
            <span className="rounded bg-[color:var(--neutral-100)] px-1.5 py-0.5 font-mono">
              {item.area}
            </span>
            {item.dueDate && (
              <span className={cn('inline-flex items-center gap-1', overdue && 'text-red-700 font-semibold')}>
                Vence {fmtDate(item.dueDate)}
              </span>
            )}
            {item.multaEvitable != null && item.multaEvitable > 0 && (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Banknote className="h-3 w-3" />
                Evita {fmtSoles(item.multaEvitable)}
              </span>
            )}
          </div>
        </div>

        <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)] group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all mt-1" />
      </div>
    </Link>
  )
}

function EmptyState({ totalItems }: { totalItems: number }) {
  if (totalItems === 0) {
    return (
      <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 p-12 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 mb-3">
          <ListChecks className="h-6 w-6 text-emerald-700" />
        </div>
        <p className="text-base font-semibold text-[color:var(--text-primary)]">
          ¡Todo al día!
        </p>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
          No hay tareas pendientes, alertas activas ni capacitaciones obligatorias atrasadas.
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-10 text-center">
      <p className="text-sm text-[color:var(--text-tertiary)]">
        Ningún item coincide con los filtros seleccionados.
      </p>
    </div>
  )
}
