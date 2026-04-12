'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Users,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  X,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
  History,
  Calendar,
  TrendingUp,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ──────────────────────────────────────────────────────────────
// Smart name display: handles the case where both firstName and
// lastName were accidentally stored with the full combined name
// (e.g. from PLAME import where full name is "APELLIDOS, NOMBRES")
// ──────────────────────────────────────────────────────────────
function displayWorkerName(firstName: string | null, lastName: string | null): string {
  const f = (firstName ?? '').trim()
  const l = (lastName ?? '').trim()
  if (!f && !l) return '—'
  if (!f) return l
  if (!l) return f
  // Both fields contain the same value → name was stored in both → show once
  if (f === l) return l
  // One field contains the other → likely full name stored in one → show the longer one
  if (l.includes(f) || f.includes(l)) return l.length >= f.length ? l : f
  // Normal case: show "Apellidos, Nombres"
  return `${l}, ${f}`
}

// For avatar initials: extract first letter of first "word" and first letter of second "word"
function workerInitials(firstName: string | null, lastName: string | null): string {
  const name = displayWorkerName(firstName, lastName)
  if (!name || name === '—') return '?'
  const parts = name.replace(/,/g, ' ').split(/\s+/).filter(Boolean)
  if (parts.length === 1) return (parts[0]?.[0] ?? '?').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

interface WorkerItem {
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
  status: string
  legajoScore: number | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400' },
  ON_LEAVE: { label: 'Licencia', color: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400' },
  SUSPENDED: { label: 'Suspendido', color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400' },
  TERMINATED: { label: 'Cesado', color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' },
}

const REGIMEN_LABELS: Record<string, string> = {
  GENERAL: 'General',
  MYPE_MICRO: 'MYPE Micro',
  MYPE_PEQUENA: 'MYPE Pequena',
  AGRARIO: 'Agrario',
  CONSTRUCCION_CIVIL: 'Construccion',
  MINERO: 'Minero',
  PESQUERO: 'Pesquero',
  TEXTIL_EXPORTACION: 'Textil Export.',
  DOMESTICO: 'Domestico',
  CAS: 'CAS',
  MODALIDAD_FORMATIVA: 'Formativo',
  TELETRABAJO: 'Teletrabajo',
}

export default function TrabajadoresPage() {
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [regimenFilter, setRegimenFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0, limit: 20 })

  const fetchWorkers = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (regimenFilter) params.set('regimen', regimenFilter)
    params.set('page', String(pagination.page))
    params.set('limit', '20')

    fetch(`/api/workers?${params}`)
      .then(res => res.json())
      .then(d => {
        setWorkers(d.data ?? [])
        if (d.pagination) setPagination(prev => ({ ...prev, ...d.pagination }))
      })
      .catch(err => console.error('Workers load error:', err))
      .finally(() => setLoading(false))
  }, [search, statusFilter, regimenFilter, pagination.page])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])

  // Debounced search
  const [searchInput, setSearchInput] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importDragging, setImportDragging] = useState(false)
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [importPreview, setImportPreview] = useState<{
    totalRows: number; validCount: number; errorCount: number
    validRows: { firstName: string; lastName: string; dni: string; position: string; sueldoBruto: number }[]
    errors: { row: number; field: string; message: string }[]
  } | null>(null)
  const [importToken, setImportToken] = useState<string>('')
  const [importDone, setImportDone] = useState<{ imported: number; skipped: number; total: number } | null>(null)
  const [importError, setImportError] = useState<string>('')

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPagination(p => ({ ...p, page: 1 })) // Reset to page 1 on new search
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Step 1: upload file → get preview
  const handleUploadFile = async () => {
    if (!importFile) return
    setImportStep('importing')
    setImportError('')
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      const res = await fetch('/api/workers/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportPreview(data.preview)
      setImportToken(data.importToken)
      setImportStep('preview')
    } catch (err) {
      setImportError(String(err instanceof Error ? err.message : err))
      setImportStep('upload')
    }
  }

  // Step 2: confirm import → bulk create
  const handleConfirmImport = async () => {
    if (!importToken) return
    setImportStep('importing')
    setImportError('')
    try {
      const res = await fetch('/api/workers/import', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setImportDone({ imported: data.imported, skipped: data.skipped ?? 0, total: data.total })
      setImportStep('done')
      if (data.imported > 0) fetchWorkers()
    } catch (err) {
      setImportError(String(err instanceof Error ? err.message : err))
      setImportStep('preview')
    }
  }

  const resetImport = () => {
    setImportFile(null)
    setImportStep('upload')
    setImportPreview(null)
    setImportToken('')
    setImportDone(null)
    setImportError('')
  }

  // ── Payroll history import state ──────────────────────────────
  const [showPayroll, setShowPayroll] = useState(false)
  const [payrollFile, setPayrollFile] = useState<File | null>(null)
  const [payrollDragging, setPayrollDragging] = useState(false)
  const [payrollStep, setPayrollStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload')
  const [payrollPreview, setPayrollPreview] = useState<{
    totalRows: number; importableRows: number; workerCount: number
    foundWorkers: number; missingWorkers: number; missingDnis: string[]
    periodStart: string; periodEnd: string
  } | null>(null)
  const [payrollToken, setPayrollToken] = useState<string>('')
  const [payrollDone, setPayrollDone] = useState<{ imported: number; total: number } | null>(null)
  const [payrollError, setPayrollError] = useState<string>('')

  const handleUploadPayroll = async () => {
    if (!payrollFile) return
    setPayrollStep('importing')
    setPayrollError('')
    try {
      const fd = new FormData()
      fd.append('file', payrollFile)
      const res = await fetch('/api/workers/import-payroll', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayrollPreview(data.preview)
      setPayrollToken(data.importToken)
      setPayrollStep('preview')
    } catch (err) {
      setPayrollError(String(err instanceof Error ? err.message : err))
      setPayrollStep('upload')
    }
  }

  const handleConfirmPayroll = async () => {
    if (!payrollToken) return
    setPayrollStep('importing')
    setPayrollError('')
    try {
      const res = await fetch('/api/workers/import-payroll', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importToken: payrollToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPayrollDone({ imported: data.imported, total: data.total })
      setPayrollStep('done')
    } catch (err) {
      setPayrollError(String(err instanceof Error ? err.message : err))
      setPayrollStep('preview')
    }
  }

  const resetPayroll = () => {
    setPayrollFile(null)
    setPayrollStep('upload')
    setPayrollPreview(null)
    setPayrollToken('')
    setPayrollDone(null)
    setPayrollError('')
  }

  const formatPeriod = (p: string) => {
    if (!p) return ''
    const [y, m] = p.split('-')
    const months = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']
    return `${months[parseInt(m ?? '0')] ?? m} ${y}`
  }

  // ── Bulk selection state ──────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)

  const allSelected = workers.length > 0 && workers.every(w => selected.has(w.id))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(workers.map(w => w.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleBulkChangeStatus = async (newStatus: string) => {
    if (selected.size === 0) return
    setBulkLoading(true)
    try {
      const res = await fetch('/api/workers/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], action: 'change-status', status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSelected(new Set())
      setBulkAction('')
      fetchWorkers()
    } catch (err) {
      console.error('Bulk action error:', err)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkExport = () => {
    const ids = [...selected].join(',')
    window.open(`/api/export?type=workers&format=xlsx&ids=${ids}`, '_blank')
  }

  // Clear selection when page/filter changes
  useEffect(() => { setSelected(new Set()) }, [pagination.page, statusFilter, regimenFilter, search])

  const statCounts = {
    total: pagination.total,
    active: workers.filter(w => w.status === 'ACTIVE').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Trabajadores</h1>
          <p className="text-gray-400 mt-1">
            Gestiona el registro de todos los trabajadores de tu organizacion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/api/export?type=workers&format=xlsx"
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 border-white/[0.08] rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </a>
          <button
            onClick={() => { setShowPayroll(true); resetPayroll() }}
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 border-white/[0.08] rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <History className="w-4 h-4" />
            Importar Historial
          </button>
          <button
            onClick={() => { setShowImport(true); resetImport() }}
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 border-white/[0.08] rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <Upload className="w-4 h-4" />
            Importar Trabajadores
          </button>
          <Link
            href="/dashboard/trabajadores/nuevo"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Agregar Trabajador
          </Link>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#141824] rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-400">Total</span>
          </div>
          <span className="text-2xl font-bold text-white">{pagination.total}</span>
        </div>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = workers.filter(w => w.status === key).length
          if (key === 'ACTIVE' || count > 0) {
            return (
              <div key={key} className="bg-[#141824] rounded-xl border border-white/[0.08] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', cfg.color.split(' ')[0]?.replace('100', '500'))} />
                  <span className="text-xs font-medium text-gray-400">{cfg.label}</span>
                </div>
                <span className="text-2xl font-bold text-white">{count}</span>
              </div>
            )
          }
          return null
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, DNI o cargo..."
            className="w-full pl-10 pr-4 py-2.5 border border-white/10 border-slate-600 bg-white/[0.04] text-gray-200 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors',
            showFilters
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-white/10 border-white/[0.08] text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04]'
          )}
        >
          <Filter className="w-4 h-4" />
          Filtrar
        </button>
      </div>

      {/* Filters row */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-white/10 border-slate-600 bg-white/[0.04] text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={regimenFilter}
            onChange={e => setRegimenFilter(e.target.value)}
            className="px-3 py-2 border border-white/10 border-slate-600 bg-white/[0.04] text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los regimenes</option>
            {Object.entries(REGIMEN_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(statusFilter || regimenFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setRegimenFilter('') }}
              className="text-xs text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : workers.length === 0 ? (
        <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm p-12 text-center">
          <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-1">No hay trabajadores registrados</h3>
          <p className="text-sm text-gray-400 mb-4">
            Agrega tu primer trabajador para comenzar a gestionar el compliance laboral.
          </p>
          <Link
            href="/dashboard/trabajadores/nuevo"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Trabajador
          </Link>
        </div>
      ) : (
        <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-500 bg-white/[0.04] text-primary focus:ring-primary/30 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Trabajador</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cargo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Regimen</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingreso</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sueldo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Legajo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {workers.map(worker => {
                  const st = STATUS_CONFIG[worker.status] || STATUS_CONFIG.ACTIVE
                  return (
                    <tr key={worker.id} className={cn('hover:bg-white/[0.03] transition-colors', selected.has(worker.id) && 'bg-primary/5')}>
                      <td className="w-10 px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(worker.id)}
                          onChange={() => toggleOne(worker.id)}
                          className="w-4 h-4 rounded border-gray-500 bg-white/[0.04] text-primary focus:ring-primary/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/trabajadores/${worker.id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">
                              {workerInitials(worker.firstName, worker.lastName)}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">
                            {displayWorkerName(worker.firstName, worker.lastName)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300 font-mono">{worker.dni}</td>
                      <td className="px-6 py-4 text-sm text-gray-300">{worker.position || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-white/[0.06] text-gray-300 px-2 py-0.5 rounded-full font-medium">
                          {REGIMEN_LABELS[worker.regimenLaboral] || worker.regimenLaboral}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-300">
                        {new Date(worker.fechaIngreso).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">
                        S/ {worker.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        {worker.legajoScore != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-gray-200 bg-white/[0.08] rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  worker.legajoScore >= 70 ? 'bg-green-500' :
                                  worker.legajoScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                                )}
                                style={{ width: `${worker.legajoScore}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-400">{worker.legajoScore}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', st.color)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/trabajadores/${worker.id}`}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (!confirm(`¿Eliminar a ${displayWorkerName(worker.firstName, worker.lastName)}? Esta accion no se puede deshacer.`)) return
                              try {
                                const res = await fetch(`/api/workers/${worker.id}`, { method: 'DELETE' })
                                if (res.ok) setWorkers(prev => prev.filter(w => w.id !== worker.id))
                              } catch { /* silent */ }
                            }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06] border-white/[0.08]">
              <span className="text-sm text-gray-400">
                {pagination.total} trabajador{pagination.total !== 1 ? 'es' : ''} en total
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-300">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg hover:bg-white/[0.04] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-[#1a2035] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40">
          <span className="text-sm font-semibold text-white">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={handleBulkExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <div className="relative">
            <button
              onClick={() => setBulkAction(bulkAction === 'status' ? '' : 'status')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors disabled:opacity-50"
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
              Cambiar estado
            </button>
            {bulkAction === 'status' && (
              <div className="absolute bottom-full left-0 mb-2 w-44 bg-[#1a2035] border border-white/[0.12] rounded-xl shadow-xl overflow-hidden">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => handleBulkChangeStatus(key)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/[0.06] transition-colors text-left"
                  >
                    <span className={cn('w-2 h-2 rounded-full', cfg.color.split(' ')[0]?.replace('100', '500'))} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={() => { setSelected(new Set()); setBulkAction('') }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            title="Deseleccionar todo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#141824] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Importar Trabajadores</h3>
                  <p className="text-xs text-gray-400">
                    {importStep === 'upload' && 'Sube tu planilla en Excel o CSV'}
                    {importStep === 'preview' && `${importPreview?.validCount ?? 0} registros listos para importar`}
                    {importStep === 'importing' && 'Procesando archivo...'}
                    {importStep === 'done' && 'Importación completada'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowImport(false); resetImport() }}
                className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Steps indicator */}
            <div className="flex items-center gap-0 px-6 pt-4">
              {(['upload', 'preview', 'done'] as const).map((step, i) => {
                const labels = ['Subir archivo', 'Vista previa', 'Listo']
                const stepIndex = { upload: 0, preview: 1, importing: 1, done: 2 }[importStep]
                const isActive = i === stepIndex
                const isDone = i < stepIndex
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className={cn(
                      'flex items-center gap-1.5 text-xs font-medium transition-colors',
                      isActive ? 'text-primary' : isDone ? 'text-green-600 text-green-400' : 'text-gray-500'
                    )}>
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                        isActive ? 'border-primary bg-primary text-white' :
                        isDone ? 'border-green-500 bg-green-500 text-white' :
                        'border-white/10 border-slate-600 text-gray-400'
                      )}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className="hidden sm:block">{labels[i]}</span>
                    </div>
                    {i < 2 && <div className={cn('flex-1 h-0.5 mx-2', isDone ? 'bg-green-400' : 'bg-gray-200 bg-slate-600')} />}
                  </div>
                )
              })}
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Error banner */}
              {importError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 bg-red-900/20 border border-red-200 border-red-800 rounded-xl">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 text-red-300">{importError}</p>
                </div>
              )}

              {/* ── STEP 1: UPLOAD ── */}
              {importStep === 'upload' && (
                <>
                  {/* Download template */}
                  <a
                    href="/api/workers/template"
                    download
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/3 hover:bg-primary/8 transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Download className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">Descargar plantilla Excel</p>
                      <p className="text-xs text-gray-400">Usa este archivo como base para cargar tus trabajadores</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors shrink-0" />
                  </a>

                  {/* Drop zone */}
                  <div
                    onDragOver={e => { e.preventDefault(); setImportDragging(true) }}
                    onDragLeave={() => setImportDragging(false)}
                    onDrop={e => {
                      e.preventDefault()
                      setImportDragging(false)
                      const f = e.dataTransfer.files[0]
                      if (f) setImportFile(f)
                    }}
                    className={cn(
                      'relative rounded-xl border-2 border-dashed transition-all cursor-pointer',
                      importDragging
                        ? 'border-primary bg-primary/5 scale-[1.01]'
                        : importFile
                          ? 'border-green-400 bg-green-50 bg-green-900/10'
                          : 'border-white/10 border-slate-600 hover:border-primary/50 hover:bg-white/[0.02] hover:bg-white/[0.04]/50'
                    )}
                  >
                    <label className="flex flex-col items-center justify-center gap-2 py-7 cursor-pointer">
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => setImportFile(e.target.files?.[0] || null)}
                      />
                      {importFile ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-green-100 bg-green-800/30 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600 text-green-400" />
                          </div>
                          <p className="text-sm font-semibold text-green-700 text-green-300">{importFile.name}</p>
                          <p className="text-xs text-green-600 text-green-400">{(importFile.size / 1024).toFixed(1)} KB · Listo para procesar</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-sm font-semibold text-gray-300">
                            {importDragging ? 'Suelta el archivo aquí' : 'Arrastra tu planilla o haz clic'}
                          </p>
                          <p className="text-xs text-gray-500">Excel (.xlsx, .xls) o CSV — máx. 5 MB</p>
                        </>
                      )}
                    </label>
                  </div>

                  <button
                    onClick={handleUploadFile}
                    disabled={!importFile}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  >
                    <Upload className="w-4 h-4" />
                    Procesar archivo
                  </button>
                </>
              )}

              {/* ── STEP: IMPORTING (spinner) ── */}
              {importStep === 'importing' && (
                <div className="flex flex-col items-center justify-center gap-4 py-10">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-pulse" />
                    <Loader2 className="w-8 h-8 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">Analizando archivo...</p>
                  <p className="text-xs text-gray-500">Validando campos y detectando errores</p>
                </div>
              )}

              {/* ── STEP 2: PREVIEW ── */}
              {importStep === 'preview' && importPreview && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white/[0.02] bg-white/[0.04]/50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-white">{importPreview.totalRows}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Filas totales</p>
                    </div>
                    <div className="bg-green-50 bg-green-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-700 text-green-400">{importPreview.validCount}</p>
                      <p className="text-xs text-green-600 text-green-400 mt-0.5">Válidos</p>
                    </div>
                    <div className={cn(
                      'rounded-xl p-3 text-center',
                      importPreview.errorCount > 0
                        ? 'bg-red-50 bg-red-900/20'
                        : 'bg-white/[0.02] bg-white/[0.04]/50'
                    )}>
                      <p className={cn(
                        'text-2xl font-bold',
                        importPreview.errorCount > 0 ? 'text-red-700 text-red-400' : 'text-gray-500'
                      )}>{importPreview.errorCount}</p>
                      <p className={cn(
                        'text-xs mt-0.5',
                        importPreview.errorCount > 0 ? 'text-red-600 text-red-400' : 'text-gray-500'
                      )}>Con errores</p>
                    </div>
                  </div>

                  {/* Preview rows */}
                  {importPreview.validRows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Primeros registros a importar
                      </p>
                      <div className="rounded-xl border border-white/[0.08] border-slate-600 overflow-hidden">
                        {importPreview.validRows.slice(0, 4).map((row, i) => (
                          <div key={i} className={cn(
                            'flex items-center gap-3 px-3 py-2.5 text-sm',
                            i > 0 && 'border-t border-white/[0.06] border-white/[0.08]'
                          )}>
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] font-bold text-primary">
                                {workerInitials(row.firstName, row.lastName)}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {displayWorkerName(row.firstName, row.lastName)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {row.dni} · {row.position || 'Sin cargo'} · S/ {Number(row.sueldoBruto).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          </div>
                        ))}
                        {importPreview.validRows.length > 4 && (
                          <div className="px-3 py-2 bg-white/[0.02] bg-white/[0.04]/50 border-t border-white/[0.06] border-white/[0.08]">
                            <p className="text-xs text-gray-400 text-center">
                              + {importPreview.validRows.length - 4} registros más
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {importPreview.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">
                        Errores detectados ({importPreview.errors.length})
                      </p>
                      <div className="max-h-28 overflow-y-auto rounded-xl border border-red-200 border-red-800 divide-y divide-red-100 divide-red-900">
                        {importPreview.errors.slice(0, 8).map((err, i) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-red-700 text-red-300">
                              Fila {err.row} · {err.field}: {err.message}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => { setImportStep('upload'); setImportError('') }}
                      className="flex-1 px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      Cambiar archivo
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={importPreview.validCount === 0}
                      className="flex-[2] flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Confirmar importación ({importPreview.validCount})
                    </button>
                  </div>
                </>
              )}

              {/* ── STEP 3: DONE ── */}
              {importStep === 'done' && importDone && (
                <>
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600 text-green-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">
                        {importDone.imported} trabajador{importDone.imported !== 1 ? 'es' : ''} importado{importDone.imported !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        {importDone.skipped > 0 && `${importDone.skipped} omitidos por DNI duplicado · `}
                        {importDone.total} fila{importDone.total !== 1 ? 's' : ''} procesada{importDone.total !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => { resetImport(); }}
                      className="flex-1 px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      Importar otro archivo
                    </button>
                    <button
                      onClick={() => { setShowImport(false); resetImport() }}
                      className="flex-1 px-5 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors"
                    >
                      Listo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════
          MODAL: Importar Historial PLAME
      ══════════════════════════════════════════ */}
      {showPayroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#141824] rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 bg-emerald-900/30 flex items-center justify-center">
                  <History className="w-4 h-4 text-emerald-600 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Importar Historial de Pagos</h3>
                  <p className="text-xs text-gray-400">
                    {payrollStep === 'upload' && 'Sube tu planilla PLAME o libro de remuneraciones'}
                    {payrollStep === 'preview' && `${payrollPreview?.importableRows ?? 0} boletas listas para importar`}
                    {payrollStep === 'importing' && 'Procesando archivo...'}
                    {payrollStep === 'done' && 'Historial importado correctamente'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowPayroll(false); resetPayroll() }}
                className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-0 px-6 pt-4">
              {(['upload', 'preview', 'done'] as const).map((step, i) => {
                const labels = ['Subir archivo', 'Verificar', 'Listo']
                const stepIndex = { upload: 0, preview: 1, importing: 1, done: 2 }[payrollStep]
                const isActive = i === stepIndex
                const isDone = i < stepIndex
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className={cn('flex items-center gap-1.5 text-xs font-medium transition-colors',
                      isActive ? 'text-emerald-600' : isDone ? 'text-green-600' : 'text-gray-500'
                    )}>
                      <div className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                        isActive ? 'border-emerald-500 bg-emerald-500 text-white' :
                        isDone   ? 'border-green-500 bg-green-500 text-white' :
                        'border-white/10 border-slate-600 text-gray-400'
                      )}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className="hidden sm:block">{labels[i]}</span>
                    </div>
                    {i < 2 && <div className={cn('flex-1 h-0.5 mx-2', isDone ? 'bg-green-400' : 'bg-gray-200 bg-slate-600')} />}
                  </div>
                )
              })}
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Error */}
              {payrollError && (
                <div className="flex items-start gap-3 p-3 bg-red-50 bg-red-900/20 border border-red-200 border-red-800 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 text-red-300">{payrollError}</p>
                </div>
              )}

              {/* STEP 1 — Upload */}
              {payrollStep === 'upload' && (
                <>
                  <div className="p-3.5 rounded-xl bg-emerald-50 bg-emerald-900/10 border border-emerald-200 border-emerald-800">
                    <p className="text-xs font-semibold text-emerald-700 text-emerald-400 mb-1">¿Qué datos se importan?</p>
                    <p className="text-xs text-emerald-600 text-emerald-500 leading-relaxed">
                      Sueldo básico · Asig. familiar · Gratificaciones · Bonificaciones · Descuentos AFP/ONP · Renta 5ta · Neto a pagar — por cada mes y cada trabajador
                    </p>
                  </div>

                  <div
                    onDragOver={e => { e.preventDefault(); setPayrollDragging(true) }}
                    onDragLeave={() => setPayrollDragging(false)}
                    onDrop={e => { e.preventDefault(); setPayrollDragging(false); const f = e.dataTransfer.files[0]; if (f) setPayrollFile(f) }}
                    className={cn(
                      'relative rounded-xl border-2 border-dashed transition-all cursor-pointer',
                      payrollDragging ? 'border-emerald-500 bg-emerald-50 bg-emerald-900/10 scale-[1.01]' :
                      payrollFile ? 'border-green-400 bg-green-50 bg-green-900/10' :
                      'border-white/10 border-slate-600 hover:border-emerald-400 hover:bg-white/[0.02] hover:bg-white/[0.04]/50'
                    )}
                  >
                    <label className="flex flex-col items-center justify-center gap-2 py-7 cursor-pointer">
                      <input type="file" accept=".xlsx,.xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => setPayrollFile(e.target.files?.[0] || null)} />
                      {payrollFile ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-green-100 bg-green-800/30 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600 text-green-400" />
                          </div>
                          <p className="text-sm font-semibold text-green-700 text-green-300">{payrollFile.name}</p>
                          <p className="text-xs text-green-600 text-green-400">{(payrollFile.size / 1024).toFixed(1)} KB · Listo</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-sm font-semibold text-gray-300">
                            {payrollDragging ? 'Suelta aquí' : 'Arrastra tu planilla PLAME o haz clic'}
                          </p>
                          <p className="text-xs text-gray-500">Excel (.xlsx, .xls) — máx. 20 MB</p>
                        </>
                      )}
                    </label>
                  </div>

                  <button onClick={handleUploadPayroll} disabled={!payrollFile}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    <History className="w-4 h-4" />
                    Analizar planilla
                  </button>
                </>
              )}

              {/* SPINNER */}
              {payrollStep === 'importing' && (
                <div className="flex flex-col items-center justify-center gap-4 py-10">
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                  <p className="text-sm font-medium text-gray-300">Procesando historial de pagos...</p>
                  <p className="text-xs text-gray-500">Esto puede tardar unos segundos</p>
                </div>
              )}

              {/* STEP 2 — Preview */}
              {payrollStep === 'preview' && payrollPreview && (
                <>
                  {/* Period range banner */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 bg-emerald-900/10 border border-emerald-200 border-emerald-800">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-700 text-emerald-300">
                      Período: {formatPeriod(payrollPreview.periodStart)} → {formatPeriod(payrollPreview.periodEnd)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/[0.02] bg-white/[0.04]/50 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-white">{payrollPreview.workerCount}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Trabajadores en archivo</p>
                    </div>
                    <div className="bg-emerald-50 bg-emerald-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-700 text-emerald-400">{payrollPreview.importableRows}</p>
                      <p className="text-xs text-emerald-600 text-emerald-400 mt-0.5">Boletas a importar</p>
                    </div>
                    <div className="bg-green-50 bg-green-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-700 text-green-400">{payrollPreview.foundWorkers}</p>
                      <p className="text-xs text-green-600 text-green-400 mt-0.5">Trabajadores encontrados</p>
                    </div>
                    <div className={cn('rounded-xl p-3 text-center',
                      payrollPreview.missingWorkers > 0 ? 'bg-amber-50 bg-amber-900/20' : 'bg-white/[0.02] bg-white/[0.04]/50'
                    )}>
                      <p className={cn('text-2xl font-bold',
                        payrollPreview.missingWorkers > 0 ? 'text-amber-700 text-amber-400' : 'text-gray-400'
                      )}>{payrollPreview.missingWorkers}</p>
                      <p className={cn('text-xs mt-0.5',
                        payrollPreview.missingWorkers > 0 ? 'text-amber-600 text-amber-400' : 'text-gray-400'
                      )}>DNIs no registrados</p>
                    </div>
                  </div>

                  {/* Missing DNIs warning */}
                  {payrollPreview.missingWorkers > 0 && (
                    <div className="p-3 bg-amber-50 bg-amber-900/10 border border-amber-200 border-amber-800 rounded-xl">
                      <p className="text-xs font-semibold text-amber-700 text-amber-400 mb-1">
                        {payrollPreview.missingWorkers} trabajador{payrollPreview.missingWorkers !== 1 ? 'es' : ''} no encontrado{payrollPreview.missingWorkers !== 1 ? 's' : ''} en el sistema
                      </p>
                      <p className="text-xs text-amber-600 text-amber-500">
                        Importa primero los trabajadores con "Importar Trabajadores", luego vuelve a importar el historial.
                      </p>
                      {payrollPreview.missingDnis.length > 0 && (
                        <p className="text-xs text-amber-600 text-amber-500 mt-1 font-mono">
                          DNIs: {payrollPreview.missingDnis.join(', ')}{payrollPreview.missingWorkers > 10 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setPayrollStep('upload'); setPayrollError('') }}
                      className="flex-1 px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      Cambiar archivo
                    </button>
                    <button onClick={handleConfirmPayroll} disabled={payrollPreview.importableRows === 0}
                      className="flex-[2] flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <CheckCircle className="w-4 h-4" />
                      Importar {payrollPreview.importableRows} boletas
                    </button>
                  </div>
                </>
              )}

              {/* STEP 3 — Done */}
              {payrollStep === 'done' && payrollDone && (
                <>
                  <div className="flex flex-col items-center gap-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-emerald-600 text-emerald-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">
                        {payrollDone.imported} boleta{payrollDone.imported !== 1 ? 's' : ''} importada{payrollDone.imported !== 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        El historial de pagos ya está disponible en el perfil de cada trabajador
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={resetPayroll}
                      className="flex-1 px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm font-medium text-gray-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      Importar otro
                    </button>
                    <button onClick={() => { setShowPayroll(false); resetPayroll() }}
                      className="flex-1 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-colors">
                      Listo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
