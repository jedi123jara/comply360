/**
 * CalcShell — shell compartido para todas las calculadoras públicas.
 * Provee: hero, form-wrapper con glass card, CTA de signup post-resultado.
 * Cada calculadora solo inyecta su form y su render de resultado.
 */
'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'

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
    <div className="text-center mb-10">
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium ring-1 ring-emerald-200 mb-4">
        <Sparkles className="w-3 h-3" />
        {eyebrow}
      </div>
      <div className="flex justify-center mb-5">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
          {icon}
        </div>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight max-w-2xl mx-auto">
        {title}
      </h1>
      <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">{description}</p>
    </div>
  )
}

export function CalcCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6 sm:p-8 ${className}`}
    >
      {children}
    </div>
  )
}

export function LegalBasis({ citations }: { citations: string[] }) {
  return (
    <div className="mt-8 rounded-xl bg-slate-50 p-4 sm:p-5 text-xs text-slate-600 ring-1 ring-slate-200">
      <div className="font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
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

export function SignupCTA({
  title = '¿Querés el análisis completo de tu empresa?',
  subtitle = 'Regístrate gratis y desbloqueá el diagnóstico SUNAFIL de 135 preguntas, alertas automáticas y más de 13 calculadoras vinculadas a tu planilla.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div className="mt-8 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-6 sm:p-8 text-white">
      <h3 className="text-lg sm:text-xl font-bold mb-2">{title}</h3>
      <p className="text-emerald-50 text-sm sm:text-base mb-4 max-w-2xl">{subtitle}</p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/sign-up"
          className="inline-flex items-center gap-1.5 bg-white hover:bg-emerald-50 text-emerald-700 font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
        >
          Registrate gratis <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/diagnostico-gratis"
          className="inline-flex items-center gap-1.5 bg-emerald-700/50 hover:bg-emerald-700/70 text-white font-semibold text-sm px-5 py-2.5 rounded-xl ring-1 ring-white/20 transition-colors"
        >
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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 text-sm pointer-events-none">
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
          className={`w-full rounded-lg border border-slate-300 bg-white ${
            prefix ? 'pl-10' : 'pl-3'
          } pr-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100`}
        />
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
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
    <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
      <span className="relative inline-flex items-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <span className="block w-10 h-6 bg-slate-300 rounded-full peer-checked:bg-emerald-600 transition-colors" />
        <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-4 transition-transform" />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-medium text-slate-700">{label}</span>
        {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}

export function BigNumberResult({
  label,
  amount,
  currency = 'S/',
  accent = 'emerald',
}: {
  label: string
  amount: number
  currency?: string
  accent?: 'emerald' | 'red' | 'amber'
}) {
  const colors = {
    emerald: 'from-emerald-500 to-emerald-600 ring-emerald-200',
    red: 'from-red-500 to-red-600 ring-red-200',
    amber: 'from-amber-500 to-amber-600 ring-amber-200',
  }
  return (
    <div
      className={`rounded-2xl bg-gradient-to-br ${colors[accent]} p-6 sm:p-8 text-white ring-1`}
    >
      <div className="text-sm font-medium opacity-90 mb-1">{label}</div>
      <div className="text-4xl sm:text-5xl font-bold tracking-tight tabular-nums">
        {currency}{' '}
        {amount.toLocaleString('es-PE', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
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
    <div
      className={`flex items-start justify-between gap-3 py-2 text-sm ${
        indent ? 'pl-4 text-slate-600' : 'text-slate-700'
      }`}
    >
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        {note && <div className="text-xs text-slate-500 mt-0.5">{note}</div>}
      </div>
      <div className="tabular-nums font-semibold text-slate-900 whitespace-nowrap">
        S/ {amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
    </div>
  )
}
