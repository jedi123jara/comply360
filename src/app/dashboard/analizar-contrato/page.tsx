'use client'

import { useState, useRef, useCallback } from 'react'
import {
  FileSearch, AlertTriangle, CheckCircle2, XCircle, Loader2, Scale,
  ShieldAlert, ChevronDown, ChevronUp, Gavel, ClipboardList, Info,
  Upload, FileText, File, TriangleAlert, Siren,
  AlertOctagon, ArrowRight, RotateCcw, Sparkles, Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContractFixModal } from '@/components/contracts/contract-fix-modal'

// ── Types ───────────────────────────────────────────────────────────────────

type TipoDocumento =
  | 'CONTRATO_INDEFINIDO' | 'CONTRATO_PLAZO_FIJO' | 'CONTRATO_TIEMPO_PARCIAL'
  | 'CONTRATO_MYPE' | 'LOCACION_SERVICIOS' | 'REGLAMENTO_INTERNO'
  | 'POLITICA_HOSTIGAMIENTO' | 'POLITICA_SST'

type NivelRiesgo = 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'
type TipoHallazgo = 'CLAUSULA_ILEGAL' | 'OMISION_OBLIGATORIA' | 'CLAUSULA_RIESGOSA' | 'BUENA_PRACTICA'
type Veredicto   = 'VALIDO' | 'CON_OBSERVACIONES' | 'DESNATURALIZADO' | 'INVALIDO'
type Modo        = 'archivo' | 'texto'

interface Hallazgo {
  id: string
  tipo: TipoHallazgo
  nivel: NivelRiesgo
  titulo: string
  descripcion: string
  fragmentoDetectado?: string
  baseLegal: string
  jurisprudencia?: string
  recomendacion: string
  multaSunafil: boolean
  articuloDs019?: string
}

interface ResultadoContrato {
  indice: number
  tipo: TipoDocumento
  tipoLabel: string
  desnaturalizado: boolean
  indicadoresDesnaturalizacion: string[]
  veredicto: Veredicto
  scoreCompliance: number
  hallazgos: Hallazgo[]
  clausulasIlegales: Hallazgo[]
  omisionesCriticas: Hallazgo[]
  alertasCriticas: number
  alertasAltas: number
  alertasMedias: number
  resumenEjecutivo: string
  recomendacionesPrioritarias: string[]
  /** Segunda capa IA (la corre el backend automáticamente con deep mode). */
  aiReview?: AIReviewResult | null
  aiAttempted?: boolean
}

interface AnalysisResult {
  archivo: string
  totalContratos: number
  scorePromedio: number
  estadisticas: {
    totalValidos: number
    totalObservados: number
    totalInvalidos: number
    totalDesnaturalizados: number
  }
  resultados: ResultadoContrato[]
}

// ── AI Review (análisis profundo con LLM + RAG) ────────────────────────────
interface AIReviewRisk {
  id: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: string
  title: string
  description: string
  clause: string
  recommendation: string
  legalBasis?: string
  multaUIT?: number
}
interface AIReviewSuggestion {
  type: 'ADD' | 'MODIFY' | 'REMOVE'
  clause: string
  suggestion: string
  reason: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
}
interface AIReviewClausula {
  nombre: string
  descripcion: string
  presente: boolean
  baseLegal: string
  obligatoriedad: 'OBLIGATORIA' | 'RECOMENDADA'
}
interface AIReviewResult {
  overallScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  risks: AIReviewRisk[]
  suggestions: AIReviewSuggestion[]
  clausulasObligatorias: AIReviewClausula[]
  resumenEjecutivo: string
  multaEstimadaUIT?: number
}

// ── Config ──────────────────────────────────────────────────────────────────

const TIPOS_LABEL: Record<TipoDocumento, string> = {
  CONTRATO_INDEFINIDO:   'Contrato Indefinido',
  CONTRATO_PLAZO_FIJO:   'Contrato a Plazo Fijo',
  CONTRATO_TIEMPO_PARCIAL:'Contrato Tiempo Parcial',
  CONTRATO_MYPE:         'Contrato MYPE (Ley 32353)',
  LOCACION_SERVICIOS:    'Locación de Servicios',
  REGLAMENTO_INTERNO:    'Reglamento Interno',
  POLITICA_HOSTIGAMIENTO:'Política Hostigamiento Sexual',
  POLITICA_SST:          'Política SST',
}

