'use client'

import { useState } from 'react'
import {
  Sparkles, Loader2, AlertCircle, CheckCircle2, TrendingUp,
  Calendar, Users, Scale, ShieldAlert, ChevronDown, ChevronUp,
  RefreshCw, Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types (mirror of src/lib/ai/action-plan.ts) ────────────────────────────
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

// ─── Visual maps ─────────────────────────────────────────────────────────────
const PRIORIDAD_STYLE: Record<ActionPlanTask['prioridad'], string> = {
  CRITICA: 'bg-red-100 text-red-700 border-red-300',
  ALTA: 'bg-orange-100 text-orange-700 border-orange-300',
  MEDIA: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  BAJA: 'bg-blue-100 text-blue-700 border-blue-300',
}

const RESPONSABLE_LABEL: Record<ActionPlanTask['responsable'], string> = {
  RRHH: 'RRHH',
  LEGAL: 'Legal',
  GERENCIA: 'Gerencia',
  SST: 'SST',
  CONTABILIDAD: 'Contabilidad',
  IT: 'TI',
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
      if (!res.ok) {
        throw new Error(data.error || `Error ${res.status}`)
      }
      setPlan(data.plan)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(msg)
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

  // ─── Empty / Initial State ────────────────────────────────────────────────
  if (!plan && !loading && !error) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-purple-300 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-lg font-bold text-white">
            Plan de Accion con IA
          </h2>
          <p className="mt-1 max-w-md text-sm text-gray-600">
            Genera un plan personalizado con tareas especificas, responsables, plazos y proyeccion
            de mejora del score usando inteligencia artificial entrenada en normativa peruana.
          </p>
          <button
            onClick={generate}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all"
          >
            <Wand2 className="h-4 w-4" />
            Generar plan con IA
          </button>
          <p className="mt-3 text-xs text-gray-400">
            El analisis tarda ~15-30 segundos
          </p>
        </div>
      </div>
    )
  }

  // ─── Loading State ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-8">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-purple-400 opacity-20" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg">
              <Loader2 className="h-7 w-7 animate-spin text-white" />
            </div>
          </div>
          <h3 className="mt-4 text-base font-semibold text-white">
            Generando plan personalizado...
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Analizando brechas, scoring por area y multas potenciales
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

  // ─── Error State ──────────────────────────────────────────────────────────
  if (error && !plan) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-6 w-6 shrink-0 text-red-500" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">No se pudo generar el plan</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <button
              onClick={generate}
              className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
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

  // ─── Plan Loaded ──────────────────────────────────────────────────────────
  const totalCompleted = completedIds.size
  const totalTareas = plan.tareas.length
  const progresoPct = totalTareas > 0 ? Math.round((totalCompleted / totalTareas) * 100) : 0
  const incrementoCompletado = plan.tareas
    .filter(t => completedIds.has(t.id))
    .reduce((acc, t) => acc + t.impactoScore, 0)
  const scoreEstimado = Math.min(100, plan.proyeccionScore.actual + incrementoCompletado)

  return (
    <div className="space-y-5">
      {/* Header con badge IA + regenerar */}
      <div className="rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-md">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white">Plan de Accion IA</h2>
                <span className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-bold border',
                  plan.generadoPor === 'ai'
                    ? 'bg-green-100 text-green-700 border-green-300'
                    : 'bg-amber-100 text-amber-700 border-amber-300'
                )}>
                  {plan.generadoPor === 'ai' ? 'IA Real' : 'Modo Simulado'}
                </span>
                <span className="text-xs text-gray-400">{plan.modelo}</span>
              </div>
              <p className="mt-1 text-sm text-gray-600">{plan.resumen}</p>
            </div>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-purple-300 bg-[#141824] bg-[#141824] px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Regenerar
          </button>
        </div>

        {/* Stats grid */}
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-[#141824] bg-[#141824] border border-purple-100 p-3 text-center">
            <p className="text-xs text-gray-500 font-medium">Tareas</p>
            <p className="mt-1 text-2xl font-bold text-purple-600">{totalTareas}</p>
          </div>
          <div className="rounded-xl bg-[#141824] bg-[#141824] border border-purple-100 p-3 text-center">
            <p className="text-xs text-gray-500 font-medium">Score actual</p>
            <p className="mt-1 text-2xl font-bold text-white">{plan.proyeccionScore.actual}</p>
          </div>
          <div className="rounded-xl bg-[#141824] bg-[#141824] border border-green-100 p-3 text-center">
            <p className="text-xs text-gray-500 font-medium">Score proyectado</p>
            <p className="mt-1 text-2xl font-bold text-green-600">
              {plan.proyeccionScore.estimadoTrasPlan}
            </p>
            <p className="text-[10px] text-green-600 font-semibold">
              +{plan.proyeccionScore.incremento} pts
            </p>
          </div>
          <div className="rounded-xl bg-[#141824] bg-[#141824] border border-emerald-100 p-3 text-center">
            <p className="text-xs text-gray-500 font-medium">Multa evitada</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">
              S/ {plan.multaEvitadaTotal.toLocaleString('es-PE')}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {totalCompleted > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
              <span className="font-medium">Progreso del plan</span>
              <span>
                {totalCompleted}/{totalTareas} tareas · Score estimado: <strong className="text-green-600">{scoreEstimado}/100</strong>
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 bg-white/[0.04] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${progresoPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tareas list */}
      <div className="space-y-3">
        {plan.tareas.map((task, idx) => {
          const done = completedIds.has(task.id)
          const expanded = expandedTask === task.id
          return (
            <div
              key={task.id}
              className={cn(
                'rounded-xl border transition-all',
                done
                  ? 'border-green-200 bg-green-50/50 opacity-80'
                  : 'border-white/[0.08] border-white/[0.08] bg-[#141824] bg-[#141824] hover:shadow-md'
              )}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleCompleted(task.id)}
                    className={cn(
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                      done
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-white/10 border-white/10 hover:border-green-400'
                    )}
                    aria-label={done ? 'Marcar como pendiente' : 'Marcar como completada'}
                  >
                    {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>

                  {/* Number badge */}
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-xs font-bold text-white">
                    {idx + 1}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className={cn(
                        'font-semibold text-sm',
                        done ? 'line-through text-gray-400' : 'text-gray-900'
                      )}>
                        {task.titulo}
                      </h3>
                      <span className={cn(
                        'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold',
                        PRIORIDAD_STYLE[task.prioridad]
                      )}>
                        {task.prioridad}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                      {task.descripcion}
                    </p>

                    {/* Meta row */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Users className="h-3 w-3" />
                        {RESPONSABLE_LABEL[task.responsable]}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <Calendar className="h-3 w-3" />
                        {task.plazoDias} dias
                      </span>
                      <span className="inline-flex items-center gap-1 text-purple-600 font-semibold">
                        <TrendingUp className="h-3 w-3" />
                        +{task.impactoScore} pts
                      </span>
                      {task.multaEvitada !== undefined && task.multaEvitada > 0 && (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                          <ShieldAlert className="h-3 w-3" />
                          S/ {task.multaEvitada.toLocaleString('es-PE')}
                        </span>
                      )}
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={() => setExpandedTask(expanded ? null : task.id)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 hover:underline"
                    >
                      {expanded ? 'Ocultar detalle' : 'Ver base legal'}
                      {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>

                    {/* Expanded section */}
                    {expanded && (
                      <div className="mt-3 rounded-lg bg-white/[0.02] bg-white/[0.04]/50 border border-white/[0.08] border-white/10 p-3">
                        <div className="flex items-start gap-2">
                          <Scale className="h-4 w-4 shrink-0 text-purple-500 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-gray-300">Base legal</p>
                            <p className="text-xs text-gray-600 mt-0.5">{task.baseLegal}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              Area: <span className="font-medium">{task.area}</span>
                            </p>
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

      {/* Footer info */}
      <div className="rounded-lg bg-purple-50 border border-purple-200 p-3 text-xs text-purple-700">
        <span className="font-semibold">Generado el:</span>{' '}
        {new Date(plan.generadoAt).toLocaleString('es-PE', { dateStyle: 'long', timeStyle: 'short' })}
        {plan.generadoPor === 'simulated' && (
          <span className="block mt-1">
            Modo simulado activo: el motor IA no respondio. Las tareas son sugerencias base segun heuristicas.
          </span>
        )}
      </div>
    </div>
  )
}
