/**
 * Piezas de UI de las calculadoras PÚBLICAS (/calculadoras/*) con el tema público
 * (hero navy, cuerpo claro, CTA ámbar).
 *
 * Misma API que `@/components/calc/calc-shell` (que siguen usando las calculadoras
 * del dashboard con su propio tema). Solo cambia la apariencia: los cálculos viven
 * en cada página y `LeadCaptureCTA` conserva exactamente la misma lógica de envío
 * a `/api/leads`. Si cambias esa lógica en calc-shell, replícala aquí.
 */
'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import { formatSoles, formatSolesParts } from '@/lib/format/peruvian'
import { cn } from '@/lib/utils'
import { PublicHero } from './public-hero'
import { pub } from './public-theme'

/** Hero navy de cada calculadora (a todo el ancho). */
export function CalcHero({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
}) {
  return (
    <PublicHero
      media={<div className={pub.iconTile}>{icon}</div>}
      eyebrow={
        <>
          <Sparkles aria-hidden className="h-3.5 w-3.5" />
          {eyebrow}
        </>
      }
      title={title}
      description={description}
    />
  )
}

/** Contenedor del cuerpo claro de la calculadora (debajo del hero). */
export function CalcBody({ children }: { children: ReactNode }) {
  return <div className={cn(pub.container, 'py-10 sm:py-12')}>{children}</div>
}

export function CalcCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={cn(pub.card, 'p-5 sm:p-8', className)}>{children}</div>
}

export function LegalBasis({ citations }: { citations: string[] }) {
  return (
    <div className={cn(pub.inset, 'mt-8 p-4 text-xs leading-5 text-[#475569] sm:p-5')}>
      <div className="mb-1.5 flex items-center gap-1.5 font-bold text-[#0B1B36]">
        <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-[#2563EB]" />
        Base legal
      </div>
      <ul className="space-y-0.5">
        {citations.map((c, i) => (
          <li key={i}>• {c}</li>
        ))}
      </ul>
    </div>
  )
}

/**
 * LeadCaptureCTA — captura de email post-cálculo.
 * Conecta a `/api/leads` con `source` para segmentar nurturing por calculadora.
 */
export function LeadCaptureCTA({
  source,
  resultSummary,
  title = '¿Te mandamos el resultado por email?',
  subtitle = 'Te enviamos el cálculo + 14 días gratis del simulacro SUNAFIL completo (sin tarjeta).',
}: {
  source: string
  resultSummary?: Record<string, unknown>
  title?: string
  subtitle?: string
}) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email,
          source,
          resultSnapshot: resultSummary ?? null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'No pudimos guardar tu email. Reintenta.')
      }
      setSubmitted(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className={cn(pub.card, 'mt-8 border-[#15803D]/30 p-6 sm:p-8')} role="status">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#15803D]">
            <CheckCircle2 aria-hidden className="h-5 w-5 text-[#ffffff]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-extrabold tracking-[-0.01em] text-[#0B1B36]">Listo, te llegó a {email}</h3>
            <p className="mt-1 text-sm text-[#475569]">
              Revisa tu bandeja en los próximos 2 minutos. Mientras tanto, ya puedes activar tu trial PRO de 14 días.
            </p>
            <Link href="/sign-up" className={cn(pub.btnPrimary, 'mt-4')}>
              Activar trial PRO gratis <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className={cn(pub.band, 'mt-8 p-6 sm:p-8')}>
      <h3 className={pub.h2OnNavy}>{title}</h3>
      <p className={cn(pub.bodyOnNavy, 'mb-5 mt-2 max-w-2xl sm:text-base')}>{subtitle}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor={`lead-email-${source}`} className="sr-only">
            Correo electrónico
          </label>
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#5A6A80]" />
          <input
            id={`lead-email-${source}`}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@empresa.pe"
            disabled={submitting}
            className={cn(pub.input, 'min-h-11 pl-10 pr-3')}
          />
        </div>
        <button type="submit" disabled={submitting || !email} className={pub.btnPrimary}>
          {submitting ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              Enviarme el resultado <ArrowRight aria-hidden className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold text-[#FCA5A5]" role="alert">
          {error}
        </p>
      )}
      <p className={cn(pub.faintOnNavy, 'mt-3')}>
        Sin spam. Solo el resultado + 1 email a los 7 días con tips de compliance.
      </p>
    </form>
  )
}

