'use client'

import { useState } from 'react'
import {
  ShieldCheck,
  Clock,
  FileText,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProgressRing } from '@/components/ui/progress-ring'

/**
 * /dev/diagnostic-intro — landing Typeform-style para el Diagnóstico SUNAFIL.
 *
 * Design spec que reemplazará la cover del diagnóstico actual. Muestra:
 *   - Hero con proposición de valor + tiempo estimado
 *   - Selección express (20) vs completo (120)
 *   - Tres pasos visuales del flujo
 *   - Wizard de 1-pregunta-por-pantalla (demo con mock)
 */
export default function DiagnosticIntro() {
  const [step, setStep] = useState(0)
  const [mode, setMode] = useState<'express' | 'full'>('express')

  const mockQuestions = [
    {
      category: 'Contratos y registro',
      question: '¿Todos tus trabajadores tienen contrato firmado registrado en SUNAT T-REGISTRO dentro del primer día hábil?',
    },
    {
      category: 'Seguridad y Salud',
      question: '¿Cuentas con un IPERC vigente firmado por el comité o supervisor SST para cada puesto de trabajo?',
    },
    {
      category: 'Remuneraciones',
      question: '¿Depositaste la CTS del último semestre antes del 15 de mayo/noviembre?',
    },
  ]

  return (
    <main className="min-h-screen bg-[color:var(--bg-canvas)] text-[color:var(--text-primary)] relative px-4 py-8 sm:px-6 lg:px-12">

      <div className="mx-auto w-full max-w-5xl space-y-12">
        {/* Banner dev */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-start gap-3">
          <Sparkles className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            <strong className="font-semibold">Spec Fase D</strong> — Diagnóstico SUNAFIL
            Typeform-style. Reemplaza la cover actual (1,200+ líneas) con una experiencia
            narrativa. Mock; conectarás a <code className="font-mono text-[11px]">/api/compliance/diagnostic</code>{' '}
            al implementar.
          </span>
        </div>

        {step === 0 ? (
          <IntroCover mode={mode} setMode={setMode} onStart={() => setStep(1)} />
        ) : (
          <QuestionStep
            total={mode === 'express' ? 20 : 120}
            step={step}
            question={mockQuestions[(step - 1) % mockQuestions.length]}
            onNext={() => setStep((s) => s + 1)}
            onBack={() => setStep((s) => Math.max(0, s - 1))}
            onFinish={() => setStep(-1)}
          />
        )}

        {step === -1 ? <ResultCover mode={mode} onRestart={() => setStep(0)} /> : null}
      </div>
    </main>
  )
}

/* ── Cover ──────────────────────────────────────────────────────────── */

function IntroCover({
  mode,
  setMode,
  onStart,
}: {
  mode: 'express' | 'full'
  setMode: (m: 'express' | 'full') => void
  onStart: () => void
}) {
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
          Una serie de preguntas guiadas que cubren las 8 áreas que SUNAFIL revisa. Al
          terminar recibes un score por área, multa estimada y un plan priorizado de acción.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StepIcon
          icon={FileText}
          title="Respondé"
          description="Sí / No / Parcial. Puedes subir evidencia cuando aplique."
        />
        <StepIcon
          icon={Sparkles}
          title="La IA analiza"
          description="Cada respuesta se cruza con tu régimen y régimen tributario."
        />
        <StepIcon
          icon={ShieldCheck}
          title="Plan de acción"
          description="Ranking por impacto + responsables + documentos generados."
        />
      </div>

      {/* Mode selector */}
      <div className="flex flex-col items-center gap-4">
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'express' | 'full')}>
          <TabsList variant="segmented">
            <TabsTrigger variant="segmented" value="express">
              Express · 20 preguntas
            </TabsTrigger>
            <TabsTrigger variant="segmented" value="full">
              Completo · 120 preguntas
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)]">
          <Clock className="h-3.5 w-3.5" />
          Tiempo estimado:{' '}
          <strong className="text-[color:var(--text-secondary)]">
            {mode === 'express' ? '4 minutos' : '25 minutos'}
          </strong>
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

