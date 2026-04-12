'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import {
  ShieldCheck, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp,
  ArrowLeft, CheckCircle2, XCircle, MinusCircle,
  BarChart3, Target, Loader2, Search, Zap, FlaskConical, History,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import BenchmarkSectorial from '@/components/dashboard/benchmark-sectorial'
import { AIActionPlanCard } from '@/components/dashboard/ai-action-plan-card'

interface GapItem {
  questionId: string
  text: string
  baseLegal: string
  gravedad: string
  multaUIT: number
  multaPEN: number
  answer: string
  priority: number
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
  gapAnalysis: GapItem[]
  actionPlan: ActionItem[]
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

// ─── Trend chart (SVG) ───────────────────────────────────────────────────────
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
    <div className="rounded-2xl border border-white/[0.08] bg-[#141824] p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <History className="h-5 w-5 text-primary" />
          Tendencia Historica
        </h2>
        <span className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
          isUp
            ? 'bg-green-100 text-green-700 bg-green-900/30 text-green-400'
            : 'bg-red-100 text-red-700 bg-red-900/30 text-red-400'
        )}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? '+' : ''}{delta} puntos vs diagnostico anterior
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} className="min-w-[320px]">
          {/* Grid lines */}
          {gridLines.map(v => (
            <g key={v}>
              <line
                x1={PAD.left} y1={yScale(v)}
                x2={PAD.left + chartW} y2={yScale(v)}
                stroke="currentColor" strokeWidth="0.5"
                className="text-gray-200 text-slate-700"
                strokeDasharray="4 4"
              />
              <text x={PAD.left - 6} y={yScale(v) + 4} textAnchor="end" fontSize="10"
                className="fill-gray-400 fill-slate-500">{v}</text>
            </g>
          ))}

          {/* Zone bands */}
          <rect x={PAD.left} y={PAD.top} width={chartW} height={yScale(60) - PAD.top}
            fill="#22c55e" opacity="0.04" />
          <rect x={PAD.left} y={yScale(60)} width={chartW} height={yScale(40) - yScale(60)}
            fill="#f59e0b" opacity="0.04" />

          {/* Gradient fill */}
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

          {/* Line */}
          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points + labels */}
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
                  className="fill-gray-400 fill-slate-500">{label}</text>
              </g>
            )
          })}
        </svg>
      </div>
      <p className="text-xs text-gray-400 text-slate-500">El punto resaltado corresponde al diagnostico actual</p>
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

