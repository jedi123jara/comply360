'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, MinusCircle, HelpCircle,
  BarChart3, Target, Loader2, Search, Zap, FlaskConical, History,
  Download, ListChecks,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AIActionPlanCard } from '@/components/dashboard/ai-action-plan-card'
import { formatSoles } from '@/lib/format/peruvian'
import { resolveTaskRoute, type ResolvedTaskRoute } from '@/lib/compliance/task-route-resolver'
import { comoVerificar, infraccionEnPalabras } from '@/lib/compliance/diagnostic-guidance'
import { getQuestionById } from '@/lib/compliance/questions'
import { SIMULACRO_ESTIMATE } from '@/app/dashboard/simulacro/_lib/simulacro-meta'
import {
  QUESTION_COUNT,
  areaLabel,
  areaWeight,
  displayQuestionText,
  formatEstimate,
  formatPlazo,
  respuestasPorArea,
  type RespuestasDelArea,
} from '../../_lib/diagnostic-meta'

interface GapItem {
  questionId: string
  text: string
  baseLegal: string
  gravedad: string
  multaUIT: number
  multaPEN: number
  /** NO, PARCIAL o NO_SE («Por verificar»). */
  answer: string
  priority: number
  /** Solo en «No sé» (diagnósticos nuevos): cómo salir de la duda. */
  comoVerificar?: string
}

interface ActionItem {
  priority: number
  area: string
  areaLabel: string
  questionId: string
  action: string
  baseLegal: string
  multaEvitable: number
  plazoSugerido: string
}

interface DiagnosticData {
  id: string
  type: string
  scoreGlobal: number
  scoreByArea: Record<string, number>
  totalMultaRiesgo: number
  /** Se guardan como JSON: se validan antes de usarlos. */
  gapAnalysis: unknown
  actionPlan: unknown
  questionsJson?: unknown
  completedAt: string
  createdAt: string
}

interface PastDiagnostic {
  id: string
  type: string
  scoreGlobal: number
  totalMultaRiesgo: number
  completedAt: string
  createdAt: string
}

const PLAN_ACCION_ROUTE: ResolvedTaskRoute = {
  href: '/dashboard/plan-accion',
  label: 'Ir al Centro de acción',
}

/** Ruta donde se corrige la brecha (módulo específico) o, si no hay, el Centro de acción. */
function routeForQuestion(questionId: string, area?: string): ResolvedTaskRoute {
  return resolveTaskRoute({ sourceId: questionId, area: area ?? '' }) ?? PLAN_ACCION_ROUTE
}

/** Pista para un «No sé»: la guardada o, en diagnósticos antiguos, la derivada de la pregunta. */
function pistaVerificacion(gap: GapItem): string | null {
  if (gap.comoVerificar) return gap.comoVerificar
  const q = getQuestionById(gap.questionId)
  return q ? comoVerificar(q) : null
}

/** Gravedad y multa juntas, en palabras: no depende del color. */
function GravedadYMulta({ gap }: { gap: GapItem }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium',
        gap.gravedad === 'MUY_GRAVE'
          ? 'bg-red-100 text-red-800'
          : gap.gravedad === 'GRAVE'
            ? 'bg-orange-100 text-orange-800'
            : 'bg-yellow-100 text-yellow-800'
      )}
    >
      {infraccionEnPalabras(gap.gravedad)} · multa estimada {formatSoles(gap.multaPEN)}
    </span>
  )
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

const TYPE_LABEL: Record<string, string> = {
  FULL: 'Diagnóstico completo',
  EXPRESS: 'Diagnóstico express',
  SIMULATION: 'Simulacro SUNAFIL',
}

