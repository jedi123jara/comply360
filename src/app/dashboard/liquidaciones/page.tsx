'use client'

import { useState, useCallback, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search, FileText, Download, Calculator, ChevronDown, ChevronUp, AlertTriangle, Info, Loader2, User, Calendar, Banknote, ArrowRight, RefreshCw, CheckCircle2, XCircle, Scale, Save } from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type MotivoCese =
  | 'despido_arbitrario'
  | 'renuncia'
  | 'mutuo_acuerdo'
  | 'fin_contrato'
  | 'despido_nulo'
  | 'hostilidad'

interface LiquidacionInput {
  sueldoBruto: number
  fechaIngreso: string
  fechaCese: string
  motivoCese: MotivoCese
  asignacionFamiliar: boolean
  gratificacionesPendientes: boolean
  vacacionesNoGozadas: number
  horasExtrasPendientes: number
  ultimaGratificacion: number
  comisionesPromedio: number
}

interface BreakdownItem {
  label: string
  amount: number
  formula: string
  baseLegal: string
  details: string
}

interface LiquidacionResult {
  breakdown: {
    cts: BreakdownItem
    vacacionesTruncas: BreakdownItem
    vacacionesNoGozadas: BreakdownItem
    gratificacionTrunca: BreakdownItem
    indemnizacion: BreakdownItem | null
    horasExtras: BreakdownItem
    bonificacionEspecial: BreakdownItem
  }
  totalBruto: number
  totalNeto: number
  warnings: { type: 'urgente' | 'info' | 'riesgo'; message: string; daysRemaining?: number }[]
  legalBasis: { norm: string; article: string; description: string }[]
}

interface WorkerSummary {
  id: string
  firstName: string
  lastName: string
  dni: string
  position?: string
  department?: string
  regimenLaboral: string
  tipoContrato: string
  status: string
}

interface SearchResult {
  id: string
  firstName: string
  lastName: string
  dni: string
  position?: string
  department?: string
  status: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MOTIVO_OPTIONS: { value: MotivoCese; label: string }[] = [
  { value: 'fin_contrato', label: 'Vencimiento de Contrato' },
  { value: 'renuncia', label: 'Renuncia Voluntaria' },
  { value: 'mutuo_acuerdo', label: 'Mutuo Disenso' },
  { value: 'despido_arbitrario', label: 'Despido Arbitrario' },
  { value: 'despido_nulo', label: 'Despido Nulo' },
  { value: 'hostilidad', label: 'Actos de Hostilidad' },
]

const REGIMEN_LABEL: Record<string, string> = {
  GENERAL: 'Régimen General (D.Leg. 728)',
  MYPE_MICRO: 'Microempresa (Ley 32353)',
  MYPE_PEQUENA: 'Pequeña Empresa (Ley 32353)',
  AGRARIO: 'Régimen Agrario',
  CAS: 'Contrato Administrativo de Servicios',
  CONSTRUCCION_CIVIL: 'Construcción Civil',
  DOMESTICO: 'Trabajador del Hogar',
  MODALIDAD_FORMATIVA: 'Modalidad Formativa',
  TELETRABAJO: 'Teletrabajo',
}

function fmt(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function BreakdownRow({
  item,
  highlight = false,
}: {
  item: BreakdownItem
  highlight?: boolean
}) {
  const [open, setOpen] = useState(false)
  const isZero = item.amount === 0

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors',
        highlight ? 'border-blue-200 bg-blue-50' : 'border-white/10 bg-white/5',
        isZero && 'opacity-50',
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
          )}
          <span className="text-sm font-medium text-white">{item.label}</span>
          {isZero && (
            <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-[color:var(--text-tertiary)]">
              No aplica
            </span>
          )}
        </div>
        <span
          className={cn(
            'text-sm font-bold tabular-nums',
            isZero ? 'text-[color:var(--text-tertiary)]' : 'text-amber-500',
          )}
        >
          {fmt(item.amount)}
        </span>
      </button>

