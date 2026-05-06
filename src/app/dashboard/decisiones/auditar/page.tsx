'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
  ClipboardCheck,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * /dashboard/decisiones/auditar — Wizard "Auditar nómina".
 *
 * 3 pasos:
 *  1. Período + dry-run del análisis
 *  2. Resultados (resumen + lista de hallazgos por severidad)
 *  3. Confirmar → genera ComplianceTask por hallazgo crítico/high
 */

const TOTAL_STEPS = 3

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface Finding {
  type: string
  severity: Severity
  payslipId: string
  workerId: string
  workerName: string
  message: string
}

interface AuditResponse {
  data: {
    periodo: string
    boletasAnalizadas: number
    findings: Finding[]
    summary: { critical: number; high: number; medium: number; low: number; total: number }
    tasksCreated: number
  }
  links: { planAccion: string; boletas: string }
}

const SEVERITY_ORDER: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const SEVERITY_CONFIG: Record<Severity, { label: string; bg: string; text: string; border: string }> = {
  CRITICAL: { label: 'Crítica', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  HIGH: { label: 'Alta', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MEDIUM: { label: 'Media', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  LOW: { label: 'Baja', bg: 'bg-blue-50', text: 'text-emerald-700', border: 'border-blue-200' },
}

function defaultPeriodo(): string {
  const d = new Date()
  d.setMonth(d.getMonth() - 1) // Por defecto, mes anterior
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function AuditarWizardPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [periodo, setPeriodo] = useState(defaultPeriodo())
  const [analyzing, setAnalyzing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<AuditResponse | null>(null)
  const [success, setSuccess] = useState<{
    tasksCreated: number
    periodo: string
    planAccion: string
  } | null>(null)

  const runAnalysis = useCallback(async () => {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch('/api/decisiones/auditar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo, createTasks: false }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      setAnalysis(body)
      setStep(2)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setAnalyzing(false)
    }
  }, [periodo])

  const handleConfirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/decisiones/auditar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodo, createTasks: true }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      setSuccess({
        tasksCreated: body.data.tasksCreated,
        periodo,
        planAccion: body.links.planAccion,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white mb-3">
            <Check className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-emerald-900">Auditoría completa</h2>
          <p className="mt-1 text-sm text-emerald-800">
            Se crearon <strong>{success.tasksCreated} tarea{success.tasksCreated !== 1 ? 's' : ''}</strong> en tu Plan
            de Acción para resolver los hallazgos del período {success.periodo}.
          </p>
        </div>
        <div className="text-center">
          <Link
            href={success.planAccion}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Ir al Plan de Acción <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Header />
      <Stepper currentStep={step} />

      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 md:p-6">
        {step === 1 && (
          <Step1Periodo
            periodo={periodo}
            setPeriodo={setPeriodo}
            analyzing={analyzing}
            onRun={runAnalysis}
          />
        )}
        {step === 2 && analysis && (
          <Step2Resultados analysis={analysis} />
        )}
        {step === 3 && analysis && (
          <Step3Confirmar analysis={analysis} />
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {step > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!analysis || analysis.data.findings.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
            >
              Crear tareas → Plan de Acción
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creando tareas...</>
              ) : (
                <><Check className="h-4 w-4" /> Confirmar y crear tareas</>
              )}
            </button>
          )}
        </div>
      )}
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
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Auditar nómina</h1>
      <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
        Análisis automático de boletas: aportes, descuentos, totales y RMV. Genera tareas por
        hallazgo en tu Plan de Acción.
      </p>
    </div>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: 'Período' },
    { n: 2, label: 'Resultados' },
    { n: 3, label: 'Confirmar' },
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

/* ── Steps ───────────────────────────────────────────────────────────── */

function Step1Periodo({
  periodo,
  setPeriodo,
  analyzing,
  onRun,
}: {
  periodo: string
  setPeriodo: (p: string) => void
  analyzing: boolean
  onRun: () => void
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Período a auditar</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Selecciona el mes a analizar. Por defecto el mes anterior.
        </p>
      </div>

      <label className="block">
        <span className="block text-xs font-semibold text-[color:var(--text-secondary)] mb-1">
          Período (YYYY-MM)
        </span>
        <input
          type="month"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </label>

      <div className="rounded-lg bg-[color:var(--neutral-50)] p-3 text-xs text-[color:var(--text-tertiary)] leading-relaxed">
        <p className="font-semibold text-[color:var(--text-secondary)] mb-1">Reglas de auditoría:</p>
        <ul className="list-disc pl-4 space-y-0.5">
          <li>Sueldo bruto bajo el RMV (S/1,130)</li>
          <li>Aporte AFP/ONP fuera de rango (10-13% AFP, 13% ONP)</li>
          <li>EsSalud distinto de 9% del bruto</li>
          <li>Total ingresos no coincide con suma de componentes</li>
          <li>Neto pagar no coincide con ingresos - descuentos</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={onRun}
        disabled={analyzing}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
      >
        {analyzing ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Analizando boletas...</>
        ) : (
          <><ClipboardCheck className="h-4 w-4" /> Ejecutar análisis</>
        )}
      </button>
    </div>
  )
}

function Step2Resultados({ analysis }: { analysis: AuditResponse }) {
  const { boletasAnalizadas, findings, summary } = analysis.data

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Resultados del análisis</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          {boletasAnalizadas} boleta{boletasAnalizadas !== 1 ? 's' : ''} analizada{boletasAnalizadas !== 1 ? 's' : ''} en el período {analysis.data.periodo}.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Total" value={summary.total} accent="default" />
        <Stat label="Críticas" value={summary.critical} accent="red" />
        <Stat label="Altas" value={summary.high} accent="amber" />
        <Stat label="Otras" value={summary.medium + summary.low} accent="blue" />
      </div>

      {findings.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 text-center">
          <TrendingUp className="mx-auto h-8 w-8 text-emerald-700" />
          <p className="mt-2 text-sm font-semibold text-emerald-900">Nómina sin observaciones</p>
          <p className="mt-1 text-xs text-emerald-800">Las {boletasAnalizadas} boletas pasan todas las reglas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {SEVERITY_ORDER.map((sev) => {
            const items = findings.filter((f) => f.severity === sev)
            if (items.length === 0) return null
            const cfg = SEVERITY_CONFIG[sev]
            return (
              <div key={sev}>
                <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--text-tertiary)] mb-1.5">
                  {cfg.label} ({items.length})
                </p>
                <div className="space-y-1.5">
                  {items.slice(0, 50).map((f, i) => (
                    <div
                      key={`${f.payslipId}-${f.type}-${i}`}
                      className={cn('rounded-lg border p-2.5 text-sm', cfg.bg, cfg.border)}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={cn('text-[9px] font-bold uppercase tracking-wider', cfg.text)}>
                          {f.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-[10px] text-[color:var(--text-tertiary)]">· {f.workerName}</span>
                      </div>
                      <p className="text-[12px] text-[color:var(--text-secondary)]">{f.message}</p>
                    </div>
                  ))}
                  {items.length > 50 && (
                    <p className="text-[10px] text-[color:var(--text-tertiary)]">
                      Y {items.length - 50} más...
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Step3Confirmar({ analysis }: { analysis: AuditResponse }) {
  const criticalAndHigh = analysis.data.summary.critical + analysis.data.summary.high
  const mediumAndLow = analysis.data.summary.medium + analysis.data.summary.low
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Confirmar creación de tareas</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Revisa lo que se creará en tu Plan de Acción.
        </p>
      </div>
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--text-secondary)]">Tareas individuales (críticas + altas)</span>
          <span className="font-bold tabular-nums">{criticalAndHigh}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--text-secondary)]">Tarea consolidada de observaciones menores</span>
          <span className="font-bold tabular-nums">{mediumAndLow > 0 ? 1 : 0}</span>
        </div>
        <hr className="border-[color:var(--border-subtle)]" />
        <div className="flex items-center justify-between">
          <span className="font-bold text-[color:var(--text-primary)]">Total de tareas a crear</span>
          <span className="font-bold tabular-nums text-emerald-700">{criticalAndHigh + (mediumAndLow > 0 ? 1 : 0)}</span>
        </div>
      </div>
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900">
        Cada tarea aparecerá en /dashboard/plan-accion con su severidad, descripción del hallazgo,
        plazo sugerido (7 días para críticas, 15 para menores) y multa evitable estimada.
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'default' | 'red' | 'amber' | 'blue'
}) {
  const accentClass = {
    default: 'text-[color:var(--text-primary)]',
    red: 'text-red-700',
    amber: 'text-amber-700',
    blue: 'text-emerald-700',
  }[accent]
  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-3">
      <p className="text-[10px] uppercase tracking-wide text-[color:var(--text-tertiary)]">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums', accentClass)}>{value}</p>
    </div>
  )
}
