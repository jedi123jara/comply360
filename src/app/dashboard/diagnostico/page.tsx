'use client'

import Link from 'next/link'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ShieldCheck,
  Clock,
  FileText,
  Sparkles,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  ListChecks,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/comply360/editorial-title'
import { cn } from '@/lib/utils'
import type { AnswerValue, ComplianceQuestion } from '@/lib/compliance/questions/types'
import {
  AREA_COUNT,
  QUESTION_COUNT,
  areaLabel,
  formatEstimate,
  formatQuestionText,
  type DiagnosticMode,
} from './_lib/diagnostic-meta'

/**
 * /dashboard/diagnostico — Diagnóstico SUNAFIL paso a paso (una pregunta por pantalla).
 *
 * Conectado a producción:
 *  - Preguntas vía `GET /api/diagnostics?action=questions&type=FULL|EXPRESS`
 *    (el banco completo vive en `src/lib/compliance/questions`; el servidor filtra
 *    según régimen y tamaño de la empresa). Se piden UNA sola vez al empezar.
 *  - Auto-respuestas vía `POST /api/diagnostico/auto-prefill` (se saltan las
 *    preguntas que ya podemos verificar con los datos cargados).
 *  - Antes de enviar se muestra un resumen con opción de revisar.
 *  - Envío vía `POST /api/diagnostics` (`scoreDiagnostic()` en el servidor, guarda
 *    `ComplianceDiagnostic` + `ComplianceScore` y crea tareas en el Centro de acción).
 *  - Navega a `/dashboard/diagnostico/[id]/resultado`.
 *
 * `?modo=completo` abre el selector en el diagnóstico completo (lo usa el resultado).
 */

type Mode = DiagnosticMode

interface QuestionsResponse {
  type: Mode
  totalQuestions: number
  questions: ComplianceQuestion[]
  context: { totalWorkers: number; sizeRange?: string; regimenPrincipal?: string }
}

type AnswerMap = Record<string, AnswerValue>

interface AutoAnswerEvidence {
  type: string
  label: string
  value: string
  href?: string
}

interface AutoAnswerRecord {
  questionId: string
  answer: AnswerValue | null
  confidence: number
  evidence: AutoAnswerEvidence[]
  sources: string[]
}

/** Confianza mínima para que una auto-respuesta se aplique sin pasar por el wizard manual. */
const MIN_CONFIDENCE = 70

const ANSWER_OPTIONS: {
  label: string
  value: NonNullable<AnswerValue>
  key: string
  tone: 'good' | 'warn' | 'bad'
}[] = [
  { label: 'Sí', value: 'SI', key: 'A', tone: 'good' },
  { label: 'Parcial', value: 'PARCIAL', key: 'B', tone: 'warn' },
  { label: 'No', value: 'NO', key: 'C', tone: 'bad' },
]

const ANSWER_LABEL: Record<NonNullable<AnswerValue>, string> = {
  SI: 'Sí',
  PARCIAL: 'Parcial',
  NO: 'No',
}

const GRAVITY_LABEL: Record<ComplianceQuestion['infraccionGravedad'], string> = {
  LEVE: 'Infracción leve',
  GRAVE: 'Infracción grave',
  MUY_GRAVE: 'Infracción muy grave',
}

/** Mensaje claro para el usuario según el código HTTP del guardado (nunca "HTTP 500"). */
function describeSaveError(status: number | null): string {
  if (status === 401) {
    return 'Tu sesión expiró. Inicia sesión otra vez en otra pestaña y luego presiona «Reintentar envío». Tus respuestas siguen aquí.'
  }
  if (status === 403) {
    return 'Tu plan actual no permite guardar diagnósticos. Revisa los planes disponibles o pide ayuda al administrador de tu cuenta.'
  }
  if (status === 429) {
    return 'Hiciste varios intentos seguidos. Espera unos segundos y presiona «Reintentar envío».'
  }
  if (status === null) {
    return 'No pudimos conectarnos con el servidor. Revisa tu conexión a internet y presiona «Reintentar envío». Tus respuestas siguen aquí.'
  }
  return 'No pudimos guardar tu diagnóstico por un problema de nuestro lado. Tus respuestas siguen aquí: presiona «Reintentar envío» en unos segundos.'
}

