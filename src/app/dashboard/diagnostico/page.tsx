'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  Clock,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/comply360/editorial-title'
import type {
  AnswerValue,
  AreaKey,
  ComplianceQuestion,
} from '@/lib/compliance/questions/types'
import { AREAS } from '@/lib/compliance/questions/types'
import { AUDIT_TOTAL } from '@/data/legal/audit-checklist'

/**
 * /dashboard/diagnostico — Diagnóstico SUNAFIL Typeform-style.
 *
 * Conectado a producción:
 *  - Preguntas via `GET /api/diagnostics?action=questions&type=FULL|EXPRESS`
 *    (120 preguntas con metadata completa: gravedad, multaUIT, baseLegal, peso).
 *  - Submit via `POST /api/diagnostics` que corre `scoreDiagnostic()` en el server,
 *    persiste a `ComplianceDiagnostic` y `ComplianceScore`, y genera gap analysis +
 *    action plan priorizado.
 *  - Navega a `/dashboard/diagnostico/[id]/resultado` para ver el detalle.
 *
 * El checklist de 133 preguntas (`src/data/legal/audit-checklist.ts`) queda disponible
 * como catálogo interno (referencia cruzada con el motor de 164 infracciones).
 */

type Mode = 'EXPRESS' | 'FULL'

interface QuestionsResponse {
  type: Mode
  totalQuestions: number
  questions: ComplianceQuestion[]
  context: { totalWorkers: number; sizeRange?: string; regimenPrincipal?: string }
}

type AnswerMap = Record<string, AnswerValue>

const AREA_LABEL = Object.fromEntries(AREAS.map((a) => [a.key, a.label])) as Record<AreaKey, string>

export default function DiagnosticoPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<Mode>('EXPRESS')
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [questions, setQuestions] = useState<ComplianceQuestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const total = questions?.length ?? 0

  // Prefetch the right question set when mode changes (only after leaving cover).
  useEffect(() => {
    if (step < 1) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const r = await fetch(`/api/diagnostics?action=questions&type=${mode}`, {
          cache: 'no-store',
        })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const data = (await r.json()) as QuestionsResponse
        if (!cancelled) setQuestions(data.questions)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error desconocido')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [mode, step])

  async function submit(finalAnswers: AnswerMap) {
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        type: mode,
        answers: Object.entries(finalAnswers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      }
      const r = await fetch('/api/diagnostics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = (await r.json()) as { diagnosticId: string }
      router.push(`/dashboard/diagnostico/${data.diagnosticId}/resultado`)
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'No se pudo guardar el diagnóstico. Revisa tu conexión.'
      )
      setSubmitting(false)
    }
  }

  function answer(q: ComplianceQuestion, value: AnswerValue, isLast: boolean) {
    const next = { ...answers, [q.id]: value }
    setAnswers(next)
    if (isLast) {
      submit(next)
    } else {
      setStep((s) => s + 1)
    }
  }

  return (
    <main className="min-h-[calc(100vh-var(--topbar-height))] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-10"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 50% 0%, rgba(16, 185, 129, 0.06), transparent 70%)',
        }}
      />

      <div className="mx-auto w-full max-w-5xl space-y-12">
        <PageHeader
          eyebrow="Diagnóstico"
          title="Audita tu empresa contra <em>120 reglas SUNAFIL</em>."
          subtitle="Responde preguntas guiadas sobre 10 áreas de fiscalización y obtén un score por área con plan de acción priorizado."
        />
        {step === 0 ? (
          <IntroCover
            mode={mode}
            setMode={(m) => {
              setMode(m)
              setAnswers({})
              setQuestions(null)
            }}
            onStart={() => setStep(1)}
          />
        ) : loading || !questions ? (
          <LoadingPanel />
        ) : error ? (
          <ErrorPanel error={error} onRetry={() => setStep(step)} />
        ) : step > 0 && step <= total ? (
          <QuestionStep
            total={total}
            step={step}
            question={questions[step - 1]}
            submitting={submitting && step === total}
            onAnswer={(a) => answer(questions[step - 1], a, step === total)}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
          />
        ) : null}
      </div>
    </main>
  )
}

/* ── Intro ─────────────────────────────────────────────────────────── */

