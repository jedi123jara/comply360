'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, Download, RefreshCw, CheckCircle2, Clock, Loader2, Users, Banknote, TrendingUp, FileText, Play, ChevronDown, Filter } from 'lucide-react'
import { cn, displayWorkerName, workerInitials } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkerPayslipRow {
  worker: {
    id: string
    firstName: string
    lastName: string
    dni: string
    position?: string
    department?: string
    regimenLaboral: string
    tipoAporte: string
    sueldoBruto: number
  }
  payslip: {
    id: string
    totalIngresos: number
    totalDescuentos: number
    netoPagar: number
    aporteAfpOnp: number
    rentaQuintaCat: number
    essalud: number
    status: string
  } | null
}

interface PlanillaSummary {
  periodo: string
  totalWorkers: number
  generadas: number
  pendientes: number
  totales: {
    masaSalarial: number
    descuentos: number
    neto: number
    essalud: number
    afpOnp: number
    renta5ta: number
    costoTotalEmpleador: number
  }
  rows: WorkerPayslipRow[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodoActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function fmt(n: number | null | undefined) {
  return `S/ ${(n ?? 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── WorkerRow ────────────────────────────────────────────────────────────────

function WorkerRow({ row, onPdfDownload }: {
  row: WorkerPayslipRow
  onPdfDownload: (workerId: string, payslipId: string, dni: string, periodo: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { worker, payslip } = row

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all',
      payslip
        ? 'border-white/[0.08] bg-white hover:border-white/15'
        : 'border-amber-500/20 bg-amber-950/20 hover:border-amber-500/30',
    )}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center gap-4 px-6 py-5 text-left"
      >
        {/* Avatar */}
        <div className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold shadow-lg',
          payslip
            ? 'bg-gradient-to-br from-primary/80 to-primary text-white shadow-primary/20'
            : 'bg-amber-900/40 text-amber-700 shadow-amber-900/10',
        )}>
          {workerInitials(worker.firstName, worker.lastName)}
        </div>

        {/* Name + metadata */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-white leading-tight">
            {displayWorkerName(worker.firstName, worker.lastName)}
          </p>
          <div className="mt-1.5 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-400">
              DNI: <span className="font-mono text-[color:var(--text-secondary)]">{worker.dni}</span>
            </span>
            {worker.position && (
              <span className="text-xs text-gray-500">{worker.position}</span>
            )}
            {worker.department && (
              <span className="text-xs text-gray-600">{worker.department}</span>
            )}
          </div>
        </div>

        {/* Status */}
        {payslip ? (
          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-[11px] text-gray-500 mb-0.5">Neto a Pagar</p>
              <p className="text-base font-bold text-gold tabular-nums">
                {fmt(payslip.netoPagar)}
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Generada
            </span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onPdfDownload(worker.id, payslip.id, worker.dni, '') }}
              className="rounded-lg p-2 text-gray-500 hover:text-gold hover:bg-white/5 transition-colors"
              title="Descargar PDF"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-400 shrink-0">
            <Clock className="h-3 w-3" />
            Pendiente
          </span>
        )}

        <ChevronDown className={cn('h-4 w-4 text-gray-600 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open && payslip && (
        <div className="border-t border-white/[0.06] bg-[#0f1219] px-6 pb-5 pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Total Ingresos', value: fmt(payslip.totalIngresos), type: 'total-income' as const },
              { label: 'AFP/ONP', value: fmt(payslip.aporteAfpOnp), type: 'deduction' as const },
              { label: 'Renta 5ta', value: fmt(payslip.rentaQuintaCat), type: 'deduction' as const },
              { label: 'Total Descuentos', value: fmt(payslip.totalDescuentos), type: 'total-deduction' as const },
              { label: 'Neto a Pagar', value: fmt(payslip.netoPagar), type: 'gold' as const },
              { label: 'EsSalud (emp.)', value: fmt(payslip.essalud), type: 'info' as const },
            ].map(item => (
              <div key={item.label} className="space-y-1">
                <p className="text-[11px] text-gray-500">{item.label}</p>
                <p className={cn(
                  'text-sm tabular-nums font-semibold',
                  item.type === 'gold' ? 'text-gold font-bold' :
                  item.type === 'total-income' ? 'text-emerald-600' :
                  item.type === 'total-deduction' ? 'text-red-400' :
                  item.type === 'deduction' ? 'text-red-400/70' :
                  'text-[color:var(--text-secondary)]',
                )}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
            <span className="text-xs text-gray-500">
              {worker.regimenLaboral} · {worker.tipoAporte}
            </span>
            <Link
              href={`/dashboard/trabajadores/${worker.id}`}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Ver perfil →
            </Link>
          </div>
        </div>
      )}

      {open && !payslip && (
        <div className="border-t border-amber-500/15 bg-amber-950/10 px-6 pb-4 pt-3">
          <p className="text-sm text-amber-700/90 leading-relaxed">
            Sin boleta para este periodo. Usa el boton &quot;Generar Planilla&quot; para crear todas las boletas pendientes,
            o ve al{' '}
            <Link href="/dashboard/boletas" className="font-semibold underline underline-offset-2">modulo de Boletas</Link>{' '}
            para generar individualmente.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function PlanillaPage() {
  const [periodo, setPeriodo] = useState(getPeriodoActual)
  const [summary, setSummary] = useState<PlanillaSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generateResult, setGenerateResult] = useState<{ generated: number; skipped: number; errors: { name: string; error: string }[] } | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [exportLoading, setExportLoading] = useState<'excel' | 'plame' | null>(null)
  const [filterDept, setFilterDept] = useState<string>('all')
  const [showPending, setShowPending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/payroll?periodo=${periodo}`)
      const data = await res.json()
      if (res.ok) setSummary(data)
    } finally {
      setLoading(false)
    }
  }, [periodo])

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

  const generate = async () => {
    setGenerating(true)
    setGenerateResult(null)
    try {
      const res = await fetch('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo, soloFaltantes: true }),
      })
      const data = await res.json()
      setGenerateResult(data)
      if (res.ok) await load()
    } finally {
      setGenerating(false)
    }
  }

  const downloadPDF = async () => {
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/payroll/pdf?periodo=${periodo}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `planilla-${periodo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setPdfLoading(false)
    }
  }

  const downloadExport = async (format: 'excel' | 'plame') => {
    setExportLoading(format)
    try {
      const res = await fetch(`/api/payroll/export?periodo=${periodo}&format=${format}`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const ext = format === 'plame' ? 'txt' : 'xlsx'
      a.download = `planilla-${periodo}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportLoading(null)
    }
  }

  const downloadWorkerPdf = async (workerId: string, payslipId: string, dni: string, per: string) => {
    const actualPeriodo = per || periodo
    const res = await fetch(`/api/workers/${workerId}/payslips/${payslipId}/pdf`)
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `boleta-${dni}-${actualPeriodo}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Compute departments for filter
  const departments = summary
    ? ['all', ...new Set(summary.rows.map(r => r.worker.department ?? '').filter(Boolean))]
    : ['all']

  const filteredRows = summary
    ? summary.rows.filter(r => {
        if (filterDept !== 'all' && r.worker.department !== filterDept) return false
        if (showPending && r.payslip) return false
        return true
      })
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-gold" />
            Planilla de Remuneraciones
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Genera, consulta y exporta la planilla mensual de todos los trabajadores.
          </p>
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={periodo}
            onChange={e => {
              setPeriodo(e.target.value)
              setGenerateResult(null)
            }}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-gold/40 focus:outline-none"
          />
          <button
            onClick={load}
            disabled={loading}
            className="rounded-xl border border-white/10 p-2 text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            title="Recargar"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Generate result banner */}
      {generateResult && (
        <div className={cn(
          'rounded-xl border px-4 py-3',
          generateResult.errors.length > 0
            ? 'border-amber-500/30 bg-amber-900/20'
            : 'border-green-500/30 bg-green-900/20',
        )}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">
                Planilla generada: {generateResult.generated} boletas nuevas, {generateResult.skipped} ya existían
              </p>
              {generateResult.errors.length > 0 && (
                <p className="text-xs text-amber-700 mt-0.5">
                  {generateResult.errors.length} errores: {generateResult.errors.map(e => e.name).join(', ')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {[
            { label: 'Trabajadores', value: String(summary.totalWorkers), icon: <Users className="h-5 w-5 text-emerald-600" />, bg: 'bg-blue-500/10' },
            { label: 'Con boleta', value: String(summary.generadas), icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-50' },
            { label: 'Pendientes', value: String(summary.pendientes), icon: <Clock className="h-5 w-5 text-amber-400" />, bg: 'bg-amber-500/10' },
            { label: 'Masa Salarial', value: `S/ ${summary.totales.masaSalarial.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`, icon: <TrendingUp className="h-5 w-5 text-gold" />, bg: 'bg-gold/10' },
            { label: 'Neto a Pagar', value: `S/ ${summary.totales.neto.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`, icon: <Banknote className="h-5 w-5 text-emerald-600" />, bg: 'bg-emerald-50' },
            { label: 'AFP/ONP', value: `S/ ${summary.totales.afpOnp.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`, icon: <FileText className="h-5 w-5 text-purple-400" />, bg: 'bg-purple-500/10' },
            { label: 'EsSalud emp.', value: `S/ ${summary.totales.essalud.toLocaleString('es-PE', { maximumFractionDigits: 0 })}`, icon: <FileText className="h-5 w-5 text-cyan-400" />, bg: 'bg-cyan-500/10' },
          ].map(item => (
            <div key={item.label} className="rounded-2xl border border-white/[0.08] bg-white p-4">
              <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl mb-3', item.bg)}>
                {item.icon}
              </div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{item.label}</p>
              <p className="text-lg font-bold text-white mt-1 tabular-nums">{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Generate all */}
        <button
          onClick={generate}
          disabled={generating || !summary || summary.pendientes === 0}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {generating
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Play className="h-4 w-4" />}
          {generating
            ? 'Generando…'
            : summary?.pendientes
              ? `Generar ${summary.pendientes} boleta${summary.pendientes > 1 ? 's' : ''} pendiente${summary.pendientes > 1 ? 's' : ''}`
              : 'Todo generado'}
        </button>

        <div className="flex items-center gap-2 ml-auto">
          {/* PDF summary */}
          <button
            onClick={downloadPDF}
            disabled={pdfLoading || !summary?.generadas}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-[color:var(--text-secondary)] hover:text-white hover:bg-white/10 disabled:opacity-50 transition-colors"
          >
            {pdfLoading
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />}
            PDF Resumen
          </button>

          {/* Excel */}
          <button
            onClick={() => downloadExport('excel')}
            disabled={exportLoading === 'excel' || !summary?.generadas}
            className="flex items-center gap-2 rounded-xl border border-green-500/30 bg-green-900/20 px-3 py-2 text-xs font-medium text-green-400 hover:bg-green-900/30 disabled:opacity-50 transition-colors"
          >
            {exportLoading === 'excel'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <FileSpreadsheet className="h-3.5 w-3.5" />}
            Excel
          </button>

          {/* PLAME */}
          <button
            onClick={() => downloadExport('plame')}
            disabled={exportLoading === 'plame' || !summary?.totalWorkers}
            className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-900/20 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-blue-900/30 disabled:opacity-50 transition-colors"
          >
            {exportLoading === 'plame'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Download className="h-3.5 w-3.5" />}
            PLAME SUNAT
          </button>
        </div>
      </div>

      {/* Filters */}
      {summary && departments.length > 2 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="h-4 w-4 text-gray-500 shrink-0" />
          <div className="flex flex-wrap gap-2">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setFilterDept(dept)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                  filterDept === dept
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white',
                )}
              >
                {dept === 'all' ? 'Todos' : dept}
              </button>
            ))}
          </div>
          <label className="ml-auto flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showPending}
              onChange={e => setShowPending(e.target.checked)}
              className="rounded border-white/20"
            />
            Solo pendientes
          </label>
        </div>
      )}

      {/* Workers list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-gold" />
          <p className="ml-3 text-gray-400">Cargando planilla…</p>
        </div>
      ) : !summary ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <FileSpreadsheet className="h-12 w-12 text-gray-600 mb-4" />
          <p className="text-gray-400">Selecciona un período para ver la planilla</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
          <p className="text-gray-400 text-sm">
            {showPending
              ? '¡Todos los trabajadores tienen boleta para este período!'
              : 'No hay trabajadores que coincidan con el filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers */}
          <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-4 px-4 py-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Trabajador</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Área / Cargo</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Ingresos</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Descuentos</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-right">Neto</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Estado</span>
          </div>

          {filteredRows.map(row => (
            <WorkerRow
              key={row.worker.id}
              row={row}
              onPdfDownload={downloadWorkerPdf}
            />
          ))}

          {/* Footer totals */}
          {summary.generadas > 0 && (
            <div className="rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 flex items-center justify-between mt-2">
              <span className="text-xs text-gray-400">
                Total planilla ({summary.generadas} trabajadores con boleta)
              </span>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">Ingresos</p>
                  <p className="font-bold text-white tabular-nums">{fmt(summary.totales.masaSalarial)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">Descuentos</p>
                  <p className="font-bold text-red-400 tabular-nums">{fmt(summary.totales.descuentos)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-500">Neto</p>
                  <p className="text-lg font-bold text-gold tabular-nums">{fmt(summary.totales.neto)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