// ─── Gráfico de evolución (SVG) ─────────────────────────────────────────────
function TrendChart({ data, currentId }: { data: { id: string; date: string; score: number; type: string }[]; currentId: string }) {
  if (data.length < 2) return null

  const W = 600
  const H = 180
  const PAD = { top: 24, right: 24, bottom: 40, left: 44 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const scores = data.map(d => d.score)
  const minScore = Math.max(0, Math.min(...scores) - 10)
  const maxScore = Math.min(100, Math.max(...scores) + 10)

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * chartW
  const yScale = (s: number) => PAD.top + chartH - ((s - minScore) / (maxScore - minScore)) * chartH

  const pathD = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.score)}`).join(' ')

  const getPointColor = (score: number) =>
    score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  const latestScore = scores[scores.length - 1]
  const prevScore = scores[scores.length - 2]
  const delta = latestScore - prevScore
  const isUp = delta >= 0

  const gridLines = [25, 50, 75, 100].filter(v => v >= minScore && v <= maxScore)

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <History className="h-5 w-5 text-primary" />
          Evolución de tu puntaje
        </h2>
        <span className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
          isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        )}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? '+' : ''}{delta} {Math.abs(delta) === 1 ? 'punto' : 'puntos'} frente al diagnóstico anterior
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="min-w-[320px]">
          {/* Líneas guía */}
          {gridLines.map(v => (
            <g key={v}>
              <line
                x1={PAD.left} y1={yScale(v)}
                x2={PAD.left + chartW} y2={yScale(v)}
                stroke="currentColor" strokeWidth="0.5"
                className="text-slate-700"
                strokeDasharray="4 4"
              />
              <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize="10"
                className="fill-slate-500">{v}</text>
            </g>
          ))}

          {/* Bandas de zona */}
          <rect x={PAD.left} y={PAD.top} width={chartW} height={yScale(60) - PAD.top}
            fill="#22c55e" opacity="0.04" />
          <rect x={PAD.left} y={yScale(60)} width={chartW} height={yScale(40) - yScale(60)}
            fill="#f59e0b" opacity="0.04" />

          {/* Relleno degradado */}
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${xScale(data.length - 1)} ${PAD.top + chartH} L ${xScale(0)} ${PAD.top + chartH} Z`}
            fill="url(#trendGrad)"
          />

          {/* Línea */}
          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Puntos + etiquetas */}
          {data.map((d, i) => {
            const cx = xScale(i)
            const cy = yScale(d.score)
            const color = getPointColor(d.score)
            const label = new Date(d.date).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })
            const isCurrent = d.id === currentId
            return (
              <g key={d.date}>
                <circle cx={cx} cy={cy} r={isCurrent ? 8 : 6} fill={color} stroke="white" strokeWidth={isCurrent ? 3 : 2} />
                {isCurrent && <circle cx={cx} cy={cy} r="12" fill={color} opacity="0.15" />}
                <text x={cx} y={cy - 14} textAnchor="middle" fontSize="10" fontWeight="700"
                  fill={color}>{d.score}</text>
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="9"
                  className="fill-slate-500">{label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="text-xs text-slate-500">El punto resaltado es este diagnóstico.</p>
    </div>
  )
}

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth="10" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth="10" fill="none"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  )
}

function AreaBar({
  label,
  score,
  weight,
  respuestas,
}: {
  label: string
  score: number
  weight: number | null
  respuestas?: RespuestasDelArea
}) {
  const noAplica = respuestas?.noAplica ?? 0
  const todoNoAplica = !!respuestas && respuestas.respondidas > 0 && noAplica === respuestas.respondidas

  if (todoNoAplica) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-[color:var(--text-secondary)]">{label}</span>
          <span className="shrink-0 text-xs font-medium text-[color:var(--text-tertiary)]">
            No aplica a tu empresa · no cuenta en el puntaje
          </span>
        </div>
        <div className="h-2.5 rounded-full bg-[color:var(--neutral-100)]" />
      </div>
    )
  }

  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  const estado = score >= 80 ? 'Bien' : score >= 60 ? 'A mejorar' : 'En riesgo'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[color:var(--text-secondary)]">{label}</span>
        <span className="shrink-0 text-gray-400">
          <span className="font-semibold text-[color:var(--text-primary)]">{score}%</span> · {estado}
          {weight !== null ? (
            <span className="text-xs text-slate-500"> (pesa {weight}% del total)</span>
          ) : null}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[color:var(--neutral-100)]">
        <div className={cn('h-2.5 rounded-full transition-all duration-700', color)} style={{ width: `${score}%` }} />
      </div>
      {noAplica > 0 ? (
        <p className="text-xs text-[color:var(--text-tertiary)]">
          {noAplica === 1
            ? '1 pregunta no aplica a tu empresa y no cuenta en este puntaje.'
            : `${noAplica} preguntas no aplican a tu empresa y no cuentan en este puntaje.`}
        </p>
      ) : null}
    </div>
  )
}

