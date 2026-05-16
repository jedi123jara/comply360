'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  ListChecks,
  XCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * /dashboard/tareas — Gestor de Compliance Tasks.
 *
 * Cada task es una brecha priorizada (o incumplimiento del simulacro) que debe
 * resolverse. El usuario puede:
 *   - Ver el listado priorizado (1 = más urgente).
 *   - Filtrar por status / gravedad.
 *   - Marcar como IN_PROGRESS, COMPLETED (con evidencia) o DISMISSED.
 *
 * Origen: POST /api/diagnostics y POST /api/simulacro spawean automáticamente.
 */

type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'
type Gravedad = 'LEVE' | 'GRAVE' | 'MUY_GRAVE'

interface ComplianceTask {
  id: string
  orgId: string
  diagnosticId: string | null
  sourceId: string | null
  area: string
  priority: number
  title: string
  description: string | null
  baseLegal: string | null
  gravedad: Gravedad
  multaEvitable: number | null
  plazoSugerido: string | null
  dueDate: string | null
  assignedTo: string | null
  status: TaskStatus
  evidenceUrl: string | null
  notes: string | null
  completedAt: string | null
  createdAt: string
}

interface TasksResponse {
  tasks: ComplianceTask[]
  countsByStatus: Record<TaskStatus, number>
}

const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pendientes',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Resueltas',
  DISMISSED: 'Descartadas',
}

export default function TareasPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<TasksResponse | null>(null)
  const [filter, setFilter] = useState<TaskStatus | 'ALL'>('PENDING')
  const [gravityFilter, setGravityFilter] = useState<Gravedad | 'ALL'>('ALL')
  const [updating, setUpdating] = useState<string | null>(null)
  const [evidenceFor, setEvidenceFor] = useState<ComplianceTask | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (filter !== 'ALL') params.set('status', filter)
      if (gravityFilter !== 'ALL') params.set('gravedad', gravityFilter)
      const r = await fetch(`/api/compliance-tasks?${params}`, { cache: 'no-store' })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const body = (await r.json()) as TasksResponse
      setData(body)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [filter, gravityFilter])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const counts = data?.countsByStatus
  const tasks = data?.tasks ?? []

  async function patchTask(id: string, patch: Record<string, unknown>) {
    setUpdating(id)
    try {
      const r = await fetch('/api/compliance-tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      await load()
    } catch (e) {
      console.error(e)
    } finally {
      setUpdating(null)
    }
  }

  const totalOpen = (counts?.PENDING ?? 0) + (counts?.IN_PROGRESS ?? 0)

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200">
                <ListChecks className="h-4 w-4 text-emerald-600" />
              </span>
              <Badge variant="emerald" size="sm">Plan de acción</Badge>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Tareas de compliance</h1>
            <p className="mt-2 text-sm text-[color:var(--text-secondary)] max-w-xl">
              Cada brecha detectada en un diagnóstico o simulacro queda como tarea priorizada.
              Marcala como resuelta cuando subsanes para bajar tu riesgo de multa.
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs uppercase tracking-widest text-[color:var(--text-tertiary)]">
              Abiertas
            </p>
            <p
              className={cn(
                'text-4xl font-bold tabular-nums',
                totalOpen === 0
                  ? 'text-emerald-700'
                  : totalOpen > 10
                    ? 'text-crimson-700'
                    : 'text-amber-700'
              )}
            >
              {totalOpen}
            </p>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2">
          <FilterPill
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
            label="Todas"
            count={
              (counts?.PENDING ?? 0) +
              (counts?.IN_PROGRESS ?? 0) +
              (counts?.COMPLETED ?? 0) +
              (counts?.DISMISSED ?? 0)
            }
          />
          {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
            <FilterPill
              key={s}
              active={filter === s}
              onClick={() => setFilter(s)}
              label={STATUS_LABEL[s]}
              count={counts?.[s] ?? 0}
            />
          ))}
        </div>

        {/* Gravity filter */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[color:var(--text-tertiary)] uppercase tracking-widest">
            Gravedad:
          </span>
          {(['ALL', 'MUY_GRAVE', 'GRAVE', 'LEVE'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGravityFilter(g)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                gravityFilter === g
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-tertiary)] hover:border-emerald-200'
              )}
            >
              {g === 'ALL' ? 'Todas' : g.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Body */}
        {loading ? (
          <LoadingPanel />
        ) : error ? (
          <ErrorPanel error={error} onRetry={load} />
        ) : tasks.length === 0 ? (
          <EmptyPanel filter={filter} />
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                updating={updating === t.id}
                onStart={() => patchTask(t.id, { status: 'IN_PROGRESS' })}
                onComplete={() => setEvidenceFor(t)}
                onDismiss={() => patchTask(t.id, { status: 'DISMISSED' })}
                onReopen={() => patchTask(t.id, { status: 'PENDING' })}
              />
            ))}
          </ul>
        )}
      </div>

      {evidenceFor ? (
        <EvidenceModal
          task={evidenceFor}
          onCancel={() => setEvidenceFor(null)}
          onSubmit={async (evidenceUrl, notes) => {
            await patchTask(evidenceFor.id, { status: 'COMPLETED', evidenceUrl, notes })
            setEvidenceFor(null)
          }}
        />
      ) : null}
    </main>
  )
}

