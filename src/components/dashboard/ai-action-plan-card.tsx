'use client'

/**
 * AIActionPlanCard — Plan de Acción generado por IA con design system claro.
 *
 * Refactor 2026-04-26: purga la deuda de modo-dark (text-white sobre bg-white,
 * bg-[#141824] duplicado, border-white/X) y aplica design system consistente.
 *
 * Estados visuales:
 *  - Empty: hero card con CTA "Generar plan con IA"
 *  - Loading: pulse + skeleton
 *  - Error: red card con retry
 *  - Loaded: header con stats grid + lista de tareas + footer
 *
 * Cuando `plan.generadoPor==='simulated'`, banner amber explicando que la IA
 * real no respondió (OPENAI_API_KEY no configurado o quota agotada). Las
 * tareas igual son útiles (heurísticas) pero el founder debe activar la IA.
 */

import { useState } from 'react'
import {
  Sparkles, Loader2, AlertCircle, CheckCircle2, TrendingUp,
  Calendar, Users, Scale, ShieldAlert, ChevronDown, ChevronUp,
  RefreshCw, Wand2, Zap, FileText, Clock, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ActionPlanTask {
  id: string
  titulo: string
  descripcion: string
  area: string
  responsable: 'RRHH' | 'LEGAL' | 'GERENCIA' | 'SST' | 'CONTABILIDAD' | 'IT'
  prioridad: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  plazoDias: number
  impactoScore: number
  baseLegal: string
  multaEvitada?: number
  pasos?: string[]
}

interface ActionPlan {
  generadoPor: 'ai' | 'simulated'
  modelo: string
  generadoAt: string
  resumen: string
  tareas: ActionPlanTask[]
  proyeccionScore: {
    actual: number
    estimadoTrasPlan: number
    incremento: number
  }
  multaEvitadaTotal: number
}

interface ApiResponse {
  diagnosticId: string
  plan: ActionPlan
  error?: string
}

// ─── Visual maps (paleta clara, sin text-white sobre bg-white) ───────────────
const PRIORIDAD_STYLE: Record<ActionPlanTask['prioridad'], { badge: string; dot: string }> = {
  CRITICA: { badge: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200', dot: 'bg-rose-500' },
  ALTA: { badge: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', dot: 'bg-orange-500' },
  MEDIA: { badge: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200', dot: 'bg-amber-500' },
  BAJA: { badge: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200', dot: 'bg-sky-500' },
}

const RESPONSABLE_LABEL: Record<ActionPlanTask['responsable'], { label: string; color: string }> = {
  RRHH: { label: 'RRHH', color: 'text-indigo-700 bg-indigo-50 ring-indigo-200' },
  LEGAL: { label: 'Legal', color: 'text-purple-700 bg-purple-50 ring-purple-200' },
  GERENCIA: { label: 'Gerencia', color: 'text-slate-700 bg-slate-50 ring-slate-200' },
  SST: { label: 'SST', color: 'text-emerald-700 bg-emerald-50 ring-emerald-200' },
  CONTABILIDAD: { label: 'Contabilidad', color: 'text-cyan-700 bg-cyan-50 ring-cyan-200' },
  IT: { label: 'TI', color: 'text-zinc-700 bg-zinc-50 ring-zinc-200' },
}

// ─── Component ───────────────────────────────────────────────────────────────
export function AIActionPlanCard({ diagnosticId }: { diagnosticId: string }) {
  const [plan, setPlan] = useState<ActionPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ai-action-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ diagnosticId }),
      })
      const data: ApiResponse = await res.json()
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
      setPlan(data.plan)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  function toggleCompleted(id: string) {
    setCompletedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ─── Empty state — invitación a generar ─────────────────────────────────
  if (!plan && !loading && !error) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-8">
        <div className="flex flex-col items-center text-center max-w-md mx-auto">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-purple-400 opacity-20 blur-xl rounded-full" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-200">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Plan de Acción con IA
          </h2>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            La IA analiza tus brechas, prioriza tareas, calcula multas SUNAFIL evitadas
            y proyecta tu nuevo score. Genera un cronograma de 90 días con base legal
            específica para tu empresa.
          </p>
          <button
            onClick={generate}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all hover:shadow-lg"
          >
            <Wand2 className="h-4 w-4" />
            Generar plan con IA
          </button>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            <span>~15-30 segundos · Hasta 8 tareas priorizadas</span>
          </div>
        </div>
      </div>
    )
  }

  // ─── Loading state ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-10">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-400 opacity-20" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            Generando plan personalizado…
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Analizando brechas, scoring por área y multas potenciales
          </p>
          <div className="mt-4 flex gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" style={{ animationDelay: '200ms' }} />
            <span className="h-2 w-2 animate-pulse rounded-full bg-purple-500" style={{ animationDelay: '400ms' }} />
          </div>
        </div>
      </div>
    )
  }

  // ─── Error state ────────────────────────────────────────────────────────
  if (error && !plan) {
    return (
      <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-rose-500" />
          <div className="flex-1">
            <h3 className="font-semibold text-rose-900">No se pudo generar el plan</h3>
            <p className="mt-1 text-sm text-rose-700">{error}</p>
            <button
              onClick={generate}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!plan) return null

  // ─── Plan loaded — header + tareas + footer ─────────────────────────────
  // Defensive: la API podría devolver tareas no-array o sin proyeccionScore
  // (especialmente si responde el modo simulado degradado o un edge case).
  const safeTareas = Array.isArray(plan.tareas) ? plan.tareas : []
  const safeProyeccion = plan.proyeccionScore ?? { actual: 0, estimadoTrasPlan: 0, incremento: 0 }
  const totalCompleted = completedIds.size
  const totalTareas = safeTareas.length
  const progresoPct = totalTareas > 0 ? Math.round((totalCompleted / totalTareas) * 100) : 0
  const incrementoCompletado = safeTareas
    .filter(t => completedIds.has(t.id))
    .reduce((acc, t) => acc + (t.impactoScore ?? 0), 0)
  const scoreEstimado = Math.min(100, (safeProyeccion.actual ?? 0) + incrementoCompletado)
  const isSimulated = plan.generadoPor === 'simulated'

  return (
    <div className="space-y-5">
      {/* Banner explicativo cuando está en modo simulado */}
      {isSimulated && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900">
              IA en modo offline — generamos un plan base con heurísticas
            </p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              El motor de IA no respondió (probablemente <code className="px-1 py-0.5 rounded bg-amber-100 text-[11px] font-mono">OPENAI_API_KEY</code> no
              está configurado). Las tareas siguen siendo útiles pero genéricas. Para obtener un plan
              personalizado con tu data específica, configura la IA real.
            </p>
          </div>
        </div>
      )}

      {/* Header con stats */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">Plan de Acción IA</h2>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold ring-1',
                  isSimulated
                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                )}>
                  {isSimulated ? 'MODO OFFLINE' : 'IA REAL'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{plan.modelo}</span>
              </div>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{plan.resumen}</p>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white border border-purple-200 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 hover:border-purple-300 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Regenerar
          </button>
        </div>

        {/* Stats grid — 4 cards blancos con borde de color */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Tareas"
            value={String(totalTareas)}
            color="purple"
            icon={<FileText className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Score actual"
            value={String(safeProyeccion.actual ?? 0)}
            suffix="/100"
            color="slate"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Score proyectado"
            value={String(safeProyeccion.estimadoTrasPlan ?? 0)}
            suffix="/100"
            badge={`+${safeProyeccion.incremento ?? 0} pts`}
            color="emerald"
            icon={<Zap className="h-3.5 w-3.5" />}
          />
          <StatCard
            label="Multa evitada"
            value={`S/ ${(plan.multaEvitadaTotal ?? 0).toLocaleString('es-PE')}`}
            color="emerald"
            icon={<ShieldAlert className="h-3.5 w-3.5" />}
            small
          />
        </div>

        {/* Progress bar (solo si hay completadas) */}
        {totalCompleted > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-700 mb-1.5">
              <span className="font-medium">Progreso del plan</span>
              <span>
                {totalCompleted}/{totalTareas} tareas · Score estimado:{' '}
                <strong className="text-emerald-600">{scoreEstimado}/100</strong>
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${progresoPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Lista de tareas */}
      <div className="space-y-3">
        {safeTareas.map((task, idx) => {
          const done = completedIds.has(task.id)
          const expanded = expandedTask === task.id
          // Defensive: si la API devuelve prioridad/responsable inesperado, usar fallback
          const prio = PRIORIDAD_STYLE[task.prioridad] ?? PRIORIDAD_STYLE.MEDIA
          const resp = RESPONSABLE_LABEL[task.responsable] ?? RESPONSABLE_LABEL.RRHH

          return (
            <div
              key={task.id}
              className={cn(
                'rounded-xl border bg-white shadow-sm transition-all',
                done
                  ? 'border-emerald-200 bg-emerald-50/30 opacity-80'
                  : 'border-slate-200 hover:border-purple-300 hover:shadow-md'
              )}
            >
              <div className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  {/* Checkbox grande */}
                  <button
                    onClick={() => toggleCompleted(task.id)}
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                      done
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 hover:border-emerald-400 bg-white'
                    )}
                    aria-label={done ? 'Marcar como pendiente' : 'Marcar como completada'}
                  >
                    {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>

                  {/* Number badge */}
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white shadow-sm">
                    {idx + 1}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className={cn(
                        'font-semibold text-sm sm:text-base leading-tight',
                        done ? 'line-through text-slate-400' : 'text-slate-900'
                      )}>
                        {task.titulo}
                      </h3>
                      <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold flex items-center gap-1', prio.badge)}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', prio.dot)} />
                        {task.prioridad}
                      </span>
                    </div>

                    <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                      {task.descripcion}
                    </p>

                    {/* Meta row: responsable / plazo / impacto / multa */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ring-1', resp.color)}>
                        <Users className="h-3 w-3" />
                        {resp.label}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md ring-1 ring-slate-200">
                        <Calendar className="h-3 w-3" />
                        {task.plazoDias} {task.plazoDias === 1 ? 'día' : 'días'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md ring-1 ring-purple-200">
                        <TrendingUp className="h-3 w-3" />
                        +{task.impactoScore} pts
                      </span>
                      {task.multaEvitada !== undefined && task.multaEvitada > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md ring-1 ring-emerald-200">
                          <ShieldAlert className="h-3 w-3" />
                          S/ {task.multaEvitada.toLocaleString('es-PE')}
                        </span>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedTask(expanded ? null : task.id)}
                      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 hover:underline"
                    >
                      {expanded ? 'Ocultar detalle' : 'Ver detalle + base legal'}
                      {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>

                    {/* Expanded section */}
                    {expanded && (
                      <div className="mt-3 space-y-3">
                        {/* Pasos concretos si existen */}
                        {task.pasos && task.pasos.length > 0 && (
                          <div className="rounded-lg bg-indigo-50/50 border border-indigo-200 p-3">
                            <div className="flex items-start gap-2">
                              <Zap className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
                              <div className="flex-1">
                                <p className="text-xs font-semibold text-indigo-900 mb-1.5">Pasos concretos</p>
                                <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside">
                                  {task.pasos.map((paso, i) => (
                                    <li key={i} className="leading-relaxed">{paso}</li>
                                  ))}
                                </ol>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Base legal */}
                        <div className="rounded-lg bg-purple-50/50 border border-purple-200 p-3">
                          <div className="flex items-start gap-2">
                            <Scale className="h-4 w-4 shrink-0 text-purple-600 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs font-semibold text-purple-900">Base legal</p>
                              <p className="text-xs text-slate-700 mt-0.5 leading-relaxed">{task.baseLegal}</p>
                              <p className="text-xs text-slate-500 mt-1">
                                Área: <span className="font-medium text-slate-700">{task.area}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span>
            <strong className="text-slate-700">Generado:</strong>{' '}
            {new Date(plan.generadoAt).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })}
          </span>
          {!isSimulated && (
            <span className="text-emerald-700 font-medium">
              ✓ Generado con IA real
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── StatCard sub-component ──────────────────────────────────────────────────
function StatCard({
  label,
  value,
  suffix,
  badge,
  color,
  icon,
  small,
}: {
  label: string
  value: string
  suffix?: string
  badge?: string
  color: 'purple' | 'slate' | 'emerald'
  icon?: React.ReactNode
  small?: boolean
}) {
  const colorMap = {
    purple: { value: 'text-purple-700', bg: 'border-purple-200 bg-white', iconColor: 'text-purple-500' },
    slate: { value: 'text-slate-900', bg: 'border-slate-200 bg-white', iconColor: 'text-slate-500' },
    emerald: { value: 'text-emerald-700', bg: 'border-emerald-200 bg-white', iconColor: 'text-emerald-500' },
  }
  const c = colorMap[color]
  return (
    <div className={cn('rounded-xl border p-3 text-center', c.bg)}>
      <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500 font-medium uppercase tracking-wide">
        {icon && <span className={c.iconColor}>{icon}</span>}
        <span>{label}</span>
      </div>
      <p className={cn('mt-1 font-bold', c.value, small ? 'text-base' : 'text-2xl')}>
        {value}
        {suffix && <span className="text-sm text-slate-400 font-medium">{suffix}</span>}
      </p>
      {badge && (
        <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
          {badge}
        </p>
      )}
    </div>
  )
}
