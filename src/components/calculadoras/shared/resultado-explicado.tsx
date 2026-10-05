'use client'

import type { ReactNode } from 'react'
import { Lightbulb, Scale, ChevronDown } from 'lucide-react'

export interface BaseLegalSimple {
  /** Norma, ej. "D.S. 001-97-TR". */
  norma: string
  /** Qué dice la norma, en una frase simple. */
  enSimple: string
}

interface ResultadoExplicadoProps {
  /** Resumen de una línea: de dónde sale el monto. */
  resumen: string
  /** Pasos del cálculo con los montos del caso, en lenguaje simple. */
  pasos: ReactNode[]
  baseLegal: BaseLegalSimple[]
  /** Fórmula técnica del motor (se muestra plegada). */
  formulaTecnica?: string
  /** Texto adicional al pie (aclaraciones, ej. descuentos que no incluye). */
  nota?: ReactNode
}

/**
 * Explica un resultado en lenguaje simple: de dónde sale el monto (paso a
 * paso), qué dice la ley en simple y, plegada, la fórmula técnica completa.
 */
export function ResultadoExplicado({
  resumen,
  pasos,
  baseLegal,
  formulaTecnica,
  nota,
}: ResultadoExplicadoProps) {
  return (
    <section className="rounded-2xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-200">
            <Lightbulb className="h-4 w-4 text-amber-600" aria-hidden />
          </span>
          <div>
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">
              ¿De dónde sale este monto?
            </h3>
            <p className="mt-0.5 text-sm text-[color:var(--text-secondary)]">{resumen}</p>
          </div>
        </div>

        {pasos.length > 0 && (
          <ol className="space-y-2.5">
            {pasos.map((paso, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[color:var(--neutral-100)] text-[11px] font-bold text-[color:var(--text-secondary)]">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-[color:var(--text-primary)]">{paso}</p>
              </li>
            ))}
          </ol>
        )}

        {nota ? (
          <p className="rounded-xl bg-[color:var(--bg-inset)] px-3.5 py-2.5 text-xs leading-relaxed text-[color:var(--text-secondary)]">
            {nota}
          </p>
        ) : null}
      </div>

      {baseLegal.length > 0 && (
        <div className="border-t border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] px-5 sm:px-6 py-4">
          <p className="mb-2.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[color:var(--text-tertiary)]">
            <Scale className="h-3.5 w-3.5" aria-hidden />
            Lo que dice la ley, en simple
          </p>
          <ul className="space-y-2">
            {baseLegal.map((ref) => (
              <li key={ref.norma} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                <span className="inline-flex w-fit flex-shrink-0 rounded-md border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--text-secondary)]">
                  {ref.norma}
                </span>
                <span className="text-sm text-[color:var(--text-secondary)]">{ref.enSimple}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {formulaTecnica ? (
        <details className="group border-t border-[color:var(--border-subtle)]">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-5 sm:px-6 py-3 text-xs font-semibold text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] [&::-webkit-details-marker]:hidden">
            Ver la fórmula técnica (para tu contador o asesor)
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <code className="mx-5 sm:mx-6 mb-4 block whitespace-pre-wrap break-words rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-inset)] px-4 py-3 font-mono text-xs leading-relaxed text-[color:var(--text-secondary)]">
            {formulaTecnica}
          </code>
        </details>
      ) : null}
    </section>
  )
}
