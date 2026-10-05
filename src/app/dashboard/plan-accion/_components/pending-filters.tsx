'use client'

import type { ReactNode } from 'react'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PROGRESS_FILTERS,
  PROGRESS_FILTER_LABELS,
  SEVERITY_LABELS,
  SOURCE_FILTER_LABELS,
  TIME_FILTERS,
  TIME_FILTER_LABELS,
  countExtraFilters,
  hasActiveFilters,
  type PlanFilters,
  type PlanSeverity,
  type PlanSource,
} from '../_lib/plan-display'

const SOURCE_OPTIONS: Array<PlanSource | 'all'> = ['all', 'task', 'alert', 'training']
const SEVERITY_OPTIONS: Array<PlanSeverity | 'all'> = ['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

/**
 * Filtros de Pendientes.
 *  - Una sola fila visible: Todos · Hoy · Esta semana · Este mes + buscador.
 *  - Lo demás (tipo, urgencia, avance) vive en "Más filtros", plegado.
 * Cada chip muestra cuántos pendientes quedarían al elegirlo.
 */
export function PendingFilters({
  filters,
  onChange,
  onReset,
  countFor,
  moreOpen,
  onMoreOpenChange,
}: {
  filters: PlanFilters
  onChange: (patch: Partial<PlanFilters>) => void
  onReset: () => void
  /** Cuántos pendientes quedan si se aplica este cambio a los filtros actuales. */
  countFor: (patch: Partial<PlanFilters>) => number
  moreOpen: boolean
  onMoreOpenChange: (open: boolean) => void
}) {
  const extraCount = countExtraFilters(filters)
  const showReset = hasActiveFilters(filters)

  return (
    <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div role="group" aria-label="Plazo" className="flex flex-wrap items-center gap-2">
          {TIME_FILTERS.map((time) => (
            <FilterChip
              key={time}
              active={filters.time === time}
              onClick={() => onChange({ time })}
              label={TIME_FILTER_LABELS[time]}
              count={countFor({ time })}
            />
          ))}
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-2 lg:justify-end">
          <label className="relative min-w-0 flex-1 lg:max-w-xs">
            <span className="sr-only">Buscar pendientes</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--text-tertiary)]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filters.query}
              onChange={(event) => onChange({ query: event.target.value })}
              placeholder="Buscar por tema, trabajador o responsable"
              className="h-9 w-full rounded-lg border border-[color:var(--border-default)] bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <button
            type="button"
            onClick={() => onMoreOpenChange(!moreOpen)}
            aria-expanded={moreOpen}
            aria-controls="pendientes-mas-filtros"
            className={cn(
              'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition-colors',
              moreOpen || extraCount > 0
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-emerald-300',
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            Más filtros
            {extraCount > 0 ? (
              <span className="rounded-full bg-emerald-600 px-1.5 text-[10px] text-white">{extraCount}</span>
            ) : null}
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', moreOpen && 'rotate-180')} aria-hidden="true" />
          </button>

          {showReset ? (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)]"
            >
              <X className="h-3 w-3" aria-hidden="true" />
              Quitar filtros
            </button>
          ) : null}
        </div>
      </div>

      {moreOpen ? (
        <div
          id="pendientes-mas-filtros"
          className="mt-3 space-y-3 border-t border-[color:var(--border-subtle)] pt-3"
        >
          <FilterGroup label="Tipo">
            {SOURCE_OPTIONS.map((source) => (
              <FilterChip
                key={source}
                active={filters.source === source}
                onClick={() => onChange({ source })}
                label={SOURCE_FILTER_LABELS[source]}
                count={countFor({ source })}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Urgencia">
            {SEVERITY_OPTIONS.map((severity) => (
              <FilterChip
                key={severity}
                active={filters.severity === severity}
                onClick={() => onChange({ severity })}
                label={severity === 'all' ? 'Cualquier urgencia' : SEVERITY_LABELS[severity]}
                count={countFor({ severity })}
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Avance">
            {PROGRESS_FILTERS.map((progress) => (
              <FilterChip
                key={progress}
                active={filters.progress === progress}
                onClick={() => onChange({ progress })}
                label={PROGRESS_FILTER_LABELS[progress]}
                count={countFor({ progress })}
              />
            ))}
          </FilterGroup>
        </div>
      ) : null}
    </div>
  )
}

function FilterGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="w-20 shrink-0 text-[11px] font-bold text-[color:var(--text-tertiary)]">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
        active
          ? 'border-emerald-300 bg-emerald-600 text-white'
          : 'border-[color:var(--border-default)] bg-white text-[color:var(--text-secondary)] hover:border-emerald-300',
      )}
    >
      {label}
      <span className={cn('rounded-full px-1.5 text-[10px]', active ? 'bg-white/20' : 'bg-[color:var(--neutral-100)]')}>
        {count}
      </span>
    </button>
  )
}
