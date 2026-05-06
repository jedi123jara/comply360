/**
 * Modal — Directorio (tabla plana de asignaciones).
 *
 * Lista todos los trabajadores activos con su cargo, unidad, fecha de inicio,
 * tipo de asignación y capacidad. Permite filtrar por nombre o cargo y
 * exportar a CSV.
 *
 * Datos: derivados del tree existente (`tree.assignments` + workers/positions/units).
 */
'use client'

import { useMemo, useState } from 'react'
import { Users, Search, Download } from 'lucide-react'

import { ModalShell } from './modal-shell'
import { useOrgStore } from '../state/org-store'
import { useTreeQuery } from '../data/queries/use-tree'
import type { OrgChartTree } from '@/lib/orgchart/types'

interface DirectoryRow {
  assignmentId: string
  workerName: string
  dni: string
  positionTitle: string
  unitName: string
  startedAt: string
  isInterim: boolean
  capacityPct: number
  workerStatus: string
}

export function DirectoryModal() {
  const activeModal = useOrgStore((s) => s.activeModal)
  const closeModal = useOrgStore((s) => s.closeModal)
  const open = activeModal === 'directory'

  const treeQuery = useTreeQuery(null)
  const rows = useMemo(() => buildDirectoryRows(treeQuery.data ?? null), [treeQuery.data])

  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(
      (r) =>
        r.workerName.toLowerCase().includes(q) ||
        r.dni.includes(q) ||
        r.positionTitle.toLowerCase().includes(q) ||
        r.unitName.toLowerCase().includes(q),
    )
  }, [rows, search])

  const downloadCsv = () => {
    const header = [
      'Trabajador',
      'DNI',
      'Cargo',
      'Unidad',
      'Fecha inicio',
      'Tipo',
      'Capacidad %',
      'Estado',
    ]
    const lines = [
      header.join(','),
      ...filtered.map((r) =>
        [
          csvEscape(r.workerName),
          r.dni,
          csvEscape(r.positionTitle),
          csvEscape(r.unitName),
          new Date(r.startedAt).toISOString().slice(0, 10),
          r.isInterim ? 'Interino' : 'Titular',
          r.capacityPct,
          r.workerStatus,
        ].join(','),
      ),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `directorio-organigrama-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <ModalShell
      open={open}
      onClose={closeModal}
      title="Directorio"
      subtitle="Lista plana de trabajadores y sus cargos vigentes"
      icon={<Users className="h-4 w-4" />}
      width="xl"
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500">
            {filtered.length} de {rows.length} asignaciones
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cerrar
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nombre, DNI, cargo o unidad…"
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {rows.length === 0
              ? 'No hay asignaciones registradas todavía.'
              : 'No hay coincidencias para tu búsqueda.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Trabajador</th>
                  <th className="px-3 py-2 text-left">DNI</th>
                  <th className="px-3 py-2 text-left">Cargo</th>
                  <th className="px-3 py-2 text-left">Unidad</th>
                  <th className="px-3 py-2 text-left">Inicio</th>
                  <th className="px-3 py-2 text-left">Tipo</th>
                  <th className="px-3 py-2 text-right">Capacidad</th>
                  <th className="px-3 py-2 text-left">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.assignmentId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium text-slate-900">{r.workerName}</td>
                    <td className="px-3 py-2 font-mono text-slate-600">{r.dni}</td>
                    <td className="px-3 py-2 text-slate-700">{r.positionTitle}</td>
                    <td className="px-3 py-2 text-slate-600">{r.unitName}</td>
                    <td className="px-3 py-2 text-slate-600 tabular-nums">
                      {new Date(r.startedAt).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          r.isInterim
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {r.isInterim ? 'Interino' : 'Titular'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {r.capacityPct}%
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        {r.workerStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ModalShell>
  )
}

function buildDirectoryRows(tree: OrgChartTree | null): DirectoryRow[] {
  if (!tree) return []
  const positionsById = new Map(tree.positions.map((p) => [p.id, p]))
  const unitsById = new Map(tree.units.map((u) => [u.id, u]))
  return tree.assignments.map((a) => {
    const position = positionsById.get(a.positionId)
    const unit = position ? unitsById.get(position.orgUnitId) : null
    return {
      assignmentId: a.id,
      workerName: `${a.worker.firstName} ${a.worker.lastName}`,
      dni: a.worker.dni,
      positionTitle: position?.title ?? '—',
      unitName: unit?.name ?? '—',
      startedAt: a.startedAt,
      isInterim: a.isInterim,
      capacityPct: a.capacityPct,
      workerStatus: a.worker.status,
    }
  })
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}
