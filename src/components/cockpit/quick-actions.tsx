'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * QuickActions — grid of ≤6 most-used actions for the current role.
 * Compact, visual, keyboard-accessible.
 */

export interface QuickAction {
  id: string
  label: string
  href?: string
  onClick?: () => void
  icon: LucideIcon
  hint?: string
  accent?: 'emerald' | 'amber' | 'crimson' | 'cyan' | 'gold'
}

const ACCENT_STYLES: Record<Required<QuickAction>['accent'], string> = {
  emerald: 'bg-emerald-500/12 border-emerald-400/30 text-emerald-300',
  amber: 'bg-amber-500/12 border-amber-400/30 text-amber-300',
  crimson: 'bg-crimson-500/12 border-crimson-400/30 text-crimson-300',
  cyan: 'bg-cyan-500/12 border-cyan-400/25 text-cyan-200',
  gold: 'bg-amber-500/12 border-amber-400/30 text-amber-200',
}

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="motion-fade-in-up">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--text-tertiary)] mb-3">
        Acciones rápidas
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {actions.map((a) => {
          const Icon = a.icon
          const accent = a.accent ? ACCENT_STYLES[a.accent] : ACCENT_STYLES.emerald
          const content = (
            <div
              className={cn(
                'flex flex-col items-start gap-2 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] p-3.5',
                'shadow-[var(--elevation-1)]',
                'transition-all duration-200',
                'hover:border-emerald-300 hover:shadow-[var(--elevation-2)] hover:-translate-y-0.5',
                'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60'
              )}
            >
              <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg border', accent)}>
                <Icon className="h-4 w-4" />
              </span>
              <p className="text-sm font-semibold leading-tight">{a.label}</p>
              {a.hint ? (
                <p className="text-[10px] text-[color:var(--text-tertiary)] leading-relaxed">
                  {a.hint}
                </p>
              ) : null}
            </div>
          )
          if (a.href) {
            return (
              <Link key={a.id} href={a.href} className="block">
                {content}
              </Link>
            )
          }
          return (
            <button key={a.id} type="button" onClick={a.onClick} className="text-left">
              {content}
            </button>
          )
        })}
      </div>
    </section>
  )
}