function AreaBar({ label, score, weight }: { label: string; score: number; weight: number }) {
  const color = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-300 text-gray-200">{label}</span>
        <span className="text-gray-500 text-gray-400">{score}% <span className="text-xs text-gray-400 text-slate-500">(peso {weight}%)</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-white/[0.04]">
        <div className={cn('h-2.5 rounded-full transition-all duration-700', color)} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

export default function ResultadoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<DiagnosticData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedArea, setExpandedArea] = useState<string | null>(null)
  const [showAllGaps, setShowAllGaps] = useState(false)
  const [pastDiags, setPastDiags] = useState<PastDiagnostic[]>([])
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())

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

  function toggleAction(questionId: string) {
    setCompletedActions(prev => {
      const next = new Set(prev)
      if (next.has(questionId)) next.delete(questionId)
      else next.add(questionId)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data || !data.id) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <XCircle className="h-12 w-12 text-red-400" />
        <p className="mt-2 text-gray-500">Diagnostico no encontrado</p>
        <Link href="/dashboard/diagnostico" className="mt-4 text-sm text-primary hover:underline">Volver</Link>
      </div>
    )
  }

  const gapAnalysis: GapItem[] = (data.gapAnalysis as GapItem[]) || []
  const actionPlan: ActionItem[] = (data.actionPlan as ActionItem[]) || []
  const scoreByArea = data.scoreByArea || {}
  const visibleGaps = showAllGaps ? gapAnalysis : gapAnalysis.slice(0, 10)

  // Build trend data: include current + past diagnostics sorted chronologically (last 6)
  const trendData = [...pastDiags, {
    id: data.id,
    type: data.type,
    scoreGlobal: data.scoreGlobal,
    totalMultaRiesgo: data.totalMultaRiesgo,
    completedAt: data.completedAt,
    createdAt: data.createdAt,
  }]
    .filter((d, i, arr) => arr.findIndex(x => x.id === d.id) === i) // deduplicate
    .sort((a, b) => new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime())
    .slice(-6)
    .map(d => ({
      id: d.id,
      date: d.completedAt || d.createdAt,
      score: d.scoreGlobal,
      type: d.type,
    }))

  // Reconstruct area labels from scoreByArea
  const areaLabels: Record<string, string> = {
    contratos_registro: 'Contratos y Registro',
    remuneraciones_beneficios: 'Remuneraciones y Beneficios',
    jornada_descansos: 'Jornada y Descansos',
    sst: 'Seguridad y Salud en el Trabajo',
    documentos_obligatorios: 'Documentos Obligatorios',
    relaciones_laborales: 'Relaciones Laborales',
    igualdad_nodiscriminacion: 'Igualdad y No Discriminacion',
    trabajadores_especiales: 'Trabajadores Especiales',
  }
  const areaWeights: Record<string, number> = {
    contratos_registro: 15, remuneraciones_beneficios: 20, jornada_descansos: 10,
    sst: 20, documentos_obligatorios: 15, relaciones_laborales: 5,
    igualdad_nodiscriminacion: 10, trabajadores_especiales: 5,
  }

  const subsanacion90 = Math.round(data.totalMultaRiesgo * 0.1)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/diagnostico" className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-primary">
            <ArrowLeft className="h-4 w-4" /> Diagnosticos
          </Link>
          <h1 className="text-2xl font-bold text-white">Resultado del Diagnostico</h1>
          <p className="text-sm text-gray-500 text-gray-400">
            {data.type === 'FULL' ? 'Completo' : 'Express'} — {new Date(data.completedAt || data.createdAt).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}
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

      {/* Score overview */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="flex flex-col items-center rounded-xl border border-white/[0.08] bg-[#141824] p-6">
          <ScoreRing score={data.scoreGlobal} />
          <h3 className="mt-3 text-sm font-semibold text-gray-300 text-gray-200">Score de Compliance</h3>
          <p className="text-xs text-gray-400 text-slate-500">
            {data.scoreGlobal >= 80 ? 'Buen nivel de cumplimiento' : data.scoreGlobal >= 60 ? 'Cumplimiento parcial — corregir' : 'Alto riesgo — accion inmediata'}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#141824] p-6">
          <AlertTriangle className={cn('h-10 w-10', data.totalMultaRiesgo > 50000 ? 'text-red-500' : 'text-yellow-500')} />
          <p className="mt-2 text-2xl font-bold text-white">S/ {data.totalMultaRiesgo.toLocaleString()}</p>
          <h3 className="text-sm font-semibold text-gray-300 text-gray-200">Multa Potencial Total</h3>
          <p className="mt-1 text-xs text-gray-400 text-slate-500">Riesgo estimado ante inspeccion SUNAFIL</p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-[#141824] p-6">
          <ShieldCheck className="h-10 w-10 text-green-500" />
          <p className="mt-2 text-2xl font-bold text-green-600">S/ {subsanacion90.toLocaleString()}</p>
          <h3 className="text-sm font-semibold text-gray-300 text-gray-200">Si Subsana al 90%</h3>
          <p className="mt-1 text-xs text-gray-400 text-slate-500">Descuento Art. 40 Ley 28806 por subsanacion voluntaria</p>
        </div>
      </div>

      {/* Historical Trend Chart */}
      {trendData.length >= 2 && (
        <TrendChart data={trendData} currentId={data.id} />
      )}

      {/* Benchmark Sectorial */}
      <BenchmarkSectorial
        companyScore={data.scoreGlobal}
        sector="SERVICIOS"
        areaScores={Object.entries(scoreByArea).map(([area, score]) => ({
          area,
          score: score as number,
        }))}
      />

      {/* Score by area */}
      <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <BarChart3 className="h-5 w-5" /> Desglose por Area
        </h2>
        <div className="space-y-4">
          {Object.entries(scoreByArea)
            .sort(([, a], [, b]) => (a as number) - (b as number))
            .map(([area, score]) => (
              <AreaBar
                key={area}
                label={areaLabels[area] || area}
                score={score as number}
                weight={areaWeights[area] || 10}
              />
            ))}
        </div>
      </div>

      {/* Gap Analysis */}
      <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-6">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <Target className="h-5 w-5 text-red-500" /> Brechas Prioritarias
        </h2>
        <p className="mb-4 text-sm text-gray-500 text-gray-400">Items ordenados por riesgo (multa x gravedad). Los primeros requieren atencion inmediata.</p>

        <div className="space-y-3">
          {visibleGaps.map((gap, i) => (
            <div key={gap.questionId} className="flex items-start gap-3 rounded-lg border border-white/[0.08] p-3">
              <span className={cn(
                'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                i < 3 ? 'bg-red-500' : i < 7 ? 'bg-orange-500' : 'bg-yellow-500'
              )}>
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{gap.text}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  <span className={cn(
                    'rounded px-1.5 py-0.5 text-xs font-medium',
                    gap.gravedad === 'MUY_GRAVE' ? 'bg-red-100 text-red-700' : gap.gravedad === 'GRAVE' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                  )}>
                    {gap.gravedad.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-500">{gap.baseLegal}</span>
                  <span className="text-xs font-medium text-red-600">S/ {gap.multaPEN.toLocaleString()}</span>
                </div>
              </div>
              {gap.answer === 'NO' ? (
                <XCircle className="h-5 w-5 shrink-0 text-red-400" />
              ) : (
                <MinusCircle className="h-5 w-5 shrink-0 text-yellow-400" />
              )}
            </div>
          ))}
        </div>

        {gapAnalysis.length > 10 && (
          <button
            onClick={() => setShowAllGaps(!showAllGaps)}
            className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {showAllGaps ? 'Ver menos' : `Ver todas las ${gapAnalysis.length} brechas`}
            {showAllGaps ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Action Plan — with checkboxes and fine reduction */}
      <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              <CheckCircle2 className="h-5 w-5 text-green-500" /> Plan de Accion
            </h2>
            <p className="mt-1 text-sm text-gray-500 text-gray-400">
              Marca las acciones completadas para rastrear tu progreso. Cada accion reduce tu riesgo de multa.
            </p>
          </div>
          {completedActions.size > 0 && (
            <div className="shrink-0 rounded-lg bg-green-50 bg-green-900/20 border border-green-200 border-green-800 px-3 py-2 text-center">
              <p className="text-xs text-green-600 text-green-400 font-medium">Completadas</p>
              <p className="text-xl font-bold text-green-700 text-green-300">{completedActions.size}/{actionPlan.length}</p>
              <p className="text-xs text-green-600 text-green-400">
                S/ {actionPlan
                  .filter(a => completedActions.has(a.questionId))
                  .reduce((sum, a) => sum + a.multaEvitable, 0)
                  .toLocaleString()} evitados
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          {actionPlan.map(item => {
            const done = completedActions.has(item.questionId)
            const priorityColor = item.priority <= 3 ? 'bg-red-500' : item.priority <= 7 ? 'bg-orange-500' : 'bg-yellow-500'
            const plazoColor = item.plazoSugerido.includes('Inmediato')
              ? 'bg-red-100 text-red-700 bg-red-900/30 text-red-400'
              : item.plazoSugerido.includes('Corto')
                ? 'bg-orange-100 text-orange-700 bg-orange-900/30 text-orange-400'
                : 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400'

            return (
              <div
                key={item.questionId}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-4 transition-all',
                  done
                    ? 'border-green-200 border-green-800 bg-green-50/50 bg-green-900/10 opacity-75'
                    : 'border-white/[0.08] hover:bg-white/[0.02] hover:bg-white/[0.04]/50'
                )}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleAction(item.questionId)}
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors',
                    done
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-white/10 border-slate-600 hover:border-green-400'
                  )}
                  aria-label={done ? 'Marcar como pendiente' : 'Marcar como completado'}
                >
                  {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>

                {/* Priority badge */}
                <span className={cn(
                  'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                  priorityColor
                )}>
                  {item.priority}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', done ? 'line-through text-gray-400 text-slate-500' : 'text-white')}>
                    {item.action}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 text-gray-400">{item.areaLabel}</span>
                    <span className="text-xs text-gray-400 text-slate-500">·</span>
                    <span className="text-xs text-gray-400 text-slate-500">{item.baseLegal}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', plazoColor)}>
                      {item.plazoSugerido}
                    </span>
                  </div>
                </div>

                {/* Fine reduction */}
                <div className="shrink-0 text-right">
                  <p className={cn('text-sm font-semibold', done ? 'text-green-600 text-green-400' : 'text-red-600 text-red-400')}>
                    {done ? '✓ ' : ''}S/ {item.multaEvitable.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 text-slate-500">multa evitable</p>
                </div>
              </div>
            )
          })}
        </div>

        {actionPlan.length > 0 && (
          <div className="mt-4 rounded-lg bg-blue-50 bg-blue-900/20 border border-blue-200 border-blue-800 p-3 text-sm text-blue-700 text-blue-300">
            <span className="font-semibold">Subsanacion voluntaria:</span> Si corriges estas brechas antes de una inspeccion,
            puedes reducir la multa hasta un 90% segun el Art. 40 de la Ley 28806.
          </div>
        )}
      </div>

      {/* ─── AI Action Plan ─── */}
      <AIActionPlanCard diagnosticId={data.id} />

      {/* ─── NEW DIAGNOSTIC CTA ─── */}
      <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-indigo-50 from-primary/10 to-slate-800/60 border-primary/30 p-6">
        <h2 className="mb-1 text-lg font-bold text-white">Iniciar Nuevo Diagnostico</h2>
        <p className="mb-5 text-sm text-gray-500 text-gray-400">Realiza un nuevo diagnostico para medir tu progreso</p>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Full */}
          <Link
            href="/dashboard/diagnostico"
            className="group flex flex-col rounded-xl border-2 border-white/[0.08] bg-[#141824] p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:border-primary"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold text-white">Diagnostico Completo</h3>
            <p className="mt-1 text-xs text-gray-500 text-gray-400">120 preguntas · ~45 min</p>
            <p className="mt-auto pt-3 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Iniciar →
            </p>
          </Link>

          {/* Express */}
          <Link
            href="/dashboard/diagnostico"
            className="group flex flex-col rounded-xl border-2 border-white/[0.08] bg-[#141824] p-5 text-left transition-all hover:border-amber-400 hover:shadow-lg hover:border-amber-400"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 bg-amber-900/20">
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="font-semibold text-white">Diagnostico Express</h3>
            <p className="mt-1 text-xs text-gray-500 text-gray-400">20 preguntas · ~10 min</p>
            <p className="mt-auto pt-3 text-xs font-medium text-amber-500 opacity-0 transition-opacity group-hover:opacity-100">
              Iniciar →
            </p>
          </Link>

          {/* Simulacro */}
          <Link
            href="/dashboard/diagnostico"
            className="group flex flex-col rounded-xl border-2 border-white/[0.08] bg-[#141824] p-5 text-left transition-all hover:border-red-400 hover:shadow-lg hover:border-red-400"
          >
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 bg-red-900/20">
              <FlaskConical className="h-5 w-5 text-red-500" />
            </div>
            <h3 className="font-semibold text-white">Simulacro SUNAFIL</h3>
            <p className="mt-1 text-xs text-gray-500 text-gray-400">Simular inspeccion real · ~45 min</p>
            <p className="mt-auto pt-3 text-xs font-medium text-red-500 opacity-0 transition-opacity group-hover:opacity-100">
              Iniciar →
            </p>
          </Link>
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] bg-[#141824] p-4">
        <Link
          href="/dashboard/trabajadores"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Ir a Trabajadores
        </Link>
        <Link
          href="/dashboard/diagnostico"
          className="rounded-lg border border-slate-600 bg-[#141824] bg-white/[0.04] px-4 py-2 text-sm font-medium text-gray-300 text-gray-200 hover:bg-white/[0.02] hover:bg-slate-600"
        >
          Ver Historial
        </Link>
      </div>
    </div>
  )
}
