'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Calendar,
  Banknote,
  Package,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * /dashboard/decisiones/sunafil — Wizard "Prepararse para SUNAFIL".
 *
 * 3 pasos:
 *  1. Estado actual: último diagnóstico, score, tareas críticas
 *  2. Plan priorizado: top tareas SUNAFIL del plan de acción
 *  3. Confirmar → crea ComplianceTask agregadora + links a evidencia
 */

const TOTAL_STEPS = 3

interface SunafilSnapshot {
  lastDiagnostic: {
    id: string
    type: string
    scoreGlobal: number
    completedAt: string | null
    createdAt: string
  } | null
  openTasks: number
  criticalTasks: number
  topTasks: Array<{
    id: string
    title: string
    gravedad: string
    multaEvitable: number
    dueDate: string | null
    area: string
  }>
  multaEvitableTotal: number
}

function fmtPEN(n: number) {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtDate(iso: string | null) {
  if (!iso) return 'sin fecha'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SunafilWizardPage() {
  const [step, setStep] = useState(1)
  const [snapshot, setSnapshot] = useState<SunafilSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<{
    taskId: string
    diagnostico: string
    simulacro: string
    sunafilReady: string
    planAccion: string
  } | null>(null)

  useEffect(() => {
    fetch('/api/decisiones/sunafil')
      .then((r) => r.json())
      .then((body: { data?: SunafilSnapshot }) => {
        if (body.data) setSnapshot(body.data)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const handleConfirm = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/decisiones/sunafil', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? `Error ${res.status}`)
      setSuccess({
        taskId: body.data.taskId,
        diagnostico: body.links.diagnostico,
        simulacro: body.links.simulacro,
        sunafilReady: body.links.sunafilReady,
        planAccion: body.links.planAccion,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return <SuccessScreen result={success} />
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Header />
      <Stepper currentStep={step} />

      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-5 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
          </div>
        ) : !snapshot ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            No se pudo cargar el snapshot SUNAFIL.
          </div>
        ) : (
          <>
            {step === 1 && <Step1Estado snapshot={snapshot} />}
            {step === 2 && <Step2Plan snapshot={snapshot} />}
            {step === 3 && <Step3Confirmar snapshot={snapshot} />}
          </>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1 || submitting}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-white px-4 py-2 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Anterior
        </button>
        {step < TOTAL_STEPS ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(s + 1, TOTAL_STEPS))}
            disabled={loading || !snapshot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Siguiente
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !snapshot}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creando plan...</>
            ) : (
              <><Check className="h-4 w-4" /> Crear plan SUNAFIL</>
            )}
          </button>
        )}
      </div>
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
      <h1 className="text-2xl font-bold text-[color:var(--text-primary)]">Prepararse ante SUNAFIL</h1>
      <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
        Snapshot del estado actual + plan priorizado por multa potencial. Genera tarea de seguimiento
        en el Plan de Acción.
      </p>
    </div>
  )
}

function Stepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { n: 1, label: 'Estado' },
    { n: 2, label: 'Plan' },
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