const NIVEL_CONFIG: Record<NivelRiesgo, {
  label: string; bg: string; text: string; border: string; icon: typeof AlertTriangle
}> = {
  CRITICO: { label: 'Crítico', bg: 'bg-red-900/30',    text: 'text-red-300',    border: 'border-red-700',    icon: XCircle },
  ALTO:    { label: 'Alto',    bg: 'bg-orange-900/20', text: 'text-orange-300', border: 'border-orange-700', icon: AlertTriangle },
  MEDIO:   { label: 'Medio',  bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-700', icon: AlertTriangle },
  BAJO:    { label: 'Bajo',   bg: 'bg-blue-900/20',   text: 'text-emerald-600',   border: 'border-blue-700',   icon: Info },
}

const TIPO_HALLAZGO_CONFIG: Record<TipoHallazgo, { label: string; color: string }> = {
  CLAUSULA_ILEGAL:     { label: 'Cláusula Ilegal',     color: 'text-red-400' },
  OMISION_OBLIGATORIA: { label: 'Omisión Obligatoria', color: 'text-orange-400' },
  CLAUSULA_RIESGOSA:   { label: 'Cláusula Riesgosa',   color: 'text-yellow-400' },
  BUENA_PRACTICA:      { label: 'Buena Práctica',      color: 'text-green-400' },
}

const VEREDICTO_CONFIG: Record<Veredicto, {
  label: string; bg: string; text: string; border: string; icon: typeof CheckCircle2; description: string
}> = {
  VALIDO:            { label: 'VÁLIDO',           bg: 'bg-green-900/30',  text: 'text-green-300',  border: 'border-green-700',  icon: CheckCircle2,  description: 'El contrato cumple los requisitos legales mínimos.' },
  CON_OBSERVACIONES: { label: 'CON OBSERVACIONES',bg: 'bg-yellow-900/30', text: 'text-yellow-300', border: 'border-yellow-700', icon: AlertTriangle,  description: 'Presenta omisiones o cláusulas que deben corregirse.' },
  DESNATURALIZADO:   { label: 'DESNATURALIZADO',  bg: 'bg-red-900/40',    text: 'text-red-300',    border: 'border-red-600',    icon: Siren,          description: 'Existen indicios de relación laboral encubierta. Riesgo de presunción de vínculo laboral.' },
  INVALIDO:          { label: 'INVÁLIDO',          bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700', icon: XCircle,        description: 'Contiene cláusulas nulas de pleno derecho o score de compliance crítico.' },
}

// ── Sub-components ──────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const color = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-400' : score >= 40 ? 'text-orange-400' : 'text-red-400'
  const ring  = score >= 80 ? 'stroke-green-500' : score >= 60 ? 'stroke-yellow-500' : score >= 40 ? 'stroke-orange-500' : 'stroke-red-500'
  const r = 30
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  return (
    <div className="relative flex items-center justify-center w-20 h-20 shrink-0">
      <svg className="absolute" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="40" cy="40" r={r} fill="none" className={ring} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 40 40)" />
      </svg>
      <span className={cn('text-xl font-bold', color)}>{score}</span>
    </div>
  )
}

