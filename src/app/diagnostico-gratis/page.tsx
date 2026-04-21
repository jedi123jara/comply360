'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, XCircle, MinusCircle, Scale, Loader2, Mail, TrendingDown, FileText, Users, Clock, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EXPRESS_QUESTIONS, AREAS } from '@/lib/compliance/questions'
import { scoreDiagnostic } from '@/lib/compliance/diagnostic-scorer'
import { track } from '@/lib/analytics'
import type { ComplianceQuestion } from '@/lib/compliance/questions'
import type { QuestionAnswer, DiagnosticResult } from '@/lib/compliance/diagnostic-scorer'
import type { AnswerValue } from '@/lib/compliance/questions/types'

// ─── Types ──────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'quiz' | 'capture' | 'result'

// ─── Constants ──────────────────────────────────────────────────────────────

const GRAVEDAD_COLORS = {
  LEVE: 'text-amber-600 bg-amber-50 border-amber-200',
  GRAVE: 'text-red-600 bg-red-50 border-red-200',
  MUY_GRAVE: 'text-red-800 bg-red-100 border-red-300',
}

const ANSWER_CONFIG = [
  { value: 'SI' as AnswerValue, label: 'Si, cumplimos', icon: CheckCircle2, color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'PARCIAL' as AnswerValue, label: 'Parcialmente', icon: MinusCircle, color: 'border-amber-500 bg-amber-50 text-amber-700' },
  { value: 'NO' as AnswerValue, label: 'No cumplimos', icon: XCircle, color: 'border-red-500 bg-red-50 text-red-700' },
]

