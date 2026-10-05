'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, UserCheck, X, Loader2, ChevronDown, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSoles } from '@/lib/format/peruvian'
import { getRegimenInfo } from './shared/regimen'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface WorkerData {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
  regimenLaboral: string
  tipoContrato: string
  fechaIngreso: string        // ISO date string
  sueldoBruto: number
  asignacionFamiliar: boolean
  jornadaSemanal: number
  status: string
}

interface Props {
  onSelect: (worker: WorkerData | null) => void
  selectedWorker: WorkerData | null
  /** Activar selección múltiple */
  multiple?: boolean
  /** Callback cuando se confirma selección múltiple */
  onSelectMultiple?: (workers: WorkerData[]) => void
  /** Trabajadores ya seleccionados (modo múltiple) */
  selectedWorkers?: WorkerData[]
  label?: string
  /**
   * DNI para preseleccionar un trabajador al abrir la calculadora (ej. desde
   * su ficha: `/dashboard/calculadoras/cts?dni=...`). Solo se usa una vez.
   */
  prefillDni?: string
}

// Referencia estable: un `[]` por defecto en cada render disparaba el efecto
// de sincronización en bucle.
const SIN_SELECCION: WorkerData[] = []

// ──────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────

function mapWorker(w: Record<string, unknown>): WorkerData {
  return {
    id: String(w.id ?? ''),
    firstName: String(w.firstName ?? ''),
    lastName: String(w.lastName ?? ''),
    dni: String(w.dni ?? ''),
    position: w.position ? String(w.position) : null,
    regimenLaboral: String(w.regimenLaboral ?? 'GENERAL'),
    tipoContrato: String(w.tipoContrato ?? 'INDEFINIDO'),
    fechaIngreso: String(w.fechaIngreso ?? '').split('T')[0],
    sueldoBruto: Number(w.sueldoBruto ?? 0),
    asignacionFamiliar: Boolean(w.asignacionFamiliar),
    jornadaSemanal: Number(w.jornadaSemanal ?? 48),
    status: String(w.status ?? 'ACTIVE'),
  }
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function WorkerAutoFill({
  onSelect,
  selectedWorker,
  multiple = false,
  onSelectMultiple,
  selectedWorkers = SIN_SELECCION,
  label = 'Seleccionar trabajador',
  prefillDni,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WorkerData[]>([])
  const [loading, setLoading] = useState(false)
  // Multi-select internal state
  const [multiSelected, setMultiSelected] = useState<WorkerData[]>(selectedWorkers)

  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onSelectRef = useRef(onSelect)
  const prefillHecho = useRef(false)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  // Prefill por DNI: busca al trabajador y lo selecciona (régimen incluido).
  useEffect(() => {
    const dni = prefillDni?.trim()
    if (!dni || multiple || prefillHecho.current) return
    let cancelled = false
    fetch(`/api/workers?search=${encodeURIComponent(dni)}&limit=5`)
      .then(res => (res.ok ? res.json() : null))
      .then(d => {
        if (cancelled || !d) return
        prefillHecho.current = true
        const match = ((d.data ?? []) as Record<string, unknown>[])
          .map(mapWorker)
          .find(w => w.dni === dni)
        if (match) onSelectRef.current(match)
      })
      .catch(() => { /* sin prefill: el usuario elige manualmente */ })
    return () => {
      cancelled = true
    }
  }, [prefillDni, multiple])

  // Sync external selectedWorkers
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      setMultiSelected(selectedWorkers)
    })
    return () => {
      cancelled = true
    }
  }, [selectedWorkers])

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  // Cargar trabajadores: todos al abrir, filtrados al escribir
  useEffect(() => {
    let cancelled = false
    if (!open) {
      void Promise.resolve().then(() => {
        if (!cancelled) setResults([])
      })
      return () => {
        cancelled = true
      }
    }

    const delay = query.trim() ? 300 : 0
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const url = query.trim()
          ? `/api/workers?search=${encodeURIComponent(query)}&status=ACTIVE&limit=20`
          : `/api/workers?status=ACTIVE&limit=60`
        const res = await fetch(url)
        if (!res.ok) return
        const d = await res.json()
        setResults((d.data ?? []).map(mapWorker))
      } catch { /* silent */ } finally {
        setLoading(false)
      }
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [query, open])

  // ── Single select ──
  function handleSingleSelect(w: WorkerData) {
    onSelect(w)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onSelect(null)
  }

  // ── Multi select ──
  function toggleMulti(w: WorkerData) {
    setMultiSelected(prev =>
      prev.find(s => s.id === w.id) ? prev.filter(s => s.id !== w.id) : [...prev, w]
    )
  }

  function selectAll() {
    setMultiSelected(prev => {
      const existingIds = new Set(prev.map(w => w.id))
      const newOnes = results.filter(w => !existingIds.has(w.id))
      return [...prev, ...newOnes]
    })
  }

  function clearMulti() { setMultiSelected([]) }

  function applyMulti() {
    onSelectMultiple?.(multiSelected)
    setOpen(false)
    setQuery('')
  }

  // ── Derived ──
  const hasSelection = multiple ? multiSelected.length > 0 : !!selectedWorker
  const isItemSelected = (w: WorkerData) =>
    multiple ? !!multiSelected.find(s => s.id === w.id) : selectedWorker?.id === w.id

  return (
    <div ref={containerRef} className="relative">

      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all',
          hasSelection
            ? 'border-green-300 bg-green-50 text-green-800'
            : 'border-2 border-primary/60 bg-primary/5 hover:bg-primary/10 text-[color:var(--text-primary)]',
        )}
      >
        {hasSelection ? (
          <>
            <UserCheck className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left truncate">
              {multiple ? (
                <span className="font-semibold">
                  {multiSelected.length} trabajador{multiSelected.length !== 1 ? 'es' : ''} seleccionado{multiSelected.length !== 1 ? 's' : ''}
                </span>
              ) : (
                <>
                  <span className="font-semibold">{selectedWorker!.lastName}, {selectedWorker!.firstName}</span>
                  <span className="text-xs ml-2 opacity-70">
                    {selectedWorker!.dni} · {formatSoles(Number(selectedWorker!.sueldoBruto))}
                  </span>
                </>
              )}
            </span>
            {!multiple && (
              <span
                role="button"
                onClick={handleClear}
                className="ml-auto p-0.5 rounded hover:bg-green-200 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={cn('w-4 h-4 transition-transform flex-shrink-0', open && 'rotate-180')} />
          </>
        ) : (
          <>
            {multiple ? <Users className="w-4 h-4 flex-shrink-0" /> : <Search className="w-4 h-4 flex-shrink-0" />}
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-[color:var(--bg-elevated)] border border-[color:var(--border-default)] rounded-xl shadow-xl z-50 overflow-hidden">

          {/* Buscador */}
          <div className="p-2 border-b border-[color:var(--border-subtle)]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[color:var(--bg-inset)] border border-[color:var(--border-default)] focus-within:ring-2 focus-within:ring-primary/30">
              <Search className="w-3.5 h-3.5 text-[color:var(--text-tertiary)] flex-shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nombre o DNI..."
                className="flex-1 text-sm bg-transparent outline-none text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)]"
              />
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[color:var(--text-tertiary)]" />
                : <span className="text-xs text-[color:var(--text-tertiary)]">{results.length}</span>
              }
            </div>

            {/* Seleccionar todos (solo modo múltiple) */}
            {multiple && results.length > 0 && (
              <div className="flex items-center justify-between mt-2 px-1">
                <span className="text-xs text-[color:var(--text-tertiary)]">
                  {multiSelected.length} seleccionado{multiSelected.length !== 1 ? 's' : ''}
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Seleccionar todos
                  </button>
                  {multiSelected.length > 0 && (
                    <button
                      type="button"
                      onClick={clearMulti}
                      className="text-xs text-[color:var(--text-tertiary)] hover:underline"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lista de trabajadores */}
          <div className="max-h-72 overflow-y-auto">
            {loading && results.length === 0 && (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-[color:var(--text-tertiary)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Cargando trabajadores...
              </div>
            )}
            {!loading && results.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[color:var(--text-tertiary)]">
                {query.trim() ? 'No se encontraron trabajadores' : 'No hay trabajadores activos'}
              </p>
            )}

            {results.map(w => {
              const selected = isItemSelected(w)
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => multiple ? toggleMulti(w) : handleSingleSelect(w)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 transition-colors text-left group',
                    selected
                      ? 'bg-primary/8'
                      : 'hover:bg-[color:var(--bg-surface-hover)]',
                  )}
                >
                  {/* Checkbox (modo múltiple) */}
                  {multiple && (
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
                      selected
                        ? 'bg-primary border-primary'
                        : 'border-[color:var(--border-strong)] group-hover:border-primary/60',
                    )}>
                      {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </div>
                  )}

                  {/* Avatar */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors',
                    selected ? 'bg-primary text-white' : 'bg-primary/10 text-primary',
                  )}>
                    {w.firstName[0]}{w.lastName[0]}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)] truncate">
                      {w.lastName}, {w.firstName}
                    </p>
                    <p className="text-xs text-[color:var(--text-tertiary)] truncate">
                      {w.dni} · {w.position ?? 'Sin cargo'} · {formatSoles(w.sueldoBruto)}
                    </p>
                  </div>

                  {/* Badges */}
                  <div className="flex-shrink-0 text-right space-y-0.5">
                    <span className="block text-[10px] px-1.5 py-0.5 rounded-full bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]">
                      {getRegimenInfo(w.regimenLaboral).label}
                    </span>
                    {w.asignacionFamiliar && (
                      <span className="block text-[10px] text-green-600">+ Asig. Familiar</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer modo múltiple */}
          {multiple && (
            <div className="p-2.5 border-t border-[color:var(--border-subtle)] flex items-center justify-between gap-2 bg-[color:var(--bg-inset)]">
              <span className="text-xs text-[color:var(--text-tertiary)]">
                {multiSelected.length === 0
                  ? 'Haz clic para seleccionar'
                  : `${multiSelected.length} trabajador${multiSelected.length !== 1 ? 'es' : ''} seleccionado${multiSelected.length !== 1 ? 's' : ''}`
                }
              </span>
              <button
                type="button"
                onClick={applyMulti}
                disabled={multiSelected.length === 0}
                className="text-xs px-4 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Aplicar ({multiSelected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