export function SignupCTA({
  title = '¿Quieres el análisis completo de tu empresa?',
  subtitle = 'Regístrate gratis y desbloqueas el diagnóstico SUNAFIL de 135 preguntas, alertas automáticas y más de 13 calculadoras vinculadas a tu planilla.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div className={cn(pub.band, 'mt-8 p-6 sm:p-8')}>
      <h3 className={pub.h2OnNavy}>{title}</h3>
      <p className={cn(pub.bodyOnNavy, 'mb-5 mt-2 max-w-2xl sm:text-base')}>{subtitle}</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link href="/sign-up" className={pub.btnPrimary}>
          Regístrate gratis <ArrowRight aria-hidden className="h-4 w-4" />
        </Link>
        <Link href="/diagnostico-gratis" className={pub.btnSecondaryOnNavy}>
          Diagnóstico express (2 min)
        </Link>
      </div>
    </div>
  )
}

export function NumberInput({
  id,
  label,
  value,
  onChange,
  prefix,
  step = 1,
  min,
  hint,
}: {
  id: string
  label: string
  value: number
  onChange: (n: number) => void
  prefix?: string
  step?: number
  min?: number
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className={pub.label}>
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-0 z-10 flex items-center pl-3 text-sm font-semibold text-[#5A6A80]">
            {prefix}
          </span>
        )}
        <input
          id={id}
          type="number"
          value={Number.isFinite(value) ? value : ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          className={cn(pub.input, prefix ? 'pl-10 pr-3' : 'px-3')}
        />
      </div>
      {hint && <p className={pub.hint}>{hint}</p>}
    </div>
  )
}

export function DateInput({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string
  label: string
  value: string
  onChange: (s: string) => void
  hint?: string
}) {
  return (
    <div>
      <label htmlFor={id} className={pub.label}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(pub.input, 'px-3')}
      />
      {hint && <p className={pub.hint}>{hint}</p>}
    </div>
  )
}

export function Toggle({
  id,
  label,
  checked,
  onChange,
  hint,
}: {
  id: string
  label: string
  checked: boolean
  onChange: (b: boolean) => void
  hint?: string
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="block h-6 w-10 rounded-full bg-[#7B8AA0] transition-colors peer-checked:bg-[#2563EB] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#2563EB]" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-[#0B1B36]">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-[#5A6A80]">{hint}</span>}
      </span>
    </label>
  )
}

const RESULT_ACCENTS = {
  brand: 'bg-[#0B1B36] shadow-[0_20px_50px_rgba(11,27,54,0.25)]',
  red: 'bg-[#991B1B] shadow-[0_20px_50px_rgba(153,27,27,0.22)]',
  amber: 'bg-[#92400E] shadow-[0_20px_50px_rgba(146,64,14,0.22)]',
} as const

/** Resultado principal: monto grande en blanco sobre navy (o rojo si es una multa sin descuento). */
export function BigNumberResult({
  label,
  amount,
  accent = 'brand',
}: {
  label: string
  amount: number
  accent?: keyof typeof RESULT_ACCENTS
}) {
  const { amount: amountText, currency: currencyText } = formatSolesParts(amount)
  return (
    <div className={cn('relative overflow-hidden rounded-2xl p-6 text-[#ffffff] sm:p-8', RESULT_ACCENTS[accent])}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-[#F5B301]" />
      <div className="mb-1 text-sm font-semibold text-[#ffffff]">{label}</div>
      <div className="text-4xl font-extrabold tracking-[-0.02em] tabular-nums sm:text-5xl">
        {amountText}
        <span className="ml-2 align-baseline text-base font-semibold text-[#E2E8F0] sm:text-lg">{currencyText}</span>
      </div>
    </div>
  )
}

export function BreakdownRow({
  label,
  amount,
  note,
  indent = false,
}: {
  label: string
  amount: number
  note?: string
  indent?: boolean
}) {
  return (
    <div className={cn('flex items-start justify-between gap-3 py-2 text-sm text-[#475569]', indent && 'pl-4')}>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {note && <div className="mt-0.5 text-xs text-[#5A6A80]">{note}</div>}
      </div>
      <div className="whitespace-nowrap font-bold tabular-nums text-[#0B1B36]">{formatSoles(amount)}</div>
    </div>
  )
}
