'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
  UserMinus,
  ShieldAlert,
  Banknote,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * /dashboard/decisiones/cesar — Wizard "Cesar trabajador".
 *
 * 4 pasos:
 *  1. Seleccionar trabajador (lista de activos con search)
 *  2. Tipo y motivo del cese
 *  3. Estimación de liquidación + riesgo legal (reusa /api/workers/[id]/liquidacion)
 *  4. Confirmar → POST orquestador → crea ComplianceTask y deja flag preliminar
 *
 * NO ejecuta el cese completo — eso pasa en /workers/[id]/cese (etapas).
 * Este wizard es el punto de entrada guiado.
 */

const TOTAL_STEPS = 4

type TipoCese =
  | 'RENUNCIA_VOLUNTARIA' | 'DESPIDO_CAUSA_JUSTA' | 'DESPIDO_ARBITRARIO'
  | 'MUTUO_DISENSO' | 'TERMINO_CONTRATO' | 'NO_RENOVACION'
  | 'FALLECIMIENTO' | 'JUBILACION' | 'PERIODO_PRUEBA'

const TIPO_OPTIONS: Array<{ value: TipoCese; label: string; risk: 'low' | 'medium' | 'high'; hint: string }> = [
  { value: 'RENUNCIA_VOLUNTARIA', label: 'Renuncia voluntaria', risk: 'low', hint: 'El trabajador presenta carta de renuncia. Sin indemnización.' },
  { value: 'MUTUO_DISENSO', label: 'Mutuo disenso', risk: 'low', hint: 'Acuerdo entre las partes. Recomendable convenio firmado.' },
  { value: 'TERMINO_CONTRATO', label: 'Término de contrato (vencimiento)', risk: 'low', hint: 'Cese natural por fin de plazo fijo.' },
  { value: 'NO_RENOVACION', label: 'No renovación', risk: 'medium', hint: 'Comunicar 30 días antes para evitar reclamos.' },
  { value: 'PERIODO_PRUEBA', label: 'Cese durante período de prueba', risk: 'medium', hint: 'Sin indemnización si está dentro del período (3 meses).' },
  { value: 'JUBILACION', label: 'Jubilación', risk: 'low', hint: 'Edad legal: 65 años (general).' },
  { value: 'FALLECIMIENTO', label: 'Fallecimiento', risk: 'low', hint: 'Liquidación a herederos.' },
  { value: 'DESPIDO_CAUSA_JUSTA', label: 'Despido por causa justa', risk: 'high', hint: 'Requiere proceso completo: preaviso 6 días, descargos, carta de despido.' },
  { value: 'DESPIDO_ARBITRARIO', label: 'Despido arbitrario (sin causa)', risk: 'high', hint: 'Genera indemnización: 1.5 sueldos × año (tope 12). Riesgo de juicio.' },
]

interface WorkerItem {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
  fechaIngreso: string
  sueldoBruto: number | string
  status: string
}

interface LiquidacionEstimate {
  totalBruto: number
  breakdown?: {
    cts?: { amount: number; label: string }
    vacacionesTruncas?: { amount: number; label: string }
    vacacionesNoGozadas?: { amount: number; label: string }
    gratificacionTrunca?: { amount: number; label: string }
    indemnizacion?: { amount: number; label: string }
  }
  warnings?: Array<{ type?: string; message: string }>
}

