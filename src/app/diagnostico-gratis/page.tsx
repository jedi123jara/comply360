'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, XCircle, MinusCircle, Scale, Loader2, Mail, TrendingDown, FileText, Users, Clock, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { scoreDiagnostic } from '@/lib/compliance/diagnostic-scorer'
import { QUESTION_COUNT, areaLabel } from '@/app/dashboard/diagnostico/_lib/diagnostic-meta'
import { PUBLIC_QUESTIONS, PUBLIC_QUESTION_COUNT, PUBLIC_ESTIMATE } from './_lib/public-questions'
import { track } from '@/lib/analytics'
import { formatSoles } from '@/lib/format/peruvian'
import { PublicHero } from '@/components/marketing/public-hero'
import { PublicShell } from '@/components/marketing/public-shell'
import { pub } from '@/components/marketing/public-theme'
import type { ComplianceQuestion } from '@/lib/compliance/questions'
import type { QuestionAnswer, DiagnosticResult } from '@/lib/compliance/diagnostic-scorer'
import type { AnswerValue } from '@/lib/compliance/questions/types'

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'quiz' | 'capture' | 'result'

// ─── Constants ──────────────────────────────────────────────────────────────

// Tema público: cuerpo claro (tarjetas blancas) y hero navy. Colores en hex
// arbitrario para no depender de la capa de compatibilidad oscura de globals.css.
const GRAVEDAD_COLORS = {
  LEVE: 'text-[#92400E] bg-[#FFFBEB] border-[#F5B301]/60',
  GRAVE: 'text-[#B91C1C] bg-[#FEF2F2] border-[#FCA5A5]',
  MUY_GRAVE: 'text-[#7F1D1D] bg-[#FEE2E2] border-[#F87171]',
}

const ANSWER_CONFIG = [
  { value: 'SI' as AnswerValue, label: 'Sí, cumplimos', icon: CheckCircle2, color: 'border-[#15803D] bg-[#F0FDF4] text-[#166534]' },
  { value: 'PARCIAL' as AnswerValue, label: 'Parcialmente', icon: MinusCircle, color: 'border-[#B45309] bg-[#FFFBEB] text-[#92400E]' },
  { value: 'NO' as AnswerValue, label: 'No cumplimos', icon: XCircle, color: 'border-[#B91C1C] bg-[#FEF2F2] text-[#991B1B]' },
]

/** Colores de estado sobre fondo blanco (texto ≥ 4.5:1). */
function statusText(score: number) {
  return score >= 80 ? 'text-[#15803D]' : score >= 60 ? 'text-[#B45309]' : 'text-[#B91C1C]'
}

