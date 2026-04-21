'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle, Shield, ChevronRight, TrendingDown, TrendingUp, Info, AlertCircle, BookOpen } from 'lucide-react'
import type {
  ContractReviewResult,
  ContractRisk,
  ComplianceCheck,
  ClausulaObligatoria,
} from '@/lib/ai/contract-review'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContractMeta {
  id: string
  title: string
  type: string
  status: string
  contentHtml: string | null
  aiRiskScore: number | null
  aiRisksJson: ContractReviewResult | null
  aiReviewedAt: string | null
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  LABORAL_INDEFINIDO: 'Plazo Indeterminado',
  LABORAL_PLAZO_FIJO: 'Plazo Fijo',
  LABORAL_TIEMPO_PARCIAL: 'Tiempo Parcial',
  LOCACION_SERVICIOS: 'Locación de Servicios',
  CONFIDENCIALIDAD: 'Confidencialidad',
  NO_COMPETENCIA: 'No Competencia',
  POLITICA_HOSTIGAMIENTO: 'Política de Hostigamiento',
  POLITICA_SST: 'Política SST',
  REGLAMENTO_INTERNO: 'Reglamento Interno',
  ADDENDUM: 'Addendum',
  CONVENIO_PRACTICAS: 'Convenio de Prácticas',
  CUSTOM: 'Personalizado',
}

const SEVERITY_COLOR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  CRITICAL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Crítico' },
  HIGH:     { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Alto' },
  MEDIUM:   { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Medio' },
  LOW:      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Bajo' },
}

const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: 'Riesgo Bajo',
  MEDIUM: 'Riesgo Medio',
  HIGH: 'Riesgo Alto',
  CRITICAL: 'Riesgo Crítico',
}

const RISK_LEVEL_COLOR: Record<string, string> = {
  LOW: 'text-green-600',
  MEDIUM: 'text-amber-600',
  HIGH: 'text-orange-600',
  CRITICAL: 'text-red-600',
}

const STATUS_COLOR: Record<string, { bg: string; ring: string }> = {
  PASS:    { bg: 'bg-green-100', ring: 'ring-green-400' },
  FAIL:    { bg: 'bg-red-100', ring: 'ring-red-400' },
  WARNING: { bg: 'bg-amber-100', ring: 'ring-amber-400' },
}