function fmtPEN(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function CesarWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [workerId, setWorkerId] = useState<string | null>(null)
  const [tipoCese, setTipoCese] = useState<TipoCese>('RENUNCIA_VOLUNTARIA')
  const [fechaCese, setFechaCese] = useState(new Date().toISOString().slice(0, 10))
  const [motivoTexto, setMotivoTexto] = useState('')
  const [riesgoAsumido, setRiesgoAsumido] = useState(false)
  const [liquidacion, setLiquidacion] = useState<LiquidacionEstimate | null>(null)
  const [liqLoading, setLiqLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    workerName: string
    tipoCeseLabel: string
    ceseFlow: string
    liquidacion: string
    planAccion: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/workers?status=ACTIVE&limit=200')
      .then((r) => r.json())
      .then((body: { data?: WorkerItem[] }) => {
        setWorkers(body.data ?? [])
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Pre-cargar liquidación al entrar al paso 3
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (step !== 3 || !workerId || liquidacion) return
      setLiqLoading(true)
      fetch(`/api/workers/${workerId}/liquidacion`)
        .then((r) => r.json())
        .then((body: { result?: LiquidacionEstimate }) => {
          if (body.result) setLiquidacion(body.result)
        })
        .catch(() => {
          // Falla silenciosa — el wizard continúa sin estimación
        })
        .finally(() => setLiqLoading(false))
    })
    return () => {
      cancelled = true
    }
  }, [step, workerId, liquidacion])

  const filteredWorkers = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workers
    return workers.filter(
      (w) =>
        w.firstName.toLowerCase().includes(q) ||
        w.lastName.toLowerCase().includes(q) ||
        w.dni.includes(q),
    )
  }, [workers, search])

  const selectedWorker = useMemo(() => workers.find((w) => w.id === workerId) ?? null, [workers, workerId])
  const selectedTipo = useMemo(() => TIPO_OPTIONS.find((t) => t.value === tipoCese)!, [tipoCese])
  const isHighRisk = selectedTipo.risk === 'high'

  const goNext = () => {
    if (step === 1 && !workerId) return
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }
  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1)), [])

  const handleSubmit = async () => {
    if (!workerId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/decisiones/cesar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workerId,
          tipoCese,
          fechaCese,
          motivoTexto: motivoTexto.trim() || null,
          riesgoLegalAsumido: riesgoAsumido,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      setSuccess({
        workerName: body.data.workerName,
        tipoCeseLabel: body.data.tipoCeseLabel,
        ceseFlow: body.links.ceseFlow,
        liquidacion: body.links.liquidacion,
        planAccion: body.links.planAccion,
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return <SuccessScreen result={success} onGoToCese={() => router.push(success.ceseFlow)} />
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Header />
      <Stepper currentStep={step} />

      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 md:p-6">
        {step === 1 && (
          <Step1Worker
            workers={filteredWorkers}
            loading={loading}
            error={error}
            search={search}
            onSearch={setSearch}
            workerId={workerId}
            onSelect={setWorkerId}
          />
        )}
        {step === 2 && (
          <Step2Motivo
            tipoCese={tipoCese}
            setTipoCese={setTipoCese}
            fechaCese={fechaCese}
            setFechaCese={setFechaCese}
            motivoTexto={motivoTexto}
            setMotivoTexto={setMotivoTexto}
          />
        )}
        {step === 3 && (
          <Step3Liquidacion
            tipo={selectedTipo}
            liquidacion={liquidacion}
            loading={liqLoading}
            riesgoAsumido={riesgoAsumido}
            setRiesgoAsumido={setRiesgoAsumido}
          />
        )}
        {step === 4 && selectedWorker && (
          <Step4Confirm
            worker={selectedWorker}
            tipo={selectedTipo}
            fechaCese={fechaCese}
            motivoTexto={motivoTexto}
            liquidacion={liquidacion}
          />
        )}

        {submitError && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {submitError}
          </div>
        )}
      </div>

      <Footer
        step={step}
        canGoNext={
          (step !== 1 || !!workerId) &&
          (step !== 3 || !isHighRisk || riesgoAsumido)
        }
        submitting={submitting}
        onBack={goBack}
        onNext={goNext}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

/* ── UI ──────────────────────────────────────────────────────────────── */

function Header() {
  return (
    <div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-emerald-700 mb-2"
      >
        <ArrowLeft className="h-3 w-3" /> Volver al Panel
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-emerald-700" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">
          Decisiones Laborales · Wizard
        </span>
      </div>
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Cesar trabajador</h1>
      <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
        Inicia el proceso de cese con cálculo de liquidación, evaluación de riesgo y plan de pasos.
      </p>
    </div>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: 'Trabajador' },
    { n: 2, label: 'Motivo' },
    { n: 3, label: 'Liquidación' },
    { n: 4, label: 'Confirmar' },
  ]
  return (
    <ol className="flex items-center gap-1">
      {steps.map((s, i) => {
        const isActive = currentStep === s.n
        const isDone = currentStep > s.n
        return (
          <li key={s.n} className="flex items-center gap-1 shrink-0">
            <div
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                isActive && 'bg-emerald-600 text-white',
                isDone && 'bg-emerald-100 text-emerald-700',
                !isActive && !isDone && 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]',
              )}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/40 text-[10px]">
                {isDone ? <Check className="h-2.5 w-2.5" /> : s.n}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className="h-px w-4 bg-[color:var(--border-default)]" />}
          </li>
        )
      })}
    </ol>
  )
}