/* ── Question step (Typeform-style) ─────────────────────────────────── */

function QuestionStep({
  total,
  step,
  question,
  onNext,
  onBack,
  onFinish,
}: {
  total: number
  step: number
  question: { category: string; question: string }
  onNext: () => void
  onBack: () => void
  onFinish: () => void
}) {
  const progress = (step / total) * 100
  const isLast = step >= total
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
            className="h-full bg-emerald-500 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <Card padding="lg" variant="elevated" className="min-h-[320px] flex flex-col justify-between">
        <div>
          <Badge variant="emerald" size="sm" className="mb-4">
            {question.category}
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-snug">
            {question.question}
          </h2>
        </div>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {['Sí', 'Parcial', 'No'].map((answer, idx) => (
            <button
              key={answer}
              type="button"
              onClick={isLast ? onFinish : onNext}
              className="rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)]/60 px-4 py-4 text-left hover:border-emerald-500/60 hover:bg-emerald-50 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-xs font-bold ${
                    idx === 0
                      ? 'bg-emerald-100 text-emerald-700'
                      : idx === 1
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-crimson-50 text-crimson-700'
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="text-sm font-semibold">{answer}</span>
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
          disabled={step === 1}
          icon={<ChevronLeft className="h-4 w-4" />}
        >
          Atrás
        </Button>
        <div className="text-xs text-[color:var(--text-tertiary)]">
          Presioná A, B o C para responder rápido
        </div>
        <Button
          size="sm"
          onClick={isLast ? onFinish : onNext}
          iconRight={<ChevronRight className="h-4 w-4" />}
        >
          {isLast ? 'Finalizar' : 'Saltar'}
        </Button>
      </div>
    </section>
  )
}

/* ── Result cover ───────────────────────────────────────────────────── */

function ResultCover({ mode, onRestart }: { mode: 'express' | 'full'; onRestart: () => void }) {
  const score = 87
  const areas = [
    { area: 'Contratos', score: 94, color: '#00d084' },
    { area: 'Legajo', score: 88, color: '#00d084' },
    { area: 'CTS', score: 95, color: '#00d084' },
    { area: 'Vacaciones', score: 84, color: '#00d084' },
    { area: 'SST', score: 58, color: '#ff4757' },
    { area: 'Planilla', score: 91, color: '#00d084' },
  ]

  return (
    <section className="space-y-8 motion-fade-in-up">
      <div className="text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
        <h1 className="text-4xl font-bold tracking-tight">Listo, diagnóstico completo</h1>
        <p className="text-[color:var(--text-secondary)]">
          {mode === 'express' ? '20' : '120'} preguntas analizadas en contra de tu régimen
          laboral.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 items-center rounded-2xl border border-emerald-200 bg-emerald-50 p-8">
        <ProgressRing value={score} size={200} stroke={14}>
          <div className="text-center">
            <div className="text-5xl font-bold text-emerald-700">{score}</div>
            <div className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)] mt-0.5">
              score total
            </div>
          </div>
        </ProgressRing>
        <div className="space-y-3">
          <p className="text-xl font-bold">
            Tu empresa está <span className="text-emerald-700">saludable</span>, pero SST
            es tu brecha clave.
          </p>
          <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed max-w-xl">
            Resolver las 4 observaciones de SST sube tu score a 93 y evita una multa
            estimada de <strong className="text-crimson-700">S/ 24,500</strong>. Generamos
            un plan de acción con responsables y plazos.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button icon={<ArrowRight className="h-3.5 w-3.5" />}>Ver plan de acción</Button>
            <Button variant="secondary" onClick={onRestart}>
              Rehacer
            </Button>
          </div>
        </div>
      </div>

      {/* Area breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {areas.map((a) => (
          <Card key={a.area} padding="md" className="text-center">
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: a.color }}
            >
              {a.score}
            </div>
            <div className="mt-1 text-[11px] text-[color:var(--text-tertiary)] uppercase tracking-widest">
              {a.area}
            </div>
          </Card>
        ))}
      </div>
    </section>
  )
}
