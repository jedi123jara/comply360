'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Download,
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Banknote,
  X,
  ArrowRight,
  Calendar,
  MoreVertical,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { EmptyState } from '@/components/ui/empty-state'

// ─── Types ──────────────────────────────────────────────────────────────────

interface Worker {
  id: string
  firstName: string
  lastName: string
  dni: string
  position?: string
  department?: string
  sueldoBruto: number
  regimenLaboral: string
  tipoAporte: string
  status: string
}

interface Payslip {
  id: string
  periodo: string
  sueldoBruto: string | number
  asignacionFamiliar: string | number | null
  bonificaciones: string | number | null
  totalIngresos: string | number
  aporteAfpOnp: string | number | null
  rentaQuintaCat: string | number | null
  totalDescuentos: string | number
  netoPagar: string | number
  essalud: string | number | null
  status: string
  pdfUrl?: string | null
  detalleJson?: Record<string, number | string | null> | null
}

// ─── Smart Name Display ─────────────────────────────────────────────────────

function displayName(firstName: string | null, lastName: string | null): string {
  const f = (firstName ?? '').trim()
  const l = (lastName ?? '').trim()
  if (!f && !l) return '—'
  if (!f) return l
  if (!l) return f
  if (f === l) return l
  if (l.includes(f) || f.includes(l)) return l.length >= f.length ? l : f
  return `${f} ${l}`
}

