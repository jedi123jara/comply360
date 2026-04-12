'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck, Zap, ChevronRight, ChevronLeft,
  AlertTriangle, CheckCircle2, Loader2, History, TrendingUp,
  TrendingDown, Building2, Award, Search, FlaskConical, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ComplianceQuestion, AreaKey } from '@/lib/compliance/questions/types'
import { AREAS } from '@/lib/compliance/questions/types'
import type { QuestionAnswer } from '@/lib/compliance/diagnostic-scorer'

type DiagType = 'FULL' | 'EXPRESS' | 'SIMULACRO'
type Phase = 'select' | 'wizard' | 'submitting'

interface PastDiagnostic {
  id: string
  type: string
  scoreGlobal: number
  totalMultaRiesgo: number
  completedAt: string
  createdAt: string
}

const AREA_ICONS: Record<string, string> = {
  contratos_registro: 'FileText',
  remuneraciones_beneficios: 'Calculator',
  jornada_descansos: 'Clock',
  sst: 'ShieldCheck',
  documentos_obligatorios: 'FolderOpen',
  relaciones_laborales: 'Users',
  igualdad_nodiscriminacion: 'Scale',
  trabajadores_especiales: 'UserCheck',
}

// DEMO DATA — sector benchmark scores are illustrative and not sourced from real SUNAFIL statistics.
// Replace with actual benchmark data from a live data source before production use.
const SECTOR_DATA = [
  { name: 'Transporte', score: 68, color: 'bg-blue-500' },
  { name: 'Construccion', score: 61, color: 'bg-orange-500' },
  { name: 'Comercio', score: 74, color: 'bg-purple-500' },
  { name: 'Servicios', score: 79, color: 'bg-green-500' },
  { name: 'Manufactura', score: 71, color: 'bg-yellow-500' },
]

// Score color thresholds
const SCORE_HIGH = 80   // score >= SCORE_HIGH → green
const SCORE_MID  = 60   // score >= SCORE_MID  → amber/yellow; below → red