/* ── Filter pill ───────────────────────────────────────────────────── */

function FilterPill({
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
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-all',
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
          : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-emerald-200'
      )}
      aria-pressed={active}
    >
      {label}
      <span
        className={cn(
          'inline-flex min-w-[1.5rem] justify-center rounded-full px-1.5 text-xs font-bold',
          active ? 'bg-emerald-600 text-white' : 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]'
        )}
      >
        {count}
      </span>
    </button>
  )
}

/* ── Task row ──────────────────────────────────────────────────────── */

function TaskRow({
  task,
  updating,
  onStart,
  onComplete,
  onDismiss,
  onReopen,
}: {
  task: ComplianceTask
  updating: boolean
  onStart: () => void
  onComplete: () => void
  onDismiss: () => void
  onReopen: () => void
}) {
  const gravityTone =
    task.gravedad === 'MUY_GRAVE'
      ? 'bg-crimson-50 text-crimson-700 border-crimson-200'
      : task.gravedad === 'GRAVE'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  const statusTone =
    task.status === 'COMPLETED'
      ? 'text-emerald-700'
      : task.status === 'IN_PROGRESS'
        ? 'text-amber-700'
        : task.status === 'DISMISSED'
          ? 'text-[color:var(--text-tertiary)]'
          : 'text-crimson-700'

  const StatusIcon =
    task.status === 'COMPLETED'
      ? CheckCircle2
      : task.status === 'IN_PROGRESS'
        ? Loader2
        : task.status === 'DISMISSED'
          ? XCircle
          : AlertTriangle

  const dueDate = task.dueDate ? new Date(task.dueDate) : null
  const isOverdue =
    dueDate !== null && task.status !== 'COMPLETED' && task.status !== 'DISMISSED' && dueDate < new Date()

  const fmtMulta = (n: number | null) =>
    n && n > 0 ? `S/ ${n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}` : null

  const open = task.status === 'PENDING' || task.status === 'IN_PROGRESS'

  return (
    <li>
      <Card padding="md" className={cn('transition-all', open ? 'hover:border-emerald-300' : 'opacity-70')}>
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg font-mono text-xs font-bold shrink-0',
              task.priority <= 3
                ? 'bg-crimson-50 text-crimson-700'
                : task.priority <= 8
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]'
            )}
            title={`Prioridad #${task.priority}`}
          >
            {task.priority}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={cn(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                  gravityTone
                )}
              >
                {task.gravedad.replace('_', ' ')}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
                {task.area.replace(/_/g, ' ')}
              </span>
              {task.baseLegal ? (
                <span className="text-[10px] font-mono text-[color:var(--text-tertiary)]">
                  {task.baseLegal}
                </span>
              ) : null}
            </div>
            <p className="text-base font-bold leading-snug">{task.title}</p>
            {task.description ? (
              <p className="mt-1 text-xs text-[color:var(--text-secondary)] leading-relaxed line-clamp-2">
                {task.description}
              </p>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              {fmtMulta(task.multaEvitable) ? (
                <span className="inline-flex items-center gap-1 text-crimson-700 font-semibold">
                  Evita <span className="font-mono">{fmtMulta(task.multaEvitable)}</span>
                </span>
              ) : null}
              {task.plazoSugerido ? (
                <span className="inline-flex items-center gap-1 text-[color:var(--text-tertiary)]">
                  <Clock className="h-3 w-3" />
                  {task.plazoSugerido}
                </span>
              ) : null}
              {dueDate ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1',
                    isOverdue ? 'text-crimson-700 font-semibold' : 'text-[color:var(--text-tertiary)]'
                  )}
                >
                  Vence {dueDate.toLocaleDateString('es-PE')}
                  {isOverdue ? ' (vencido)' : ''}
                </span>
              ) : null}
              <span className={cn('inline-flex items-center gap-1 font-semibold', statusTone)}>
                <StatusIcon
                  className={cn('h-3 w-3', task.status === 'IN_PROGRESS' ? 'animate-spin' : '')}
                />
                {STATUS_LABEL[task.status].slice(0, -1)}
              </span>
              {task.evidenceUrl ? (
                <a
                  href={task.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  Evidencia
                </a>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {updating ? (
              <Loader2 className="h-4 w-4 animate-spin text-[color:var(--text-tertiary)]" />
            ) : task.status === 'PENDING' ? (
              <>
                <Button size="sm" variant="ghost" onClick={onStart}>
                  Empezar
                </Button>
                <Button size="sm" onClick={onComplete} iconRight={<ArrowRight className="h-3 w-3" />}>
                  Resolver
                </Button>
              </>
            ) : task.status === 'IN_PROGRESS' ? (
              <>
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  Descartar
                </Button>
                <Button size="sm" onClick={onComplete} iconRight={<ArrowRight className="h-3 w-3" />}>
                  Resolver
                </Button>
              </>
            ) : (
              <Button size="sm" variant="ghost" onClick={onReopen}>
                Reabrir
              </Button>
            )}
          </div>
        </div>
      </Card>
    </li>
  )
}

/* ── Loading / Error / Empty panels ────────────────────────────────── */

function LoadingPanel() {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-[color:var(--text-tertiary)]">
      <Loader2 className="h-4 w-4 animate-spin" />
      Cargando tareas…
    </div>
  )
}