// ─── Score Ring Component ────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="70" cy="70" r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="block text-xs text-gray-400">/100</span>
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

  // Use express questions (38 questions, no auth needed)
  const questions: ComplianceQuestion[] = useMemo(() => {
    // For public landing, we use a subset of 20 of the express questions (the highest-weight ones)
    return [...EXPRESS_QUESTIONS]
      .sort((a, b) => b.peso - a.peso)
      .slice(0, 20)
  }, [])

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
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.98) 100%), linear-gradient(135deg, #ecfdf5 0%, #f8fafc 55%, #fefce8 100%)',
        }}
      >
        {/* Grid overlay + halo emerald */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            maskImage: 'radial-gradient(80% 60% at 50% 40%, #000 0%, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(80% 60% at 50% 40%, #000 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: '-20%',
            right: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.22), transparent 70%)',
            animation: 'c360-breathe 6s ease-in-out infinite',
          }}
        />

        <div className="relative max-w-2xl w-full text-center">
          {/* Eyebrow editorial */}
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 mb-6">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Diagnóstico express · 100% gratis
            </span>
          </div>

          {/* Hero editorial */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontWeight: 400,
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: 'var(--text-primary)',
              marginBottom: 18,
            }}
            dangerouslySetInnerHTML={{
              __html:
                '¿Cuánto te costaría una inspección <em style="color: var(--emerald-700); font-style: italic">SUNAFIL</em> hoy?',
            }}
          />
          <p className="text-lg text-gray-600 leading-relaxed max-w-xl mx-auto mb-8">
            Respondé 20 preguntas en 10 minutos y obtené tu <b>score de compliance</b>,
            la <b>multa potencial estimada</b> y un plan de acción priorizado — todo sin registro.
          </p>

          {/* Stats trust signals */}
          <div className="grid grid-cols-3 gap-3 mb-8 max-w-lg mx-auto">
            {[
              { icon: Clock, label: '10 min', sub: 'Rápido y directo' },
              { icon: FileText, label: '20 preguntas', sub: 'Las más críticas' },
              { icon: ShieldCheck, label: 'Resultado en vivo', sub: 'Score + multa estimada' },
            ].map(({ icon: Icon, label, sub }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  backdropFilter: 'blur(10px)',
                  border: '0.5px solid var(--border-subtle)',
                }}
              >
                <Icon className="h-5 w-5 text-emerald-600 mx-auto mb-2" />
                <p
                  className="text-sm"
                  style={{
                    fontFamily: 'var(--font-serif)',
                    color: 'var(--text-primary)',
                    fontWeight: 400,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {label}
                </p>
                <p className="text-[11px] text-gray-500">{sub}</p>
              </div>
            ))}
          </div>

          {/* Company size input */}
          <div
            className="rounded-xl p-5 mb-6 text-left max-w-md mx-auto"
            style={{
              background: 'white',
              border: '0.5px solid var(--border-default)',
              boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
            }}
          >
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-700 mb-2">
              <Users className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-emerald-600" />
              ¿Cuántos trabajadores tiene tu empresa?
            </label>
            <input
              type="number"
              min={1}
              max={9999}
              value={companySize}
              onChange={e => setCompanySize(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg border border-[color:var(--border-default)] px-4 py-2.5 text-base bg-white text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
              placeholder="Ej: 25"
            />
            <p className="mt-2 text-xs text-gray-500">
              La multa estimada se ajusta según el tamaño (base legal: D.S. 019-2006-TR).
            </p>
          </div>

          {/* CTA primario emerald */}
          <button
            type="button"
            onClick={() => {
              track('free_diagnostic_started', { company_size: companySize })
              setPhase('quiz')
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-8 py-4 text-base font-bold text-white transition-all"
            style={{
              boxShadow: '0 12px 32px -8px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.14)',
            }}
          >
            Iniciar diagnóstico gratis <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-3 text-xs text-gray-500">
            Sin registro · sin tarjeta · datos 100% confidenciales
          </p>

          {/* Trust badges */}
          <div className="mt-10 flex items-center justify-center gap-6 flex-wrap text-gray-500">
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Scale className="h-3.5 w-3.5" /> Basado en normativa vigente
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <ShieldCheck className="h-3.5 w-3.5" /> D.S. 019-2006-TR
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs">
              <Award className="h-3.5 w-3.5" /> UIT 2026: S/ 5,500
            </span>
          </div>

          {/* Volver a landing */}
          <Link
            href="/"
            className="mt-8 inline-block text-xs text-gray-500 hover:text-emerald-700 font-medium"
          >
            ← Volver al sitio
          </Link>
        </div>
      </div>
    )
  }

  // ─── Quiz Phase ───────────────────────────────────────────────────────

  if (phase === 'quiz' && currentQ) {
    const currentAnswer = answers.get(currentQ.id)
    const gravedadStyle = GRAVEDAD_COLORS[currentQ.infraccionGravedad] ?? GRAVEDAD_COLORS.LEVE

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Top progress bar */}
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 bg-white/[0.04]">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="border-b bg-white border-[color:var(--border-default)]">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-bold text-gray-900">Comply<span className="text-emerald-700">360</span></span>
            </div>
            <span className="text-sm text-gray-500">
              Pregunta {currentIdx + 1} de {totalQuestions}
            </span>
          </div>
        </div>

        {/* Question card */}
        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="rounded-2xl bg-white border border-[color:var(--border-default)] shadow-sm p-8">
            {/* Area badge */}
            <div className="flex items-center gap-2 mb-4">
              <span className={cn('inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium', gravedadStyle)}>
                {currentQ.infraccionGravedad}
              </span>
              <span className="text-xs text-gray-400">
                {AREAS.find(a => a.key === currentQ.area)?.label}
              </span>
            </div>

            {/* Question text */}
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {currentQ.text}
            </h2>

            <p className="text-xs text-gray-400 mb-8">
              Base legal: {currentQ.baseLegal} | Multa: {currentQ.multaUIT} UIT (S/ {(currentQ.multaUIT * 5500).toLocaleString('es-PE')})
            </p>

            {/* Answer buttons */}
            <div className="grid gap-3">
              {ANSWER_CONFIG.map(({ value, label, icon: Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleAnswer(value)}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 px-5 py-4 text-left transition-all',
                    currentAnswer === value
                      ? color
                      : 'border-[color:var(--border-default)] bg-white text-gray-300 hover:border-gray-300',
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[color:var(--border-default)]">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentIdx === 0}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 disabled:opacity-30"
              >
                <ArrowLeft className="h-4 w-4" /> Anterior
              </button>

              <div className="flex gap-1">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'h-2 w-2 rounded-full transition-colors',
                      i === currentIdx ? 'bg-amber-500' : answers.has(questions[i].id) ? 'bg-emerald-400' : 'bg-gray-200',
                    )}
                  />
                ))}
              </div>

              {currentIdx < totalQuestions - 1 && answers.has(currentQ.id) && (
                <button
                  type="button"
                  onClick={() => setCurrentIdx(currentIdx + 1)}
                  className="flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Siguiente <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Email Capture Phase ──────────────────────────────────────────────

  if (phase === 'capture') {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{
          background:
            'linear-gradient(rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.98) 100%), linear-gradient(135deg, #ecfdf5 0%, #f8fafc 55%, #fefce8 100%)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: '-15%',
            right: '-10%',
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.18), transparent 70%)',
            animation: 'c360-breathe 6s ease-in-out infinite',
          }}
        />

        <div className="relative max-w-md w-full">
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'white',
              border: '0.5px solid var(--border-default)',
              boxShadow: '0 20px 40px -12px rgba(4,120,87,0.18), 0 4px 8px rgba(15,23,42,0.04)',
            }}
          >
            {/* Success icon */}
            <div className="flex justify-center mb-5">
              <div
                className="flex items-center justify-center rounded-2xl"
                style={{
                  width: 56,
                  height: 56,
                  background: 'linear-gradient(165deg, #10b981 0%, #047857 100%)',
                  boxShadow:
                    '0 8px 24px -6px rgba(4,120,87,0.45), inset 0 1px 0 rgba(255,255,255,0.18)',
                }}
              >
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
            </div>

            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Diagnóstico completado</span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 28,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                lineHeight: 1.15,
                marginBottom: 8,
              }}
              dangerouslySetInnerHTML={{
                __html:
                  'Tu resultado está <em style="color: var(--emerald-700); font-style: italic">listo</em>.',
              }}
            />
            <p className="text-sm text-gray-600 mb-6">
              Dejanos tu email y desbloqueamos tu score, la multa potencial y las 5 brechas más urgentes.
              Sin spam — sólo el resultado y un tip de compliance semanal.
            </p>

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full rounded-lg border border-[color:var(--border-default)] bg-white pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-colors"
                />
              </div>

              <button
                type="button"
                onClick={handleCalculateResult}
                disabled={!email.includes('@') || submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  boxShadow:
                    '0 10px 24px -6px rgba(4,120,87,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Ver mi resultado <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            <p className="mt-5 text-xs text-gray-500">
              100% confidencial · Datos protegidos
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── Result Phase ─────────────────────────────────────────────────────

  if (phase === 'result' && result) {
    const score = result.scoreGlobal
    const multa = result.totalMultaRiesgo

    // Group gaps by area for display
    const areaScores = result.areaScores
      .filter(a => a.totalQuestions > 0)
      .sort((a, b) => a.score - b.score)

    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-[color:var(--border-default)]">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-amber-500" />
              <span className="text-sm font-bold text-gray-900">Comply<span className="text-emerald-700">360</span></span>
            </div>
            <Link
              href="/sign-up"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
            >
              Crear cuenta gratuita
            </Link>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
          {/* Score hero */}
          <div className="rounded-2xl bg-white border border-[color:var(--border-default)] shadow-sm p-8 text-center">
            <h1
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 30,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                marginBottom: 24,
              }}
              dangerouslySetInnerHTML={{
                __html:
                  'Tu <em style="color: var(--emerald-700); font-style: italic">diagnóstico</em> de compliance',
              }}
            />

            <div className="flex flex-col md:flex-row items-center justify-center gap-8">
              <ScoreRing score={score} />

              <div className="text-left">
                <p className={cn(
                  'text-lg font-bold',
                  score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600',
                )}>
                  {score >= 80 ? 'Buen nivel de compliance' : score >= 60 ? 'Nivel en riesgo — necesita mejoras' : 'Nivel critico — accion inmediata'}
                </p>

                <div className="mt-4 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  <span className="text-sm text-gray-600">
                    Multa potencial estimada: <strong className="text-red-600 text-lg">S/ {multa.toLocaleString('es-PE')}</strong>
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-400">
                  Basado en {companySize} trabajadores, UIT 2026 = S/ 5,500, D.S. 019-2006-TR
                </p>
              </div>
            </div>
          </div>

          {/* Area breakdown */}
          <div className="rounded-2xl bg-white border border-[color:var(--border-default)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[color:var(--border-default)]">
              <h2 className="text-base font-semibold text-gray-900">Score por área</h2>
            </div>
            <div className="divide-y">
              {areaScores.map(area => {
                const c = area.score >= 80 ? 'bg-emerald-500' : area.score >= 60 ? 'bg-amber-500' : 'bg-red-500'
                return (
                  <div key={area.area} className="px-6 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300">{area.label}</span>
                      <span className={cn('text-sm font-bold', area.score >= 80 ? 'text-emerald-600' : area.score >= 60 ? 'text-amber-600' : 'text-red-600')}>
                        {area.score}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[color:var(--neutral-100)]">
                      <div className={cn('h-1.5 rounded-full transition-all', c)} style={{ width: `${area.score}%` }} />
                    </div>
                    {area.multaEstimada > 0 && (
                      <p className="mt-1 text-xs text-red-500">Multa estimada: S/ {area.multaEstimada.toLocaleString('es-PE')}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top 5 gaps */}
          <div className="rounded-2xl bg-white border border-[color:var(--border-default)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[color:var(--border-default)]">
              <h2 className="text-base font-semibold text-gray-900">Top 5 brechas más urgentes</h2>
            </div>
            <div className="divide-y">
              {result.gapAnalysis.slice(0, 5).map((gap, i) => (
                <div key={gap.questionId} className="px-6 py-4 flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300">{gap.text}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>{gap.baseLegal}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', GRAVEDAD_COLORS[gap.gravedad as keyof typeof GRAVEDAD_COLORS])}>
                        {gap.gravedad}
                      </span>
                      <span className="text-red-500 font-medium">S/ {gap.multaPEN.toLocaleString('es-PE')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA — blurred action plan teaser */}
          <div className="relative rounded-2xl bg-white border border-[color:var(--border-default)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[color:var(--border-default)]">
              <h2 className="text-base font-semibold text-gray-900">Plan de acción completo</h2>
            </div>
            <div className="p-6 blur-sm select-none pointer-events-none" aria-hidden>
              {result.actionPlan.slice(0, 3).map((item, i) => (
                <div key={i} className="mb-4 rounded-lg bg-[color:var(--neutral-50)] p-4">
                  <p className="text-sm font-medium text-gray-300">Prioridad {item.priority}: {item.areaLabel}</p>
                  <p className="text-xs text-gray-500 mt-1">{item.action}</p>
                  <p className="text-xs text-red-500 mt-1">Multa evitable: S/ {item.multaEvitable.toLocaleString('es-PE')}</p>
                </div>
              ))}
            </div>

            {/* Overlay CTA */}
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 bg-[#141824]/70 backdrop-blur-sm">
              <div className="text-center px-4">
                <ShieldCheck className="h-10 w-10 text-emerald-700 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Registrate para ver el plan completo
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
                  Accede al plan de accion detallado, simulacro SUNAFIL interactivo, alertas automaticas y mas.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Crear cuenta gratis <ArrowRight className="h-4 w-4" />
                  </Link>
                  <span className="text-xs text-gray-400">Prueba gratuita, sin tarjeta de credito</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust footer */}
          <div className="text-center py-8">
            <p className="text-xs text-gray-400 mb-4">
              Mas de 135 criterios de compliance laboral peruano | Actualizado 2026 | D.S. 019-2006-TR, Ley 29783, Ley 27942
            </p>
            <Link href="/" className="text-xs text-emerald-700 hover:underline">
              Volver a COMPLY360
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Fallback
  return null
}
