'use client'

import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  ListChecks,
  AlertTriangle,
  Clock,
  TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * ComplianceTasksPanel — widget del cockpit que muestra el estado del plan de
 * acción derivado de diagnósticos/simulacros.
 *
 * Pilares:
 *  - Count de tareas abiertas (pending + in_progress), con overdue en rojo.
 *  - Multa evitada (acumulado de tasks COMPLETED) — el "reward" visible.
 *  - Multa evitable (si resolvieras todas las abiertas).
 *  - Top 3 tasks abiertas con gravedad + multa + CTA directa.
 *
 * Vacío (0 abiertas, 0 completadas) → empty state invitando a correr diagnóstico.
 */

export interface ComplianceTaskTeaser {
  id: string
  title: string
  area: string
  gravedad: 'LEVE' | 'GRAVE' | 'MUY_GRAVE'
  priority: number
  multaEvitable: number | null
  dueDate: string | null
  overdue: boolean
}

export interface ComplianceTasksPanelProps {
  open: number
  completed: number
  overdue: number
  multaEvitable: number
  multaEvitada: number
  top: ComplianceTaskTeaser[]
}

function fmtPEN(n: number): string {
  if (n <= 0) return '—'
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 0,
  }).format(n)
}

function gravityClass(g: ComplianceTaskTeaser['gravedad']): string {
  return g === 'MUY_GRAVE'
    ? 'bg-crimson-500/12 text-crimson-400 border-crimson-500/30'
    : g === 'GRAVE'
      ? 'bg-amber-500/12 text-amber-300 border-amber-500/30'
      : 'bg-emerald-500/12 text-emerald-300 border-emerald-500/30'
}

export function ComplianceTasksPanel({
  open,
  completed,
  overdue,
  multaEvitable,
  multaEvitada,
  top,
}: ComplianceTasksPanelProps) {
  const empty = open === 0 && completed === 0

  if (empty) {
    return (
      <Card padding="lg">
        <CardHeader className="!p-0 !pb-3 !border-none">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-emerald-600" />
              Plan de acción
            </CardTitle>
            <CardDescription>
              Sin tareas aún — corre un diagnóstico o simulacro para generarlas.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="!p-0">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/diagnostico"
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-500/12 px-3 py-1.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/18 transition-colors"
            >
              Correr diagnóstico
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/simulacro"
              className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-surface)] px-3 py-1.5 text-sm font-semibold text-[color:var(--text-primary)] hover:border-crimson-400/40 transition-colors"
            >
              Simulacro SUNAFIL
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <CardHeader className="!p-0 !pb-4 !border-none">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-emerald-600" />
            Plan de acción
          </CardTitle>
          <CardDescription>
            {open > 0
              ? `${open} tareas abiertas · resolviendo podrías evitar ${fmtPEN(multaEvitable)}.`
              : 'Sin brechas abiertas en este momento.'}
          </CardDescription>
        </div>
        <Link
          href="/dashboard/plan-accion"
          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
        >
          Ver todas
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="!p-0 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            icon={ListChecks}
            label="Abiertas"
            value={open}
            tone={open > 10 ? 'crimson' : open > 0 ? 'amber' : 'emerald'}
          />
          <StatTile
            icon={AlertTriangle}
            label="Vencidas"
            value={overdue}
            tone={overdue > 0 ? 'crimson' : 'neutral'}
          />
          <StatTile
            icon={CheckCircle2}
            label="Resueltas"
            value={completed}
            tone="emerald"
          />
          <StatTile
            icon={TrendingUp}
            label="Multa evitada"
            valueText={fmtPEN(multaEvitada)}
            tone="emerald"
          />
        </div>

        {/* Top 3 open tasks */}
        {top.length > 0 ? (
          <ul className="space-y-2">
            {top.map((t) => (
              <li key={t.id}>
                <Link
                  href="/dashboard/plan-accion"
                  className="flex items-start gap-3 rounded-lg border border-[color:var(--border-subtle)] bg-[color:var(--bg-inset)] px-3 py-2.5 hover:border-emerald-400/45 hover:bg-[color:var(--bg-surface-hover)] transition-colors"
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md font-mono text-[11px] font-bold shrink-0',
                      t.priority <= 3
                        ? 'bg-crimson-500/12 text-crimson-300'
                        : t.priority <= 8
                          ? 'bg-amber-500/12 text-amber-300'
                          : 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]'
                    )}
                  >
                    {t.priority}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-1.5 py-0 text-[9px] font-bold uppercase tracking-widest',
                          gravityClass(t.gravedad)
                        )}
                      >
                        {t.gravedad.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-[color:var(--text-tertiary)]">
                        {t.area.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-semibold truncate">{t.title}</p>
                    <div className="mt-0.5 flex items-center gap-3 text-[11px] text-[color:var(--text-tertiary)]">
                      {t.multaEvitable && t.multaEvitable > 0 ? (
                        <span className="text-crimson-700 font-semibold">
                          Evita {fmtPEN(t.multaEvitable)}
                        </span>
                      ) : null}
                      {t.dueDate ? (
                        <span
                          className={cn(
                            'inline-flex items-center gap-0.5',
                            t.overdue ? 'text-crimson-300 font-semibold' : ''
                          )}
                        >
                          <Clock className="h-3 w-3" />
                          {t.overdue ? 'Vencida' : new Date(t.dueDate).toLocaleDateString('es-PE')}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-[color:var(--text-tertiary)] shrink-0 mt-1" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-4 text-center">
            <CheckCircle2 className="h-6 w-6 text-emerald-300 mx-auto mb-1" />
            <p className="text-sm font-semibold text-emerald-200">Sin brechas abiertas</p>
            <p className="text-xs text-emerald-100/70">
              Corré un nuevo diagnóstico para confirmar que sigues al día.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ── Internal ──────────────────────────────────────────────────────── */

function StatTile({
  icon: Icon,
  label,
  value,
  valueText,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value?: number
  valueText?: string
  tone: 'emerald' | 'amber' | 'crimson' | 'neutral'
}) {
  const toneClasses: Record<typeof tone, { border: string; bg: string; text: string; icon: string }> = {
    emerald: {
      border: 'border-emerald-400/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-200',
      icon: 'text-emerald-300',
    },
    amber: {
      border: 'border-amber-400/30',
      bg: 'bg-amber-500/10',
      text: 'text-amber-200',
      icon: 'text-amber-300',
    },
    crimson: {
      border: 'border-crimson-400/30',
      bg: 'bg-crimson-500/10',
      text: 'text-crimson-200',
      icon: 'text-crimson-300',
    },
    neutral: {
      border: 'border-[color:var(--border-subtle)]',
      bg: 'bg-[color:var(--bg-inset)]',
      text: 'text-[color:var(--text-primary)]',
      icon: 'text-[color:var(--text-tertiary)]',
    },
  }
  const t = toneClasses[tone]
  return (
    <div className={cn('rounded-lg border px-3 py-2.5', t.border, t.bg)}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('h-3.5 w-3.5', t.icon)} />
        <span className="text-[10px] uppercase tracking-widest text-[color:var(--text-tertiary)]">
          {label}
        </span>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums leading-tight', t.text)}>
        {valueText ?? value ?? 0}
      </p>
    </div>
  )
}