function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card padding="lg" className="text-center">
      <AlertTriangle className="h-8 w-8 text-crimson-700 mx-auto mb-3" />
      <p className="text-base font-bold">No pudimos cargar las tareas</p>
      <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{error}</p>
      <Button size="sm" onClick={onRetry} className="mt-4">
        Reintentar
      </Button>
    </Card>
  )
}

function EmptyPanel({ filter }: { filter: string }) {
  return (
    <Card padding="lg" className="text-center">
      <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
      <CardTitle>
        {filter === 'PENDING'
          ? 'Sin tareas pendientes'
          : filter === 'COMPLETED'
            ? 'Sin tareas resueltas aún'
            : 'Sin tareas en este filtro'}
      </CardTitle>
      <CardDescription className="mt-2 max-w-md mx-auto">
        Al correr un diagnóstico o simulacro se generan tareas priorizadas
        automáticamente. Empieza por{' '}
        <a href="/dashboard/diagnostico" className="font-semibold text-emerald-700 hover:underline">
          /diagnóstico
        </a>{' '}
        o{' '}
        <a href="/dashboard/simulacro" className="font-semibold text-emerald-700 hover:underline">
          /simulacro
        </a>
        .
      </CardDescription>
    </Card>
  )
}

/* ── Evidence modal ────────────────────────────────────────────────── */

function EvidenceModal({
  task,
  onCancel,
  onSubmit,
}: {
  task: ComplianceTask
  onCancel: () => void
  onSubmit: (evidenceUrl: string | null, notes: string | null) => void | Promise<void>
}) {
  const [evidenceUrl, setEvidenceUrl] = useState(task.evidenceUrl ?? '')
  const [notes, setNotes] = useState(task.notes ?? '')
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    setSubmitting(true)
    await onSubmit(evidenceUrl.trim() || null, notes.trim() || null)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="!p-0 !pb-3 !border-none">
          <div>
            <CardTitle>Marcar como resuelta</CardTitle>
            <CardDescription>
              Adjuntá el link a la evidencia (documento subido al legajo, captura, link interno) y
              una nota opcional.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="!p-0 space-y-3">
          <div>
            <label className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest">
              Link de evidencia (opcional)
            </label>
            <input
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[color:var(--text-secondary)] uppercase tracking-widest">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe qué se hizo para subsanar…"
              className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 resize-none"
            />
          </div>
        </CardContent>
        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={submitting}
            icon={submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          >
            {submitting ? 'Guardando…' : 'Marcar resuelta'}
          </Button>
        </div>
      </div>
    </div>
  )
}
