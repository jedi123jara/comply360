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
  FileText,
  CalendarClock,
  ShieldAlert,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * /dashboard/decisiones/renovar — Wizard "Renovar contrato".
 *
 * 4 pasos:
 *  1. Seleccionar contrato a vencer (lista de contratos en próximos 60 días)
 *  2. Análisis de desnaturalización (heurística simple basada en duración)
 *  3. Decisión: renovar mismo régimen / convertir a indeterminado / no renovar
 *  4. Confirmar → POST orquestador → crea ComplianceTask + actualiza contrato
 *
 * NO genera el contrato nuevo — el usuario va al generador de contratos
 * o usa plantillas propias después.
 */

const TOTAL_STEPS = 4
const RENEWAL_WINDOW_DAYS = 60

type Action = 'renew_same' | 'convert_to_indefinite' | 'do_not_renew'

interface ContractItem {
  id: string
  title: string
  type: string
  status: string
  expiresAt: string | null
  createdAt: string
  worker: { id: string; firstName: string; lastName: string; dni: string; position: string | null } | null
}

const ACTION_OPTIONS: Array<{
  value: Action
  title: string
  description: string
  recommended?: boolean
  warning?: boolean
}> = [
  {
    value: 'convert_to_indefinite',
    title: 'Convertir a plazo indeterminado',
    description:
      'Más seguro legalmente. Reduce riesgo de desnaturalización si el trabajador lleva >1 año en plazo fijo.',
    recommended: true,
  },
  {
    value: 'renew_same',
    title: 'Renovar con misma modalidad',
    description:
      'Mantiene el régimen actual. Genera adenda de renovación con nueva fecha de vencimiento.',
  },
  {
    value: 'do_not_renew',
    title: 'No renovar (cesar al vencimiento)',
    description:
      'Comunicar al trabajador con al menos 30 días de anticipación. Genera tarea de cese ordenado.',
    warning: true,
  },
]