/** Error con el código HTTP (o null si no hubo respuesta) para elegir el mensaje. */
class RequestError extends Error {
  readonly status: number | null
  constructor(status: number | null) {
    super(status === null ? 'network' : `status ${status}`)
    this.status = status
  }
}

function describeLoadError(status: number | null): string {
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión y presiona «Reintentar».'
  if (status === null) {
    return 'No pudimos conectarnos con el servidor. Revisa tu conexión a internet y presiona «Reintentar».'
  }
  return 'Tuvimos un problema al preparar tus preguntas. Presiona «Reintentar» en unos segundos.'
}

export default function DiagnosticoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { modo } = use(searchParams)
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<Mode>(modo === 'completo' ? 'FULL' : 'EXPRESS')
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [allQuestions, setAllQuestions] = useState<ComplianceQuestion[] | null>(null)
  const [autoMap, setAutoMap] = useState<Map<string, AutoAnswerRecord>>(new Map())
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadAttempt, setLoadAttempt] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const started = step > 0

  /** Preguntas que el usuario debe responder a mano (filtradas las auto-resueltas). */
  const questions =
    allQuestions === null
      ? null
      : allQuestions.filter((q) => {
          const auto = autoMap.get(q.id)
          // Si tiene auto-respuesta con confianza suficiente y respuesta no nula → la saltamos
          return !(auto && auto.confidence >= MIN_CONFIDENCE && auto.answer !== null)
        })

  const total = questions?.length ?? 0
  const autoAnswered = allQuestions ? allQuestions.length - total : 0
  const allManualAnswered = questions ? questions.every((q) => answers[q.id] != null) : false

  // Carga preguntas + auto-respuestas UNA sola vez al empezar (o al cambiar de modo /
  // reintentar). Depende de `started` y no de `step` para no recargar en cada respuesta.
  useEffect(() => {
    if (!started) return
    let cancelled = false
    async function load() {
      setLoading(true)
      setLoadError(null)
      try {
        const [qRes, autoRes] = await Promise.all([
          fetch(`/api/diagnostics?action=questions&type=${mode}`, { cache: 'no-store' }),
          fetch(`/api/diagnostico/auto-prefill`, { method: 'POST', cache: 'no-store' }).catch(
            () => null
          ),
        ])
        if (!qRes.ok) throw new RequestError(qRes.status)
        const qData = (await qRes.json()) as QuestionsResponse
        if (cancelled) return
        setAllQuestions(qData.questions)

        if (autoRes && autoRes.ok) {
          const autoData = (await autoRes.json()) as {
            answers: AutoAnswerRecord[]
          }
          if (cancelled) return
          const map = new Map<string, AutoAnswerRecord>()
          // Pre-rellena el AnswerMap con las auto-respuestas aplicables
          const prefilled: AnswerMap = {}
          for (const a of autoData.answers ?? []) {
            map.set(a.questionId, a)
            if (a.confidence >= MIN_CONFIDENCE && a.answer !== null) {
              prefilled[a.questionId] = a.answer
            }
          }
          setAutoMap(map)
          setAnswers((prev) => ({ ...prefilled, ...prev }))
        }
      } catch (e) {
        if (cancelled) return
        // fetch() lanza TypeError cuando no hay red → status null.
        setLoadError(describeLoadError(e instanceof RequestError ? e.status : null))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [mode, started, loadAttempt])

  async function submit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const payload = {
        type: mode,
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          questionId,
          answer,
        })),
      }
      let r: Response
      try {
        r = await fetch('/api/diagnostics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {
        throw new RequestError(null)
      }
      if (!r.ok) throw new RequestError(r.status)
      const data = (await r.json().catch(() => null)) as { diagnosticId?: string } | null
      if (!data?.diagnosticId) throw new RequestError(500)
      router.push(`/dashboard/diagnostico/${data.diagnosticId}/resultado`)
    } catch (e) {
      setSubmitError(describeSaveError(e instanceof RequestError ? e.status : 500))
      setSubmitting(false)
    }
  }

  function answer(q: ComplianceQuestion, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [q.id]: value }))
    setSubmitError(null)
    // Tras la última pregunta pasamos al resumen (step = total + 1), no se envía directo.
    setStep((s) => s + 1)
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

      <div className="mx-auto w-full max-w-5xl space-y-10">
        <Link
          href="/dashboard/centro-sunafil?tab=diagnostico"
          className="inline-flex items-center gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[color:var(--text-secondary)] transition hover:border-emerald-300 hover:text-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Centro SUNAFIL
        </Link>

        {step === 0 ? (
          <>
            <PageHeader
              eyebrow="Diagnóstico SUNAFIL"
              title="Descubre cómo está tu empresa <em>ante SUNAFIL</em>."
              subtitle={`Responde Sí, Parcial o No sobre las ${AREA_COUNT} áreas que revisa un inspector. Al final verás tu nivel de cumplimiento por área, la multa que podrías recibir y qué corregir primero.`}
            />
            <IntroCover
              mode={mode}
              setMode={(m) => {
                setMode(m)
                setAnswers({})
                setAllQuestions(null)
                setAutoMap(new Map())
              }}
              onStart={() => setStep(1)}
            />
          </>
        ) : loadError ? (
          <ErrorPanel
            title="No pudimos cargar las preguntas"
            message={loadError}
            onRetry={() => setLoadAttempt((n) => n + 1)}
            onBack={() => {
              setLoadError(null)
              setStep(0)
            }}
          />
        ) : loading || !questions || !allQuestions ? (
          <LoadingPanel />
        ) : step <= total ? (
          <>
            {autoAnswered > 0 && step === 1 ? (
              <AutoPrefillBanner autoAnswered={autoAnswered} totalOriginal={allQuestions.length} />
            ) : null}
            <QuestionStep
              total={total}
              step={step}
              question={questions[step - 1]}
              selected={answers[questions[step - 1]?.id ?? ''] ?? null}
              canJumpToReview={allManualAnswered}
              onAnswer={(a) => answer(questions[step - 1], a)}
              onBack={() => setStep((s) => Math.max(1, s - 1))}
              onJumpToReview={() => setStep(total + 1)}
            />
          </>
        ) : (
          <ReviewPanel
            mode={mode}
            questions={questions}
            allQuestions={allQuestions}
            autoMap={autoMap}
            answers={answers}
            submitting={submitting}
            error={submitError}
            onSubmit={submit}
            onEdit={(index) => setStep(index + 1)}
          />
        )}
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
  const count = QUESTION_COUNT[mode]
  return (
    <section className="space-y-8 motion-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StepIcon
          icon={FileText}
          title="1. Responde"
          description="Sí, Parcial o No. Las preguntas que ya podemos verificar con tus datos se responden solas."
        />
        <StepIcon
          icon={Calculator}
          title="2. Calculamos tu riesgo"
          description="Cruzamos tus respuestas con tu régimen, tu número de trabajadores y la escala oficial de multas."
        />
        <StepIcon
          icon={ListChecks}
          title="3. Recibes tu plan"
          description="Brechas ordenadas por riesgo, con plazo sugerido. Las tareas quedan listas en tu Centro de acción."
        />
      </div>

      {/* Selector de modo */}
      <div className="flex flex-col items-center gap-4">
        <Tabs value={mode.toLowerCase()} onValueChange={(v) => setMode(v.toUpperCase() as Mode)}>
          <TabsList variant="segmented">
            <TabsTrigger variant="segmented" value="express">
              Express · {QUESTION_COUNT.EXPRESS} preguntas
            </TabsTrigger>
            <TabsTrigger variant="segmented" value="full">
              Completo · {QUESTION_COUNT.FULL} preguntas
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="max-w-xl text-center text-sm text-[color:var(--text-secondary)]">
          {mode === 'EXPRESS'
            ? 'Las preguntas más críticas. Ideal para revisar tu empresa cada mes.'
            : `Todas las preguntas de las ${AREA_COUNT} áreas. Ideal una vez al año o antes de una auditoría.`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-[color:var(--text-tertiary)]">
          <Clock className="h-3.5 w-3.5" />
          Tiempo estimado:{' '}
          <strong className="text-[color:var(--text-secondary)]">{formatEstimate(count)}</strong>
          <span aria-hidden="true">·</span>
          Hasta {count} preguntas; algunas no aplican a tu régimen o ya las respondemos con tus datos.
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

/* ── Carga + error ────────────────────────────────────────────────── */

function LoadingPanel() {
  return (
    <section className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
      <p className="text-sm text-[color:var(--text-secondary)]">
        Preparando tus preguntas…
      </p>
    </section>
  )
}

function ErrorPanel({
  title,
  message,
  onRetry,
  onBack,
}: {
  title: string
  message: string
  onRetry: () => void
  onBack: () => void
}) {
  return (
    <section
      role="alert"
      className="flex flex-col items-center justify-center gap-4 py-24 text-center"
    >
      <AlertTriangle className="h-8 w-8 text-crimson-700" />
      <div>
        <p className="text-base font-bold">{title}</p>
        <p className="mt-1 max-w-md text-sm text-[color:var(--text-tertiary)]">{message}</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
        <Button size="sm" variant="ghost" onClick={onBack}>
          Volver al inicio
        </Button>
      </div>
    </section>
  )
}

/* ── Pregunta (una por pantalla) ───────────────────────────────────── */

function QuestionStep({
  total,
  step,
  question,
  selected,
  canJumpToReview,
  onAnswer,
  onBack,
  onJumpToReview,
}: {
  total: number
  step: number
  question: ComplianceQuestion | undefined
  selected: AnswerValue
  canJumpToReview: boolean
  onAnswer: (a: AnswerValue) => void
  onBack: () => void
  onJumpToReview: () => void
}) {
  // Atajo de teclado: A = Sí, B = Parcial, C = No.
  useEffect(() => {
    if (!question) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat || e.altKey || e.ctrlKey || e.metaKey) return
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return
      }
      const option = ANSWER_OPTIONS.find((o) => o.key === e.key.toUpperCase())
      if (!option) return
      e.preventDefault()
      onAnswer(option.value)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [question, onAnswer])

  if (!question) return null

  const progress = ((step - 1) / total) * 100
  const isLast = step === total
  const gravityTone =
    question.infraccionGravedad === 'MUY_GRAVE'
      ? 'bg-crimson-50 text-crimson-700 border-crimson-200'
      : question.infraccionGravedad === 'GRAVE'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] border-[color:var(--border-default)]'

  return (
    <section className="space-y-8 motion-fade-in-up">
      {/* Progreso */}
      <div>
        <div className="flex items-center justify-between mb-2 text-xs text-[color:var(--text-tertiary)]">
          <span>
            Pregunta {step} de {total}
          </span>
          <span>{progress.toFixed(0)}% completado</span>
        </div>
        <div
          className="h-1.5 rounded-full bg-[color:var(--neutral-100)] overflow-hidden"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={step - 1}
          aria-label="Avance del diagnóstico"
        >
          <div
            className="h-full bg-emerald-600 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Tarjeta de la pregunta */}
      {/* `key` reinicia la animación de entrada en cada pregunta; la barra de progreso se anima sola. */}
      <Card
        key={question.id}
        padding="lg"
        variant="elevated"
        className="min-h-[320px] flex flex-col justify-between motion-fade-in-up"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {areaLabel(question.area)}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${gravityTone}`}
            >
              {GRAVITY_LABEL[question.infraccionGravedad]}
            </span>
            <span className="text-[11px] text-[color:var(--text-tertiary)]">
              {question.baseLegal}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
            {formatQuestionText(question.text)}
          </h2>
          {question.helpText ? (
            <p className="mt-3 text-sm text-[color:var(--text-tertiary)] leading-relaxed">
              {question.helpText}
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2" role="group" aria-label="Tu respuesta">
          {ANSWER_OPTIONS.map((opt) => {
            const isSelected = selected === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onAnswer(opt.value)}
                aria-pressed={isSelected}
                aria-keyshortcuts={opt.key}
                className={cn(
                  'rounded-xl border bg-white px-4 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60',
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500/40'
                    : 'border-[color:var(--border-default)] hover:border-emerald-300 hover:bg-emerald-50/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold',
                      opt.tone === 'good'
                        ? 'bg-emerald-50 text-emerald-700'
                        : opt.tone === 'warn'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-crimson-50 text-crimson-700'
                    )}
                  >
                    {opt.key}
                  </span>
                  <span className="text-sm font-semibold">{opt.label}</span>
                  {isSelected ? (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-600" aria-hidden="true" />
                  ) : null}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Navegación */}
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          disabled={step === 1}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Atrás
        </Button>
        <p className="text-center text-xs text-[color:var(--text-tertiary)]">
          {isLast ? (
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              Última pregunta: luego verás un resumen antes de enviar
            </span>
          ) : (
            <span className="hidden sm:inline">Presiona A, B o C para responder rápido</span>
          )}
        </p>
        {canJumpToReview ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={onJumpToReview}
            iconRight={<Send className="h-3.5 w-3.5" />}
          >
            Ir al resumen
          </Button>
        ) : (
          <span className="w-[72px]" aria-hidden="true" />
        )}
      </div>
    </section>
  )
}

/* ── Resumen antes de enviar ───────────────────────────────────────── */

function ReviewPanel({
  mode,
  questions,
  allQuestions,
  autoMap,
  answers,
  submitting,
  error,
  onSubmit,
  onEdit,
}: {
  mode: Mode
  questions: ComplianceQuestion[]
  allQuestions: ComplianceQuestion[]
  autoMap: Map<string, AutoAnswerRecord>
  answers: AnswerMap
  submitting: boolean
  error: string | null
  onSubmit: () => void
  onEdit: (index: number) => void
}) {
  const [showList, setShowList] = useState(false)

  const manualAnswered = questions.filter((q) => answers[q.id] != null)
  const noCount = manualAnswered.filter((q) => answers[q.id] === 'NO').length
  const partialCount = manualAnswered.filter((q) => answers[q.id] === 'PARCIAL').length
  const manualIds = new Set(questions.map((q) => q.id))
  const autoQuestions = allQuestions.filter((q) => !manualIds.has(q.id) && answers[q.id] != null)

  return (
    <section className="mx-auto max-w-3xl space-y-6 motion-fade-in-up">
      <Card padding="lg" variant="elevated">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </span>
          <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
            Diagnóstico {mode === 'EXPRESS' ? 'express' : 'completo'} · Resumen
          </p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            {manualAnswered.length > 0
              ? `Respondiste ${manualAnswered.length} ${manualAnswered.length === 1 ? 'pregunta' : 'preguntas'} · ${noCount} ${noCount === 1 ? 'marcada' : 'marcadas'} como No`
              : 'Todas las preguntas se respondieron con tus datos'}
          </h2>
          <p className="max-w-xl text-sm text-[color:var(--text-secondary)] leading-relaxed">
            {partialCount > 0
              ? `También marcaste ${partialCount} como Parcial. `
              : ''}
            {autoQuestions.length > 0
              ? `Otras ${autoQuestions.length} se respondieron con los datos que ya tienes en la plataforma. `
              : ''}
            Las respuestas No y Parcial se convierten en brechas, y las más urgentes pasan a tu
            plan de acción como tareas.
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-2 flex w-full items-start gap-3 rounded-xl border border-crimson-200 bg-crimson-50 p-4 text-left"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-crimson-700" />
              <div>
                <p className="text-sm font-bold text-crimson-700">No se guardó tu diagnóstico</p>
                <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">{error}</p>
              </div>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button
              size="lg"
              onClick={onSubmit}
              loading={submitting}
              icon={<Send className="h-4 w-4" />}
            >
              {submitting ? 'Guardando tu diagnóstico…' : error ? 'Reintentar envío' : 'Enviar'}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setShowList((v) => !v)}
              disabled={submitting}
              iconRight={showList ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            >
              Revisar
            </Button>
          </div>
        </div>
      </Card>

      {showList ? (
        <Card padding="md" className="motion-fade-in-up">
          <p className="mb-3 text-sm text-[color:var(--text-secondary)]">
            Haz clic en una pregunta para cambiar tu respuesta.
          </p>
          <ul className="divide-y divide-[color:var(--border-subtle)]">
            {questions.map((q, index) => (
              <li key={q.id}>
                <button
                  type="button"
                  onClick={() => onEdit(index)}
                  disabled={submitting}
                  className="flex w-full items-start gap-3 py-3 text-left transition hover:bg-[color:var(--neutral-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded-md px-2"
                >
                  <span className="mt-0.5 w-6 shrink-0 text-xs font-mono text-[color:var(--text-tertiary)]">
                    {index + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm leading-snug line-clamp-2">
                      {formatQuestionText(q.text)}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-[color:var(--text-tertiary)]">
                      {areaLabel(q.area)}
                    </span>
                  </span>
                  <AnswerChip value={answers[q.id] ?? null} />
                </button>
              </li>
            ))}
          </ul>

          {autoQuestions.length > 0 ? (
            <div className="mt-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)]">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Respondidas con tus datos
              </p>
              <ul className="divide-y divide-[color:var(--border-subtle)]">
                {autoQuestions.map((q) => {
                  const evidence = autoMap.get(q.id)?.evidence?.[0]
                  return (
                    <li key={q.id} className="flex items-start gap-3 px-2 py-3">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm leading-snug line-clamp-2">
                          {formatQuestionText(q.text)}
                        </span>
                        {evidence ? (
                          <span className="mt-0.5 block text-[11px] text-[color:var(--text-tertiary)]">
                            {evidence.label}: {evidence.value}
                          </span>
                        ) : null}
                      </span>
                      <AnswerChip value={answers[q.id] ?? null} />
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}
    </section>
  )
}

function AnswerChip({ value }: { value: AnswerValue }) {
  if (!value) {
    return (
      <span className="shrink-0 rounded-full border border-[color:var(--border-default)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-tertiary)]">
        Sin responder
      </span>
    )
  }
  return (
    <span
      className={cn(
        'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        value === 'SI'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : value === 'PARCIAL'
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-crimson-200 bg-crimson-50 text-crimson-700'
      )}
    >
      {ANSWER_LABEL[value]}
    </span>
  )
}

/* ── Aviso de auto-respuestas ──────────────────────────────────────── */

function AutoPrefillBanner({
  autoAnswered,
  totalOriginal,
}: {
  autoAnswered: number
  totalOriginal: number
}) {
  return (
    <Card padding="md" variant="emerald" className="motion-fade-in-up">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 border border-emerald-200 shrink-0">
          <Sparkles className="h-4 w-4 text-emerald-700" />
        </span>
        <div className="flex-1">
          <p className="text-base font-bold text-emerald-900">
            Ya respondimos {autoAnswered} de {totalOriginal} preguntas con tus datos
          </p>
          <p className="mt-1 text-sm text-emerald-800/80 leading-relaxed">
            Usamos lo que ya tienes cargado (trabajadores, contratos, boletas, asistencia, SST y
            denuncias). Solo te preguntamos lo que no podemos verificar por nuestra cuenta. En el
            resumen final verás cuáles respondimos y con qué dato.
          </p>
        </div>
      </div>
    </Card>
  )
}