function Footer({
  step,
  canGoNext,
  submitting,
  onBack,
  onNext,
  onSubmit,
}: {
  step: number
  canGoNext: boolean
  submitting: boolean
  onBack: () => void
  onNext: () => void
  onSubmit: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <button
        type="button"
        onClick={onBack}
        disabled={step === 1 || submitting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-40"
      >
        <ArrowLeft className="h-4 w-4" />
        Anterior
      </button>
      {step < TOTAL_STEPS ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
        >
          Siguiente
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-700 px-5 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-50"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Iniciando...</>
          ) : (
            <><UserMinus className="h-4 w-4" /> Iniciar proceso de cese</>
          )}
        </button>
      )}
    </div>
  )
}

/* ── Steps ───────────────────────────────────────────────────────────── */

function Step1Worker({
  workers,
  loading,
  error,
  search,
  onSearch,
  workerId,
  onSelect,
}: {
  workers: WorkerItem[]
  loading: boolean
  error: string | null
  search: string
  onSearch: (s: string) => void
  workerId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Seleccionar trabajador</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Busca por nombre, apellido o DNI.
        </p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--text-tertiary)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar trabajador..."
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white pl-9 pr-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      ) : workers.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-6 text-center">
          <p className="text-sm text-[color:var(--text-tertiary)]">No hay trabajadores activos.</p>
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto space-y-1.5">
          {workers.slice(0, 100).map((w) => {
            const checked = workerId === w.id
            return (
              <label
                key={w.id}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors',
                  checked
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-[color:var(--border-default)] bg-white hover:border-emerald-200',
                )}
              >
                <input
                  type="radio"
                  name="worker"
                  checked={checked}
                  onChange={() => onSelect(w.id)}
                  className="h-4 w-4 text-emerald-600"
                />
                <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">
                      {w.firstName} {w.lastName}
                    </p>
                    <p className="text-[11px] text-[color:var(--text-tertiary)]">
                      DNI {w.dni}{w.position && ` · ${w.position}`}
                    </p>
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Step2Motivo({
  tipoCese,
  setTipoCese,
  fechaCese,
  setFechaCese,
  motivoTexto,
  setMotivoTexto,
}: {
  tipoCese: TipoCese
  setTipoCese: (t: TipoCese) => void
  fechaCese: string
  setFechaCese: (f: string) => void
  motivoTexto: string
  setMotivoTexto: (s: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Motivo y fecha</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          El tipo de cese determina el proceso legal y el riesgo de reclamos.
        </p>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
          Tipo de cese *
        </span>
        <select
          value={tipoCese}
          onChange={(e) => setTipoCese(e.target.value as TipoCese)}
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          {TIPO_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {(() => {
        const opt = TIPO_OPTIONS.find((t) => t.value === tipoCese)!
        const riskStyle = {
          low: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
          medium: 'border-amber-200 bg-amber-50 text-amber-900',
          high: 'border-red-200 bg-red-50 text-red-900',
        }[opt.risk]
        return (
          <div className={cn('rounded-lg border p-3 text-xs', riskStyle)}>
            <p className="font-semibold uppercase tracking-wide mb-0.5">
              Riesgo {opt.risk === 'low' ? 'bajo' : opt.risk === 'medium' ? 'medio' : 'alto'}
            </p>
            {opt.hint}
          </div>
        )
      })()}

      <label className="block">
        <span className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
          Fecha de cese *
        </span>
        <input
          type="date"
          value={fechaCese}
          onChange={(e) => setFechaCese(e.target.value)}
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </label>

      <label className="block">
        <span className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
          Motivo / observaciones (opcional)
        </span>
        <textarea
          value={motivoTexto}
          onChange={(e) => setMotivoTexto(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Detalles del motivo, contexto, acuerdos, etc."
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </label>
    </div>
  )
}

function Step3Liquidacion({
  tipo,
  liquidacion,
  loading,
  riesgoAsumido,
  setRiesgoAsumido,
}: {
  tipo: typeof TIPO_OPTIONS[number]
  liquidacion: LiquidacionEstimate | null
  loading: boolean
  riesgoAsumido: boolean
  setRiesgoAsumido: (v: boolean) => void
}) {
  const isHighRisk = tipo.risk === 'high'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Estimación de liquidación</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Cálculo preliminar — el monto definitivo se confirma en el flujo de cese.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      ) : !liquidacion ? (
        <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4 text-sm text-[color:var(--text-tertiary)]">
          No se pudo calcular la estimación automáticamente. Podrás verla en el flujo de cese
          completo después de confirmar.
        </div>
      ) : (
        <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)]">
              Total liquidación
            </span>
            <span className="text-xl font-bold text-emerald-700 tabular-nums">
              {fmtPEN(liquidacion.totalBruto)}
            </span>
          </div>
          {liquidacion.breakdown && (
            <dl className="space-y-1 text-sm pt-2 border-t border-[color:var(--border-subtle)]">
              {Object.values(liquidacion.breakdown)
                .filter(Boolean)
                .filter((b) => b!.amount > 0)
                .map((b) => (
                  <div key={b!.label} className="flex items-center justify-between text-[color:var(--text-secondary)]">
                    <dt>{b!.label}</dt>
                    <dd className="tabular-nums">{fmtPEN(b!.amount)}</dd>
                  </div>
                ))}
            </dl>
          )}
          {liquidacion.warnings && liquidacion.warnings.length > 0 && (
            <div className="pt-2 border-t border-[color:var(--border-subtle)] text-[11px] text-amber-800">
              <p className="font-semibold mb-1">Advertencias:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {liquidacion.warnings.slice(0, 3).map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isHighRisk && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3 mb-3">
            <ShieldAlert className="h-4 w-4 text-red-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-red-900">
                Cese de alto riesgo legal
              </p>
              <p className="mt-1 text-sm text-red-800 leading-relaxed">
                {tipo.label} requiere proceso completo: carta de preaviso (6 días), período de
                descargos, carta de despido, cálculo de indemnización (1.5 sueldos × año, tope 12).
                Riesgo de reposición o indemnización si el proceso se ejecuta mal.
              </p>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm text-red-900 cursor-pointer">
            <input
              type="checkbox"
              checked={riesgoAsumido}
              onChange={(e) => setRiesgoAsumido(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded text-red-700"
            />
            <span>
              Asumo que este es un cese de alto riesgo y me responsabilizo de seguir el proceso
              completo en /trabajadores/[id]/cese.
            </span>
          </label>
        </div>
      )}
    </div>
  )
}

function Step4Confirm({
  worker,
  tipo,
  fechaCese,
  motivoTexto,
  liquidacion,
}: {
  worker: WorkerItem
  tipo: typeof TIPO_OPTIONS[number]
  fechaCese: string
  motivoTexto: string
  liquidacion: LiquidacionEstimate | null
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Confirmar inicio del cese</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Al confirmar registramos los datos preliminares y abrimos una tarea para completar el
          proceso en el módulo de cese.
        </p>
      </div>
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 space-y-2 text-sm">
        <Row label="Trabajador" value={`${worker.firstName} ${worker.lastName}`} />
        <Row label="DNI" value={worker.dni} />
        <Row label="Tipo de cese" value={tipo.label} bold />
        <Row label="Fecha de cese" value={new Date(fechaCese).toLocaleDateString('es-PE')} />
        {motivoTexto && <Row label="Motivo" value={motivoTexto} />}
        {liquidacion && (
          <Row
            label="Liquidación estimada"
            value={fmtPEN(liquidacion.totalBruto)}
            bold
          />
        )}
      </div>
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-start gap-2">
        <Banknote className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Este wizard solo registra el inicio. El cálculo definitivo de liquidación, el pago y los
          documentos legales se manejan en el flujo de cese del módulo de trabajadores.
        </span>
      </div>
    </div>
  )
}

function SuccessScreen({
  result,
  onGoToCese,
}: {
  result: { workerName: string; tipoCeseLabel: string; ceseFlow: string; liquidacion: string; planAccion: string }
  onGoToCese: () => void
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-700 text-white mb-3">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-amber-900">Proceso de cese iniciado</h2>
        <p className="mt-1 text-sm text-amber-800">
          {result.tipoCeseLabel} — {result.workerName}
          <br />
          Continúa el proceso en el módulo de cese para emitir documentos y pagar la liquidación.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onGoToCese}
          className="rounded-xl border border-emerald-300 bg-white p-4 text-left hover:border-emerald-500"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Siguiente paso</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Continuar en flujo de cese</p>
          <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Cartas, descargos, liquidación.</p>
        </button>
        <Link
          href={result.liquidacion}
          className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left hover:border-emerald-300"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Perfil del trabajador</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Ver detalle</p>
        </Link>
        <Link
          href={result.planAccion}
          className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left hover:border-emerald-300"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Plan de Acción</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Ver tarea</p>
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between text-sm gap-3', bold && 'font-bold text-[color:var(--text-primary)]')}>
      <dt className="text-[color:var(--text-tertiary)] shrink-0">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}