      {open && (
        <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-2">
          <div className="rounded bg-blue-950/50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">
              Fórmula aplicada
            </p>
            <p className="font-mono text-xs text-blue-200">{item.formula}</p>
          </div>
          <div className="rounded bg-white/5 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)] mb-1">
              Detalle
            </p>
            <p className="text-xs text-[color:var(--text-secondary)]">{item.details}</p>
          </div>
          <p className="text-[10px] text-[color:var(--text-tertiary)]">
            <span className="font-semibold">Base legal:</span> {item.baseLegal}
          </p>
        </div>
      )}
    </div>
  )
}

function WarningBanner({ warning }: { warning: LiquidacionResult['warnings'][0] }) {
  const styles = {
    urgente: {
      bg: 'bg-red-900/40 border-red-500/40',
      icon: <XCircle className="h-4 w-4 text-red-400 shrink-0" />,
      text: 'text-red-300',
    },
    riesgo: {
      bg: 'bg-amber-900/40 border-amber-500/40',
      icon: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />,
      text: 'text-amber-700',
    },
    info: {
      bg: 'bg-blue-900/40 border-blue-500/40',
      icon: <Info className="h-4 w-4 text-emerald-600 shrink-0" />,
      text: 'text-emerald-600',
    },
  }
  const s = styles[warning.type]
  return (
    <div className={cn('flex items-start gap-3 rounded-lg border px-4 py-3', s.bg)}>
      {s.icon}
      <p className={cn('text-sm', s.text)}>{warning.message}</p>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LiquidacionesPage() {
  return (
    <Suspense fallback={null}>
      <LiquidacionesInner />
    </Suspense>
  )
}

function LiquidacionesInner() {
  const searchParams = useSearchParams()
  const preselectedWorkerId = searchParams.get('worker')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const [selectedWorker, setSelectedWorker] = useState<WorkerSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [recalculating, setRecalculating] = useState(false)

  const [input, setInput] = useState<LiquidacionInput | null>(null)
  const [result, setResult] = useState<LiquidacionResult | null>(null)
  const [regimenNota, setRegimenNota] = useState<string | null>(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [savingLiq, setSavingLiq] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // ── Search workers ──────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    if (searchQuery.trim().length < 2) {
      void Promise.resolve().then(() => {
        if (!cancelled) setSearchResults([])
      })
      return () => {
        cancelled = true
      }
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/workers?search=${encodeURIComponent(searchQuery)}&limit=8&status=ACTIVE,TERMINATED`,
        )
        const data = await res.json()
        setSearchResults(data.data ?? [])
      } catch {
        /* ignore */
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [searchQuery])

  // ── Load liquidacion for worker ──────────────────────────────────────
  const loadWorkerLiquidacion = useCallback(async (workerId: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    setInput(null)
    setSearchResults([])
    setSearchQuery('')
    try {
      const res = await fetch(`/api/workers/${workerId}/liquidacion`)
      if (!res.ok) throw new Error('No se pudo cargar la liquidación')
      const data = await res.json()
      setSelectedWorker(data.worker)
      setInput(data.input)
      setResult(data.result)
      setRegimenNota(data.regimenNota)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Auto-load from URL param ?worker=<id> ───────────────────────────
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (!cancelled && preselectedWorkerId) {
        void loadWorkerLiquidacion(preselectedWorkerId)
      }
    })
    return () => {
      cancelled = true
    }
  }, [preselectedWorkerId, loadWorkerLiquidacion])

  // ── Recalculate with edited input ────────────────────────────────────
  const recalculate = useCallback(async () => {
    if (!selectedWorker || !input) return
    setRecalculating(true)
    setError(null)
    try {
      const res = await fetch(`/api/workers/${selectedWorker.id}/liquidacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      if (!res.ok) throw new Error('Error al recalcular')
      const data = await res.json()
      setResult(data.result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al recalcular')
    } finally {
      setRecalculating(false)
    }
  }, [selectedWorker, input])

  // ── Download PDF ─────────────────────────────────────────────────────
  const downloadPDF = useCallback(async () => {
    if (!selectedWorker) return
    setPdfLoading(true)
    try {
      const res = await fetch(`/api/workers/${selectedWorker.id}/liquidacion/pdf`)
      if (!res.ok) throw new Error('Error al generar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `liquidacion-${selectedWorker.dni}-${new Date().toISOString().slice(0, 10)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al descargar PDF')
    } finally {
      setPdfLoading(false)
    }
  }, [selectedWorker])

  // ── Save liquidacion + start cese ────────────────────────────────────
  const guardarLiquidacion = useCallback(async () => {
    if (!selectedWorker || !result) return
    setSavingLiq(true)
    setSavedSuccess(false)
    setError(null)
    try {
      // First check if cese process already exists
      const checkRes = await fetch(`/api/workers/${selectedWorker.id}/cese`)
      const checkData = await checkRes.json()

      if (checkData.ceseRecord) {
        // Already has cese process — just save liquidation amounts
        const patchRes = await fetch(`/api/workers/${selectedWorker.id}/cese`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'GUARDAR_LIQUIDACION',
            ctsMonto: result.breakdown.cts.amount,
            vacacionesMonto: result.breakdown.vacacionesTruncas.amount + result.breakdown.vacacionesNoGozadas.amount,
            gratificacionMonto: result.breakdown.gratificacionTrunca.amount + (result.breakdown.bonificacionEspecial?.amount ?? 0),
            indemnizacionMonto: result.breakdown.indemnizacion?.amount ?? 0,
            totalLiquidacion: result.totalBruto,
            detalleJson: result.breakdown,
          }),
        })
        if (!patchRes.ok) throw new Error('Error al guardar liquidación')
        setSavedSuccess(true)
      } else {
        // No cese process — redirect to cese page to create one
        router.push(`/dashboard/trabajadores/${selectedWorker.id}/cese`)
        return
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSavingLiq(false)
    }
  }, [selectedWorker, result, router])

  const updateInput = (patch: Partial<LiquidacionInput>) => {
    if (!input) return
    setInput(prev => prev ? { ...prev, ...patch } : prev)
  }

  const breakdown = result?.breakdown
  const breakdownItems = breakdown
    ? [
        breakdown.cts,
        breakdown.vacacionesTruncas,
        breakdown.vacacionesNoGozadas,
        breakdown.gratificacionTrunca,
        breakdown.indemnizacion,
        breakdown.horasExtras,
        breakdown.bonificacionEspecial,
      ].filter(Boolean) as BreakdownItem[]
    : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-amber-500" />
            Liquidación de Beneficios Sociales
          </h1>
          <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">
            Calcula automáticamente la liquidación completa de un trabajador al cese.
          </p>
        </div>
        {result && (
          <button
            onClick={downloadPDF}
            disabled={pdfLoading}
            className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold/90 disabled:opacity-60 transition-colors"
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Descargar PDF
          </button>
        )}
      </div>

      {/* Worker search */}
      <div className="relative">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar trabajador por nombre o DNI…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[color:var(--text-tertiary)]" />
          )}
        </div>

        {/* Dropdown results */}
        {searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-white/10 bg-sidebar shadow-xl overflow-hidden">
            {searchResults.map(w => (
              <button
                key={w.id}
                type="button"
                onClick={() => loadWorkerLiquidacion(w.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                  {(w.firstName?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">
                    {displayWorkerName(w.firstName, w.lastName)}
                  </p>
                  <p className="truncate text-xs text-[color:var(--text-tertiary)]">
                    DNI: {w.dni}
                    {w.position && ` · ${w.position}`}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[10px] font-semibold',
                    w.status === 'ACTIVE'
                      ? 'bg-green-900/40 text-green-400'
                      : 'bg-gray-700 text-[color:var(--text-tertiary)]',
                  )}
                >
                  {w.status === 'ACTIVE' ? 'Activo' : 'Cesado'}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-[color:var(--text-tertiary)]" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="ml-3 text-[color:var(--text-tertiary)]">Cargando datos del trabajador…</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !selectedWorker && !error && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <Calculator className="h-12 w-12 text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Selecciona un trabajador
          </h3>
          <p className="max-w-sm text-sm text-[color:var(--text-tertiary)]">
            Busca al trabajador cuya liquidación deseas calcular. Los datos se
            completarán automáticamente desde su legajo.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 text-center">
            {[
              { icon: <Banknote className="h-5 w-5 text-amber-500" />, label: 'CTS Trunca' },
              { icon: <Calendar className="h-5 w-5 text-emerald-600" />, label: 'Gratificación' },
              { icon: <FileText className="h-5 w-5 text-green-400" />, label: 'Vacaciones' },
            ].map(item => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5">
                  {item.icon}
                </div>
                <span className="text-xs text-[color:var(--text-tertiary)]">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main layout: form + result */}
      {selectedWorker && input && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Left: worker card + editable form */}
          <div className="space-y-4">
            {/* Worker card */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                  {(selectedWorker.firstName?.[0] ?? '?').toUpperCase()}
                  {(selectedWorker.lastName?.[0] ?? '?').toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white">
                    {displayWorkerName(selectedWorker.firstName, selectedWorker.lastName)}
                  </p>
                  <p className="text-xs text-[color:var(--text-tertiary)]">
                    DNI: {selectedWorker.dni}
                    {selectedWorker.position && ` · ${selectedWorker.position}`}
                  </p>
                </div>
              </div>

              <div className="space-y-1 text-xs text-[color:var(--text-tertiary)]">
                <div className="flex justify-between">
                  <span>Régimen</span>
                  <span className="text-[color:var(--text-secondary)] text-right max-w-[55%]">
                    {REGIMEN_LABEL[selectedWorker.regimenLaboral] ?? selectedWorker.regimenLaboral}
                  </span>
                </div>
                {selectedWorker.department && (
                  <div className="flex justify-between">
                    <span>Área</span>
                    <span className="text-[color:var(--text-secondary)]">{selectedWorker.department}</span>
                  </div>
                )}
              </div>

              {regimenNota && (
                <div className="mt-3 rounded-lg bg-amber-900/30 border border-amber-500/30 px-3 py-2">
                  <p className="text-[11px] text-amber-700">{regimenNota}</p>
                </div>
              )}
            </div>

            {/* Editable form */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-amber-500" />
                Datos de la Liquidación
              </h3>

              <div className="space-y-3">
                <FormField label="Sueldo Bruto (S/)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={input.sueldoBruto}
                    onChange={e => updateInput({ sueldoBruto: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Fecha de Ingreso">
                  <input
                    type="date"
                    value={input.fechaIngreso}
                    onChange={e => updateInput({ fechaIngreso: e.target.value })}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Fecha de Cese">
                  <input
                    type="date"
                    value={input.fechaCese}
                    onChange={e => updateInput({ fechaCese: e.target.value })}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Motivo de Cese">
                  <select
                    value={input.motivoCese}
                    onChange={e => updateInput({ motivoCese: e.target.value as MotivoCese })}
                    className={inputClass}
                  >
                    {MOTIVO_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Última Gratificación (S/)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={input.ultimaGratificacion}
                    onChange={e => updateInput({ ultimaGratificacion: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Vacaciones No Gozadas (días)">
                  <input
                    type="number"
                    min="0"
                    value={input.vacacionesNoGozadas}
                    onChange={e => updateInput({ vacacionesNoGozadas: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Horas Extras Pendientes">
                  <input
                    type="number"
                    min="0"
                    value={input.horasExtrasPendientes}
                    onChange={e => updateInput({ horasExtrasPendientes: parseInt(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </FormField>

                <FormField label="Comisiones Promedio (S/)">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={input.comisionesPromedio}
                    onChange={e => updateInput({ comisionesPromedio: parseFloat(e.target.value) || 0 })}
                    className={inputClass}
                  />
                </FormField>

                <div className="flex gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={input.asignacionFamiliar}
                      onChange={e => updateInput({ asignacionFamiliar: e.target.checked })}
                      className="rounded border-white/20 bg-white/10 text-amber-500"
                    />
                    Asignación Familiar
                  </label>
                  <label className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={input.gratificacionesPendientes}
                      onChange={e => updateInput({ gratificacionesPendientes: e.target.checked })}
                      className="rounded border-white/20 bg-white/10 text-amber-500"
                    />
                    Gratificaciones Adeudadas
                  </label>
                </div>

                <button
                  type="button"
                  onClick={recalculate}
                  disabled={recalculating}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600/80 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors disabled:opacity-60"
                >
                  {recalculating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Recalcular
                </button>
              </div>
            </div>
          </div>

          {/* Right: result breakdown */}
          <div className="space-y-4">
            {/* Total KPI */}
            {result && (
              <>
                <div className="rounded-xl border border-gold/30 bg-gold/5 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-500/70 mb-1">
                    Total Liquidación
                  </p>
                  <p className="text-4xl font-bold text-amber-500 tabular-nums">
                    {fmt(result.totalBruto)}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                    Monto bruto · sin retención de renta en liquidaciones laborales
                  </p>
                </div>

                {/* Quick summary grid */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'CTS', value: result.breakdown.cts.amount },
                    { label: 'Vacaciones', value: (result.breakdown.vacacionesTruncas.amount + result.breakdown.vacacionesNoGozadas.amount) },
                    { label: 'Gratificación', value: result.breakdown.gratificacionTrunca.amount },
                    { label: 'Indemnización', value: result.breakdown.indemnizacion?.amount ?? 0 },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-white/10 bg-white/5 p-3 text-center"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-[color:var(--text-tertiary)] mb-1">
                        {item.label}
                      </p>
                      <p className={cn(
                        'text-sm font-bold tabular-nums',
                        item.value > 0 ? 'text-white' : 'text-gray-600',
                      )}>
                        {fmt(item.value)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Breakdown detail */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="mb-3 text-sm font-semibold text-white flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    Detalle por Concepto
                    <span className="ml-auto text-[10px] text-[color:var(--text-tertiary)]">
                      Haz clic en cada concepto para ver la fórmula
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {breakdownItems.map(item => (
                      <BreakdownRow key={item.label} item={item} />
                    ))}
                  </div>

                  {/* Total footer */}
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
                    <span className="text-sm font-bold text-white">TOTAL LIQUIDACIÓN</span>
                    <span className="text-lg font-bold text-amber-500 tabular-nums">
                      {fmt(result.totalBruto)}
                    </span>
                  </div>
                </div>

                {/* Warnings */}
                {result.warnings.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      Alertas Legales
                    </h3>
                    {result.warnings.map((w, i) => (
                      <WarningBanner key={i} warning={w} />
                    ))}
                  </div>
                )}

                {/* Legal basis */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">
                    Base Legal Aplicada
                  </h3>
                  <div className="space-y-2">
                    {result.legalBasis.map(ref => (
                      <div key={ref.norm} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500 mt-0.5" />
                        <div>
                          <span className="text-xs font-semibold text-emerald-600">
                            {ref.norm} {ref.article}
                          </span>
                          <span className="text-xs text-[color:var(--text-tertiary)]"> — {ref.description}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="space-y-3">
                  {/* Save liquidacion */}
                  {selectedWorker?.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={guardarLiquidacion}
                        disabled={savingLiq}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                      >
                        {savingLiq ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        Guardar Liquidación en Historial
                      </button>

                      {savedSuccess && (
                        <div className="flex items-center gap-2 rounded-lg bg-green-900/30 border border-green-500/30 px-3 py-2">
                          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                          <p className="text-xs text-green-300">
                            Liquidación guardada exitosamente en el proceso de cese del trabajador.
                          </p>
                        </div>
                      )}

                      {/* Link to cese process */}
                      <Link
                        href={`/dashboard/trabajadores/${selectedWorker.id}/cese`}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-900/20 py-3 text-sm font-semibold text-red-400 hover:bg-red-900/40 transition-colors"
                      >
                        <Scale className="h-4 w-4" />
                        Iniciar Proceso de Cese / Despido
                      </Link>
                    </>
                  )}

                  {selectedWorker?.status === 'TERMINATED' && (
                    <div className="flex items-center gap-2 rounded-lg bg-gray-800 border border-white/10 px-3 py-2">
                      <XCircle className="h-4 w-4 text-[color:var(--text-tertiary)] shrink-0" />
                      <p className="text-xs text-[color:var(--text-tertiary)]">Este trabajador ya fue cesado.</p>
                    </div>
                  )}

                  {/* Download PDF */}
                  <button
                    onClick={downloadPDF}
                    disabled={pdfLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-gold/30 bg-amber-50 py-3 text-sm font-semibold text-amber-500 hover:bg-gold/20 transition-colors disabled:opacity-60"
                  >
                    {pdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    Descargar Liquidación en PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
} // end LiquidacionesInner

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold/20'

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="block text-[11px] font-medium uppercase tracking-wider text-[color:var(--text-tertiary)]">
        {label}
      </label>
      {children}
    </div>
  )
}