/** Botón que lleva al módulo donde se corrige (o se verifica) la brecha. */
function ResolveLink({ route, label = 'Resolver' }: { route: ResolvedTaskRoute; label?: string }) {
  return (
    <Link
      href={route.href}
      title={route.label}
      aria-label={`${label}: ${route.label}`}
      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
    >
      {label}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  )
}

export default function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAllGaps, setShowAllGaps] = useState(false)
  const [pastDiags, setPastDiags] = useState<PastDiagnostic[]>([])

  useEffect(() => {
    fetch(`/api/diagnostics/${id}`)
      .then(r => r.json())
      .then(d => { setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetch('/api/diagnostics')
      .then(r => r.json())
      .then(d => setPastDiags(d.diagnostics || []))
      .catch(() => {})
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data || !data.id) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <XCircle className="h-12 w-12 text-red-400" />
        <p className="mt-2 text-gray-500">No encontramos este diagnóstico.</p>
        <Link href="/dashboard/diagnostico" className="mt-4 text-sm text-primary hover:underline">
          Hacer un diagnóstico nuevo
        </Link>
      </div>
    )
  }

  const allGaps = asArray<GapItem>(data.gapAnalysis).filter(g => g && typeof g.questionId === 'string')
  // «No sé» va aparte («Por verificar»); el resto son brechas confirmadas.
  const gapAnalysis = allGaps.filter(g => g.answer !== 'NO_SE')
  const porVerificar = allGaps.filter(g => g.answer === 'NO_SE')
  const actionPlan = asArray<ActionItem>(data.actionPlan).filter(a => a && typeof a.questionId === 'string')
  const scoreByArea: Record<string, number> =
    data.scoreByArea && typeof data.scoreByArea === 'object' ? data.scoreByArea : {}
  // Con respuestas guardadas se ocultan las áreas que no se evaluaron (sin
  // preguntas en este diagnóstico) y se marcan las que no aplican.
  const porArea = respuestasPorArea(data.questionsJson)
  const areasVisibles = Object.entries(scoreByArea).filter(
    ([area, score]) => typeof score === 'number' && (!porArea || (porArea[area]?.respondidas ?? 0) > 0)
  )
  const visibleGaps = showAllGaps ? gapAnalysis : gapAnalysis.slice(0, 10)

  // Datos de evolución: diagnóstico actual + anteriores en orden cronológico (últimos 6)
  const trendData = [...pastDiags, {
    id: data.id,
    type: data.type,
    scoreGlobal: data.scoreGlobal,
    totalMultaRiesgo: data.totalMultaRiesgo,
    completedAt: data.completedAt,
    createdAt: data.createdAt,
  }]
    .filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i) // sin duplicados
    .sort((a, b) => new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime())
    .slice(-6)
    .map(d => ({
      id: d.id,
      date: d.completedAt || d.createdAt,
      score: d.scoreGlobal,
      type: d.type,
    }))

  const subsanacion90 = Math.round(data.totalMultaRiesgo * 0.1)

  return (
    <div className="space-y-8">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/centro-sunafil?tab=diagnostico" className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Centro SUNAFIL
          </Link>
          <h1 className="text-2xl font-bold text-white">Resultado del diagnóstico</h1>
          <p className="text-sm text-gray-400">
            {TYPE_LABEL[data.type] ?? 'Diagnóstico'} · {new Date(data.completedAt || data.createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const a = document.createElement('a')
            a.href = `/api/diagnostics/${data.id}/pdf`
            a.download = ''
            a.click()
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors shrink-0"
        >
          <Download className="h-4 w-4" />
          Descargar PDF
        </button>
      </div>

      {/* Resumen */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col items-center rounded-xl border border-white/[0.08] bg-white p-6 text-center">
          <ScoreRing score={data.scoreGlobal} />
          <h3 className="mt-3 text-sm font-semibold text-[color:var(--text-secondary)]">Nivel de cumplimiento</h3>
          <p className="text-xs text-slate-500">
            {data.scoreGlobal >= 80 ? 'Buen nivel de cumplimiento' : data.scoreGlobal >= 60 ? 'Cumplimiento parcial: hay que corregir' : 'Riesgo alto: actúa de inmediato'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white p-6 text-center">
          <AlertTriangle className={cn('h-10 w-10', data.totalMultaRiesgo > 50000 ? 'text-red-500' : 'text-yellow-500')} />
          <p className="mt-2 text-2xl font-bold text-white">{formatSoles(data.totalMultaRiesgo)}</p>
          <h3 className="text-sm font-semibold text-[color:var(--text-secondary)]">Multa potencial total</h3>
          <p className="mt-1 text-xs text-slate-500">Lo que podrías pagar si SUNAFIL te inspecciona hoy</p>
          {porVerificar.length > 0 ? (
            <p className="mt-1 text-xs text-sky-700">
              Incluye {porVerificar.length === 1 ? '1 pregunta' : `${porVerificar.length} preguntas`} por verificar
              (respondiste «No sé»).
            </p>
          ) : null}
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white p-6 text-center">
          <ShieldCheck className="h-10 w-10 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-green-600">{formatSoles(subsanacion90)}</p>
          <h3 className="text-sm font-semibold text-[color:var(--text-secondary)]">Si corriges antes de la inspección</h3>
          <p className="mt-1 text-xs text-slate-500">Descuento de hasta 90% por subsanación voluntaria (Art. 40, Ley 28806)</p>
        </div>
      </div>

      {/* Evolución histórica */}
      {trendData.length >= 2 && (
        <TrendChart data={trendData} currentId={data.id} />
      )}

      {/* Resultado por área */}
      <div className="rounded-xl border border-white/[0.08] bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <BarChart3 className="h-5 w-5" /> Resultado por área
        </h2>
        <div className="space-y-4">
          {[...areasVisibles]
            .sort(([, a], [, b]) => a - b)
            .map(([area, score]) => (
              <AreaBar
                key={area}
                label={areaLabel(area)}
                score={score}
                weight={areaWeight(area)}
                respuestas={porArea?.[area]}
              />
            ))}
        </div>
      </div>

      {/* Brechas */}
      <div className="rounded-xl border border-white/[0.08] bg-white p-6">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
          <Target className="h-5 w-5 text-red-500" /> Brechas prioritarias
        </h2>
        <p className="mb-4 text-sm text-gray-400">
          Ordenadas por riesgo (multa y gravedad). Empieza por las primeras: son las más urgentes.
        </p>

        {gapAnalysis.length === 0 ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {porVerificar.length > 0
              ? 'No encontramos brechas confirmadas. Revisa abajo las preguntas que quedaron por verificar.'
              : 'No encontramos brechas en este diagnóstico. ¡Buen trabajo! Vuelve a medir cada cierto tiempo para mantenerlo así.'}
          </p>
        ) : null}

        <div className="space-y-3">
          {visibleGaps.map((gap, i) => (
            <div key={gap.questionId} className="flex flex-col gap-3 rounded-lg border border-white/[0.08] p-3 sm:flex-row sm:items-start">
              <div className="flex flex-1 items-start gap-3">
                <span className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                  i < 3 ? 'bg-red-500' : i < 7 ? 'bg-orange-500' : 'bg-yellow-500'
                )}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{displayQuestionText(gap.questionId, gap.text)}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <GravedadYMulta gap={gap} />
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      {gap.answer === 'PARCIAL' ? (
                        <MinusCircle className="h-3.5 w-3.5 text-yellow-500" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-400" aria-hidden="true" />
                      )}
                      {gap.answer === 'PARCIAL' ? 'Cumple en parte' : 'No cumple'}
                    </span>
                    <span className="text-xs text-gray-500">{gap.baseLegal}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end sm:pt-0.5">
                <ResolveLink route={routeForQuestion(gap.questionId)} />
              </div>
            </div>
          ))}
        </div>

        {gapAnalysis.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAllGaps(!showAllGaps)}
            className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {showAllGaps ? 'Ver menos' : `Ver las ${gapAnalysis.length} brechas`}
            {showAllGaps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Por verificar: respuestas «No sé» */}
      {porVerificar.length > 0 ? (
        <div className="rounded-xl border border-sky-200 bg-white p-6">
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold text-white">
            <HelpCircle className="h-5 w-5 text-sky-600" aria-hidden="true" /> Por verificar ({porVerificar.length})
          </h2>
          <p className="mb-4 text-sm text-gray-400">
            Respondiste «No sé» en estas preguntas. Mientras no lo confirmes, las contamos como brecha (con su
            multa) para no darte una falsa tranquilidad. Averígualo con la pista de cada una y vuelve a medir.
          </p>
          <div className="space-y-3">
            {porVerificar.map(gap => {
              const pista = pistaVerificacion(gap)
              return (
                <div
                  key={gap.questionId}
                  className="flex flex-col gap-3 rounded-lg border border-sky-100 bg-sky-50/40 p-3 sm:flex-row sm:items-start"
                >
                  <div className="flex flex-1 items-start gap-3">
                    <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{displayQuestionText(gap.questionId, gap.text)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <GravedadYMulta gap={gap} />
                        <span className="text-xs text-gray-500">{gap.baseLegal}</span>
                      </div>
                      {pista ? (
                        <p className="mt-2 text-xs text-[color:var(--text-secondary)]">
                          <span className="font-semibold text-[color:var(--text-primary)]">Cómo averiguarlo:</span> {pista}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex justify-end sm:pt-0.5">
                    <ResolveLink route={routeForQuestion(gap.questionId)} label="Verificar" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {/* Plan de acción — el avance se guarda en el Centro de acción (con evidencia) */}
      <div className="rounded-xl border border-white/[0.08] bg-white p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Plan de acción
            </h2>
            <p className="mt-1 text-sm text-gray-400">
              Estas acciones se agregan como tareas a tu Centro de acción. Ahí asignas responsables,
              adjuntas evidencia y marcas tu avance, que queda guardado.
            </p>
          </div>
          <Link
            href="/dashboard/plan-accion"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <ListChecks className="h-4 w-4" />
            Abrir Centro de acción
          </Link>
        </div>

        <div className="space-y-3">
          {actionPlan.map(item => {
            const priorityColor = item.priority <= 3 ? 'bg-red-500' : item.priority <= 7 ? 'bg-orange-500' : 'bg-yellow-500'
            const plazoColor = item.plazoSugerido.includes('Inmediato')
              ? 'bg-red-100 text-red-700'
              : item.plazoSugerido.includes('Corto')
                ? 'bg-orange-100 text-orange-700'
                : 'bg-blue-100 text-blue-700'

            return (
              <div
                key={item.questionId}
                className="flex flex-col gap-3 rounded-lg border border-white/[0.08] p-4 transition-colors hover:bg-[color:var(--neutral-50)] sm:flex-row sm:items-start"
              >
                <div className="flex flex-1 items-start gap-3">
                  {/* Prioridad */}
                  <span className={cn(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    priorityColor
                  )}>
                    {item.priority}
                  </span>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{item.action}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-400">{areaLabel(item.area)}</span>
                      <span className="text-xs text-slate-500">·</span>
                      <span className="text-xs text-slate-500">{item.baseLegal}</span>
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', plazoColor)}>
                        {formatPlazo(item.plazoSugerido)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Multa evitable + acción */}
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-semibold text-red-500">{formatSoles(item.multaEvitable)}</p>
                    <p className="text-xs text-slate-500">multa evitable</p>
                  </div>
                  <ResolveLink route={routeForQuestion(item.questionId, item.area)} />
                </div>
              </div>
            )
          })}
        </div>

        {actionPlan.length > 0 && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <span className="font-semibold">Subsanación voluntaria:</span> si corriges estas brechas antes de una inspección,
            puedes reducir la multa hasta en 90% según el Art. 40 de la Ley 28806.
          </div>
        )}
      </div>

      {/* ─── Plan de acción con IA ─── */}
      <AIActionPlanCard diagnosticId={data.id} />

      {/* ─── Volver a medir ─── */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-indigo-50 p-6">
        <h2 className="mb-1 text-lg font-bold text-white">Mide tu avance</h2>
        <p className="mb-5 text-sm text-gray-400">
          Cuando corrijas brechas, vuelve a medir para ver cómo sube tu puntaje.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Completo */}
          <Link
            href="/dashboard/diagnostico?modo=completo"
            className="group flex flex-col rounded-xl border-2 border-white/[0.08] bg-white p-5 text-left transition-all hover:border-primary hover:shadow-lg"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white">Diagnóstico completo</h3>
            <p className="mt-1 text-xs text-gray-400">
              {QUESTION_COUNT.FULL} preguntas · {formatEstimate(QUESTION_COUNT.FULL)}
            </p>
            <p className="mt-auto pt-3 text-xs font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
              Empezar →
            </p>
          </Link>

          {/* Express */}
          <Link
            href="/dashboard/diagnostico?modo=express"
            className="group flex flex-col rounded-xl border-2 border-white/[0.08] bg-white p-5 text-left transition-all hover:border-amber-400 hover:shadow-lg"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="font-semibold text-white">Diagnóstico express</h3>
            <p className="mt-1 text-xs text-gray-400">
              {QUESTION_COUNT.EXPRESS} preguntas · {formatEstimate(QUESTION_COUNT.EXPRESS)}
            </p>
            <p className="mt-auto pt-3 text-xs font-medium text-amber-500 opacity-70 transition-opacity group-hover:opacity-100">
              Empezar →
            </p>
          </Link>

          {/* Simulacro */}
          <Link
            href="/dashboard/simulacro"
            className="group flex flex-col rounded-xl border-2 border-white/[0.08] bg-white p-5 text-left transition-all hover:border-red-400 hover:shadow-lg"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50">
              <FlaskConical className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Simulacro SUNAFIL</h3>
            <p className="mt-1 text-xs text-gray-400">Simula una inspección con tu legajo real · {SIMULACRO_ESTIMATE}</p>
            <p className="mt-auto pt-3 text-xs font-medium text-red-500 opacity-70 transition-opacity group-hover:opacity-100">
              Empezar →
            </p>
          </Link>
        </div>
      </div>

      {/* Siguiente paso */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--text-secondary)]">
          <span className="font-semibold text-[color:var(--text-primary)]">Siguiente paso:</span>{' '}
          resuelve tus brechas una por una, empezando por las más urgentes.
        </p>
        <Link
          href="/dashboard/plan-accion"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Ver mi plan de acción
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