function nameInitials(firstName: string | null, lastName: string | null): string {
  const name = displayName(firstName, lastName)
  if (!name || name === '—') return '?'
  const parts = name.replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function getPeriodoActual() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function fmtPeriodo(periodo: string) {
  const [y, m] = periodo.split('-')
  return `${MESES[parseInt(m, 10)]} ${y}`
}

function fmt(n: number | string | null | undefined) {
  const v = Number(n ?? 0)
  return `S/ ${v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_STYLES: Record<string, { label: string; dot: string; bg: string }> = {
  EMITIDA: { label: 'Emitida', dot: 'bg-blue-400', bg: 'bg-blue-500/10 text-emerald-600' },
  ENVIADA: { label: 'Enviada', dot: 'bg-amber-400', bg: 'bg-amber-500/10 text-amber-400' },
  ACEPTADA: { label: 'Aceptada', dot: 'bg-emerald-400', bg: 'bg-emerald-50 text-emerald-600' },
}

const inputStyles = 'w-full rounded-lg border border-white/10 bg-[color:var(--neutral-100)] px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-colors'

// Avatar colors based on name hash
const AVATAR_COLORS = [
  'from-blue-500 to-blue-700',
  'from-emerald-500 to-emerald-700',
  'from-purple-500 to-purple-700',
  'from-amber-500 to-amber-700',
  'from-rose-500 to-rose-700',
  'from-cyan-500 to-cyan-700',
  'from-indigo-500 to-indigo-700',
  'from-orange-500 to-orange-700',
]

function getAvatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── GenerarModal ────────────────────────────────────────────────────────────

function GenerarModal({
  worker,
  onClose,
  onSuccess,
}: {
  worker: Worker
  onClose: () => void
  onSuccess: (payslip: Payslip) => void
}) {
  const [periodo, setPeriodo] = useState(getPeriodoActual)
  const [horasExtras, setHorasExtras] = useState(0)
  const [bonificaciones, setBonificaciones] = useState(0)
  const [incluirGratif, setIncluirGratif] = useState(() => {
    const m = new Date().getMonth() + 1
    return m === 7 || m === 12
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${worker.id}/payslips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo, horasExtras, bonificaciones, incluirGratificacion: incluirGratif }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al generar boleta')
      onSuccess(data.payslip)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h3 className="text-lg font-bold text-white">Generar Boleta de Pago</h3>
            <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
              {displayName(worker.firstName, worker.lastName)}
              <span className="mx-2 text-white/20">|</span>
              <span className="text-[color:var(--text-tertiary)]">DNI {worker.dni}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar modal" className="rounded-lg p-2 text-[color:var(--text-tertiary)] hover:bg-white/5 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-5 p-6">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="boleta-periodo" className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Periodo</label>
            <input id="boleta-periodo" type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} className={inputStyles} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="boleta-horas-extras" className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Horas Extras (S/)</label>
              <input id="boleta-horas-extras" type="number" step="0.01" min="0" value={horasExtras} onChange={e => setHorasExtras(parseFloat(e.target.value) || 0)} className={inputStyles} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="boleta-bonificaciones" className="block text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Bonificaciones (S/)</label>
              <input id="boleta-bonificaciones" type="number" step="0.01" min="0" value={bonificaciones} onChange={e => setBonificaciones(parseFloat(e.target.value) || 0)} className={inputStyles} />
            </div>
          </div>
          <label className="flex items-center gap-4 cursor-pointer rounded-xl border border-white/10 bg-[color:var(--neutral-50)] px-5 py-4 hover:bg-[color:var(--neutral-100)] transition-colors">
            <input type="checkbox" checked={incluirGratif} onChange={e => setIncluirGratif(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-white/10 text-amber-500 focus:ring-gold/30" />
            <div>
              <p className="text-sm font-semibold text-white">Incluir Gratificacion</p>
              <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">Marcar en julio y diciembre</p>
            </div>
          </label>
          <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-3">Vista previa</p>
            <div className="space-y-2">
              {[
                { label: 'Sueldo bruto', value: fmt(worker.sueldoBruto) },
                { label: 'Sistema previsional', value: worker.tipoAporte ?? 'AFP' },
                { label: 'Periodo', value: fmtPeriodo(periodo) },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-[color:var(--text-tertiary)]">{r.label}</span>
                  <span className="font-medium text-[color:var(--text-secondary)]">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 border-t border-white/10 px-6 py-5">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-medium text-[color:var(--text-tertiary)] hover:bg-white/5 hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={generate} disabled={loading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gold py-2.5 text-sm font-bold text-black hover:bg-gold/90 disabled:opacity-60 transition-colors">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Generar Boleta
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Payslips Drawer ─────────────────────────────────────────────────────────

function PayslipsDrawer({
  worker,
  onClose,
}: {
  worker: Worker
  onClose: () => void
}) {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/workers/${worker.id}/payslips?limit=36`)
      .then(r => r.json())
      .then(d => setPayslips(d.payslips ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [worker.id])

  const downloadPDF = async (payslipId: string, periodo: string) => {
    try {
      const res = await fetch(`/api/workers/${worker.id}/payslips/${payslipId}/pdf`)
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `boleta-${worker.dni}-${periodo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* silent */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-white/10 bg-[#1a1f2e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-white">Historial de Boletas</h3>
            <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
              {displayName(worker.firstName, worker.lastName)} · DNI {worker.dni}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar modal" className="rounded-lg p-2 text-[color:var(--text-tertiary)] hover:bg-white/5 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
              <span className="ml-2 text-sm text-[color:var(--text-tertiary)]">Cargando...</span>
            </div>
          ) : payslips.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Sin boletas para este trabajador"
              description="Registrá la primera boleta. Queda firmada digitalmente por el trabajador desde su portal y lista ante SUNAFIL."
              variant="compact"
            />
          ) : (
            payslips.map(p => {
              const st = STATUS_STYLES[p.status] ?? { label: p.status, dot: 'bg-gray-500', bg: 'bg-gray-500/10 text-[color:var(--text-tertiary)]' }
              return (
                <div key={p.id} className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50">
                        <Calendar className="h-4 w-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{fmtPeriodo(p.periodo)}</p>
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold mt-0.5', st.bg)}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', st.dot)} />
                          {st.label}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadPDF(p.id, p.periodo)}
                      className="rounded-lg p-2 text-[color:var(--text-tertiary)] hover:text-amber-500 hover:bg-white/5 transition-colors"
                      title="Descargar PDF"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <p className="text-[color:var(--text-tertiary)]">Ingresos</p>
                      <p className="text-sm font-semibold text-emerald-600 mt-0.5">{fmt(p.totalIngresos)}</p>
                    </div>
                    <div>
                      <p className="text-[color:var(--text-tertiary)]">Descuentos</p>
                      <p className="text-sm font-semibold text-red-400 mt-0.5">{fmt(p.totalDescuentos)}</p>
                    </div>
                    <div>
                      <p className="text-[color:var(--text-tertiary)]">Neto</p>
                      <p className="text-sm font-bold text-amber-500 mt-0.5">{fmt(p.netoPagar)}</p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Worker Grid Card ────────────────────────────────────────────────────────

function WorkerGridCard({
  worker,
  hasCurrentMonth,
  onGenerar,
  onViewHistory,
}: {
  worker: Worker
  hasCurrentMonth: boolean
  onGenerar: () => void
  onViewHistory: () => void
}) {
  const initials = nameInitials(worker.firstName, worker.lastName)
  const fullName = displayName(worker.firstName, worker.lastName)
  const color = getAvatarColor(fullName)

  return (
    <div className="group rounded-xl border border-[color:var(--border-default)] bg-white p-4 flex flex-col transition-all shadow-sm shadow-black/20 hover:shadow-md hover:shadow-black/40 hover:border-white/10 hover:border-white/15">
      {/* Top row: avatar + name inline */}
      <div className="flex items-center gap-3 mb-3">
        {/* Compact circular avatar */}
        <div className={cn(
          'flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white shadow-md',
          color,
        )}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-white leading-tight truncate">
            {fullName}
          </h3>
          {worker.position && (
            <p className="text-[11px] text-[color:var(--text-tertiary)] truncate mt-0.5">
              {worker.position}
              {worker.department ? ` · ${worker.department}` : ''}
            </p>
          )}
        </div>
        <button
          onClick={onViewHistory}
          className="rounded-lg p-1.5 text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] hover:text-white hover:bg-[color:var(--neutral-100)] hover:bg-white/5 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="Ver historial"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </div>

      {/* DNI */}
      <p className="text-[11px] text-[color:var(--text-tertiary)] mb-3">
        DNI: <span className="font-mono text-[color:var(--text-tertiary)]">{worker.dni}</span>
      </p>

      {/* Sueldo */}
      <div className="rounded-lg bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] px-3 py-2.5 mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-600 mb-0.5">Sueldo Bruto</p>
        <p className="text-base font-bold text-white tabular-nums">{fmt(worker.sueldoBruto)}</p>
      </div>

      {/* Footer: status + action */}
      <div className="mt-auto flex items-center justify-between gap-2">
        {hasCurrentMonth ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Al dia
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400">
            <Clock className="h-3 w-3" />
            Pendiente
          </span>
        )}
        <button
          type="button"
          onClick={onGenerar}
          className="flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-[11px] font-bold text-black hover:bg-gold/90 transition-all shadow-sm hover:shadow-md hover:shadow-gold/20"
        >
          <Plus className="h-3 w-3" />
          Generar Boleta
        </button>
      </div>
    </div>
  )
}

// ─── Bulk Payslip Button ───────────────────────────────────────────────────

function BulkPayslipButton({ periodo, periodoLabel, pendingCount, onComplete }: {
  periodo: string
  periodoLabel: string
  pendingCount: number
  onComplete: () => void
}) {
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{ created: number; skipped: number; errors?: { workerName: string; error: string }[] } | null>(null)

  const handleBulkGenerate = async () => {
    setGenerating(true)
    setResult(null)
    try {
      const res = await fetch('/api/payslips/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al generar boletas')
      setResult(data)
      onComplete()
    } catch (err) {
      setResult({ created: 0, skipped: 0, errors: [{ workerName: '', error: err instanceof Error ? err.message : 'Error desconocido' }] })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-gold/20 bg-gold/[0.03] p-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
            <Banknote className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Generacion masiva — {periodoLabel}</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">{pendingCount} trabajadores pendientes de boleta</p>
          </div>
        </div>
        <button
          onClick={handleBulkGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-5 py-2.5 bg-gold/90 hover:bg-gold text-slate-900 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {generating ? 'Generando...' : 'Generar Todas las Boletas'}
        </button>
      </div>
      {result && (
        <div className="mt-3 pt-3 border-t border-gold/10 text-sm">
          <p className="text-emerald-600 font-semibold">
            {result.created} boletas creadas{result.skipped > 0 ? `, ${result.skipped} omitidas (ya existian)` : ''}
          </p>
          {result.errors && result.errors.length > 0 && (
            <p className="text-red-400 mt-1">{result.errors.length} errores: {result.errors[0].error}</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function BoletasPage() {
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [total, setTotal] = useState(0)
  const [modalWorker, setModalWorker] = useState<Worker | null>(null)
  const [historyWorker, setHistoryWorker] = useState<Worker | null>(null)

  // Track which workers have current month payslips (lazy loaded)
  const [payslipStatus, setPayslipStatus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ status: 'ACTIVE', limit: '50' })
        if (search.trim()) params.set('search', search.trim())
        const res = await fetch(`/api/workers?${params}`)
        const data = await res.json()
        setWorkers(data.data ?? [])
        setTotal(data.pagination?.total ?? 0)
      } catch { /* silent */ }
      finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  // Check payslip status for each worker
  useEffect(() => {
    if (workers.length === 0) return
    const currentPeriodo = getPeriodoActual()
    workers.forEach(async (w) => {
      if (payslipStatus[w.id] !== undefined) return
      try {
        const res = await fetch(`/api/workers/${w.id}/payslips?limit=1&periodo=${currentPeriodo}`)
        const data = await res.json()
        setPayslipStatus(prev => ({ ...prev, [w.id]: (data.payslips?.length ?? 0) > 0 }))
      } catch {
        setPayslipStatus(prev => ({ ...prev, [w.id]: false }))
      }
    })
  }, [workers, payslipStatus])

  const handleGenerateSuccess = () => {
    if (modalWorker) {
      setPayslipStatus(prev => ({ ...prev, [modalWorker.id]: true }))
    }
    setModalWorker(null)
  }

  const currentPeriodo = getPeriodoActual()
  const periodoLabel = fmtPeriodo(currentPeriodo)
  const pendingCount = workers.filter(w => payslipStatus[w.id] === false).length
  const generatedCount = workers.filter(w => payslipStatus[w.id] === true).length

  return (
    <div className="space-y-8">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Boletas"
        title="Genera y firma <em>boletas de pago</em>."
        subtitle={`Genera y descarga boletas mensuales para cada trabajador. Periodo actual: ${periodoLabel}.`}
      />

      {/* ─── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">Total</p>
              <p className="text-2xl font-bold text-white">{total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">Pendientes</p>
              <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">Generadas</p>
              <p className="text-2xl font-bold text-emerald-600">{generatedCount}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
              <Calendar className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider">Periodo</p>
              <p className="text-lg font-bold text-white">{periodoLabel}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bulk Generation ───────────────────────────────────────────── */}
      {pendingCount > 0 && (
        <BulkPayslipButton
          periodo={currentPeriodo}
          periodoLabel={periodoLabel}
          pendingCount={pendingCount}
          onComplete={() => {
            // Mark all as generated and refresh
            setPayslipStatus({})
            setWorkers([...workers])
          }}
        />
      )}

      {/* ─── Legal notice ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-blue-500/15 bg-blue-500/[0.05] px-5 py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-emerald-600/90 leading-relaxed">
            <span className="font-bold text-emerald-600">Obligacion legal:</span>{' '}
            El empleador debe entregar la boleta de pago a cada trabajador a mas tardar el dia de pago
            (D.S. 003-97-TR Art. 19, modificado por D.S. 009-2011-TR).
          </p>
        </div>
      </div>

      {/* ─── Search ──────────────────────────────────────────────────── */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Buscar trabajador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[color:var(--neutral-100)] py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20 transition-colors"
        />
        {loading && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[color:var(--text-tertiary)]" />
        )}
      </div>

      {/* ─── Workers Grid ────────────────────────────────────────────── */}
      {loading && workers.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          <span className="ml-3 text-sm text-[color:var(--text-tertiary)]">Cargando trabajadores...</span>
        </div>
      ) : !loading && workers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 mb-5">
            <Users className="h-8 w-8 text-gray-600" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Sin trabajadores activos</h3>
          <p className="max-w-md text-sm text-[color:var(--text-tertiary)] mb-6">
            Primero debes registrar trabajadores en el modulo de Trabajadores.
          </p>
          <Link
            href="/dashboard/trabajadores"
            className="flex items-center gap-2 rounded-xl bg-gold px-5 py-2.5 text-sm font-bold text-black hover:bg-gold/90 transition-colors"
          >
            Ir a Trabajadores
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">
            {workers.length} Trabajadores
          </p>

          {/* Grid layout */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {workers.map(w => (
              <WorkerGridCard
                key={w.id}
                worker={w}
                hasCurrentMonth={payslipStatus[w.id] === true}
                onGenerar={() => setModalWorker(w)}
                onViewHistory={() => setHistoryWorker(w)}
              />
            ))}
          </div>
        </>
      )}

      {/* ─── Modals ──────────────────────────────────────────────────── */}
      {modalWorker && (
        <GenerarModal
          worker={modalWorker}
          onClose={() => setModalWorker(null)}
          onSuccess={handleGenerateSuccess}
        />
      )}

      {historyWorker && (
        <PayslipsDrawer
          worker={historyWorker}
          onClose={() => setHistoryWorker(null)}
        />
      )}
    </div>
  )
}