// Historical trend SVG chart
function TrendChart({ data }: { data: { date: string; score: number; type: string }[] }) {
  if (data.length < 2) return null

  const W = 560
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
    score >= SCORE_HIGH ? '#22c55e' : score >= SCORE_MID ? '#f59e0b' : '#ef4444'

  const latestScore = scores[scores.length - 1]
  const prevScore = scores[scores.length - 2]
  const delta = latestScore - prevScore
  const isUp = delta >= 0

  // Y axis grid lines at 25, 50, 75, 100
  const gridLines = [25, 50, 75, 100].filter(v => v >= minScore && v <= maxScore)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <TrendingUp className="h-4 w-4 text-primary" />
          Tendencia Historica (ultimos 6 diagnosticos)
        </h3>
        <span className={cn(
          'flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
          isUp
            ? 'bg-green-100 text-green-700 bg-green-900/30 text-green-400'
            : 'bg-red-100 text-red-700 bg-red-900/30 text-red-400'
        )}>
          {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {isUp ? '+' : ''}{delta} puntos vs diagnostico anterior
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#141824] p-4">
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
              <text
                x={PAD.left - 6} y={yScale(v) + 4}
                textAnchor="end" fontSize="10"
                className="fill-gray-400 fill-slate-500"
              >{v}</text>
            </g>
          ))}

          {/* Colored zone bands */}
          <rect x={PAD.left} y={PAD.top} width={chartW} height={yScale(60) - PAD.top}
            fill="#22c55e" opacity="0.04" />
          <rect x={PAD.left} y={yScale(60)} width={chartW} height={yScale(40) - yScale(60)}
            fill="#f59e0b" opacity="0.04" />
          <rect x={PAD.left} y={yScale(40)} width={chartW} height={chartH - (yScale(40) - PAD.top)}
            fill="#ef4444" opacity="0.04" />

          {/* Gradient fill under line */}
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${xScale(data.length - 1)} ${PAD.top + chartH} L ${xScale(0)} ${PAD.top + chartH} Z`}
            fill="url(#lineGrad)"
          />

          {/* Line */}
          <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data points + labels */}
          {data.map((d, i) => {
            const cx = xScale(i)
            const cy = yScale(d.score)
            const color = getPointColor(d.score)
            const label = new Date(d.date).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' })
            return (
              <g key={d.date}>
                <circle cx={cx} cy={cy} r="6" fill={color} stroke="white" strokeWidth="2" />
                <text x={cx} y={cy - 12} textAnchor="middle" fontSize="10" fontWeight="700"
                  fill={color}>{d.score}</text>
                <text x={cx} y={H - 8} textAnchor="middle" fontSize="9"
                  className="fill-gray-400 fill-slate-500">{label}</text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}

// Sector benchmark mini chart
function SectorBenchmark({ companyScore, companySector = 'Servicios' }: { companyScore: number; companySector?: string }) {
  const companySectorScore = SECTOR_DATA.find(s => s.name === companySector)?.score ?? 79
  const percentile = companyScore >= companySectorScore
    ? Math.min(99, 50 + Math.round(((companyScore - companySectorScore) / (100 - companySectorScore)) * 49))
    : Math.round((companyScore / companySectorScore) * 50)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <Building2 className="h-4 w-4 text-indigo-500" />
          Tu empresa vs. el sector
        </h3>
        <span className="flex items-center gap-1 rounded-full bg-indigo-100 bg-indigo-900/30 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 text-indigo-300">
          <Award className="h-3 w-3" />
          Percentil {percentile} de tu sector
        </span>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-[#141824] p-4 space-y-3">
        {SECTOR_DATA.map(s => {
          const isYou = s.name === companySector
          const diff = (isYou ? companyScore : s.score) - s.score
          return (
            <div key={s.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={cn('font-medium', isYou ? 'text-white' : 'text-slate-300')}>
                    {s.name}
                  </span>
                  {isYou && (
                    <span className="rounded bg-indigo-100 bg-indigo-900/30 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 text-indigo-300">
                      Tu empresa
                    </span>
                  )}
                </div>
                <span className={cn('font-semibold', isYou ? 'text-indigo-600 text-indigo-400' : 'text-gray-500 text-gray-400')}>
                  {isYou ? companyScore : s.score}/100
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-white/[0.04]">
                <div
                  className={cn('h-2.5 rounded-full transition-all duration-700', isYou
                    ? (companyScore >= SCORE_HIGH ? 'bg-green-500' : companyScore >= SCORE_MID ? 'bg-amber-500' : 'bg-red-500')
                    : s.color)}
                  style={{ width: `${isYou ? companyScore : s.score}%` }}
                />
                {/* sector avg marker */}
                <div
                  className="absolute top-0 h-full w-0.5 bg-gray-400 bg-slate-500 z-10"
                  style={{ left: `${s.score}%` }}
                />
              </div>
            </div>
          )
        })}
        <p className="mt-2 text-xs text-gray-400 text-slate-500">
          Barra gris vertical = promedio del sector. Usando ultimo diagnostico disponible.
        </p>
        <p className="mt-1 text-xs text-amber-600 text-amber-400 italic">
          * Los promedios sectoriales son referenciales e ilustrativos. No representan estadisticas oficiales de SUNAFIL.
        </p>
      </div>
    </div>
  )
}

export default function DiagnosticoPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('select')
  const [diagType, setDiagType] = useState<DiagType>('FULL')
  const [questions, setQuestions] = useState<ComplianceQuestion[]>([])
  const [answers, setAnswers] = useState<Map<string, QuestionAnswer>>(new Map())
  const [currentAreaIdx, setCurrentAreaIdx] = useState(0)
  const [loading, setLoading] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [pastDiags, setPastDiags] = useState<PastDiagnostic[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [orgSector, setOrgSector] = useState<string>('Servicios')

  // Load past diagnostics + org profile
  useEffect(() => {
    Promise.all([
      fetch('/api/diagnostics').then(r => r.json()).catch(() => ({ diagnostics: [] })),
      fetch('/api/org/profile').then(r => r.json()).catch(() => null),
    ]).then(([diagData, orgData]) => {
      setPastDiags(diagData.diagnostics || [])
      if (orgData?.org?.sector) {
        setOrgSector(orgData.org.sector)
      }
    }).finally(() => setLoadingHistory(false))
  }, [])

  // Group questions by area
  const questionsByArea = useCallback(() => {
    const map = new Map<AreaKey, ComplianceQuestion[]>()
    for (const q of questions) {
      const list = map.get(q.area) || []
      list.push(q)
      map.set(q.area, list)
    }
    return AREAS.filter(a => map.has(a.key)).map(a => ({
      ...a,
      questions: map.get(a.key)!,
    }))
  }, [questions])

  const areaGroups = questionsByArea()
  const currentArea = areaGroups[currentAreaIdx]

  async function startDiagnostic(type: DiagType) {
    setDiagType(type)
    setLoading(true)
    setStartError(null)
    try {
      // SIMULACRO uses the FULL question set
      const apiType = type === 'SIMULACRO' ? 'FULL' : type
      const res = await fetch(`/api/diagnostics?action=questions&type=${apiType}`)
      const data = await res.json()
      setQuestions(data.questions || [])
      setAnswers(new Map())
      setCurrentAreaIdx(0)
      setPhase('wizard')
    } catch {
      setStartError('Error al cargar las preguntas del diagnóstico. Verifique su conexión e intente de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const [autoFilling, setAutoFilling] = useState(false)
  const [autoFillStats, setAutoFillStats] = useState<{ autoAnswered: number; pendingManual: number } | null>(null)

  async function autoFillFromData() {
    setAutoFilling(true)
    try {
      const apiType = diagType === 'SIMULACRO' ? 'FULL' : diagType
      const res = await fetch(`/api/diagnostics/auto-answer?type=${apiType}`)
      const data = await res.json()
      if (data.answers) {
        setAnswers(prev => {
          const next = new Map(prev)
          for (const a of data.answers as { questionId: string; answer: 'SI' | 'NO' | 'PARCIAL' | null; autoFilled: boolean }[]) {
            if (a.answer && a.autoFilled) {
              next.set(a.questionId, { questionId: a.questionId, answer: a.answer })
            }
          }
          return next
        })
        setAutoFillStats({ autoAnswered: data.autoAnswered, pendingManual: data.pendingManual })
      }
    } catch {
      // Silent — keep manual mode
    } finally {
      setAutoFilling(false)
    }
  }

  function setAnswer(questionId: string, answer: 'SI' | 'NO' | 'PARCIAL') {
    setAnswers(prev => {
      const next = new Map(prev)
      next.set(questionId, { questionId, answer })
      return next
    })
  }

  function getAreaProgress(areaQuestions: ComplianceQuestion[]) {
    let answered = 0
    for (const q of areaQuestions) {
      if (answers.has(q.id)) answered++
    }
    return { answered, total: areaQuestions.length, pct: Math.round((answered / areaQuestions.length) * 100) }
  }

  const totalProgress = (() => {
    const total = questions.length
    const answered = answers.size
    return { answered, total, pct: total > 0 ? Math.round((answered / total) * 100) : 0 }
  })()

  async function submitDiagnostic() {
    setPhase('submitting')
    try {
      const answersArray = Array.from(answers.values())
      // For unanswered questions, add NO
      for (const q of questions) {
        if (!answers.has(q.id)) {
          answersArray.push({ questionId: q.id, answer: 'NO' })
        }
      }

      const res = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: diagType,
          answers: answersArray,
        }),
      })

      const data = await res.json()
      if (data.diagnosticId) {
        router.push(`/dashboard/diagnostico/${data.diagnosticId}/resultado`)
      } else {
        setSubmitError('Error al guardar el diagnóstico. Intente nuevamente.')
        setPhase('wizard')
      }
    } catch {
      setSubmitError('Error de conexión. Verifique su red e intente de nuevo.')
      setPhase('wizard')
    }
  }

  // =============================================
  // PHASE: SELECT TYPE
  // =============================================
  if (phase === 'select') {
    // Build trend data from past diagnostics (last 6)
    const trendData = [...pastDiags]
      .sort((a, b) => new Date(a.completedAt || a.createdAt).getTime() - new Date(b.completedAt || b.createdAt).getTime())
      .slice(-6)
      .map(d => ({
        date: d.completedAt || d.createdAt,
        score: d.scoreGlobal,
        type: d.type,
      }))

    const latestScore = trendData.length > 0 ? trendData[trendData.length - 1].score : null

    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Diagnostico de Compliance SUNAFIL</h1>
          <p className="mt-1 text-gray-500 text-gray-400">Evalua el nivel de cumplimiento laboral de tu empresa y genera un plan de accion.</p>
        </div>

        {/* Start error banner */}
        {startError && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 border-red-800 bg-red-50 bg-red-900/20 px-4 py-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 text-red-300">{startError}</p>
            </div>
            <button
              onClick={() => setStartError(null)}
              className="ml-auto p-1 rounded hover:bg-red-100 hover:bg-red-800/50"
              aria-label="Cerrar alerta"
            >
              <X className="h-4 w-4 text-red-400" />
            </button>
          </div>
        )}

        {/* ─── NEW DIAGNOSTIC CTA ─── */}
        <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-indigo-50 from-primary/10 to-slate-800/60 border-primary/30 p-6">
          <h2 className="mb-1 text-lg font-bold text-white">Iniciar Nuevo Diagnostico</h2>
          <p className="mb-5 text-sm text-gray-500 text-gray-400">Elige el tipo de evaluacion segun tu disponibilidad</p>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Full */}
            <button
              onClick={() => startDiagnostic('FULL')}
              disabled={loading}
              className="group relative flex flex-col rounded-xl border-2 border-white/[0.08] bg-[#141824] p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:border-primary disabled:opacity-60"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-white">Diagnostico Completo</h3>
              <p className="mt-1 text-xs text-gray-500 text-gray-400">120 preguntas · ~45 min</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-blue-100 bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-700 text-blue-400">Gap Analysis</span>
                <span className="rounded-full bg-green-100 bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 text-green-400">Plan de Accion</span>
                <span className="rounded-full bg-orange-100 bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-700 text-orange-400">Multa Estimada</span>
              </div>
              <div className="mt-3 flex items-center text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Iniciar <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </button>

            {/* Express */}
            <button
              onClick={() => startDiagnostic('EXPRESS')}
              disabled={loading}
              className="group relative flex flex-col rounded-xl border-2 border-white/[0.08] bg-[#141824] p-5 text-left transition-all hover:border-amber-400 hover:shadow-lg hover:border-amber-400 disabled:opacity-60"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 bg-amber-900/20">
                <Zap className="h-5 w-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-white">Diagnostico Express</h3>
              <p className="mt-1 text-xs text-gray-500 text-gray-400">20 preguntas · ~10 min</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-yellow-100 bg-yellow-900/30 px-2 py-0.5 text-xs font-medium text-yellow-700 text-yellow-400">Rapido</span>
                <span className="rounded-full bg-purple-100 bg-purple-900/30 px-2 py-0.5 text-xs font-medium text-purple-700 text-purple-400">Score Global</span>
              </div>
              <div className="mt-3 flex items-center text-xs font-medium text-amber-500 opacity-0 transition-opacity group-hover:opacity-100">
                Iniciar <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </button>

            {/* Simulacro */}
            <button
              onClick={() => startDiagnostic('SIMULACRO')}
              disabled={loading}
              className="group relative flex flex-col rounded-xl border-2 border-white/[0.08] bg-[#141824] p-5 text-left transition-all hover:border-red-400 hover:shadow-lg hover:border-red-400 disabled:opacity-60"
            >
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 bg-red-900/20">
                <FlaskConical className="h-5 w-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-white">Simulacro SUNAFIL</h3>
              <p className="mt-1 text-xs text-gray-500 text-gray-400">Simular inspeccion real · ~45 min</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-red-100 bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 text-red-400">Alta presion</span>
                <span className="rounded-full bg-slate-100 bg-white/[0.04] px-2 py-0.5 text-xs font-medium text-slate-600 text-slate-300">Inspeccion real</span>
              </div>
              <div className="mt-3 flex items-center text-xs font-medium text-red-500 opacity-0 transition-opacity group-hover:opacity-100">
                Iniciar simulacro <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </div>
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-gray-500 text-gray-400">Cargando preguntas...</span>
          </div>
        )}

        {/* ─── HISTORICAL TREND CHART ─── */}
        {!loadingHistory && trendData.length >= 2 && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] bg-[#141824]/40 p-6">
            <TrendChart data={trendData} />
          </div>
        )}

        {/* ─── SECTOR BENCHMARK ─── */}
        {!loadingHistory && latestScore !== null && (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] bg-[#141824]/40 p-6">
            <SectorBenchmark companyScore={latestScore} companySector={orgSector} />
          </div>
        )}

        {/* ─── PAST DIAGNOSTICS LIST ─── */}
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <History className="h-5 w-5" /> Historial de Diagnosticos
          </h2>
          {loadingHistory ? (
            <p className="mt-4 text-sm text-gray-400 text-slate-500">Cargando...</p>
          ) : pastDiags.length === 0 ? (
            <div className="mt-4 rounded-lg border border-dashed border-white/10 border-slate-600 bg-white/[0.02] bg-white/50 p-8 text-center">
              <ShieldCheck className="mx-auto h-10 w-10 text-gray-300 text-slate-600" />
              <p className="mt-2 text-sm text-gray-500 text-gray-400">No hay diagnosticos previos. Inicia tu primer diagnostico.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {[...pastDiags]
                .sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime())
                .map((d, idx, arr) => {
                  const prev = arr[idx + 1]
                  const delta = prev ? d.scoreGlobal - prev.scoreGlobal : null
                  return (
                    <button
                      key={d.id}
                      onClick={() => router.push(`/dashboard/diagnostico/${d.id}/resultado`)}
                      className="flex w-full items-center justify-between rounded-lg border border-white/[0.08] bg-[#141824] px-4 py-3 text-left transition-colors hover:bg-white/[0.02] hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white',
                          d.scoreGlobal >= SCORE_HIGH ? 'bg-green-500' : d.scoreGlobal >= SCORE_MID ? 'bg-yellow-500' : 'bg-red-500'
                        )}>
                          {d.scoreGlobal}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {d.type === 'FULL' ? 'Completo' : d.type === 'EXPRESS' ? 'Express' : 'Simulacro'}
                          </p>
                          <p className="text-xs text-gray-500 text-gray-400">
                            {new Date(d.completedAt || d.createdAt).toLocaleDateString('es-PE')}
                            {' — '}Multa potencial: S/ {d.totalMultaRiesgo.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {delta !== null && (
                          <span className={cn(
                            'flex items-center gap-0.5 text-xs font-semibold',
                            delta > 0 ? 'text-green-600 text-green-400' : delta < 0 ? 'text-red-500 text-red-400' : 'text-gray-400'
                          )}>
                            {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        )}
                        <ChevronRight className="h-4 w-4 text-gray-400 text-slate-500" />
                      </div>
                    </button>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // =============================================
  // PHASE: SUBMITTING
  // =============================================
  if (phase === 'submitting') {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg font-medium text-gray-300 text-gray-200">Analizando respuestas...</p>
        <p className="text-sm text-gray-400 text-slate-500">Calculando score, brechas y plan de accion</p>
      </div>
    )
  }

  // =============================================
  // PHASE: WIZARD
  // =============================================
  return (
    <div className="space-y-4">
      {/* Submit error banner */}
      {submitError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 border-red-800 bg-red-50 bg-red-900/20 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 text-red-300 flex-1">{submitError}</p>
          <button
            onClick={() => setSubmitError(null)}
            className="p-1 rounded hover:bg-red-100 hover:bg-red-800/50"
            aria-label="Cerrar alerta"
          >
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}
    <div className="flex gap-6">
      {/* Sidebar: area navigation */}
      <div className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-4 space-y-1">
          {/* Auto-fill button */}
          <button
            onClick={autoFillFromData}
            disabled={autoFilling}
            className="mb-3 flex w-full items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            {autoFilling ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analizando datos...</>
            ) : (
              <><Zap className="h-3.5 w-3.5" /> Auto-completar desde datos</>
            )}
          </button>
          {autoFillStats && (
            <p className="mb-2 text-[11px] text-emerald-400/70">
              {autoFillStats.autoAnswered} respuestas automaticas · {autoFillStats.pendingManual} pendientes
            </p>
          )}

          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-slate-500">
              {diagType === 'EXPRESS' ? 'Express' : 'Completo'} — {totalProgress.pct}%
            </p>
            <div className="mt-1 h-2 rounded-full bg-gray-200 bg-white/[0.04]">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${totalProgress.pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-gray-500 text-gray-400">{totalProgress.answered}/{totalProgress.total} preguntas</p>
          </div>

          {areaGroups.map((area, i) => {
            const prog = getAreaProgress(area.questions)
            const isActive = i === currentAreaIdx
            return (
              <button
                key={area.key}
                onClick={() => setCurrentAreaIdx(i)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  isActive ? 'bg-primary/10 font-medium text-primary' : 'text-slate-300 hover:bg-white/[0.04]'
                )}
              >
                <span className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                  prog.pct === 100 ? 'bg-green-100 bg-green-900/30 text-green-700 text-green-400' : isActive ? 'bg-primary/20 text-primary' : 'bg-white/[0.04] text-gray-500 text-gray-400'
                )}>
                  {prog.pct === 100 ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </span>
                <span className="truncate">{area.label}</span>
                <span className="ml-auto text-xs text-gray-400 text-slate-500">{prog.answered}/{prog.total}</span>
              </button>
            )
          })}

          <div className="pt-4">
            <button
              onClick={() => setPhase('select')}
              className="w-full rounded-lg border border-white/[0.08] px-3 py-2 text-sm text-gray-500 text-gray-400 hover:bg-white/[0.02] hover:bg-white/[0.04]"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Main content: questions */}
      <div className="min-w-0 flex-1">
        {/* Mobile progress */}
        <div className="mb-4 lg:hidden">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-300 text-gray-200">Area {currentAreaIdx + 1}/{areaGroups.length}</span>
            <span className="text-gray-500 text-gray-400">{totalProgress.pct}% completado</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-200 bg-white/[0.04]">
            <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${totalProgress.pct}%` }} />
          </div>
        </div>

        {currentArea && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white">{currentArea.label}</h2>
              <p className="text-sm text-gray-500 text-gray-400">{currentArea.description}</p>
            </div>

            <div className="space-y-4">
              {currentArea.questions.map((q, qi) => {
                const ans = answers.get(q.id)?.answer
                return (
                  <div key={q.id} className="rounded-lg border border-white/[0.08] bg-[#141824] p-4">
                    <div className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-xs font-medium text-slate-300">
                        {qi + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{q.text}</p>
                        <p className="mt-1 text-xs text-gray-400 text-slate-500">Base legal: {q.baseLegal}</p>
                        {q.infraccionGravedad === 'MUY_GRAVE' && (
                          <p className="mt-1 flex items-center gap-1 text-xs text-red-600 text-red-400">
                            <AlertTriangle className="h-3 w-3" /> Infraccion muy grave — multa hasta {q.multaUIT} UIT
                          </p>
                        )}
                        {q.infraccionGravedad === 'GRAVE' && (
                          <p className="mt-1 text-xs text-orange-600 text-orange-400">Infraccion grave — multa hasta {q.multaUIT} UIT</p>
                        )}

                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => setAnswer(q.id, 'SI')}
                            className={cn(
                              'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                              ans === 'SI'
                                ? 'border-green-500 bg-green-50 bg-green-900/30 text-green-700 text-green-400'
                                : 'border-white/[0.08] border-slate-600 text-gray-500 text-gray-400 hover:border-green-300 hover:bg-green-50/50 hover:bg-green-900/20'
                            )}
                          >
                            Si
                          </button>
                          <button
                            onClick={() => setAnswer(q.id, 'PARCIAL')}
                            className={cn(
                              'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                              ans === 'PARCIAL'
                                ? 'border-yellow-500 bg-yellow-50 bg-yellow-900/30 text-yellow-700 text-yellow-400'
                                : 'border-white/[0.08] border-slate-600 text-gray-500 text-gray-400 hover:border-yellow-300 hover:bg-yellow-50/50 hover:bg-yellow-900/20'
                            )}
                          >
                            Parcial
                          </button>
                          <button
                            onClick={() => setAnswer(q.id, 'NO')}
                            className={cn(
                              'rounded-lg border px-4 py-1.5 text-sm font-medium transition-colors',
                              ans === 'NO'
                                ? 'border-red-500 bg-red-50 bg-red-900/30 text-red-700 text-red-400'
                                : 'border-white/[0.08] border-slate-600 text-gray-500 text-gray-400 hover:border-red-300 hover:bg-red-50/50 hover:bg-red-900/20'
                            )}
                          >
                            No
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setCurrentAreaIdx(Math.max(0, currentAreaIdx - 1))}
                disabled={currentAreaIdx === 0}
                className="flex items-center gap-1 rounded-lg border border-white/[0.08] px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.02] hover:bg-white/[0.04] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </button>

              {currentAreaIdx < areaGroups.length - 1 ? (
                <button
                  onClick={() => setCurrentAreaIdx(currentAreaIdx + 1)}
                  className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  Siguiente <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={submitDiagnostic}
                  className="flex items-center gap-1 rounded-lg bg-green-600 px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" /> Finalizar Diagnostico
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
    </div>
  )
}