function Step1Estado({ snapshot }: { snapshot: SunafilSnapshot }) {
  const scoreColor =
    snapshot.lastDiagnostic == null
      ? 'text-[color:var(--text-tertiary)]'
      : snapshot.lastDiagnostic.scoreGlobal >= 80
        ? 'text-emerald-700'
        : snapshot.lastDiagnostic.scoreGlobal >= 60
          ? 'text-amber-700'
          : 'text-red-700'

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Estado actual</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Snapshot de tu compliance hoy.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat
          label="Score actual"
          value={snapshot.lastDiagnostic ? `${snapshot.lastDiagnostic.scoreGlobal}/100` : '—'}
          accentClass={scoreColor}
        />
        <Stat label="Tareas abiertas" value={snapshot.openTasks} />
        <Stat label="Tareas críticas" value={snapshot.criticalTasks} accentClass="text-red-700" />
        <Stat label="Multa evitable" value={fmtPEN(snapshot.multaEvitableTotal)} accentClass="text-emerald-700" />
      </div>

      {snapshot.lastDiagnostic ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Último diagnóstico: {snapshot.lastDiagnostic.type}
              </p>
              <p className="mt-1 text-xs text-emerald-800">
                Completado {fmtDate(snapshot.lastDiagnostic.completedAt)}.
              </p>
              <Link
                href={`/dashboard/diagnostico`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
              >
                Ver resultados completos <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Sin diagnóstico previo</p>
              <p className="mt-1 text-xs text-amber-800">
                Antes de prepararte para SUNAFIL conviene correr un diagnóstico para ubicar las
                brechas reales.
              </p>
              <Link
                href="/dashboard/diagnostico"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:underline"
              >
                Iniciar diagnóstico <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Step2Plan({ snapshot }: { snapshot: SunafilSnapshot }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Plan priorizado</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Top {Math.min(10, snapshot.topTasks.length)} acciones por urgencia y multa evitable.
        </p>
      </div>

      {snapshot.topTasks.length === 0 ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-emerald-700" />
          <p className="mt-2 text-sm font-semibold text-emerald-900">Sin tareas pendientes</p>
          <p className="mt-1 text-xs text-emerald-800">
            No hay acciones críticas abiertas. Tu compliance está al día.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshot.topTasks.map((t, i) => (
            <div
              key={t.id}
              className="rounded-lg border border-[color:var(--border-default)] bg-white p-3 flex items-start gap-3"
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold shrink-0',
                  i < 3 ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700',
                )}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase',
                      t.gravedad === 'MUY_GRAVE'
                        ? 'bg-red-50 text-red-700'
                        : t.gravedad === 'GRAVE'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-yellow-50 text-yellow-700',
                    )}
                  >
                    {t.gravedad.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-[color:var(--text-tertiary)]">{t.area}</span>
                </div>
                <p className="text-sm font-semibold text-[color:var(--text-primary)] line-clamp-2">{t.title}</p>
                <div className="mt-1 flex items-center gap-3 text-[11px] text-[color:var(--text-tertiary)]">
                  {t.dueDate && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {fmtDate(t.dueDate)}
                    </span>
                  )}
                  {t.multaEvitable > 0 && (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <Banknote className="h-3 w-3" /> Evita {fmtPEN(t.multaEvitable)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Step3Confirmar({ snapshot }: { snapshot: SunafilSnapshot }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[color:var(--text-primary)]">Confirmar plan SUNAFIL</h2>
        <p className="text-sm text-[color:var(--text-tertiary)] mt-1">
          Al confirmar creamos una <strong>tarea agregadora</strong> en tu Plan de Acción que
          consolida todas las acciones priorizadas para llegar listo a una inspección.
        </p>
      </div>

      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--text-secondary)]">Tareas que cubre el plan</span>
          <span className="font-bold tabular-nums">{snapshot.openTasks}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--text-secondary)]">De las cuales son críticas</span>
          <span className="font-bold tabular-nums text-red-700">{snapshot.criticalTasks}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--text-secondary)]">Multa evitable estimada</span>
          <span className="font-bold tabular-nums text-emerald-700">{fmtPEN(snapshot.multaEvitableTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[color:var(--text-secondary)]">Plazo objetivo</span>
          <span className="font-bold tabular-nums">30 días</span>
        </div>
      </div>

      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
        <Package className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          Tras crear el plan, recomendamos correr el simulacro SUNAFIL para validar que el equipo
          sabe responder en una inspección real, y revisar los 28 documentos SUNAFIL-Ready que el
          sistema rastrea.
        </span>
      </div>

      <EvidencePackButton />
    </div>
  )
}

/**
 * Botón opcional para descargar el paquete de evidencia ZIP antes de
 * confirmar el plan. Útil si el usuario solo quiere el material para
 * mostrar en una inspección sin generar la tarea agregadora.
 */
function EvidencePackButton() {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const download = async () => {
    setDownloading(true)
    setError(null)
    try {
      const res = await fetch('/api/decisiones/sunafil/evidence-pack')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `Error ${res.status}`)
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') ?? ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match?.[1] ?? `evidencia-sunafil-${Date.now()}.zip`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
      <div className="flex items-start gap-3">
        <Download className="h-4 w-4 text-emerald-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[color:var(--text-primary)]">
            Paquete de evidencia (ZIP)
          </p>
          <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)] leading-relaxed">
            Descarga ahora un ZIP con manifest, lista de trabajadores, capacitaciones, registros de
            asistencia y certificados. Material listo para mostrar en una inspección SUNAFIL.
          </p>
          <button
            type="button"
            onClick={download}
            disabled={downloading}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {downloading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generando ZIP...</>
            ) : (
              <><Download className="h-3.5 w-3.5" /> Descargar evidencia</>
            )}
          </button>
          {error && (
            <p className="mt-2 text-xs text-red-700">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function SuccessScreen({
  result,
}: {
  result: { taskId: string; diagnostico: string; simulacro: string; sunafilReady: string; planAccion: string }
}) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-8 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white mb-3">
          <Check className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-emerald-900">Plan SUNAFIL creado</h2>
        <p className="mt-1 text-sm text-emerald-800">
          Tarea agregadora con plazo 30 días añadida a tu Plan de Acción.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href={result.simulacro}
          className="rounded-xl border border-emerald-300 bg-white p-4 text-left hover:border-emerald-500"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Validar</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">Simulacro SUNAFIL</p>
          <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Inspección virtual + acta R.M. 199-2016-TR.</p>
        </Link>
        <Link
          href={result.sunafilReady}
          className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-left hover:border-emerald-300"
        >
          <p className="text-xs font-semibold text-emerald-700 mb-1">Evidencia</p>
          <p className="text-sm font-bold text-[color:var(--text-primary)]">28 docs SUNAFIL-Ready</p>
          <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Lista de documentos requeridos.</p>
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

function Stat({
  label,
  value,
  accentClass,
}: {
  label: string
  value: number | string
  accentClass?: string
}) {
  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-3">
      <p className="text-[10px] uppercase tracking-wide text-[color:var(--text-tertiary)]">{label}</p>
      <p className={cn('mt-1 text-xl font-bold tabular-nums', accentClass ?? 'text-[color:var(--text-primary)]')}>
        {value}
      </p>
    </div>
  )
}
