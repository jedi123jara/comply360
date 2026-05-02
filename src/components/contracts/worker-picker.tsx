'use client'

/* -------------------------------------------------------------------------- */
/*  WorkerPicker — combobox dual: trabajador existente | nuevo trabajador     */
/* -------------------------------------------------------------------------- */
/*
 * Reemplaza el lookup manual por DNI con un selector que busca en el
 * directorio de trabajadores ya registrados. Cuando el usuario elige uno,
 * dispara `onSelectExisting` con TODOS los datos del worker (8+ campos
 * pre-rellenables). Si no encuentra, ofrece modo "nuevo trabajador" que
 * cae al flujo manual con DNI lookup RENIEC.
 *
 * Recents (ultimos 10 elegidos) se persisten en localStorage scoped por orgId.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2, Search, UserPlus, Users, X } from 'lucide-react'

export interface WorkerSummary {
  id: string
  dni: string
  firstName: string
  lastName: string
  position: string | null
  department: string | null
  regimenLaboral: string
  tipoContrato: string
  fechaIngreso: string
  sueldoBruto: number
  asignacionFamiliar: boolean
  email?: string | null
}

interface WorkerPickerProps {
  /** orgId para scopear los "recientes" en localStorage */
  orgId: string | null
  /** Callback al elegir un trabajador existente */
  onSelectExisting: (worker: WorkerSummary) => void
  /** Callback al elegir "nuevo trabajador" */
  onChooseNew: () => void
  /** Estado actual: si ya hay un worker seleccionado, mostrarlo como chip */
  selectedWorker?: WorkerSummary | null
  /** Limpiar seleccion */
  onClear?: () => void
}

const RECENTS_KEY_PREFIX = 'comply360:worker-picker-recents:v1:'
const MAX_RECENTS = 10

function readRecents(orgId: string | null): WorkerSummary[] {
  if (!orgId || typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(`${RECENTS_KEY_PREFIX}${orgId}`)
    if (!raw) return []
    return JSON.parse(raw) as WorkerSummary[]
  } catch {
    return []
  }
}

function pushRecent(orgId: string | null, w: WorkerSummary) {
  if (!orgId || typeof window === 'undefined') return
  try {
    const cur = readRecents(orgId).filter(r => r.id !== w.id)
    cur.unshift(w)
    const trimmed = cur.slice(0, MAX_RECENTS)
    window.localStorage.setItem(`${RECENTS_KEY_PREFIX}${orgId}`, JSON.stringify(trimmed))
  } catch {
    // localStorage lleno o bloqueado: silencio
  }
}

export function WorkerPicker({
  orgId,
  onSelectExisting,
  onChooseNew,
  selectedWorker,
  onClear,
}: WorkerPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<WorkerSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [recents, setRecents] = useState<WorkerSummary[]>([])
  const inputRef = useRef<HTMLInputElement | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setRecents(readRecents(orgId))
  }, [orgId])

  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = new URL('/api/workers', window.location.origin)
        url.searchParams.set('limit', '20')
        if (query.trim()) url.searchParams.set('search', query.trim())
        const res = await fetch(url.toString())
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        const list: WorkerSummary[] = (data.data || []).map((w: Record<string, unknown>) => ({
          id: w.id as string,
          dni: w.dni as string,
          firstName: w.firstName as string,
          lastName: w.lastName as string,
          position: (w.position as string | null) ?? null,
          department: (w.department as string | null) ?? null,
          regimenLaboral: w.regimenLaboral as string,
          tipoContrato: w.tipoContrato as string,
          fechaIngreso: w.fechaIngreso as string,
          sueldoBruto: Number(w.sueldoBruto ?? 0),
          asignacionFamiliar: !!w.asignacionFamiliar,
          email: (w.email as string | null) ?? null,
        }))
        setResults(list)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, open])

  // Focus input al abrir
  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const visibleResults = useMemo(() => {
    // Cuando no hay query y no hay results, mostrar recents
    if (!query.trim() && results.length === 0) return recents
    return results
  }, [query, results, recents])

  function handlePick(w: WorkerSummary) {
    pushRecent(orgId, w)
    setOpen(false)
    setQuery('')
    onSelectExisting(w)
  }

  // Si ya hay selectedWorker, mostrar card rica
  if (selectedWorker) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold text-lg shadow-md">
          {selectedWorker.firstName.charAt(0)}
          {selectedWorker.lastName.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-slate-900 truncate">
              {selectedWorker.firstName} {selectedWorker.lastName}
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
              <Check className="h-3 w-3" aria-hidden="true" />
              Información encontrada
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-0.5 truncate">
            DNI {selectedWorker.dni}
            {selectedWorker.position && ` · ${selectedWorker.position}`}
            {selectedWorker.department && ` · ${selectedWorker.department}`}
          </p>
        </div>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Quitar trabajador seleccionado"
            className="flex-shrink-0 rounded-lg p-1.5 text-emerald-700 hover:bg-emerald-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Card 1: Buscar existente */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 text-left hover:border-primary hover:bg-primary/10 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
              <Search className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Buscar trabajador existente</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Autocompleta la información
              </p>
            </div>
          </div>
        </button>

        {/* Card 2: Nuevo trabajador */}
        <button
          type="button"
          onClick={onChooseNew}
          className="rounded-xl border-2 border-slate-200 bg-white p-4 text-left hover:border-slate-400 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-colors">
              <UserPlus className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">Nuevo trabajador</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Registrar manualmente
              </p>
            </div>
          </div>
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Buscar trabajador"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-20 px-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Busca por nombre, DNI o cargo..."
                className="flex-1 bg-transparent border-0 outline-none text-sm text-slate-900 placeholder:text-slate-400"
                aria-label="Buscar trabajador"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden="true" />}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {!query.trim() && recents.length > 0 && (
                <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-50">
                  Recientes
                </p>
              )}
              {visibleResults.length === 0 && !loading && (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500">
                    {query.trim()
                      ? `No se encontraron trabajadores con "${query}"`
                      : 'No tienes trabajadores aún. Empieza creando uno nuevo.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      onChooseNew()
                    }}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary/90"
                  >
                    <UserPlus className="h-3 w-3" aria-hidden="true" />
                    Crear trabajador nuevo
                  </button>
                </div>
              )}
              <ul className="divide-y divide-slate-100">
                {visibleResults.map(w => (
                  <li key={w.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(w)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">
                        {w.firstName.charAt(0)}
                        {w.lastName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {w.firstName} {w.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          DNI {w.dni}
                          {w.position && ` · ${w.position}`}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase">
                        {w.regimenLaboral.replace('_', ' ')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-slate-200 px-4 py-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>{visibleResults.length} resultado{visibleResults.length === 1 ? '' : 's'}</span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onChooseNew()
                }}
                className="font-semibold text-primary hover:underline"
              >
                + Nuevo trabajador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