function fmtDate(iso: string | null) {
  if (!iso) return 'Sin fecha'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(iso: string | null) {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

/**
 * Heurística simple de desnaturalización:
 * - Plazo fijo continuo > 5 años → riesgo alto
 * - Plazo fijo continuo > 2 años → riesgo medio
 */
function analyzeDesnaturalizacion(contract: ContractItem | null): {
  level: 'low' | 'medium' | 'high'
  message: string
} {
  if (!contract || !contract.createdAt) return { level: 'low', message: 'Sin datos suficientes para análisis.' }
  const monthsActive = Math.floor(
    (Date.now() - new Date(contract.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30),
  )
  const isLaboralPlazoFijo = contract.type === 'LABORAL_PLAZO_FIJO'
  if (!isLaboralPlazoFijo) {
    return {
      level: 'low',
      message: 'Contrato no es de plazo fijo — no aplica análisis de desnaturalización.',
    }
  }
  if (monthsActive >= 60) {
    return {
      level: 'high',
      message:
        'Riesgo ALTO de desnaturalización. El trabajador lleva ≥5 años en plazo fijo continuo. Conviene convertir a indeterminado.',
    }
  }
  if (monthsActive >= 24) {
    return {
      level: 'medium',
      message:
        'Riesgo MEDIO. El trabajador lleva 2-5 años. Evaluar si la causal de plazo fijo sigue vigente.',
    }
  }
  return { level: 'low', message: 'Riesgo bajo. Plazo fijo dentro de un horizonte razonable.' }
}

export default function RenovarWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contractId, setContractId] = useState<string | null>(null)
  const [action, setAction] = useState<Action>('convert_to_indefinite')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{
    contractId: string
    contractTitle: string
    actionLabel: string
    contractDetail: string
    contractGenerator: string
    planAccion: string
  } | null>(null)

  useEffect(() => {
    fetch(`/api/contracts?expiringSoonDays=${RENEWAL_WINDOW_DAYS}&limit=50`)
      .then((r) => r.json())
      .then((body: { data?: ContractItem[] }) => {
        setContracts(body.data ?? [])
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const selectedContract = useMemo(
    () => contracts.find((c) => c.id === contractId) ?? null,
    [contracts, contractId],
  )

  const analysis = useMemo(() => analyzeDesnaturalizacion(selectedContract), [selectedContract])

  // Auto-recomendar acción según análisis
  useEffect(() => {
    if (analysis.level === 'high') setAction('convert_to_indefinite')
  }, [analysis.level])

  const goNext = useCallback(() => {
    if (step === 1 && !contractId) return
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }, [step, contractId])
  const goBack = useCallback(() => setStep((s) => Math.max(1, s - 1)), [])

  const handleSubmit = async () => {
    if (!contractId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/decisiones/renovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId, action, notes: notes.trim() || null }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      setSuccess({
        contractId: body.data.contractId,
        contractTitle: body.data.contractTitle,
        actionLabel: body.data.actionLabel,
        contractDetail: body.links.contractDetail,
        contractGenerator: body.links.contractGenerator,
        planAccion: body.links.planAccion,
      })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <SuccessScreen
        result={success}
        onGoToContract={() => router.push(success.contractDetail)}
      />
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Header />
      <Stepper currentStep={step} />

      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 md:p-6">
        {step === 1 && (
          <Step1Select
            contracts={contracts}
            loading={loading}
            error={error}
            contractId={contractId}
            onSelect={setContractId}
          />
        )}
        {step === 2 && selectedContract && (
          <Step2Analysis contract={selectedContract} analysis={analysis} />
        )}
        {step === 3 && (
          <Step3Decision action={action} setAction={setAction} notes={notes} setNotes={setNotes} />
        )}
        {step === 4 && selectedContract && (
          <Step4Confirm contract={selectedContract} action={action} notes={notes} />
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
        canGoNext={step !== 1 || !!contractId}
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
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Renovar contrato</h1>
      <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
        Análisis de desnaturalización + decisión guiada para contratos próximos a vencer.
      </p>
    </div>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: 'Contrato' },
    { n: 2, label: 'Análisis' },
    { n: 3, label: 'Decisión' },
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
        className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
        >
          {submitting ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
          ) : (
            <><Check className="h-4 w-4" /> Confirmar decisión</>
          )}
        </button>
      )}
    </div>
  )
}

/* ── Steps ───────────────────────────────────────────────────────────── */

function Step1Select({
  contracts,
  loading,
  error,
  contractId,
  onSelect,
}: {
  contracts: ContractItem[]
  loading: boolean
  error: string | null
  contractId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Seleccionar contrato</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Contratos que vencen en los próximos {RENEWAL_WINDOW_DAYS} días.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          No se pudieron cargar los contratos: {error}
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-[color:var(--text-tertiary)]" />
          <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">
            No hay contratos por vencer en los próximos {RENEWAL_WINDOW_DAYS} días.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((c) => {
            const days = daysUntil(c.expiresAt)
            const urgent = days != null && days <= 15
            const checked = contractId === c.id
            return (
              <label
                key={c.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                  checked
                    ? 'border-emerald-500 bg-emerald-50/40'
                    : 'border-[color:var(--border-default)] bg-white hover:border-emerald-200',
                )}
              >
                <input
                  type="radio"
                  name="contract"
                  checked={checked}
                  onChange={() => onSelect(c.id)}
                  className="mt-1 h-4 w-4 text-emerald-600"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase text-emerald-700">{c.type.replace(/_/g, ' ')}</span>
                    {urgent && (
                      <span className="rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700 border border-red-200">
                        Urgente · {days} días
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm font-semibold text-[color:var(--text-primary)] truncate">
                    {c.title}
                  </p>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-[color:var(--text-tertiary)]">
                    {c.worker && (
                      <span>
                        <strong>{c.worker.firstName} {c.worker.lastName}</strong>
                        {c.worker.position && ` · ${c.worker.position}`}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      Vence {fmtDate(c.expiresAt)}
                    </span>
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

function Step2Analysis({
  contract,
  analysis,
}: {
  contract: ContractItem
  analysis: { level: 'low' | 'medium' | 'high'; message: string }
}) {
  const levelStyle = {
    low: 'border-emerald-200 bg-emerald-50/40 text-emerald-900',
    medium: 'border-amber-200 bg-amber-50 text-amber-900',
    high: 'border-red-200 bg-red-50 text-red-900',
  }[analysis.level]

  const monthsActive = Math.floor(
    (Date.now() - new Date(contract.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30),
  )

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Análisis del contrato</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Detección automática de riesgo de desnaturalización.
        </p>
      </div>

      <div className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4 space-y-2 text-sm">
        <Row label="Contrato" value={contract.title} />
        <Row label="Tipo" value={contract.type.replace(/_/g, ' ')} />
        <Row label="Vence" value={fmtDate(contract.expiresAt)} />
        <Row label="Antigüedad" value={`${monthsActive} meses`} />
        {contract.worker && (
          <Row label="Trabajador" value={`${contract.worker.firstName} ${contract.worker.lastName}`} />
        )}
      </div>

      <div className={cn('rounded-xl border p-4', levelStyle)}>
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide">
              Riesgo {analysis.level === 'low' ? 'BAJO' : analysis.level === 'medium' ? 'MEDIO' : 'ALTO'}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{analysis.message}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-[color:var(--neutral-50)] p-3 text-xs text-[color:var(--text-tertiary)] leading-relaxed">
        <strong>Base legal:</strong> D.Leg. 728 Art. 77 — los contratos de plazo fijo se
        desnaturalizan en contrato indeterminado si: (a) el trabajador continúa laborando vencido el
        plazo, (b) se simulan condiciones de necesidad transitoria, o (c) las renovaciones encubren
        plazo indeterminado.
      </div>
    </div>
  )
}

function Step3Decision({
  action,
  setAction,
  notes,
  setNotes,
}: {
  action: Action
  setAction: (a: Action) => void
  notes: string
  setNotes: (n: string) => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Decisión</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Elige cómo proceder con la renovación.
        </p>
      </div>
      <div className="space-y-2">
        {ACTION_OPTIONS.map((opt) => {
          const checked = action === opt.value
          return (
            <label
              key={opt.value}
              className={cn(
                'flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors',
                checked
                  ? opt.warning
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-emerald-500 bg-emerald-50/40'
                  : 'border-[color:var(--border-default)] bg-white hover:border-emerald-200',
              )}
            >
              <input
                type="radio"
                name="action"
                checked={checked}
                onChange={() => setAction(opt.value)}
                className="mt-1 h-4 w-4 text-emerald-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[color:var(--text-primary)]">{opt.title}</p>
                  {opt.recommended && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-700">
                      Recomendado
                    </span>
                  )}
                  {opt.warning && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-700">
                      Sensible
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">{opt.description}</p>
              </div>
            </label>
          )
        })}
      </div>

      <label className="block">
        <span className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
          Notas (opcional)
        </span>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Razón de la decisión, observaciones para el responsable, etc."
          className="w-full rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </label>
    </div>
  )
}

function Step4Confirm({
  contract,
  action,
  notes,
}: {
  contract: ContractItem
  action: Action
  notes: string
}) {
  const opt = ACTION_OPTIONS.find((o) => o.value === action)!
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Confirmar</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Al confirmar, registramos la decisión en el contrato y creamos una tarea de seguimiento en
          tu Plan de Acción.
        </p>
      </div>
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 space-y-2 text-sm">
        <Row label="Contrato" value={contract.title} />
        <Row label="Trabajador" value={contract.worker ? `${contract.worker.firstName} ${contract.worker.lastName}` : '—'} />
        <Row label="Vence" value={fmtDate(contract.expiresAt)} />
        <Row label="Decisión" value={opt.title} bold />
        {notes && <Row label="Notas" value={notes} />}
      </div>
    </div>
  )
}

function SuccessScreen({
  result,
  onGoToContract,
}: {
  result: {
    contractId: string
    contractTitle: string
    actionLabel: string
    contractDetail: string
    contractGenerator: string
    planAccion: string
  }
  onGoToContract: () => void
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white mb-3">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-emerald-900">Decisión registrada</h2>
        <p className="mt-1 text-sm text-emerald-800">
          {result.actionLabel} — {result.contractTitle}.
          <br />
          Tarea de seguimiento creada en tu Plan de Acción.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={onGoToContract}
          className="rounded-xl border border-emerald-300 bg-white p-4 text-left hover:border-emerald-500"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Siguiente paso</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Ver detalle del contrato</p>
        </button>
        <Link
          href={result.contractGenerator}
          className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left hover:border-emerald-300"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Generar nuevo</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Crear contrato</p>
          <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Plantillas propias o generadores</p>
        </Link>
        <Link
          href={result.planAccion}
          className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left hover:border-emerald-300"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Plan de Acción</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Ver tareas pendientes</p>
        </Link>
      </div>
    </div>
  )
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn('flex items-center justify-between text-sm gap-3', bold && 'font-bold text-[color:var(--text-primary)]')}>
      <dt className="text-[color:var(--text-tertiary)] shrink-0">{label}</dt>
      <dd className="tabular-nums text-right">{value}</dd>
    </div>
  )
}
