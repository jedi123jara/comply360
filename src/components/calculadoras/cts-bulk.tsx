'use client'

import { useState, useEffect, useMemo } from 'react'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import type { CTSInput } from '@/lib/legal-engine'
import * as XLSX from 'xlsx'
import { Users, Download, RefreshCw, Loader2, CheckCircle, Search, ChevronDown, ChevronUp, FileSpreadsheet } from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

const CORTE_OPTIONS = [
  { value: '2026-05-15', label: 'Mayo 2026' },
  { value: '2025-11-15', label: 'Noviembre 2025' },
  { value: '2025-05-15', label: 'Mayo 2025' },
]

// Regímenes que tienen CTS
const REGIMENES_CON_CTS = ['GENERAL', 'MYPE_PEQUENA', 'CONSTRUCCION_CIVIL', 'MINERO', 'PESQUERO', 'TELETRABAJO']

const fmt = (n: number) =>
  n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function BulkCTSCalculadora() {
  const [workers, setWorkers] = useState<WorkerRow[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [fechaCorte, setFechaCorte] = useState('2026-05-15')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<'nombre' | 'cts' | 'regimen'>('cts')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function fetchAndCalculate() {
    setLoading(true)
    try {
      const res = await fetch('/api/workers?limit=500&status=ACTIVE')
      if (!res.ok) throw new Error('Error al cargar trabajadores')
      const data = await res.json()
      const raw: WorkerRaw[] = data.data ?? []

      const rows: WorkerRow[] = raw.map(w => {
        const hasNoRegimen = !REGIMENES_CON_CTS.includes(w.regimenLaboral)
        if (hasNoRegimen) {
          return { ...w, ctsResult: null, error: `Sin CTS (${w.regimenLaboral})` }
        }

        try {
          const input: CTSInput = {
            sueldoBruto: Number(w.sueldoBruto),
            fechaIngreso: w.fechaIngreso.split('T')[0],
            fechaCorte,
            asignacionFamiliar: w.asignacionFamiliar ?? false,
            ultimaGratificacion: 0, // No stored yet; field editable per-row
          }
          if (input.sueldoBruto <= 0 || !input.fechaIngreso) {
            return { ...w, ctsResult: null, error: 'Datos incompletos' }
          }
          return { ...w, ctsResult: calcularCTS(input), error: null }
        } catch (e) {
          return { ...w, ctsResult: null, error: e instanceof Error ? e.message : 'Error' }
        }
      })

      setWorkers(rows)
      setSelected(new Set(rows.filter(r => r.ctsResult !== null).map(r => r.id)))
      setFetched(true)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Recalculate when fechaCorte changes (if already fetched)
  useEffect(() => {
    if (fetched) fetchAndCalculate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaCorte])

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

  function exportExcel() {
    const rows = selectedRows.map(w => ({
      'DNI': w.dni,
      'Apellidos': w.lastName,
      'Nombres': w.firstName,
      'Cargo': w.position ?? '',
      'Régimen': w.regimenLaboral,
      'Fecha Ingreso': w.fechaIngreso.split('T')[0],
      'Sueldo Bruto': Number(w.sueldoBruto),
      'Asig. Familiar': w.asignacionFamiliar ? 'Sí' : 'No',
      'Rem. Computable': w.ctsResult?.remuneracionComputable ?? 0,
      'Meses Computables': w.ctsResult?.mesesComputables ?? 0,
      'Días Computables': w.ctsResult?.diasComputables ?? 0,
      'CTS a Depositar (S/)': w.ctsResult?.ctsTotal ?? 0,
      'Fecha Corte': fechaCorte,
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    // Column widths
    ws['!cols'] = [8,18,18,20,15,14,12,12,16,16,14,18,14].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'CTS')
    XLSX.writeFile(wb, `CTS_Masivo_${fechaCorte}.xlsx`)
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
      : <ChevronDown className="w-3 h-3 opacity-30" />

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm p-5">
        <div className="flex flex-wrap items-end gap-4">
          {/* Fecha corte */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Fecha de Corte
            </label>
            <select
              value={fechaCorte}
              onChange={e => setFechaCorte(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] border-white/10 bg-[#141824] bg-[color:var(--neutral-100)] text-sm text-white"
            >
              {CORTE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div className="flex-[2] min-w-[220px]">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5">
              Buscar trabajador
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Nombre, DNI o cargo..."
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-white/[0.08] border-white/10 bg-[#141824] bg-[color:var(--neutral-100)] text-sm text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary/30"
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
          <div className="bg-[#141824] bg-[#141824] rounded-xl border border-white/[0.08] border-white/[0.08] p-4">
            <p className="text-xs text-gray-500 mb-1">Trabajadores</p>
            <p className="text-2xl font-bold text-white">{workers.length}</p>
          </div>
          <div className="bg-[#141824] bg-[#141824] rounded-xl border border-white/[0.08] border-white/[0.08] p-4">
            <p className="text-xs text-gray-500 mb-1">Con CTS</p>
            <p className="text-2xl font-bold text-green-600">{conCTS}</p>
          </div>
          <div className="bg-[#141824] bg-[#141824] rounded-xl border border-white/[0.08] border-white/[0.08] p-4">
            <p className="text-xs text-gray-500 mb-1">Sin CTS (exentos)</p>
            <p className="text-2xl font-bold text-gray-400">{sinCTS}</p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-600 font-semibold mb-1">Total CTS a depositar</p>
            <p className="text-2xl font-bold text-blue-700">S/ {fmt(totalCTS)}</p>
          </div>
        </div>
      )}

      {/* Table */}
      {fetched && (
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] border-white/[0.08]">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span className="font-semibold">{filtered.length} trabajadores</span>
              {selected.size > 0 && <span className="text-xs text-gray-400">· {selected.size} seleccionados</span>}
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
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
                <tr className="bg-gray-50/70 bg-[color:var(--neutral-100)]/50 border-b border-white/[0.06] border-white/[0.08]">
                  <th className="px-3 py-2.5 w-8"></th>
                  <th className="px-4 py-2.5 text-left">
                    <button onClick={() => toggleSort('nombre')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300">
                      Trabajador <SortIcon field="nombre" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left">
                    <button onClick={() => toggleSort('regimen')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300">
                      Régimen <SortIcon field="regimen" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Sueldo</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Últ. Gratif.</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Rem. Comp.</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Meses</th>
                  <th className="px-4 py-2.5 text-right">
                    <button onClick={() => toggleSort('cts')} className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-300 ml-auto">
                      CTS <SortIcon field="cts" />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">
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
                        isSelected && hasCTS ? 'bg-blue-50/30' : 'hover:bg-gray-50/50 hover:bg-[color:var(--neutral-100)]/30',
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
                            <p className="font-semibold text-white text-xs leading-tight">
                              {w.lastName}, {w.firstName}
                            </p>
                            <p className="text-[11px] text-gray-400">{w.dni} · {w.position ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[color:var(--neutral-100)] bg-[color:var(--neutral-100)] text-gray-600 font-medium">
                          {w.regimenLaboral.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-300">
                        S/ {fmt(Number(w.sueldoBruto))}
                      </td>
                      {/* Editable gratificación */}
                      <td className="px-4 py-3 text-right">
                        {hasCTS ? (
                          <input
                            type="number"
                            min={0}
                            defaultValue={0}
                            onChange={e => updateGratificacion(w.id, Number(e.target.value))}
                            className="w-24 text-right px-2 py-1 rounded-lg border border-white/[0.08] border-white/10 bg-[#141824] bg-[color:var(--neutral-100)] text-xs text-white"
                            placeholder="0.00"
                          />
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {w.ctsResult ? `S/ ${fmt(w.ctsResult.remuneracionComputable)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-600">
                        {w.ctsResult
                          ? `${w.ctsResult.mesesComputables}m ${w.ctsResult.diasComputables}d`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {w.ctsResult ? (
                          <span className="text-base font-bold text-blue-700">
                            S/ {fmt(w.ctsResult.ctsTotal)}
                          </span>
                        ) : <span className="text-xs text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasCTS ? (
                          <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-[10px] text-gray-400 leading-tight block max-w-[80px] mx-auto">
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
                      S/ {fmt(totalCTS)}
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
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm flex flex-col items-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Cálculo Masivo de CTS
          </h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Calcula automáticamente la CTS de todos los trabajadores activos de tu empresa.
            Selecciona la fecha de corte y haz clic en &quot;Calcular todos&quot;.
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
        <div className="bg-[#141824] bg-[#141824] rounded-2xl border border-white/[0.08] border-white/[0.08] shadow-sm flex flex-col items-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-gray-500">Cargando trabajadores y calculando CTS...</p>
        </div>
      )}
    </div>
  )
}
