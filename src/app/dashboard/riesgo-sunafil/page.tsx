'use client'

import { useState, useEffect } from 'react'
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Loader2,
  RefreshCw, ChevronDown, ChevronUp, Users, Scale,
  Zap, TrendingDown, ExternalLink, ClipboardList,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrabajadorAfectado { id: string; nombre: string; detalle: string }
interface Riesgo {
  codigo: string
  categoria: string
  severidad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  titulo: string
  descripcion: string
  baseLegal: string
  trabajadoresAfectados: TrabajadorAfectado[]
  multaEstimadaSoles: number
  multaEstimadaUit: number
  multaConSubsanacionSoles: number
  ahorroSubsanacion: number
  accionInmediata: string
  urgencia: number
  prioridadFiscalizacion: number
}
interface Resumen {
  muyGraves: number; graves: number; leves: number
  totalRiesgos: number; areasMasRiesgosas: string[]
  riesgosCriticosCount: number
}
interface ReportData {
  scanDate: string; tipoEmpresa: string; totalTrabajadores: number
  totalMultaSoles: number; totalMultaUit: number
  totalMultaConSubsanacionSoles: number; ahorroTotalSoles: number
  resumen: Resumen; riesgos: Riesgo[]
}

const SEVERIDAD_CONFIG = {
  MUY_GRAVE: { label: 'Muy Grave', bg: 'bg-red-900/30', text: 'text-red-300', border: 'border-red-700', dot: 'bg-red-500' },
  GRAVE:     { label: 'Grave',     bg: 'bg-orange-900/30', text: 'text-orange-300', border: 'border-orange-700', dot: 'bg-orange-500' },
  LEVE:      { label: 'Leve',      bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-600', dot: 'bg-yellow-500' },
}

const CATEGORIA_LABELS: Record<string, string> = {
  RELACIONES_LABORALES: 'Relaciones Laborales',
  SST: 'Seguridad y Salud',
  SEGURIDAD_SOCIAL: 'Seguridad Social',
  EMPLEO_COLOCACION: 'Empleo y Colocación',
  REMUNERACIONES: 'Remuneraciones',
  JORNADA_DESCANSO: 'Jornada y Descanso',
  DOCUMENTOS_REGISTROS: 'Documentos y Registros',
  IGUALDAD: 'Igualdad y No Discriminación',
  MODALIDADES_FORMATIVAS: 'Modalidades Formativas',
}

function formatSoles(n: number) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(n)
}

function UrgenciaBar({ urgencia }: { urgencia: number }) {
  const pct = (urgencia / 10) * 100
  const color = urgencia >= 8 ? 'bg-red-500' : urgencia >= 6 ? 'bg-orange-500' : 'bg-yellow-400'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 rounded-full bg-gray-200 bg-[color:var(--neutral-100)] overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400">{urgencia}/10</span>
    </div>
  )
}