function HallazgoCard({ h }: { h: Hallazgo }) {
  const [open, setOpen] = useState(false)
  const cfg     = NIVEL_CONFIG[h.nivel]
  const tipoCfg = TIPO_HALLAZGO_CONFIG[h.tipo]
  const Icon    = cfg.icon
  return (
    <div className={cn('rounded-xl border', cfg.border)}>
      <button onClick={() => setOpen(p => !p)} className="w-full text-left p-3.5">
        <div className="flex items-start gap-3">
          <Icon className={cn('h-5 w-5 mt-0.5 shrink-0', cfg.text)} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={cn('text-[11px] font-bold rounded-full px-2 py-0.5', cfg.bg, cfg.text)}>
                {cfg.label}
              </span>
              <span className={cn('text-[11px] font-semibold', tipoCfg.color)}>{tipoCfg.label}</span>
              {h.multaSunafil && (
                <span className="text-[10px] font-bold bg-red-900/30 text-red-400 rounded-full px-2 py-0.5">
                  ⚠ Multa SUNAFIL
                </span>
              )}
            </div>
            <p className="font-semibold text-sm text-white">{h.titulo}</p>
            {h.fragmentoDetectado && (
              <p className="text-xs text-red-400 mt-1 font-mono bg-red-900/20 px-2 py-0.5 rounded truncate">
                Detectado: &ldquo;{h.fragmentoDetectado}&rdquo;
              </p>
            )}
          </div>
          {open ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-white/[0.08] px-4 py-3 space-y-3 text-sm">
          <p className="text-slate-300">{h.descripcion}</p>
          <div className="flex items-start gap-2 rounded-lg bg-blue-900/20 px-3 py-2">
            <Scale className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-600"><span className="font-semibold">Base legal:</span> {h.baseLegal}</p>
          </div>
          {h.jurisprudencia && (
            <div className="flex items-start gap-2 rounded-lg bg-purple-900/20 px-3 py-2">
              <Gavel className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
              <p className="text-xs text-purple-300">
                <span className="font-semibold">Jurisprudencia SUNAFIL/TFL:</span> {h.jurisprudencia}
              </p>
            </div>
          )}
          <div className="rounded-lg bg-green-900/20 border border-green-800 px-3 py-2">
            <p className="text-xs font-semibold text-green-400 mb-1">
              <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />Corrección recomendada:
            </p>
            <p className="text-xs text-green-300">{h.recomendacion}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ContratoCard({ r, defaultOpen }: { r: ResultadoContrato; defaultOpen: boolean }) {
  const [open, setOpen]   = useState(defaultOpen)
  const [filtro, setFiltro] = useState<'TODOS' | NivelRiesgo>('TODOS')
  const vcfg = VEREDICTO_CONFIG[r.veredicto]
  const VIcon = vcfg.icon

  const hallazgosFiltrados = r.hallazgos.filter(h => filtro === 'TODOS' || h.nivel === filtro)

  return (
    <div className={cn('rounded-2xl border', vcfg.border, 'bg-white')}>
      {/* Header */}
      <button onClick={() => setOpen(p => !p)} className="w-full text-left p-5">
        <div className="flex items-center gap-4">
          <ScoreCircle score={r.scoreCompliance} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-slate-400">Contrato {r.indice}</span>
              <span className="text-xs text-slate-500">•</span>
              <span className="text-xs font-medium text-slate-300">{r.tipoLabel}</span>
            </div>
            {/* Veredicto badge */}
            <div className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border',
              vcfg.bg, vcfg.text, vcfg.border
            )}>
              <VIcon className="h-3.5 w-3.5" />
              {vcfg.label}
            </div>
            {r.desnaturalizado && r.indicadoresDesnaturalizacion.length > 0 && (
              <p className="text-[11px] text-red-400 mt-1.5">
                Indicadores: {r.indicadoresDesnaturalizacion.slice(0, 2).join(' • ')}
                {r.indicadoresDesnaturalizacion.length > 2 && ` +${r.indicadoresDesnaturalizacion.length - 2} más`}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex gap-3 text-xs">
              {r.alertasCriticas > 0 && <span className="text-red-400 font-semibold">{r.alertasCriticas} críticos</span>}
              {r.alertasAltas    > 0 && <span className="text-orange-400 font-semibold">{r.alertasAltas} altos</span>}
              {r.alertasMedias   > 0 && <span className="text-yellow-400 font-semibold">{r.alertasMedias} medios</span>}
            </div>
            {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.08] p-5 space-y-5">

          {/* Alerta desnaturalización */}
          {r.desnaturalizado && (
            <div className="rounded-xl border border-red-600 bg-red-900/20 p-4">
              <div className="flex items-start gap-3">
                <Siren className="h-5 w-5 text-red-400 mt-0.5 shrink-0 animate-pulse" />
                <div>
                  <p className="font-bold text-red-300 text-sm mb-1">RIESGO DE DESNATURALIZACIÓN</p>
                  <p className="text-xs text-red-400 mb-2">
                    Este contrato presenta indicios de una relación laboral encubierta. Conforme al principio de
                    Primacía de la Realidad (Art. III Título Preliminar D.S. 003-97-TR), un juez o inspector SUNAFIL
                    podría presumir la existencia de vínculo laboral e imponer el pago retroactivo de todos los
                    beneficios sociales (CTS, gratificaciones, vacaciones, ONP/AFP).
                  </p>
                  {r.indicadoresDesnaturalizacion.length > 0 && (
                    <ul className="space-y-1">
                      {r.indicadoresDesnaturalizacion.map((ind, i) => (
                        <li key={i} className="flex items-center gap-2 text-xs text-red-300">
                          <ArrowRight className="h-3 w-3 shrink-0" />{ind}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Resumen ejecutivo */}
          <div className="rounded-xl bg-[color:var(--neutral-50)] border border-white/[0.06] p-4">
            <p className="text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Resumen ejecutivo</p>
            <p className="text-sm text-slate-300">{r.resumenEjecutivo}</p>
          </div>

          {/* Cláusulas ilegales */}
          {r.clausulasIlegales.length > 0 && (
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-red-400 mb-2">
                <AlertOctagon className="h-4 w-4" />
                Cláusulas ilegales — nulas de pleno derecho ({r.clausulasIlegales.length})
              </h4>
              <div className="space-y-2">
                {r.clausulasIlegales.map(h => <HallazgoCard key={h.id} h={h} />)}
              </div>
            </div>
          )}

          {/* Acciones prioritarias */}
          {r.recomendacionesPrioritarias.length > 0 && (
            <div className="rounded-xl border border-amber-800 bg-amber-900/20 p-4">
              <h4 className="font-semibold text-amber-700 flex items-center gap-2 mb-2 text-sm">
                <ClipboardList className="h-4 w-4" /> Acciones prioritarias
              </h4>
              <ol className="space-y-1.5">
                {r.recomendacionesPrioritarias.map((rec, i) => (
                  <li key={i} className="text-xs text-amber-700 flex gap-2">
                    <span className="font-bold shrink-0">{i + 1}.</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Hallazgos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-white text-sm">
                Todos los hallazgos ({hallazgosFiltrados.length})
              </h4>
              <div className="flex gap-1">
                {(['TODOS', 'CRITICO', 'ALTO', 'MEDIO', 'BAJO'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setFiltro(f)}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-medium transition-colors',
                      filtro === f
                        ? 'bg-primary text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {f === 'TODOS' ? 'Todos' : NIVEL_CONFIG[f].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {hallazgosFiltrados.length === 0 ? (
                <p className="text-sm text-slate-500 py-3 text-center">
                  {r.hallazgos.length === 0 ? 'No se detectaron hallazgos en este contrato.' : 'No hay hallazgos en este nivel de riesgo.'}
                </p>
              ) : (
                hallazgosFiltrados.map(h => <HallazgoCard key={h.id} h={h} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Upload zone ──────────────────────────────────────────────────────────────

function UploadZone({
  onFile,
  loading,
}: {
  onFile: (f: File) => void
  loading: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) onFile(file)
  }, [onFile])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !loading && inputRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-16 px-8 cursor-pointer transition-all',
        dragging
          ? 'border-primary bg-primary/10 scale-[1.01]'
          : 'border-white/[0.12] bg-[color:var(--neutral-50)] hover:border-primary/50 hover:bg-primary/5',
        loading && 'pointer-events-none opacity-70'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.doc,.txt"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />

      {loading ? (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Analizando contrato...</p>
            <p className="text-sm text-slate-400 mt-1">Extrayendo texto y aplicando reglas legales</p>
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-white">Arrastra tu archivo aquí</p>
            <p className="text-sm text-slate-400 mt-1">o haz clic para buscar</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              {['PDF', 'DOCX', 'TXT'].map(ext => (
                <span key={ext} className="text-[11px] font-bold px-2 py-0.5 rounded bg-[color:var(--neutral-100)] text-slate-400 border border-white/[0.08]">
                  {ext}
                </span>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">Máximo 15 MB · Un archivo puede contener múltiples contratos</p>
          </div>
        </>
      )}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function AnalizarContratoPage() {
  const [modo, setModo]         = useState<Modo>('archivo')
  // Modo archivo
  const [, setArchivo]   = useState<File | null>(null)
  const [loading, setLoading]   = useState(false)
  const [resultado, setResultado] = useState<AnalysisResult | null>(null)
  // Modo texto (legacy)
  const [tipo, setTipo]         = useState<TipoDocumento>('CONTRATO_PLAZO_FIJO')
  const [texto, setTexto]       = useState('')
  const [analizando, setAnalizando] = useState(false)
  const [resultadoTexto, setResultadoTexto] = useState<ResultadoContrato | null>(null)
  // AI Review (segunda capa: LLM + RAG sobre el mismo texto ya analizado)
  const [aiReview, setAiReview] = useState<AIReviewResult | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  // Contract Fix modal (Sprint 5+ T6.3 — generar versión corregida por IA)
  const [fixModal, setFixModal] = useState<{
    open: boolean
    contractHtml: string
    review: AIReviewResult | null
  }>({ open: false, contractHtml: '', review: null })
  // Shared
  const [error, setError]       = useState<string | null>(null)

  // ── Upload handler ───────────────────────────────────────────
  async function handleFile(file: File) {
    setArchivo(file)
    setError(null)
    setResultado(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res  = await fetch('/api/contracts/analyze-upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al analizar')
      setResultado(data as AnalysisResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al analizar el archivo')
    } finally {
      setLoading(false)
    }
  }

  // ── Paste text handler ───────────────────────────────────────
  async function analizarTexto() {
    if (!texto.trim() || texto.length < 50) {
      setError('Por favor, pegue el texto del documento (mínimo 50 caracteres).')
      return
    }
    setAnalizando(true)
    setError(null)
    setResultadoTexto(null)
    try {
      const res  = await fetch('/api/compliance/analyze-contract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto, tipo, deep: true }), // IA siempre on
      })
      const data = await res.json()
      if (!data.ok && data.error) throw new Error(data.error)
      setResultadoTexto({ indice: 1, tipo, tipoLabel: TIPOS_LABEL[tipo], desnaturalizado: false, indicadoresDesnaturalizacion: [], veredicto: data.alertasCriticas > 0 || data.clausulasIlegales?.length > 0 ? 'INVALIDO' : data.scoreCompliance >= 70 ? 'VALIDO' : 'CON_OBSERVACIONES', ...data })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al analizar')
    } finally {
      setAnalizando(false)
    }
  }

  function resetAll() {
    setArchivo(null)
    setResultado(null)
    setResultadoTexto(null)
    setError(null)
    setTexto('')
    setAiReview(null)
    setAiError(null)
  }

  /**
   * Análisis IA profundo: complementa el rule-based con una revisión LLM
   * fundamentada por el corpus legal RAG (v1 73 chunks + v2 361 chunks).
   * Devuelve: clausulas obligatorias presentes/ausentes, risks con severity,
   * sugerencias ADD/MODIFY/REMOVE, score global + multa estimada en UIT.
   */
  async function runDeepAIReview() {
    const contractText = texto.trim()
    if (!contractText || contractText.length < 50) {
      setAiError('Necesitás el texto del contrato cargado antes de correr el análisis IA.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    setAiReview(null)
    try {
      const res = await fetch('/api/ai-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractHtml: contractText, // el server hace strip HTML
          contractType: tipo,
        }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`)
      setAiReview(body.data as AIReviewResult)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Error al correr el análisis IA')
    } finally {
      setAiLoading(false)
    }
  }

  const hasResults = resultado !== null || resultadoTexto !== null

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSearch className="h-6 w-6 text-primary" />
            Analizador de Contratos
          </h1>
          <p className="mt-1 text-slate-400 text-sm max-w-2xl">
            Detecta cláusulas ilegales, omisiones críticas y riesgo de desnaturalización
            basado en D.Leg. 728, D.S. 003-97-TR, Ley 29783, Ley 27942 y jurisprudencia del TFL/SUNAFIL.
          </p>
        </div>
        {hasResults && (
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Nuevo análisis
          </button>
        )}
      </div>

      {/* ── Modo selector ── */}
      {!hasResults && (
        <>
          <div className="flex gap-2 p-1 bg-[color:var(--neutral-100)] rounded-xl border border-white/[0.06] w-fit">
            {(['archivo', 'texto'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setModo(m); setError(null) }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  modo === m
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                )}
              >
                {m === 'archivo' ? (
                  <><Upload className="h-4 w-4" /> Subir archivo</>
                ) : (
                  <><FileText className="h-4 w-4" /> Pegar texto</>
                )}
              </button>
            ))}
          </div>

          {/* ── Modo: archivo ── */}
          {modo === 'archivo' && (
            <div className="space-y-4">
              <UploadZone onFile={handleFile} loading={loading} />

              {/* Info chips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { icon: File,         label: 'Múltiples contratos',    desc: 'Un solo PDF puede contener varios contratos. Se analizan por separado.' },
                  { icon: Sparkles,     label: 'Auto-detección de tipo',  desc: 'Detecta automáticamente si es indefinido, plazo fijo, locación, etc.' },
                  { icon: ShieldAlert,  label: 'Desnaturalización',       desc: 'Identifica locación de servicios que encubren relación laboral.' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-[color:var(--neutral-50)] p-3 flex items-start gap-3">
                    <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">{label}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Modo: texto ── */}
          {modo === 'texto' && (
            <div className="rounded-xl border border-white/[0.08] bg-white p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Tipo de documento</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.entries(TIPOS_LABEL) as [TipoDocumento, string][]).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setTipo(val)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-medium text-left transition-colors',
                        tipo === val
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-white/[0.08] text-slate-300 hover:border-primary/50'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Pegue el texto del documento
                </label>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  rows={12}
                  placeholder={`Pegue el texto completo del ${TIPOS_LABEL[tipo].toLowerCase()} aquí...`}
                  className="w-full rounded-lg border border-white/[0.08] bg-[#0f172a] px-3 py-2.5 text-sm text-white placeholder:text-[color:var(--text-secondary)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                />
                <p className="mt-1 text-xs text-slate-500">{texto.length.toLocaleString()} caracteres</p>
              </div>
              <button
                onClick={analizarTexto}
                disabled={analizando || texto.length < 50}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analizando
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Analizando...</>
                  : <><FileSearch className="h-4 w-4" /> Analizar documento</>
                }
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </>
      )}

      {/* ── Resultados: archivo ── */}
      {resultado && (
        <div className="space-y-5">
          {/* Resumen global */}
          <div className="rounded-2xl border border-white/[0.08] bg-white p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-0.5">Archivo analizado</p>
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-white">{resultado.archivo}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <ScoreCircle score={resultado.scorePromedio} />
                <div>
                  <p className="text-xs text-slate-500">Score promedio</p>
                  <p className="text-xs text-slate-300 font-medium">{resultado.totalContratos} contrato{resultado.totalContratos !== 1 ? 's' : ''} encontrado{resultado.totalContratos !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Válidos',           val: resultado.estadisticas.totalValidos,          color: 'text-green-400', bg: 'bg-green-900/20 border-green-800' },
                { label: 'Con observaciones', val: resultado.estadisticas.totalObservados,        color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-800' },
                { label: 'Inválidos',         val: resultado.estadisticas.totalInvalidos,         color: 'text-orange-400', bg: 'bg-orange-900/20 border-orange-800' },
                { label: 'Desnaturalizados',  val: resultado.estadisticas.totalDesnaturalizados,  color: 'text-red-400',    bg: 'bg-red-900/20 border-red-800' },
              ].map(({ label, val, color, bg }) => (
                <div key={label} className={cn('rounded-xl border p-3 text-center', bg)}>
                  <p className={cn('text-2xl font-bold', color)}>{val}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {resultado.estadisticas.totalDesnaturalizados > 0 && (
              <div className="mt-4 rounded-xl border border-red-700 bg-red-900/20 px-4 py-3 flex items-center gap-3">
                <Siren className="h-5 w-5 text-red-400 shrink-0 animate-pulse" />
                <p className="text-sm text-red-300">
                  <span className="font-bold">{resultado.estadisticas.totalDesnaturalizados} contrato{resultado.estadisticas.totalDesnaturalizados !== 1 ? 's' : ''} desnaturalizado{resultado.estadisticas.totalDesnaturalizados !== 1 ? 's' : ''}.</span>{' '}
                  Riesgo de presunción de vínculo laboral y pago retroactivo de beneficios sociales.
                </p>
              </div>
            )}
          </div>

          {/* Cards por contrato + IA inline (la corre el backend) */}
          <div className="space-y-4">
            {resultado.resultados.map(r => (
              <div key={r.indice} className="space-y-3">
                <ContratoCard r={r} defaultOpen={resultado.totalContratos === 1} />
                {r.aiReview ? (
                  <InlineAIReview
                    result={r.aiReview}
                    contratoIdx={r.indice}
                    onGenerateFix={(review) =>
                      setFixModal({
                        open: true,
                        contractHtml: r.resumenEjecutivo, // archivo: usamos resumen como aprox
                        review,
                      })
                    }
                  />
                ) : r.aiAttempted ? (
                  <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-2 text-xs text-amber-200 flex items-center gap-2">
                    <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                    Análisis IA no disponible para este contrato (timeout o fallo del LLM). El
                    análisis por reglas arriba sigue siendo confiable.
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Resultados: texto (rule + IA) ── */}
      {resultadoTexto && (
        <div className="space-y-4">
          <ContratoCard r={resultadoTexto} defaultOpen={true} />

          {/* IA inline: del backend (deep mode) O del botón manual como fallback */}
          {(resultadoTexto.aiReview || aiReview) ? (
            <InlineAIReview
              result={(resultadoTexto.aiReview ?? aiReview)!}
              onGenerateFix={(review) =>
                setFixModal({
                  open: true,
                  contractHtml: texto, // modo texto: tenemos el HTML/texto original
                  review,
                })
              }
            />
          ) : resultadoTexto.aiAttempted ? (
            <AIFailedNotice onRetry={runDeepAIReview} loading={aiLoading} error={aiError} />
          ) : (
            <AIReviewPanel
              canRun={texto.trim().length >= 50}
              loading={aiLoading}
              error={aiError}
              result={aiReview}
              onRun={runDeepAIReview}
            />
          )}
        </div>
      )}

      {error && hasResults === false && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300 flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Modal de versión corregida — único en mercado peruano (Sprint 5+ T6.3) */}
      {fixModal.open && fixModal.review && (
        <ContractFixModal
          open={fixModal.open}
          onClose={() => setFixModal({ open: false, contractHtml: '', review: null })}
          contractHtml={fixModal.contractHtml}
          contractType={tipo}
          reviewResult={fixModal.review}
        />
      )}

    </div>
  )
}

/* ─── Análisis IA profundo ────────────────────────────────────────────────
 * Corre sobre el mismo texto ya analizado por reglas. Aporta:
 *   - Score global 0-100 + nivel de riesgo (LOW/MEDIUM/HIGH/CRITICAL)
 *   - Multa estimada en UIT (D.S. 019-2006-TR)
 *   - Checklist de cláusulas obligatorias (presente / ausente)
 *   - Risks con severity + recomendación + base legal
 *   - Sugerencias ADD/MODIFY/REMOVE priorizadas
 * Fundamentado por RAG v2 (corpus v1 73 chunks + v2 361 chunks)
 * ───────────────────────────────────────────────────────────────────────── */

function AIReviewPanel({
  canRun,
  loading,
  error,
  result,
  onRun,
}: {
  canRun: boolean
  loading: boolean
  error: string | null
  result: AIReviewResult | null
  onRun: () => void
}) {
  return (
    <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-emerald-800/40">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-900/50 border border-emerald-700">
            <Sparkles className="h-4 w-4 text-emerald-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-emerald-100">Análisis IA profundo</p>
            <p className="mt-0.5 text-xs text-emerald-200/70 max-w-xl">
              Capa LLM fundamentada en nuestro corpus legal (434 chunks + jurisprudencia SUNAFIL).
              Detecta cláusulas omitidas, calcula multa estimada y prioriza acciones correctivas.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!canRun || loading}
          className={cn(
            'shrink-0 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
            loading
              ? 'bg-emerald-900 text-emerald-200 cursor-wait'
              : 'bg-emerald-500 text-slate-900 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Analizando…
            </>
          ) : result ? (
            <>
              <RotateCcw className="h-3.5 w-3.5" />
              Correr otra vez
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Correr análisis IA
            </>
          )}
        </button>
      </div>

      {error ? (
        <div className="px-5 py-3 border-b border-emerald-800/40 bg-red-900/20 text-xs text-red-300 flex items-center gap-2">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="px-5 py-4 space-y-4">
          {/* Score + Riesgo + Multa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <AITile
              label="Score global"
              value={`${result.overallScore}`}
              suffix="/100"
              tone={
                result.overallScore >= 80 ? 'emerald' : result.overallScore >= 60 ? 'amber' : 'crimson'
              }
            />
            <AITile
              label="Nivel de riesgo"
              value={result.riskLevel}
              tone={
                result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH'
                  ? 'crimson'
                  : result.riskLevel === 'MEDIUM'
                    ? 'amber'
                    : 'emerald'
              }
            />
            <AITile
              label="Multa estimada"
              value={`${(result.multaEstimadaUIT ?? 0).toFixed(2)}`}
              suffix=" UIT"
              hint={`≈ S/ ${Math.round((result.multaEstimadaUIT ?? 0) * 5500).toLocaleString('es-PE')}`}
              tone={
                (result.multaEstimadaUIT ?? 0) >= 5 ? 'crimson' : (result.multaEstimadaUIT ?? 0) >= 1 ? 'amber' : 'emerald'
              }
            />
          </div>

          {/* Resumen ejecutivo */}
          {result.resumenEjecutivo ? (
            <div className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 p-3">
              <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-1">
                Resumen ejecutivo
              </p>
              <p className="text-sm text-emerald-100 leading-relaxed">{result.resumenEjecutivo}</p>
            </div>
          ) : null}

          {/* Cláusulas obligatorias */}
          {result.clausulasObligatorias?.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-2">
                Cláusulas obligatorias ({result.clausulasObligatorias.filter((c) => c.presente).length}/
                {result.clausulasObligatorias.length} presentes)
              </p>
              <ul className="space-y-1.5">
                {result.clausulasObligatorias.map((c, i) => (
                  <li
                    key={i}
                    className={cn(
                      'flex items-start gap-2 text-xs rounded-md px-2 py-1.5 border',
                      c.presente
                        ? 'border-emerald-800/40 bg-emerald-900/10 text-emerald-100'
                        : 'border-red-800/50 bg-red-900/20 text-red-200'
                    )}
                  >
                    {c.presente ? (
                      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{c.nombre}</p>
                      <p className="text-[11px] text-emerald-200/70 font-mono">{c.baseLegal}</p>
                    </div>
                    {c.obligatoriedad === 'OBLIGATORIA' ? (
                      <span className="shrink-0 rounded-full bg-red-800/60 text-red-100 text-[10px] px-2 py-0.5 uppercase tracking-widest">
                        Obligatoria
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-800/60 text-amber-100 text-[10px] px-2 py-0.5 uppercase tracking-widest">
                        Recomendada
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Risks priorizados por severity */}
          {result.risks?.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-2">
                Riesgos detectados ({result.risks.length})
              </p>
              <ul className="space-y-2">
                {[...result.risks]
                  .sort((a, b) => {
                    const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
                    return (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
                  })
                  .slice(0, 8)
                  .map((r) => (
                    <li
                      key={r.id}
                      className="rounded-lg border border-emerald-800/40 bg-white/40 p-3"
                    >
                      <div className="flex items-start gap-2 mb-1">
                        <span
                          className={cn(
                            'shrink-0 rounded-md text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5',
                            r.severity === 'CRITICAL'
                              ? 'bg-red-800/60 text-red-100'
                              : r.severity === 'HIGH'
                                ? 'bg-orange-800/60 text-orange-100'
                                : r.severity === 'MEDIUM'
                                  ? 'bg-amber-800/60 text-amber-100'
                                  : 'bg-slate-700 text-slate-200'
                          )}
                        >
                          {r.severity}
                        </span>
                        <p className="text-sm font-semibold text-emerald-100 flex-1">{r.title}</p>
                        {r.multaUIT ? (
                          <span className="shrink-0 text-[11px] font-mono text-red-300">
                            {r.multaUIT.toFixed(2)} UIT
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-emerald-200/80 leading-relaxed">{r.description}</p>
                      {r.recommendation ? (
                        <p className="mt-2 text-xs text-emerald-300">
                          <strong>Acción:</strong> {r.recommendation}
                        </p>
                      ) : null}
                      {r.legalBasis ? (
                        <p className="mt-1 text-[10px] font-mono text-emerald-400/70">
                          {r.legalBasis}
                        </p>
                      ) : null}
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}

          {/* Sugerencias */}
          {result.suggestions?.length > 0 ? (
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-2">
                Sugerencias accionables
              </p>
              <ul className="space-y-1.5">
                {result.suggestions.slice(0, 6).map((s, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-emerald-100 rounded-md border border-emerald-800/40 bg-white/30 px-2 py-1.5"
                  >
                    <span
                      className={cn(
                        'shrink-0 rounded text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5',
                        s.type === 'ADD'
                          ? 'bg-emerald-800/50 text-emerald-100'
                          : s.type === 'MODIFY'
                            ? 'bg-amber-800/50 text-amber-100'
                            : 'bg-red-800/50 text-red-100'
                      )}
                    >
                      {s.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{s.clause}</p>
                      <p className="text-emerald-200/80">{s.suggestion}</p>
                      {s.reason ? (
                        <p className="text-[10px] text-emerald-300/70 mt-0.5">— {s.reason}</p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : !loading ? (
        <div className="px-5 py-4">
          <p className="text-xs text-emerald-200/70">
            El análisis IA agrega una segunda capa sobre el análisis por reglas: detecta lo que un
            abogado laboralista detectaría en una segunda lectura. Usa DeepSeek (gratis) o el
            provider configurado.
          </p>
        </div>
      ) : null}
    </div>
  )
}

function AITile({
  label,
  value,
  suffix,
  hint,
  tone,
}: {
  label: string
  value: string
  suffix?: string
  hint?: string
  tone: 'emerald' | 'amber' | 'crimson'
}) {
  const toneClass =
    tone === 'emerald'
      ? 'text-emerald-300'
      : tone === 'amber'
        ? 'text-amber-300'
        : 'text-red-300'
  return (
    <div className="rounded-lg border border-emerald-800/40 bg-white/50 px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-widest text-emerald-300/70">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold tabular-nums', toneClass)}>
        {value}
        {suffix ? <span className="text-sm font-normal text-emerald-200/60 ml-0.5">{suffix}</span> : null}
      </p>
      {hint ? <p className="text-[10px] text-emerald-300/60 font-mono mt-0.5">{hint}</p> : null}
    </div>
  )
}

/* InlineAIReview — versión sin botón (el backend ya corrió el análisis en deep mode). */
function InlineAIReview({
  result,
  contratoIdx,
  onGenerateFix,
}: {
  result: AIReviewResult
  contratoIdx?: number
  onGenerateFix?: (review: AIReviewResult) => void
}) {
  const hasRisks = result.risks?.length > 0 || result.clausulasObligatorias?.some(c => !c.presente)
  return (
    <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-emerald-800/40">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-900/50 border border-emerald-700">
            <Sparkles className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-emerald-100">
              Análisis IA profundo{contratoIdx ? ` · Contrato #${contratoIdx}` : ''}
            </p>
            <p className="mt-0.5 text-xs text-emerald-200/70 max-w-xl">
              Segunda capa sobre el análisis por reglas — fundamentado en el corpus legal RAG.
            </p>
          </div>
        </div>
        {/* Botón único en mercado peruano: genera versión corregida del contrato */}
        {hasRisks && onGenerateFix && (
          <button
            type="button"
            onClick={() => onGenerateFix(result)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-3 py-2 text-xs font-bold transition-colors shadow-md"
            title="Genera una versión del contrato con los riesgos corregidos (PRO)"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Generar versión corregida
          </button>
        )}
      </div>
      <div className="px-5 py-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <AITile
            label="Score global"
            value={`${result.overallScore}`}
            suffix="/100"
            tone={
              result.overallScore >= 80 ? 'emerald' : result.overallScore >= 60 ? 'amber' : 'crimson'
            }
          />
          <AITile
            label="Nivel de riesgo"
            value={result.riskLevel}
            tone={
              result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH'
                ? 'crimson'
                : result.riskLevel === 'MEDIUM'
                  ? 'amber'
                  : 'emerald'
            }
          />
          <AITile
            label="Multa estimada"
            value={`${(result.multaEstimadaUIT ?? 0).toFixed(2)}`}
            suffix=" UIT"
            hint={`≈ S/ ${Math.round((result.multaEstimadaUIT ?? 0) * 5500).toLocaleString('es-PE')}`}
            tone={
              (result.multaEstimadaUIT ?? 0) >= 5
                ? 'crimson'
                : (result.multaEstimadaUIT ?? 0) >= 1
                  ? 'amber'
                  : 'emerald'
            }
          />
        </div>
        {result.resumenEjecutivo ? (
          <div className="rounded-lg border border-emerald-800/40 bg-emerald-900/20 p-3">
            <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-1">
              Resumen ejecutivo
            </p>
            <p className="text-sm text-emerald-100 leading-relaxed">{result.resumenEjecutivo}</p>
          </div>
        ) : null}
        {result.clausulasObligatorias?.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-2">
              Cláusulas obligatorias ({result.clausulasObligatorias.filter((c) => c.presente).length}/
              {result.clausulasObligatorias.length} presentes)
            </p>
            <ul className="space-y-1.5">
              {result.clausulasObligatorias.map((c, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-start gap-2 text-xs rounded-md px-2 py-1.5 border',
                    c.presente
                      ? 'border-emerald-800/40 bg-emerald-900/10 text-emerald-100'
                      : 'border-red-800/50 bg-red-900/20 text-red-200',
                  )}
                >
                  {c.presente ? (
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{c.nombre}</p>
                    <p className="text-[11px] text-emerald-200/70 font-mono">{c.baseLegal}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {result.risks?.length > 0 ? (
          <div>
            <p className="text-xs uppercase tracking-widest text-emerald-300/80 mb-2">
              Riesgos detectados ({result.risks.length})
            </p>
            <ul className="space-y-2">
              {[...result.risks]
                .sort((a, b) => {
                  const order: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
                  return (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
                })
                .slice(0, 6)
                .map((r) => (
                  <li
                    key={r.id}
                    className="rounded-lg border border-emerald-800/40 bg-white/40 p-3"
                  >
                    <div className="flex items-start gap-2 mb-1">
                      <span
                        className={cn(
                          'shrink-0 rounded-md text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5',
                          r.severity === 'CRITICAL'
                            ? 'bg-red-800/60 text-red-100'
                            : r.severity === 'HIGH'
                              ? 'bg-orange-800/60 text-orange-100'
                              : r.severity === 'MEDIUM'
                                ? 'bg-amber-800/60 text-amber-100'
                                : 'bg-slate-700 text-slate-200',
                        )}
                      >
                        {r.severity}
                      </span>
                      <p className="text-sm font-semibold text-emerald-100 flex-1">{r.title}</p>
                      {r.multaUIT ? (
                        <span className="shrink-0 text-[11px] font-mono text-red-300">
                          {r.multaUIT.toFixed(2)} UIT
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-emerald-200/80 leading-relaxed">{r.description}</p>
                    {r.recommendation ? (
                      <p className="mt-2 text-xs text-emerald-300">
                        <strong>Acción:</strong> {r.recommendation}
                      </p>
                    ) : null}
                    {r.legalBasis ? (
                      <p className="mt-1 text-[10px] font-mono text-emerald-400/70">
                        {r.legalBasis}
                      </p>
                    ) : null}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}

/* AIFailedNotice — muestra que el backend intentó la IA pero falló, con retry. */
function AIFailedNotice({
  onRetry,
  loading,
  error,
}: {
  onRetry: () => void
  loading: boolean
  error: string | null
}) {
  return (
    <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-4 py-3 flex items-start gap-3">
      <TriangleAlert className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-100">
          El análisis IA automático no pudo completarse
        </p>
        <p className="mt-0.5 text-xs text-amber-200/80">
          Probablemente timeout del LLM o falta de API key. El análisis por reglas arriba sigue
          siendo confiable. Puedes reintentar manualmente.
        </p>
        {error ? <p className="mt-1 text-xs text-red-300">{error}</p> : null}
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={loading}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-100 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Reintentar
      </button>
    </div>
  )
}