// ─── Score Ring Component (sobre el hero navy) ───────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#4ade80' : score >= 60 ? '#fbbf24' : '#f87171'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="8" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-extrabold" style={{ color }}>{score}</span>
        <span className="block text-xs text-[#CBD5E1]">/100</span>
      </div>
    </div>
  )
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function DiagnosticoGratisPage() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<Map<string, AnswerValue>>(new Map())
  const [email, setEmail] = useState('')
  const [companySize, setCompanySize] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<DiagnosticResult | null>(null)

  // Preguntas express de mayor peso (sin registro). Ver _lib/public-questions.ts
  const questions: ComplianceQuestion[] = PUBLIC_QUESTIONS

  const totalQuestions = questions.length
  const currentQ = questions[currentIdx]
  const progress = Math.round(((currentIdx + 1) / totalQuestions) * 100)

  function handleAnswer(value: AnswerValue) {
    const next = new Map(answers)
    next.set(currentQ.id, value)
    setAnswers(next)
    track('free_diagnostic_question_answered', {
      question_id: currentQ.id,
      answer: value,
      index: currentIdx,
    })

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIdx < totalQuestions - 1) {
        setCurrentIdx(currentIdx + 1)
      } else {
        // All questions answered — go to email capture
        setPhase('capture')
      }
    }, 300)
  }

  function handleBack() {
    if (currentIdx > 0) setCurrentIdx(currentIdx - 1)
  }

  function handleCalculateResult() {
    setSubmitting(true)

    // Build answers array
    const answersList: QuestionAnswer[] = Array.from(answers.entries()).map(([questionId, answer]) => ({
      questionId,
      answer,
    }))

    // Score locally (no API call needed — the scoring engine is pure)
    const res = scoreDiagnostic(questions, answersList, companySize)
    setResult(res)
    setPhase('result')
    setSubmitting(false)
    track('free_diagnostic_completed', {
      score_global: res.scoreGlobal,
      multa_estimada: Number(res.totalMultaRiesgo),
      answered_count: answersList.length,
      company_size_bucket:
        companySize <= 10 ? '1-10' : companySize <= 50 ? '11-50' : companySize <= 200 ? '51-200' : '200+',
    })

    // Save lead to DB (non-blocking — don't wait for response)
    if (email) {
      const sizeBucket =
        companySize > 0
          ? companySize <= 10
            ? '1-10'
            : companySize <= 50
              ? '11-50'
              : companySize <= 200
                ? '51-200'
                : '200+'
          : null
      fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          companySize: sizeBucket,
          source: 'DIAGNOSTICO_GRATIS',
          scoreGlobal: res.scoreGlobal,
          multaEstimada: res.totalMultaRiesgo,
          scoreByArea: res.scoreByArea,
        }),
      })
        .then(() => {
          // NOTA: no pasamos email/PII a analytics — solo métricas agregadas
          track('lead_captured', {
            source: 'DIAGNOSTICO_GRATIS',
            has_score: true,
            score_global: res.scoreGlobal,
            company_size_bucket: sizeBucket,
          })
        })
        .catch(() => {
          /* silently ignore — lead capture is best-effort */
        })
    }
  }

  // ─── Intro Phase ──────────────────────────────────────────────────────

  if (phase === 'intro') {
    return (
      <PublicShell>
        <PublicHero
          eyebrow={
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-[#F5B301]" />
              Diagnóstico express · 100% gratis
            </>
          }
          title={
            <>
              ¿Cuánto te costaría una inspección <span className={pub.highlightOnNavy}>SUNAFIL</span> hoy?
            </>
          }
          description={
            <>
              Responde {PUBLIC_QUESTION_COUNT} preguntas en unos {PUBLIC_ESTIMATE.replace('~', '')} y obtén tu{' '}
              <b className="text-[#ffffff]">score de compliance</b>, la{' '}
              <b className="text-[#ffffff]">multa potencial estimada</b> y un plan de acción priorizado — todo sin registro.
            </>
          }
        >
          {/* Stats trust signals */}
          <div className="mx-auto mt-8 grid max-w-lg grid-cols-3 gap-2 sm:gap-3">
            {[
              { icon: Clock, label: PUBLIC_ESTIMATE, sub: 'Rápido y directo' },
              { icon: FileText, label: `${PUBLIC_QUESTION_COUNT} preguntas`, sub: 'Las de mayor impacto' },
              { icon: ShieldCheck, label: 'Resultado en vivo', sub: 'Score + multa estimada' },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl border border-[#ffffff]/12 bg-[#ffffff]/[0.06] p-3 sm:p-4"
              >
                <Icon aria-hidden className="mx-auto mb-2 h-5 w-5 text-[#F5B301]" />
                <p className="text-sm font-bold text-[#ffffff]">{label}</p>
                <p className="text-[11px] text-[#CBD5E1]">{sub}</p>
              </div>
            ))}
          </div>
        </PublicHero>

        <div className={cn(pub.container, 'py-10 sm:py-12')}>
          <div className="mx-auto max-w-md text-center">
            {/* Company size input */}
            <div className={cn(pub.card, 'mb-6 p-5 text-left')}>
              <label htmlFor="company-size" className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#0B1B36]">
                <Users aria-hidden className="-mt-0.5 mr-1 inline h-3.5 w-3.5 text-[#2563EB]" />
                ¿Cuántos trabajadores tiene tu empresa?
              </label>
              <input
                id="company-size"
                type="number"
                min={1}
                max={9999}
                value={companySize}
                onChange={e => setCompanySize(Math.max(1, parseInt(e.target.value) || 1))}
                className={cn(pub.input, 'px-4 text-base')}
                placeholder="Ej: 25"
              />
              <p className={cn(pub.hint, 'mt-2')}>
                La multa estimada se ajusta según el tamaño (base legal: D.S. 019-2006-TR).
              </p>
            </div>

            {/* CTA principal */}
            <button
              type="button"
              onClick={() => {
                track('free_diagnostic_started', { company_size: companySize })
                setPhase('quiz')
              }}
              className={cn(pub.btnPrimaryLg, 'w-full sm:w-auto sm:px-8')}
            >
              Iniciar diagnóstico gratis <ArrowRight aria-hidden className="h-5 w-5" />
            </button>
            <p className={cn(pub.faint, 'mt-3')}>
              Sin registro · sin tarjeta · datos 100% confidenciales
            </p>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[#5A6A80]">
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Scale aria-hidden className="h-3.5 w-3.5 text-[#2563EB]" /> Basado en normativa vigente
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-[#2563EB]" /> D.S. 019-2006-TR
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Award aria-hidden className="h-3.5 w-3.5 text-[#2563EB]" /> UIT 2026: {formatSoles(5500)}
              </span>
            </div>

            {/* Volver a landing */}
            <Link href="/" className={cn(pub.link, 'mt-8 inline-block text-xs')}>
              ← Volver al sitio
            </Link>
          </div>
        </div>
      </PublicShell>
    )
  }

  // ─── Quiz Phase ───────────────────────────────────────────────────────

  if (phase === 'quiz' && currentQ) {
    const currentAnswer = answers.get(currentQ.id)
    const gravedadStyle = GRAVEDAD_COLORS[currentQ.infraccionGravedad] ?? GRAVEDAD_COLORS.LEVE

    return (
      <PublicShell header="minimal" footer={false}>
        {/* Barra de progreso */}
        <div className="border-b border-[#E5EAF2] bg-[#ffffff]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <span className="text-sm font-bold text-[#0B1B36]">Diagnóstico express</span>
            <span className="text-sm text-[#475569]">
              Pregunta {currentIdx + 1} de {totalQuestions}
            </span>
          </div>
          <div
            className="h-1.5 bg-[#EEF2F7]"
            role="progressbar"
            aria-label="Avance del diagnóstico"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full bg-[linear-gradient(90deg,#2563EB,#F5B301)] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
          <div className={cn(pub.card, 'p-5 sm:p-8')}>
            {/* Area badge */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold', gravedadStyle)}>
                {currentQ.infraccionGravedad}
              </span>
              <span className="text-xs text-[#5A6A80]">
                {areaLabel(currentQ.area)}
              </span>
            </div>

            {/* Question text */}
            <h2 className="mb-2 text-xl font-extrabold tracking-[-0.02em] text-[#0B1B36]">
              {currentQ.text}
            </h2>

            <p className="mb-8 text-xs text-[#5A6A80]">
              Base legal: {currentQ.baseLegal} | Multa: {currentQ.multaUIT} UIT ({formatSoles(currentQ.multaUIT * 5500)})
            </p>

            {/* Answer buttons */}
            <div className="grid gap-3">
              {ANSWER_CONFIG.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAnswer(value)}
                  aria-pressed={currentAnswer === value}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all',
                    currentAnswer === value
                      ? color
                      : 'border-[#E5EAF2] bg-[#ffffff] text-[#0B1B36] hover:border-[#2563EB]/45 hover:bg-[#F5F7FB]',
                  )}
                >
                  <Icon aria-hidden className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#E5EAF2] pt-6">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentIdx === 0}
                className="flex items-center gap-1 text-sm font-semibold text-[#475569] hover:text-[#0B1B36] disabled:opacity-40"
              >
                <ArrowLeft aria-hidden className="h-4 w-4" /> Anterior
              </button>

              <div className="hidden gap-1 sm:flex" aria-hidden="true">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 w-2 rounded-full transition-colors',
                      i === currentIdx ? 'bg-[#F5B301]' : answers.has(questions[i].id) ? 'bg-[#2563EB]' : 'bg-[#E5EAF2]',
                    )}
                  />
                ))}
              </div>

              {currentIdx < totalQuestions - 1 && answers.has(currentQ.id) && (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                  className="flex items-center gap-1 text-sm font-semibold text-[#B45309] hover:text-[#92400E]"
                >
                  Siguiente <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </PublicShell>
    )
  }

  // ─── Email Capture Phase ──────────────────────────────────────────────

  if (phase === 'capture') {
    return (
      <PublicShell header="minimal" footer={false} mainClassName="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className={cn(pub.card, 'p-6 text-center sm:p-8')}>
            {/* Success icon */}
            <div className="mb-5 flex justify-center">
              <div className={pub.iconTile}>
                <ShieldCheck aria-hidden className="h-6 w-6" />
              </div>
            </div>

            <div className="mb-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#15803D]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#15803D]" />
              <span>Diagnóstico completado</span>
            </div>

            <h2 className="mb-2 text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em] text-[#0B1B36]">
              Tu resultado está <span className={pub.highlight}>listo</span>.
            </h2>
            <p className="mb-6 text-sm text-[#475569]">
              Déjanos tu email y desbloqueamos tu score, la multa potencial y las 5 brechas más urgentes.
              Sin spam — sólo el resultado y un tip de compliance semanal.
            </p>

            <div className="space-y-3">
              <div className="relative">
                <label htmlFor="diagnostico-email" className="sr-only">
                  Correo electrónico
                </label>
                <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#5A6A80]" />
                <input
                  id="diagnostico-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className={cn(pub.input, 'py-3 pl-10 pr-4')}
                />
              </div>

              <button
                type="button"
                onClick={handleCalculateResult}
                disabled={!email.includes('@') || submitting}
                className={cn(pub.btnPrimary, 'w-full py-3')}
              >
                {submitting ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Ver mi resultado <ArrowRight aria-hidden className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            <p className={cn(pub.faint, 'mt-5')}>
              100% confidencial · Datos protegidos
            </p>
          </div>
        </div>
      </PublicShell>
    )
  }

  // ─── Result Phase ─────────────────────────────────────────────────────

  if (phase === 'result' && result) {
    const score = result.scoreGlobal
    const multa = result.totalMultaRiesgo
    const heroStatus = score >= 80 ? 'text-[#4ade80]' : score >= 60 ? 'text-[#fbbf24]' : 'text-[#f87171]'

    // Group gaps by area for display
    const areaScores = result.areaScores
      .filter(a => a.totalQuestions > 0)
      .sort((a, b) => a.score - b.score)

    return (
      <PublicShell>
        {/* Score hero */}
        <PublicHero
          title={
            <>
              Tu <span className={pub.highlightOnNavy}>diagnóstico</span> de compliance
            </>
          }
        >
          <div className="mt-8 flex flex-col items-center justify-center gap-8 md:flex-row">
            <ScoreRing score={score} />

            <div className="text-center md:text-left">
              <p className={cn('text-lg font-bold', heroStatus)}>
                {score >= 80 ? 'Buen nivel de compliance' : score >= 60 ? 'Nivel en riesgo — necesita mejoras' : 'Nivel crítico — acción inmediata'}
              </p>

              <div className="mt-4 flex items-center justify-center gap-2 md:justify-start">
                <TrendingDown aria-hidden className="h-5 w-5 shrink-0 text-[#f87171]" />
                <span className="text-sm text-[#CBD5E1]">
                  Multa potencial estimada: <strong className="text-lg text-[#f87171]">{formatSoles(multa)}</strong>
                </span>
              </div>

              <p className={cn(pub.faintOnNavy, 'mt-2')}>
                Basado en {companySize} trabajadores, UIT 2026 = {formatSoles(5500)}, D.S. 019-2006-TR
              </p>
            </div>
          </div>
        </PublicHero>

        <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
          {/* Area breakdown */}
          <div className={cn(pub.card, 'overflow-hidden')}>
            <div className="border-b border-[#E5EAF2] px-6 py-4">
              <h2 className={pub.h3}>Score por área</h2>
            </div>
            <div className={pub.divide}>
              {areaScores.map(area => {
                const c = area.score >= 80 ? 'bg-[#16A34A]' : area.score >= 60 ? 'bg-[#F59E0B]' : 'bg-[#DC2626]'
                return (
                  <div key={area.area} className="px-6 py-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-sm text-[#0B1B36]">{area.label}</span>
                      <span className={cn('text-sm font-bold', statusText(area.score))}>
                        {area.score}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#EEF2F7]">
                      <div className={cn('h-1.5 rounded-full transition-all', c)} style={{ width: `${area.score}%` }} />
                    </div>
                    {area.multaEstimada > 0 && (
                      <p className="mt-1 text-xs text-[#B91C1C]">Multa estimada: {formatSoles(area.multaEstimada)}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top 5 gaps */}
          <div className={cn(pub.card, 'overflow-hidden')}>
            <div className="border-b border-[#E5EAF2] px-6 py-4">
              <h2 className={pub.h3}>Top 5 brechas más urgentes</h2>
            </div>
            <div className={pub.divide}>
              {result.gapAnalysis.slice(0, 5).map((gap, i) => (
                <div key={gap.questionId} className="flex gap-3 px-6 py-4">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEF2F2] text-xs font-bold text-[#991B1B]">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#0B1B36]">{gap.text}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#5A6A80]">
                      <span>{gap.baseLegal}</span>
                      <span className={cn('rounded border px-1.5 py-0.5 text-xs font-semibold', GRAVEDAD_COLORS[gap.gravedad as keyof typeof GRAVEDAD_COLORS])}>
                        {gap.gravedad}
                      </span>
                      <span className="font-semibold text-[#B91C1C]">{formatSoles(gap.multaPEN)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA — blurred action plan teaser */}
          <div className={cn(pub.card, 'relative overflow-hidden')}>
            <div className="border-b border-[#E5EAF2] px-6 py-4">
              <h2 className={pub.h3}>Plan de acción completo</h2>
            </div>
            <div className="pointer-events-none select-none p-6 blur-sm" aria-hidden>
              {result.actionPlan.slice(0, 3).map((item, i) => (
                <div key={i} className="mb-4 rounded-lg bg-[#F5F7FB] p-4">
                  <p className="text-sm font-medium text-[#0B1B36]">Prioridad {item.priority}: {item.areaLabel}</p>
                  <p className="mt-1 text-xs text-[#475569]">{item.action}</p>
                  <p className="mt-1 text-xs text-[#B91C1C]">Multa evitable: {formatSoles(item.multaEvitable)}</p>
                </div>
              ))}
            </div>

            {/* Overlay CTA */}
            <div className="absolute inset-0 flex items-center justify-center bg-[#ffffff]/80 backdrop-blur-sm">
              <div className="px-4 text-center">
                <div className={cn(pub.iconBox, 'mx-auto mb-3 h-12 w-12')}>
                  <ShieldCheck aria-hidden className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-extrabold tracking-[-0.02em] text-[#0B1B36]">
                  Revisemos tu plan de acción juntos
                </h3>
                <p className="mx-auto mb-4 max-w-sm text-sm text-[#475569]">
                  En una llamada gratis de 30 minutos te explicamos qué corregir primero y cuánto cuesta ponerte al día.
                </p>
                <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Link href="/contacto?interes=diagnostico" className={cn(pub.btnPrimary, 'px-6')}>
                    Agendar mi llamada gratis <ArrowRight aria-hidden className="h-4 w-4" />
                  </Link>
                  <Link href="/planes" className="text-xs font-semibold text-[#1D4ED8] hover:underline">
                    Ver precios
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Trust footer */}
          <div className="py-8 text-center">
            <p className="mb-4 text-xs text-[#5A6A80]">
              Preguntas tomadas de los {QUESTION_COUNT.FULL} criterios del diagnóstico completo | Actualizado 2026 | D.S. 019-2006-TR, Ley 29783, Ley 27942
            </p>
            <Link href="/" className={cn(pub.link, 'text-xs')}>
              Volver a Comply360
            </Link>
          </div>
        </div>
      </PublicShell>
    )
  }

  // Fallback
  return null
}
