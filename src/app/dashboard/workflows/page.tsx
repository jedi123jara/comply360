'use client'

/**
 * /dashboard/workflows — MVP del módulo de Workflows.
 *
 * Funcionalidad:
 *  - Lista los workflows de la organización (activos + inactivos)
 *  - Permite crear uno nuevo desde un template prefabricado
 *  - Activar/desactivar con un toggle
 *  - Eliminar con confirmación
 *  - Ejecutar manualmente (útil para pruebas)
 *  - Ver historial reciente de runs por workflow
 *
 * Fuera del MVP: editor visual libre, drag-and-drop, triggers automáticos
 * por evento. El engine (src/lib/workflows/engine.ts) ya los soporta a nivel
 * código, solo falta el wiring con eventos reales.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Workflow as WorkflowIcon,
  Play,
  Trash2,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Pause,
  AlertTriangle,
  X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────

interface WorkflowDef {
  id: string
  name: string
  description: string
  triggerId: string
  active: boolean
  version: number
  steps: Array<{ id: string; name: string; type: string; order: number }>
  createdAt: string
  updatedAt: string
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'contratos' | 'onboarding' | 'compliance' | 'sst'
  params: Array<{
    key: string
    label: string
    type: 'email' | 'number' | 'text'
    default?: string | number
    required?: boolean
  }>
}

interface WorkflowRun {
  id: string
  workflowId: string
  status: string
  startedAt: string
  completedAt: string | null
  error: string | null
  triggeredBy: string | null
  workflow?: { name: string }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
  RUNNING: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Loader2 },
  WAITING_APPROVAL: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Pause },
  PAUSED: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Pause },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-700', icon: X },
  PENDING: { bg: 'bg-slate-100', text: 'text-slate-700', icon: Clock },
}

const CATEGORY_LABEL: Record<WorkflowTemplate['category'], string> = {
  contratos: 'Contratos',
  onboarding: 'Onboarding',
  compliance: 'Compliance',
  sst: 'SST',
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowDef[]>([])
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/workflows', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const body = (await res.json()) as { workflows: WorkflowDef[]; templates: WorkflowTemplate[] }
      setWorkflows(body.workflows)
      setTemplates(body.templates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function toggleActive(id: string, active: boolean) {
    const res = await fetch(`/api/workflows/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active }),
    })
    if (res.ok) await load()
  }

  async function removeWorkflow(id: string, name: string) {
    if (!confirm(`¿Eliminar el workflow "${name}"? Se perderá su historial de ejecuciones.`)) return
    const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
    if (res.ok) {
      if (selectedWorkflowId === id) setSelectedWorkflowId(null)
      await load()
    }
  }

  const selected = workflows.find((w) => w.id === selectedWorkflowId) ?? null

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workflows</h1>
          <p className="text-sm text-slate-500 mt-1">
            Automatiza tareas de compliance: alertas, recordatorios, onboarding. Los disparadores
            automáticos están en versión MVP; por ahora puedes ejecutar manualmente cada workflow.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" />
          Nuevo workflow
        </button>
      </div>

      {loading && (
        <div className="py-16 text-center">
          <Loader2 className="w-6 h-6 animate-spin inline-block text-slate-400" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Error al cargar workflows</p>
            <p className="text-sm text-red-800 mt-1">{error}</p>
            <button onClick={load} className="mt-3 text-xs font-medium text-red-700 hover:text-red-900">
              Reintentar →
            </button>
          </div>
        </div>
      )}

      {!loading && !error && workflows.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
          <WorkflowIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">
            No tienes workflows activos todavía. Elige un template para empezar.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Crear el primero
          </button>
        </div>
      )}

      {!loading && !error && workflows.length > 0 && (
        <div className="grid md:grid-cols-[1fr_2fr] gap-6">
          {/* Lista */}
          <div className="space-y-2">
            {workflows.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWorkflowId(w.id)}
                className={`w-full text-left rounded-lg border p-3 transition ${
                  selectedWorkflowId === w.id
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-slate-900 text-sm leading-tight">
                    {w.name}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${
                      w.active
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {w.active ? 'ACTIVO' : 'PAUSADO'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2">{w.description}</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  {w.steps.length} paso{w.steps.length === 1 ? '' : 's'} · v{w.version}
                </p>
              </button>
            ))}
          </div>

          {/* Detalle */}
          <div>
            {selected ? (
              <WorkflowDetail
                workflow={selected}
                onToggle={() => toggleActive(selected.id, !selected.active)}
                onDelete={() => removeWorkflow(selected.id, selected.name)}
                onReload={load}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
                Selecciona un workflow de la lista para ver sus pasos e historial.
              </div>
            )}
          </div>
        </div>
      )}

      {creating && (
        <CreateModal
          templates={templates}
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false)
            await load()
          }}
        />
      )}
    </div>
  )
}

// ─── WorkflowDetail ────────────────────────────────────────────────────────

function WorkflowDetail({
  workflow,
  onToggle,
  onDelete,
  onReload,
}: {
  workflow: WorkflowDef
  onToggle: () => void
  onDelete: () => void
  onReload: () => Promise<void>
}) {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const loadRuns = useCallback(async () => {
    setRunsLoading(true)
    try {
      const res = await fetch(`/api/workflows/${workflow.id}`, { cache: 'no-store' })
      if (res.ok) {
        const body = (await res.json()) as { runs: WorkflowRun[] }
        setRuns(body.runs)
      }
    } finally {
      setRunsLoading(false)
    }
  }, [workflow.id])

  useEffect(() => {
    loadRuns()
  }, [loadRuns])

  async function handleRun() {
    setRunning(true)
    try {
      const res = await fetch(`/api/workflows/${workflow.id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggerData: {} }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert(body.error ?? 'Error al ejecutar')
        return
      }
      await Promise.all([loadRuns(), onReload()])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{workflow.name}</h2>
            <p className="text-sm text-slate-600 mt-1">{workflow.description}</p>
            <p className="text-xs text-slate-400 mt-2">
              Trigger: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{workflow.triggerId}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggle}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                workflow.active
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-50'
                  : 'border-emerald-600 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {workflow.active ? 'Pausar' : 'Activar'}
            </button>
            <button
              onClick={handleRun}
              disabled={running || !workflow.active}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Ejecutar
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
              aria-label="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold uppercase text-slate-500 tracking-wide mb-2">
            Pasos ({workflow.steps.length})
          </p>
          <ol className="space-y-2">
            {workflow.steps.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-slate-700">{s.name}</span>
                <span className="ml-auto text-[11px] font-mono text-slate-400">{s.type}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Historial */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Historial de ejecuciones</h3>
          <span className="text-xs text-slate-500">{runs.length} recientes</span>
        </div>
        {runsLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
        ) : runs.length === 0 ? (
          <p className="text-sm text-slate-500">Sin ejecuciones todavía. Usa el botón Ejecutar.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {runs.map((run) => {
              const s = STATUS_STYLE[run.status] ?? STATUS_STYLE.PENDING
              const Icon = s.icon
              return (
                <li key={run.id} className="py-2.5 flex items-start gap-3 text-sm">
                  <div className={`px-2 py-0.5 rounded text-[11px] font-semibold ${s.bg} ${s.text} flex items-center gap-1 flex-shrink-0`}>
                    <Icon className="w-3 h-3" />
                    {run.status}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700">
                      {formatDate(run.startedAt)}
                      {run.triggeredBy && (
                        <span className="text-slate-400"> · por {run.triggeredBy}</span>
                      )}
                    </p>
                    {run.error && (
                      <p className="text-xs text-red-700 mt-0.5">{run.error}</p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── CreateModal ───────────────────────────────────────────────────────────

function CreateModal({
  templates,
  onClose,
  onCreated,
}: {
  templates: WorkflowTemplate[]
  onClose: () => void
  onCreated: () => Promise<void>
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [params, setParams] = useState<Record<string, string | number>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const template = templates.find((t) => t.id === selectedId)

  async function handleCreate() {
    if (!template) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, params }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      await onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Nuevo workflow</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {!template ? (
            <>
              <p className="text-sm text-slate-600">
                Elige un template para empezar. Puedes activar o pausar el workflow después.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className="text-left rounded-lg border border-slate-200 p-4 hover:border-emerald-500 hover:bg-emerald-50 transition"
                  >
                    <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wide">
                      {CATEGORY_LABEL[t.category]}
                    </span>
                    <h3 className="font-semibold text-slate-900 mt-1">{t.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{t.description}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedId(null)
                    setParams({})
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  ← Cambiar template
                </button>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{template.name}</h3>
                <p className="text-sm text-slate-600 mt-1">{template.description}</p>
              </div>
              <div className="space-y-3 pt-2">
                {template.params.map((p) => (
                  <label key={p.key} className="block">
                    <span className="text-xs font-semibold text-slate-700">
                      {p.label}
                      {p.required && <span className="text-red-600 ml-1">*</span>}
                    </span>
                    <input
                      type={p.type === 'number' ? 'number' : p.type === 'email' ? 'email' : 'text'}
                      value={
                        params[p.key] !== undefined
                          ? String(params[p.key])
                          : p.default !== undefined
                            ? String(p.default)
                            : ''
                      }
                      onChange={(e) =>
                        setParams((prev) => ({
                          ...prev,
                          [p.key]:
                            p.type === 'number' ? Number(e.target.value) : e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </label>
                ))}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear workflow
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