function IntroCover({
  mode,
  setMode,
  onStart,
}: {
  mode: Mode
  setMode: (m: Mode) => void
  onStart: () => void
}) {
  const expressCount = 35 // aprox: preguntas con express:true en el dataset
  const fullCount = 120
  return (
    <section className="space-y-8 motion-fade-in-up">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </span>
          <Badge variant="emerald" size="sm" dot>
            Diagnóstico SUNAFIL 2026
          </Badge>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight max-w-3xl mx-auto">
          Sabé exactamente dónde está tu empresa hoy
        </h1>
        <p className="text-lg text-[color:var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
          Una serie de preguntas guiadas sobre 10 áreas clave de fiscalización SUNAFIL.
          Al terminar recibes un score por área, multa estimada y un plan priorizado de
          acción persistido en tu cuenta.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StepIcon
          icon={FileText}
          title="Respondé"
          description="Sí / Parcial / No. Cada pregunta ponderada por gravedad, peso y multa asociada."
        />
        <StepIcon
          icon={Sparkles}
          title="La IA analiza"
          description="Cruzamos tus respuestas con régimen, tamaño y multas por trabajador afectado."
        />
        <StepIcon
          icon={ShieldCheck}
          title="Plan de acción"
          description="Top 15 brechas priorizadas + responsables + plazos según gravedad."
        />
      </div>

      {/* Mode selector */}
      <div className="flex flex-col items-center gap-4">
        <Tabs value={mode.toLowerCase()} onValueChange={(v) => setMode((v.toUpperCase() as Mode))}>
          <TabsList variant="segmented">
            <TabsTrigger variant="segmented" value="express">
              Express · {expressCount} preguntas
            </TabsTrigger>
            <TabsTrigger variant="segmented" value="full">
              Completo · {fullCount} preguntas
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
          <Clock className="h-3.5 w-3.5" />
          Tiempo estimado:{' '}
          <strong className="text-[color:var(--text-secondary)]">
            {mode === 'EXPRESS' ? '5 minutos' : '25 minutos'}
          </strong>
          <span className="mx-1">·</span>
          Base: 120 preguntas oficiales + {AUDIT_TOTAL} checkpoints SUNAFIL
        </div>
      </div>

      <div className="flex justify-center">
        <Button size="lg" icon={<ShieldCheck className="h-4 w-4" />} onClick={onStart}>
          Empezar diagnóstico
        </Button>
      </div>
    </section>
  )
}

function StepIcon({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <Card padding="md" className="h-full">
      <div className="flex flex-col items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 border border-emerald-200">
          <Icon className="h-4 w-4 text-emerald-600" />
        </span>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </Card>
  )
}

/* ── Loading + error ──────────────────────────────────────────────── */

function LoadingPanel() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      <p className="text-sm text-[color:var(--text-secondary)]">
        Cargando preguntas oficiales…
      </p>
    </section>
  )
}

function ErrorPanel({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <section className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <AlertTriangle className="h-8 w-8 text-crimson-700" />
      <div>
        <p className="text-base font-bold">No pudimos cargar el diagnóstico</p>
        <p className="mt-1 text-sm text-[color:var(--text-tertiary)]">{error}</p>
      </div>
      <Button size="sm" onClick={onRetry}>
        Reintentar
      </Button>
    </section>
  )
}

/* ── Question step (Typeform-style) ─────────────────────────────────── */

function QuestionStep({
  total,
  step,
  question,
  submitting,
  onAnswer,
  onBack,
}: {
  total: number
  step: number
  question: ComplianceQuestion | undefined
  submitting: boolean
  onAnswer: (a: AnswerValue) => void
  onBack: () => void
}) {
  const progress = (step / total) * 100
  if (!question) return null

  const isLast = step === total
  const options: { label: string; value: NonNullable<AnswerValue>; tone: 'good' | 'warn' | 'bad' }[] = [
    { label: 'Sí', value: 'SI', tone: 'good' },
    { label: 'Parcial', value: 'PARCIAL', tone: 'warn' },
    { label: 'No', value: 'NO', tone: 'bad' },
  ]
  const gravityTone =
    question.infraccionGravedad === 'MUY_GRAVE'
      ? 'bg-crimson-50 text-crimson-700 border-crimson-200'
      : question.infraccionGravedad === 'GRAVE'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200'

  return (
    <section className="space-y-8 motion-fade-in-up">
      {/* Progress */}
      <div>
        <div className="flex items-center justify-between mb-2 text-xs text-[color:var(--text-tertiary)]">
          <span>
            Pregunta {step} / {total}
          </span>
          <span>{progress.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[color:var(--neutral-100)] overflow-hidden">
          <div
            className="h-full bg-emerald-600 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <Card padding="lg" variant="elevated" className="min-h-[320px] flex flex-col justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant="emerald" size="sm">
              {AREA_LABEL[question.area] ?? question.area}
            </Badge>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${gravityTone}`}
            >
              {question.infraccionGravedad.replace('_', ' ')}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
              {question.baseLegal}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
            {question.text}
          </h2>
          {question.helpText ? (
            <p className="mt-3 text-sm text-[color:var(--text-tertiary)] leading-relaxed">
              {question.helpText}
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {options.map((opt, idx) => (
            <button
              key={opt.value}
              type="button"
              disabled={submitting}
              onClick={() => onAnswer(opt.value)}
              className="rounded-xl border border-[color:var(--border-default)] bg-white px-4 py-4 text-left hover:border-emerald-300 hover:bg-emerald-50/50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold ${
                    opt.tone === 'good'
                      ? 'bg-emerald-50 text-emerald-700'
                      : opt.tone === 'warn'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-crimson-50 text-crimson-700'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm font-semibold">{opt.label}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={step === 1 || submitting}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Atrás
        </Button>
        <div className="text-xs text-[color:var(--text-tertiary)]">
          {submitting ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Guardando diagnóstico…
            </span>
          ) : isLast ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Última pregunta — al responder se genera tu reporte
            </span>
          ) : (
            <>Presioná A, B o C para responder rápido</>
          )}
        </div>
        <div className="text-xs text-[color:var(--text-tertiary)] inline-flex items-center gap-1">
          <ArrowRight className="h-3.5 w-3.5" />
          Elegí una opción
        </div>
      </div>
    </section>
  )
}