// ─── Score ring component ─────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-400 font-medium">/ 100</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalisisContratoPaje() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [contract, setContract] = useState<ContractMeta | null>(null)
  const [result, setResult] = useState<ContractReviewResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState<'resumen' | 'clausulas' | 'riesgos' | 'compliance'>('resumen')

  const fetchContract = useCallback(async () => {
    const res = await fetch(`/api/contracts/${id}`)
    if (!res.ok) { router.push('/dashboard/contratos'); return }
    const data = await res.json()
    const c: ContractMeta = data.data
    setContract(c)
    if (c.aiRisksJson) setResult(c.aiRisksJson as ContractReviewResult)
    setLoading(false)
  }, [id, router])

  useEffect(() => { fetchContract() }, [fetchContract])

  async function runAnalysis() {
    if (!contract) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractHtml: contract.contentHtml ?? '',
          contractType: contract.type,
        }),
      })
      const data = await res.json()
      const r: ContractReviewResult = data.data

      // Persistir
      await fetch(`/api/contracts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiRiskScore: r.overallScore,
          aiRisksJson: r,
          aiReviewedAt: new Date().toISOString(),
        }),
      })

      setResult(r)
      setContract(prev => prev ? { ...prev, aiRiskScore: r.overallScore, aiReviewedAt: new Date().toISOString() } : prev)
    } catch (e) {
      console.error('Análisis fallido:', e)
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  if (!contract) return null

  const clausulasOk = result?.clausulasObligatorias?.filter(c => c.presente) ?? []
  const clausulasFail = result?.clausulasObligatorias?.filter(c => !c.presente) ?? []
  const complianceFail = result?.compliance?.filter(c => c.status === 'FAIL') ?? []
  const complianceWarn = result?.compliance?.filter(c => c.status === 'WARNING') ?? []
  const riesgosAltos = result?.risks?.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH') ?? []

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/contratos" className="hover:text-[color:var(--text-secondary)] transition-colors">Contratos</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/dashboard/contratos/${id}`} className="hover:text-[color:var(--text-secondary)] transition-colors truncate max-w-[160px]">
          {contract.title}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white font-medium">Análisis Normativo</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Análisis de Cumplimiento Normativo</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {TYPE_LABELS[contract.type] ?? contract.type} · {contract.title}
              </p>
              {contract.aiReviewedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  Último análisis: {new Date(contract.aiReviewedAt).toLocaleString('es-PE')}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/contratos/${id}`}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-white/[0.08] rounded-xl hover:bg-[color:var(--neutral-50)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al contrato
            </Link>
            <button
              onClick={runAnalysis}
              disabled={analyzing || !contract.contentHtml}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 shadow-md shadow-primary/20"
            >
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {result ? 'Re-analizar' : 'Analizar ahora'}
            </button>
          </div>
        </div>
      </div>

      {/* Sin contenido */}
      {!contract.contentHtml && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Contrato sin contenido HTML</p>
            <p className="text-sm text-amber-700 mt-1">
              Para analizar el contrato se necesita el texto generado. Primero genera el contrato desde el editor.
            </p>
          </div>
        </div>
      )}

      {/* Analizando... */}
      {analyzing && (
        <div className="bg-white rounded-2xl border border-primary/20 p-12 text-center shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5">
            <Sparkles className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Analizando con IA...</h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-5">
            Verificando cláusulas obligatorias, detectando riesgos legales y calculando multas potenciales según normativa peruana vigente.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            {['Verificando identificación de partes', 'Revisando remuneración y jornada', 'Chequeando SST y datos personales', 'Calculando score de cumplimiento'].map((step, i) => (
              <div key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-[color:var(--text-secondary)]">·</span>}
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sin análisis aún */}
      {!analyzing && !result && contract.contentHtml && (
        <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-12 text-center">
          <Shield className="w-12 h-12 text-[color:var(--text-secondary)] mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Sin análisis todavía</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Ejecuta el análisis para verificar que el contrato cumple con la normativa laboral peruana vigente y detectar riesgos antes de la firma.
          </p>
          <button
            onClick={runAnalysis}
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light shadow-lg shadow-primary/20 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Iniciar análisis normativo
          </button>
        </div>
      )}

      {/* RESULTADO */}
      {!analyzing && result && (
        <>
          {/* Score overview */}
          <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <ScoreRing score={result.overallScore} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-bold text-white">Resultado del análisis</h2>
                  <span className={`text-sm font-bold ${RISK_LEVEL_COLOR[result.riskLevel]}`}>
                    {RISK_LEVEL_LABEL[result.riskLevel]}
                  </span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">
                  {result.resumenEjecutivo || result.summary}
                </p>

                {/* Quick stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <QuickStat
                    label="Cláusulas presentes"
                    value={`${clausulasOk.length}/${(result.clausulasObligatorias ?? []).length}`}
                    color={clausulasFail.length === 0 ? 'text-green-600' : 'text-orange-600'}
                    icon={CheckCircle2}
                  />
                  <QuickStat
                    label="Cláusulas faltantes"
                    value={String(clausulasFail.length)}
                    color={clausulasFail.length === 0 ? 'text-green-600' : 'text-red-600'}
                    icon={XCircle}
                  />
                  <QuickStat
                    label="Riesgos altos/críticos"
                    value={String(riesgosAltos.length)}
                    color={riesgosAltos.length === 0 ? 'text-green-600' : 'text-red-600'}
                    icon={AlertTriangle}
                  />
                  <QuickStat
                    label="Multa estimada"
                    value={result.multaEstimadaUIT ? `${result.multaEstimadaUIT} UIT` : '—'}
                    color={result.multaEstimadaUIT ? 'text-red-600' : 'text-green-600'}
                    icon={TrendingDown}
                    sub={result.multaEstimadaUIT ? `S/ ${(result.multaEstimadaUIT * 5500).toLocaleString('es-PE')}` : undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
            {/* Tab strip */}
            <div className="flex border-b border-white/[0.06] px-2 pt-2 gap-1 overflow-x-auto">
              {([
                { key: 'resumen', label: 'Resumen', icon: Info },
                { key: 'clausulas', label: `Cláusulas (${(result.clausulasObligatorias ?? []).length})`, icon: BookOpen },
                { key: 'riesgos', label: `Riesgos (${(result.risks ?? []).length})`, icon: AlertTriangle },
                { key: 'compliance', label: `Verificaciones (${(result.compliance ?? []).length})`, icon: Shield },
              ] as { key: typeof activeTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-xl border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === key
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-gray-500 hover:text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* ── Tab: Resumen ── */}
              {activeTab === 'resumen' && (
                <div className="space-y-5">
                  {/* Alertas urgentes */}
                  {riesgosAltos.length > 0 && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <p className="text-sm font-bold text-red-700">Acción urgente requerida</p>
                      </div>
                      <ul className="space-y-1.5">
                        {riesgosAltos.slice(0, 3).map(r => (
                          <li key={r.id} className="flex items-start gap-2 text-sm text-red-700">
                            <span className="mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span><strong>{r.title}</strong> — {r.recommendation}</span>
                          </li>
                        ))}
                        {riesgosAltos.length > 3 && (
                          <li className="text-xs text-red-500 pl-3">
                            + {riesgosAltos.length - 3} riesgo(s) adicional(es) — ver pestaña Riesgos
                          </li>
                        )}
                      </ul>
                    </div>
                  )}

                  {/* Cláusulas faltantes */}
                  {clausulasFail.length > 0 && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <XCircle className="w-4 h-4 text-orange-600" />
                        <p className="text-sm font-bold text-orange-700">Cláusulas obligatorias faltantes</p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {clausulasFail.map(c => (
                          <div key={c.nombre} className="flex items-start gap-2 text-sm">
                            <XCircle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-orange-800">{c.nombre}</span>
                              <span className="text-orange-600 text-xs block">{c.baseLegal}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Todo bien */}
                  {riesgosAltos.length === 0 && clausulasFail.length === 0 && (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-5 flex items-center gap-4">
                      <CheckCircle2 className="w-10 h-10 text-green-500 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-800">Contrato bien estructurado</p>
                        <p className="text-sm text-green-700 mt-0.5">
                          Todas las cláusulas obligatorias están presentes y no se detectaron riesgos de alta severidad.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Sugerencias top */}
                  {(result.suggestions ?? []).length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-[color:var(--text-secondary)] mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        Sugerencias de mejora
                      </h3>
                      <div className="space-y-2">
                        {result.suggestions.slice(0, 4).map((s, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-[color:var(--neutral-50)] border border-white/[0.06]">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${
                              s.type === 'ADD' ? 'bg-green-100 text-green-700' :
                              s.type === 'MODIFY' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {s.type === 'ADD' ? 'Agregar' : s.type === 'MODIFY' ? 'Modificar' : 'Eliminar'}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-white">{s.clause}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{s.suggestion}</p>
                            </div>
                            <span className={`ml-auto text-xs font-semibold flex-shrink-0 ${
                              s.priority === 'HIGH' ? 'text-red-600' : s.priority === 'MEDIUM' ? 'text-amber-600' : 'text-gray-400'
                            }`}>
                              {s.priority === 'HIGH' ? 'Urgente' : s.priority === 'MEDIUM' ? 'Importante' : 'Opcional'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Tab: Cláusulas obligatorias ── */}
              {activeTab === 'clausulas' && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 mb-4">
                    Verificación de las cláusulas que la ley peruana exige en este tipo de contrato.
                  </p>
                  {(result.clausulasObligatorias ?? []).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">
                      Ejecuta el análisis para ver las cláusulas verificadas.
                    </p>
                  )}
                  {(result.clausulasObligatorias ?? []).map((c: ClausulaObligatoria, i: number) => (
                    <div
                      key={i}
                      className={`flex items-start gap-4 p-4 rounded-xl border ${
                        c.presente
                          ? 'bg-green-50/60 border-green-100'
                          : c.obligatoriedad === 'OBLIGATORIA'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-amber-50 border-amber-100'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {c.presente ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : c.obligatoriedad === 'OBLIGATORIA' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{c.nombre}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            c.obligatoriedad === 'OBLIGATORIA'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-[color:var(--neutral-100)] text-gray-600'
                          }`}>
                            {c.obligatoriedad === 'OBLIGATORIA' ? 'Obligatoria' : 'Recomendada'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{c.descripcion}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          <span className="font-medium">Base legal:</span> {c.baseLegal}
                        </p>
                        {c.textoEncontrado && (
                          <p className="text-xs text-green-700 mt-1.5 italic bg-green-50 rounded-lg px-2 py-1">
                            &ldquo;{c.textoEncontrado}&rdquo;
                          </p>
                        )}
                        {!c.presente && (
                          <p className="text-xs text-red-600 mt-1.5 font-medium">
                            ✗ No encontrada en el contrato — debe agregarse antes de la firma
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Tab: Riesgos ── */}
              {activeTab === 'riesgos' && (
                <div className="space-y-3">
                  {(result.risks ?? []).length === 0 && (
                    <div className="flex flex-col items-center py-10 text-center">
                      <CheckCircle2 className="w-10 h-10 text-green-400 mb-3" />
                      <p className="text-sm font-semibold text-[color:var(--text-secondary)]">Sin riesgos detectados</p>
                      <p className="text-xs text-gray-400 mt-1">El contrato no presenta riesgos legales identificables.</p>
                    </div>
                  )}
                  {(result.risks ?? [])
                    .sort((a, b) => {
                      const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
                      return (order[a.severity] ?? 3) - (order[b.severity] ?? 3)
                    })
                    .map((risk: ContractRisk) => {
                      const sc = SEVERITY_COLOR[risk.severity] ?? SEVERITY_COLOR.LOW
                      const TIcon = risk.severity === 'CRITICAL' || risk.severity === 'HIGH' ? TrendingDown : TrendingUp
                      return (
                        <div key={risk.id} className={`rounded-xl border p-5 ${sc.bg} ${sc.border}`}>
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <TIcon className={`w-4 h-4 ${sc.text} flex-shrink-0`} />
                              <span className={`text-sm font-bold ${sc.text}`}>{risk.title}</span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
                                {sc.label}
                              </span>
                              {risk.multaUIT && risk.multaUIT > 0 && (
                                <span className="text-xs text-red-600 font-semibold bg-red-100 px-2 py-0.5 rounded-full">
                                  {risk.multaUIT} UIT
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoría:</span>
                              <span className="text-xs text-[color:var(--text-secondary)] ml-2">{risk.category}</span>
                            </div>
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Cláusula:</span>
                              <span className="text-xs text-[color:var(--text-secondary)] ml-2">{risk.clause}</span>
                            </div>
                            <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">{risk.description}</p>
                            <div className="bg-white/70 rounded-lg p-3 mt-2">
                              <p className="text-xs font-semibold text-gray-600 mb-1">Recomendación:</p>
                              <p className="text-sm text-[color:var(--text-secondary)]">{risk.recommendation}</p>
                            </div>
                            {risk.legalBasis && (
                              <p className="text-xs text-gray-500">
                                <span className="font-semibold">Base legal:</span> {risk.legalBasis}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}

              {/* ── Tab: Compliance ── */}
              {activeTab === 'compliance' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      {(result.compliance ?? []).filter(c => c.status === 'PASS').length} aprobadas
                    </div>
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      {complianceWarn.length} advertencias
                    </div>
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      {complianceFail.length} fallidas
                    </div>
                  </div>

                  {(result.compliance ?? [])
                    .sort((a, b) => {
                      const order = { FAIL: 0, WARNING: 1, PASS: 2 }
                      return (order[a.status] ?? 2) - (order[b.status] ?? 2)
                    })
                    .map((check: ComplianceCheck, i: number) => {
                      const sc = STATUS_COLOR[check.status] ?? STATUS_COLOR.PASS
                      return (
                        <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.06] hover:bg-[color:var(--neutral-50)] transition-colors">
                          <div className={`flex-shrink-0 w-5 h-5 rounded-full ${sc.bg} ring-1 ${sc.ring} flex items-center justify-center mt-0.5`}>
                            {check.status === 'PASS' ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : check.status === 'FAIL' ? (
                              <XCircle className="w-3 h-3 text-red-600" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">{check.rule}</span>
                              {check.categoria && (
                                <span className="text-xs px-1.5 py-0.5 bg-[color:var(--neutral-100)] text-gray-500 rounded-md">
                                  {check.categoria}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-0.5">{check.details}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              <span className="font-medium">Base legal:</span> {check.legalBasis}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Footer disclaimer */}
          <div className="flex items-start gap-2 text-xs text-gray-400 px-1">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <p>
              Este análisis es orientativo y está basado en la normativa laboral peruana vigente (UIT 2026 = S/ 5,500 · RMV = S/ 1,130).
              No reemplaza el criterio de un abogado laboralista certificado.{' '}
              <button onClick={runAnalysis} className="underline hover:text-gray-600 transition-colors">
                Actualizar análisis
              </button>
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function QuickStat({
  label, value, color, icon: Icon, sub,
}: {
  label: string
  value: string
  color: string
  icon: React.ElementType
  sub?: string
}) {
  return (
    <div className="flex flex-col p-3 rounded-xl bg-[color:var(--neutral-50)] border border-white/[0.06]">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <span className={`text-xl font-extrabold ${color}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400 mt-0.5">{sub}</span>}
    </div>
  )
}
