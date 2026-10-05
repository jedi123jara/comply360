'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import type { CTSInput } from '@/lib/legal-engine'
import { Users, Download, RefreshCw, Loader2, CheckCircle, Search, ChevronDown, ChevronUp, FileSpreadsheet, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatSoles } from '@/lib/format/peruvian'
import { AVISO_REFERENCIAL, esRegimenEspecial, getRegimenInfo } from './shared/regimen'
import { opcionesCorteCTS, periodoCTS, proximoCorteCTS } from './shared/fechas'

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface WorkerRaw {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
  regimenLaboral: string
  fechaIngreso: string
  sueldoBruto: string | number
  asignacionFamiliar: boolean
  status: string
}

interface WorkerRow extends WorkerRaw {
  ctsResult: ReturnType<typeof calcularCTS> | null
  error: string | null
  /** Régimen con reglas propias que el motor aún no calcula: monto referencial. */
  referencial: boolean
}

/**
 * Regímenes SIN CTS. El resto se calcula; los regímenes especiales (agrario,
 * construcción civil, pesquero, hogar, CAS) salen como referenciales.
 */
const SIN_CTS: Record<string, string> = {
  MYPE_MICRO: 'Sin CTS (microempresa)',
  MODALIDAD_FORMATIVA: 'Sin CTS (practicante)',
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function BulkCTSCalculadora() {
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  // Por defecto el PRÓXIMO depósito; nunca un periodo que ya pasó.
  const [opcionesCorte] = useState(() => opcionesCorteCTS())
  const [fechaCorte, setFechaCorte] = useState(() => proximoCorteCTS())
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'nombre' | 'cts' | 'regimen'>('cts')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fetchedRef = useRef(false)

  const fetchAndCalculate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/workers?limit=500&status=ACTIVE')
      if (!res.ok) throw new Error('Error al cargar trabajadores')
      const data = await res.json()
      const raw: WorkerRaw[] = data.data ?? []

      const rows: WorkerRow[] = raw.map(w => {
        const sinCts = SIN_CTS[w.regimenLaboral]
        if (sinCts) {
          return { ...w, ctsResult: null, error: sinCts, referencial: false }
        }
        const referencial = esRegimenEspecial(w.regimenLaboral)

        try {
          const input: CTSInput = {
            sueldoBruto: Number(w.sueldoBruto),
            fechaIngreso: w.fechaIngreso.split('T')[0],
            fechaCorte,
            asignacionFamiliar: w.asignacionFamiliar ?? false,
            ultimaGratificacion: 0, // No stored yet; field editable per-row
            // FIX auditoría P0 (JUR-01): MYPE_PEQUENA recibe 50% de CTS (Ley 32353),
            // antes se pagaba el 100% del régimen general.
            regimenLaboral: w.regimenLaboral,
          }
          if (input.sueldoBruto <= 0 || !input.fechaIngreso) {
            return { ...w, ctsResult: null, error: 'Datos incompletos', referencial }
          }
          // Ingresó después del semestre: todavía no le toca este depósito.
          if (input.fechaIngreso >= `${fechaCorte.slice(0, 8)}01`) {
            return { ...w, ctsResult: null, error: 'Aún no le corresponde', referencial }
          }
          return { ...w, ctsResult: calcularCTS(input), error: null, referencial }
        } catch (e) {
          return { ...w, ctsResult: null, error: e instanceof Error ? e.message : 'Error', referencial }
        }
      })

      setWorkers(rows)
      // Los referenciales no se suman al total hasta que el usuario los marque.
      setSelected(new Set(rows.filter(r => r.ctsResult !== null && !r.referencial).map(r => r.id)))
      setFetched(true)
      fetchedRef.current = true
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [fechaCorte])

  useEffect(() => {
    fetchedRef.current = fetched
  }, [fetched])

  // Recalculate when fechaCorte changes (if already fetched)
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (fetchedRef.current) void fetchAndCalculate()
    })
    return () => {
      cancelled = true
    }
  }, [fechaCorte, fetchAndCalculate])

  function updateGratificacion(id: string, value: number) {
    setWorkers(prev => prev.map(w => {
      if (w.id !== id) return w
      try {
        const input: CTSInput = {
          sueldoBruto: Number(w.sueldoBruto),
          fechaIngreso: w.fechaIngreso.split('T')[0],
          fechaCorte,
          asignacionFamiliar: w.asignacionFamiliar ?? false,
          ultimaGratificacion: value,
          // FIX auditoría P0 (JUR-01): factor de régimen (MYPE_PEQUENA 50%).
          regimenLaboral: w.regimenLaboral,
        }
        return { ...w, ctsResult: calcularCTS(input), error: null }
      } catch {
        return w
      }
    }))
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return workers
      .filter(w =>
        !q ||
        `${w.firstName} ${w.lastName}`.toLowerCase().includes(q) ||
        w.dni.includes(q) ||
        (w.position ?? '').toLowerCase().includes(q)
      )
      .sort((a, b) => {
        let v = 0
        if (sortField === 'nombre') v = `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`)
        if (sortField === 'cts') v = (a.ctsResult?.ctsTotal ?? 0) - (b.ctsResult?.ctsTotal ?? 0)
        if (sortField === 'regimen') v = a.regimenLaboral.localeCompare(b.regimenLaboral)
        return sortDir === 'asc' ? v : -v
      })
  }, [workers, search, sortField, sortDir])

  const selectedRows = filtered.filter(w => selected.has(w.id) && w.ctsResult)
  const totalCTS = selectedRows.reduce((s, w) => s + (w.ctsResult?.ctsTotal ?? 0), 0)
  const conCTS = workers.filter(w => w.ctsResult !== null).length
  const sinCTS = workers.length - conCTS

  async function exportExcel() {
    const rows = selectedRows.map(w => ({
      'DNI': w.dni,
      'Apellidos': w.lastName,
      'Nombres': w.firstName,
      'Cargo': w.position ?? '',
      'Régimen': getRegimenInfo(w.regimenLaboral).label,
      'Referencial': w.referencial ? 'Sí' : 'No',
      'Fecha Ingreso': w.fechaIngreso.split('T')[0],
      'Sueldo Bruto': Number(w.sueldoBruto),
      'Asig. Familiar': w.asignacionFamiliar ? 'Sí' : 'No',
      'Rem. Computable': w.ctsResult?.remuneracionComputable ?? 0,
      'Meses Computables': w.ctsResult?.mesesComputables ?? 0,
      'Días Computables': w.ctsResult?.diasComputables ?? 0,
      'CTS a Depositar (S/)': w.ctsResult?.ctsTotal ?? 0,
      'Fecha Corte': fechaCorte,
    }))

    const { addJsonSheet, createWorkbook, workbookToArrayBuffer } = await import('@/lib/excel/exceljs')
    const workbook = createWorkbook()
    addJsonSheet(workbook, 'CTS', rows, {
      columnWidths: [8, 18, 18, 20, 22, 11, 14, 12, 12, 16, 16, 14, 18, 14],
    })
    const buffer = await workbookToArrayBuffer(workbook)
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `CTS_Masivo_${fechaCorte}.xlsx`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderSortIcon = (field: typeof sortField) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-30" />

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          {/* Fecha corte */}
          <div className="flex-1 min-w-[180px]">
            <label htmlFor="cts-bulk-corte" className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">
              Depósito
            </label>
            <select
              id="cts-bulk-corte"
              value={fechaCorte}
              onChange={e => setFechaCorte(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-sm text-[color:var(--text-primary)]"
            >
              {opcionesCorte.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[color:var(--text-tertiary)]">Semestre {periodoCTS(fechaCorte)}</p>
          </div>

          {/* Search */}
          <div className="flex-[2] min-w-[220px]">
            <label className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">
              Buscar trabajador
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text-tertiary)]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nombre, DNI o cargo..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-tertiary)] outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={fetchAndCalculate}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              {fetched ? 'Recalcular' : 'Calcular todos'}
            </button>

            {fetched && selectedRows.length > 0 && (
              <button
                onClick={exportExcel}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Excel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {fetched && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[color:var(--bg-elevated)] rounded-xl border border-[color:var(--border-default)] p-4">
            <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Trabajadores</p>
            <p className="text-2xl font-bold text-[color:var(--text-primary)]">{workers.length}</p>
          </div>
          <div className="bg-[color:var(--bg-elevated)] rounded-xl border border-[color:var(--border-default)] p-4">
            <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Con CTS</p>
            <p className="text-2xl font-bold text-green-600">{conCTS}</p>
          </div>
          <div className="bg-[color:var(--bg-elevated)] rounded-xl border border-[color:var(--border-default)] p-4">
            <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Sin CTS (exentos)</p>
            <p className="text-2xl font-bold text-[color:var(--text-tertiary)]">{sinCTS}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-600 font-semibold mb-1">Total CTS a depositar</p>
            <p className="text-2xl font-bold text-blue-700">{formatSoles(totalCTS)}</p>
          </div>
        </div>
      )}

      {fetched && workers.some(w => w.referencial && w.ctsResult) && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden />
          <div>
            <p className="text-sm font-bold">
              {workers.filter(w => w.referencial && w.ctsResult).length} trabajador(es) con régimen especial
            </p>
            <p className="text-sm">
              {AVISO_REFERENCIAL} Su CTS no se suma al total hasta que la marques.
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {fetched && (
        <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-[color:var(--border-subtle)]">
            <div className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{filtered.length} trabajadores</span>
              {selected.size > 0 && <span className="text-xs text-[color:var(--text-tertiary)]">· {selected.size} seleccionados</span>}
            </div>
            <label className="flex items-center gap-2 text-xs text-[color:var(--text-tertiary)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selectedRows.length === filtered.filter(w => w.ctsResult).length && filtered.some(w => w.ctsResult)}
                onChange={e => {
                  if (e.target.checked) setSelected(new Set(filtered.filter(w => w.ctsResult).map(w => w.id)))
                  else setSelected(new Set())
                }}
                className="rounded"
              />
              Seleccionar todos
            </label>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[color:var(--bg-inset)] border-b border-[color:var(--border-subtle)]">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-4 py-2.5 text-left">
                    <button onClick={() => toggleSort('nombre')} className="flex items-center gap-1 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider hover:text-[color:var(--text-primary)]">
                      Trabajador {renderSortIcon('nombre')}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left">
                    <button onClick={() => toggleSort('regimen')} className="flex items-center gap-1 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider hover:text-[color:var(--text-primary)]">
                      Régimen {renderSortIcon('regimen')}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Sueldo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Últ. Gratif.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Rem. Comp.</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Meses</th>
                  <th className="px-4 py-2.5 text-right">
                    <button onClick={() => toggleSort('cts')} className="flex items-center gap-1 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider hover:text-[color:var(--text-primary)] ml-auto">
                      CTS {renderSortIcon('cts')}
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-subtle)]">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-[color:var(--text-tertiary)]">
                      No se encontraron trabajadores
                    </td>
                  </tr>
                )}
                {filtered.map(w => {
                  const hasCTS = w.ctsResult !== null
                  const isSelected = selected.has(w.id)
                  return (
                    <tr
                      key={w.id}
                      className={cn(
                        'transition-colors',
                        isSelected && hasCTS ? 'bg-blue-50/30' : 'hover:bg-[color:var(--bg-surface-hover)]',
                        !hasCTS && 'opacity-50',
                      )}
                    >
                      <td className="px-3 py-3 text-center">
                        {hasCTS && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={e => setSelected(prev => {
                              const next = new Set(prev)
                              if (e.target.checked) next.add(w.id)
                              else next.delete(w.id)
                              return next
                            })}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                            {w.firstName[0]}{w.lastName[0]}
                          </div>
                          <div>
                            <p className="font-semibold text-[color:var(--text-primary)] text-xs leading-tight">
                              {w.lastName}, {w.firstName}
                            </p>
                            <p className="text-[11px] text-[color:var(--text-tertiary)]">{w.dni} · {w.position ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] font-medium">
                          {getRegimenInfo(w.regimenLaboral).label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-[color:var(--text-secondary)]">
                        {formatSoles(Number(w.sueldoBruto))}
                      </td>
                      {/* Editable gratificación */}
                      <td className="px-4 py-3 text-right">
                        {hasCTS ? (
                          <input
                            type="number"
                            min={0}
                            defaultValue={0}
                            onChange={e => updateGratificacion(w.id, Number(e.target.value))}
                            className="w-24 text-right px-2 py-1 rounded-lg border border-[color:var(--border-default)] bg-[color:var(--bg-elevated)] text-xs text-[color:var(--text-primary)]"
                            placeholder="0.00"
                          />
                        ) : <span className="text-[color:var(--text-secondary)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-[color:var(--text-secondary)]">
                        {w.ctsResult ? formatSoles(w.ctsResult.remuneracionComputable) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-[color:var(--text-secondary)]">
                        {w.ctsResult
                          ? `${w.ctsResult.mesesComputables}m ${w.ctsResult.diasComputables}d`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {w.ctsResult ? (
                          <span className="text-base font-bold text-blue-700">
                            {formatSoles(w.ctsResult.ctsTotal)}
                          </span>
                        ) : <span className="text-xs text-[color:var(--text-tertiary)]">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasCTS && w.referencial ? (
                          <span
                            title={AVISO_REFERENCIAL}
                            className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
                          >
                            <AlertTriangle className="w-3 h-3" aria-hidden />
                            Referencial
                          </span>
                        ) : hasCTS ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-[10px] text-[color:var(--text-tertiary)] leading-tight block max-w-[80px] mx-auto">
                            {w.error}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {selectedRows.length > 0 && (
                <tfoot>
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td colSpan={7} className="px-4 py-3 text-sm font-bold text-blue-700 text-right">
                      Total a depositar ({selectedRows.length} trabajadores):
                    </td>
                    <td className="px-4 py-3 text-right text-lg font-bold text-blue-700">
                      {formatSoles(totalCTS)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!fetched && !loading && (
        <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-base font-bold text-[color:var(--text-primary)] mb-1">
            Cálculo Masivo de CTS
          </h3>
          <p className="text-sm text-[color:var(--text-tertiary)] max-w-sm mb-6">
            Calcula automáticamente la CTS de todos los trabajadores activos de tu empresa.
            Elige el depósito y haz clic en &quot;Calcular todos&quot;. Se usa el régimen de cada trabajador.
          </p>
          <button
            onClick={fetchAndCalculate}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Calcular todos los trabajadores
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-[color:var(--bg-elevated)] rounded-2xl border border-[color:var(--border-default)] shadow-sm flex flex-col items-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-[color:var(--text-tertiary)]">Cargando trabajadores y calculando CTS...</p>
        </div>
      )}
    </div>
  )
}