function RiesgoCard({ riesgo }: { riesgo: Riesgo }) {
  const [open, setOpen] = useState(false)
  const cfg = SEVERIDAD_CONFIG[riesgo.severidad]

  return (
    <div className={cn('rounded-xl border', cfg.border, riesgo.urgencia >= 8 ? 'ring-1 ring-red-400/40' : '')}>
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start gap-3">
          {/* Dot */}
          <div className={cn('mt-1 h-2.5 w-2.5 rounded-full shrink-0', cfg.dot)} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('inline-block rounded-full px-2 py-0.5 text-[11px] font-bold', cfg.bg, cfg.text)}>
                {cfg.label}
              </span>
              <span className="text-[11px] text-gray-400">
                {CATEGORIA_LABELS[riesgo.categoria] ?? riesgo.categoria}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">{riesgo.codigo}</span>
              {riesgo.prioridadFiscalizacion === 1 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-red-900/30 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                  <Zap className="h-3 w-3" /> Alta fiscalización
                </span>
              )}
            </div>
            <p className="mt-1 font-semibold text-white text-sm">{riesgo.titulo}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-4">
              <span className="text-sm font-bold text-red-400">{formatSoles(riesgo.multaEstimadaSoles)}</span>
              <span className="text-xs text-gray-400">→ con subsanación: <span className="font-semibold text-green-400">{formatSoles(riesgo.multaConSubsanacionSoles)}</span></span>
              <span className="text-xs text-green-400 font-medium">Ahorro: {formatSoles(riesgo.ahorroSubsanacion)}</span>
            </div>
          </div>
          <div className="shrink-0 ml-2">
            {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
        <div className="mt-2 ml-5">
          <UrgenciaBar urgencia={riesgo.urgencia} />
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.08] px-4 py-4 space-y-3 text-sm">
          {/* Descripción */}
          <p className="text-slate-300">{riesgo.descripcion}</p>

          {/* Base legal */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-900/20 px-3 py-2">
            <Scale className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <p className="text-xs text-emerald-600 font-medium">{riesgo.baseLegal}</p>
          </div>

          {/* Trabajadores afectados */}
          {riesgo.trabajadoresAfectados.length > 0 && riesgo.trabajadoresAfectados[0].id !== 'org' && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                <Users className="inline h-3.5 w-3.5 mr-1" />
                {riesgo.trabajadoresAfectados.length} Trabajador{riesgo.trabajadoresAfectados.length !== 1 ? 'es' : ''} afectado{riesgo.trabajadoresAfectados.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {riesgo.trabajadoresAfectados.slice(0, 10).map((t, i) => (
                  <div key={i} className="flex items-start gap-2 rounded bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/50 px-2.5 py-1.5">
                    <span className="font-medium text-[color:var(--text-secondary)] text-white shrink-0">{t.nombre}</span>
                    <span className="text-gray-400 text-xs mt-0.5">{t.detalle}</span>
                  </div>
                ))}
                {riesgo.trabajadoresAfectados.length > 10 && (
                  <p className="text-xs text-gray-400 pl-2">... y {riesgo.trabajadoresAfectados.length - 10} más</p>
                )}
              </div>
            </div>
          )}

          {/* Acción inmediata */}
          <div className="rounded-lg bg-green-900/20 border border-green-800 px-3 py-2">
            <p className="text-xs font-semibold text-green-400 mb-1">
              <CheckCircle2 className="inline h-3.5 w-3.5 mr-1" />
              Acción para subsanar (−90% de multa):
            </p>
            <p className="text-xs text-green-300">{riesgo.accionInmediata}</p>
          </div>

          {/* Resumen de multas */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-red-900/20 px-2 py-2">
              <p className="text-red-400 font-bold text-base">{formatSoles(riesgo.multaEstimadaSoles)}</p>
              <p className="text-red-400 mt-0.5">Sin subsanar</p>
            </div>
            <div className="rounded-lg bg-green-900/20 px-2 py-2">
              <p className="text-green-400 font-bold text-base">{formatSoles(riesgo.multaConSubsanacionSoles)}</p>
              <p className="text-green-400 mt-0.5">Subsanando hoy</p>
            </div>
            <div className="rounded-lg bg-blue-900/20 px-2 py-2">
              <p className="text-emerald-600 font-bold text-base">{formatSoles(riesgo.ahorroSubsanacion)}</p>
              <p className="text-emerald-600 mt-0.5">Ahorro (−90%)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RiesgoSunafilPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterSev, setFilterSev] = useState<'ALL' | 'MUY_GRAVE' | 'GRAVE' | 'LEVE'>('ALL')

  async function runScan() {
    setScanning(true)
    setError(null)
    try {
      const res = await fetch('/api/compliance/scan')
      const data = await res.json()
      if (!data.ok) throw new Error(data.error)
      setReport(data.report)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al escanear')
    } finally {
      setScanning(false)
      setLoading(false)
    }
  }

  useEffect(() => { runScan() }, [])

  const filteredRiesgos = report?.riesgos.filter(r =>
    filterSev === 'ALL' || r.severidad === filterSev
  ) ?? []

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-gray-400">Analizando riesgos SUNAFIL de tu organización...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-red-500" />
            Panel de Riesgo SUNAFIL
          </h1>
          <p className="mt-1 text-gray-400 text-sm">
            Detección automática de infracciones y multas estimadas según D.S. 019-2006-TR
          </p>
        </div>
        <button
          onClick={runScan}
          disabled={scanning}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          {scanning ? 'Escaneando...' : 'Re-escanear ahora'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {report && (
        <>
          {/* Aviso legal */}
          <div className="rounded-xl border border-blue-800 bg-blue-900/20 px-4 py-3">
            <div className="flex items-start gap-2">
              <Scale className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              <p className="text-xs text-emerald-600">
                <span className="font-semibold">Base legal:</span> D.S. N° 019-2006-TR (modificado por D.S. 008-2020-TR) — Multas calculadas según escala granular por N° de trabajadores afectados.{' '}
                <span className="font-semibold">Subsanación voluntaria antes de inspección: −90%</span> (Art. 40, Ley 28806).
                Última actualización UIT 2026: S/ 5,500.
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-xl border border-white/[0.08] bg-white p-4 text-center">
              <AlertTriangle className="mx-auto h-5 w-5 text-red-500" />
              <p className="mt-1 text-2xl font-bold text-red-400">
                {formatSoles(report.totalMultaSoles)}
              </p>
              <p className="text-xs text-gray-400">Multa Total Estimada</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white p-4 text-center">
              <CheckCircle2 className="mx-auto h-5 w-5 text-green-500" />
              <p className="mt-1 text-2xl font-bold text-green-400">
                {formatSoles(report.totalMultaConSubsanacionSoles)}
              </p>
              <p className="text-xs text-gray-400">Subsanando hoy (−90%)</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white p-4 text-center">
              <TrendingDown className="mx-auto h-5 w-5 text-blue-500" />
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {formatSoles(report.ahorroTotalSoles)}
              </p>
              <p className="text-xs text-gray-400">Ahorro si subsana ya</p>
            </div>
            <div className="rounded-xl border border-white/[0.08] bg-white p-4 text-center">
              <ClipboardList className="mx-auto h-5 w-5 text-purple-500" />
              <p className="mt-1 text-2xl font-bold text-white">
                {report.resumen.totalRiesgos}
              </p>
              <p className="text-xs text-gray-400">Riesgos detectados</p>
            </div>
          </div>

          {/* Resumen por severidad */}
          <div className="rounded-xl border border-white/[0.08] bg-white p-4">
            <h2 className="font-semibold text-white mb-3">Resumen por severidad</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-red-900/20 border border-red-800 p-3 text-center">
                <p className="text-2xl font-bold text-red-400">{report.resumen.muyGraves}</p>
                <p className="text-xs text-red-400 font-medium">Muy Graves</p>
                <p className="text-[10px] text-red-400 mt-0.5">Acción inmediata</p>
              </div>
              <div className="rounded-lg bg-orange-900/20 border border-orange-800 p-3 text-center">
                <p className="text-2xl font-bold text-orange-400">{report.resumen.graves}</p>
                <p className="text-xs text-orange-400 font-medium">Graves</p>
                <p className="text-[10px] text-orange-400 mt-0.5">Esta semana</p>
              </div>
              <div className="rounded-lg bg-yellow-900/20 border border-yellow-700 p-3 text-center">
                <p className="text-2xl font-bold text-yellow-400">{report.resumen.leves}</p>
                <p className="text-xs text-yellow-400 font-medium">Leves</p>
                <p className="text-[10px] text-yellow-500 mt-0.5">Planificar</p>
              </div>
            </div>
            {report.resumen.areasMasRiesgosas.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-gray-400">Áreas más riesgosas:</span>
                {report.resumen.areasMasRiesgosas.map(a => (
                  <span key={a} className="rounded-full bg-[color:var(--neutral-100)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--text-secondary)]">
                    {CATEGORIA_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Lista de riesgos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">
                Riesgos detectados ({filteredRiesgos.length})
              </h2>
              <div className="flex gap-1">
                {(['ALL', 'MUY_GRAVE', 'GRAVE', 'LEVE'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterSev(s)}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                      filterSev === s
                        ? 'bg-primary text-white'
                        : 'bg-[color:var(--neutral-100)] text-slate-300 hover:bg-[color:var(--neutral-200)]'
                    )}
                  >
                    {s === 'ALL' ? 'Todos' : s === 'MUY_GRAVE' ? 'Muy Graves' : s === 'GRAVE' ? 'Graves' : 'Leves'}
                  </button>
                ))}
              </div>
            </div>

            {filteredRiesgos.length === 0 ? (
              <div className="rounded-xl border border-white/[0.08] bg-white p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-green-500" />
                <p className="mt-2 font-medium text-[color:var(--text-secondary)]">
                  {filterSev === 'ALL' ? '¡Sin riesgos detectados!' : `Sin infracciones ${filterSev.toLowerCase().replace('_', ' ')} detectadas`}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRiesgos.map((r, i) => <RiesgoCard key={i} riesgo={r} />)}
              </div>
            )}
          </div>

          {/* Nota final */}
          <div className="rounded-xl border border-white/[0.08] bg-[color:var(--neutral-50)] bg-white/50 px-4 py-3 text-xs text-gray-400">
            <ExternalLink className="inline h-3.5 w-3.5 mr-1" />
            Escaneo realizado: {new Date(report.scanDate).toLocaleString('es-PE')} | Empresa: {report.tipoEmpresa} | {report.totalTrabajadores} trabajadores activos.
            Las multas son estimativas según el número de trabajadores afectados. Un inspector puede aplicar escalas diferentes.
          </div>
        </>
      )}
    </div>
  )
}
