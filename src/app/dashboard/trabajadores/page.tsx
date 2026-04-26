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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Wallet,
  BarChart2,
  Building2,
} from 'lucide-react'
import { cn, displayWorkerName, workerInitials } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { KpiCard, KpiGrid } from '@/components/comply360/kpi-card'
import { PremiumEmptyState } from '@/components/comply360/premium-empty-state'
import { confirm } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'

interface WorkerStats {
  byStatus: { ACTIVE: number; ON_LEAVE: number; SUSPENDED: number; TERMINATED: number }
  byRegimen: Record<string, number>
  totalActivos: number
  avgSueldo: number
  totalPlanilla: number
  avgLegajoScore: number
  lowLegajoCount: number
  departments: string[]
  recentlyAdded: number
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
  ACTIVE: { label: 'Activo', color: 'bg-emerald-50 text-emerald-600' },
  ON_LEAVE: { label: 'Licencia', color: 'bg-blue-500/15 text-emerald-600' },
  SUSPENDED: { label: 'Suspendido', color: 'bg-amber-500/15 text-amber-400' },
  TERMINATED: { label: 'Cesado', color: 'bg-red-500/15 text-red-400' },
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
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0, limit: 20 })

  // Org-wide stats (fetched separately, independent of pagination/filters)
  const [stats, setStats] = useState<WorkerStats | null>(null)

  // Sorting
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Error state: si el fetch falla, mostramos un banner con retry en vez de
  // quedar con la tabla vacía pareciendo que no hay trabajadores.
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchWorkers = useCallback(() => {
    setLoading(true)
    setFetchError(null)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    if (regimenFilter) params.set('regimen', regimenFilter)
    if (departmentFilter) params.set('department', departmentFilter)
    params.set('page', String(pagination.page))
    params.set('limit', '20')
    params.set('sortBy', sortBy)
    params.set('sortDir', sortDir)

    fetch(`/api/workers?${params}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`No se pudo cargar la lista (HTTP ${res.status})`)
        }
        return res.json()
      })
      .then((d) => {
        setWorkers(d.data ?? [])
        if (d.pagination) setPagination((prev) => ({ ...prev, ...d.pagination }))
      })
      .catch((err: Error) => {
        console.error('Workers load error:', err)
        setFetchError(
          err.message ||
            'No pudimos cargar los trabajadores. Revisa tu conexión o intentá recargar.',
        )
        setWorkers([])
      })
      .finally(() => setLoading(false))
  }, [search, statusFilter, regimenFilter, departmentFilter, pagination.page, sortBy, sortDir])

  useEffect(() => { fetchWorkers() }, [fetchWorkers])

  // Load org-wide stats once on mount (and after imports)
  const fetchStats = useCallback(() => {
    fetch('/api/workers?stats=1')
      .then(res => res.json())
      .then(d => setStats(d))
      .catch(() => {})
  }, [])

  useEffect(() => { fetchStats() }, [fetchStats])

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
      if (data.imported > 0) refreshAll()
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

  // Clear selection when page/filter/sort changes
  useEffect(() => { setSelected(new Set()) }, [pagination.page, statusFilter, regimenFilter, departmentFilter, search, sortBy, sortDir])

  // Refresh stats after imports
  const refreshAll = () => { fetchWorkers(); fetchStats() }

  // Toggle sort: clicking the same column flips direction; new column → desc by default
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir(field === 'lastName' ? 'asc' : 'desc')
    }
    setPagination(p => ({ ...p, page: 1 }))
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3 h-3 text-gray-600 ml-1" />
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 text-primary ml-1" />
      : <ArrowDown className="w-3 h-3 text-primary ml-1" />
  }

  return (
    <div className="space-y-6">
      {/* Header editorial (sistema Emerald Light) */}
      <PageHeader
        eyebrow="Equipo"
        title="Gestiona tu <em>planilla completa</em>."
        subtitle="Registra, importa y mantén al día a todos tus trabajadores desde un solo lugar. Su legajo alimenta tu score de compliance."
        actions={
          <>
            <a
              href="/api/export?type=workers&format=xlsx"
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Excel
            </a>
            <button
              onClick={() => { setShowPayroll(true); resetPayroll() }}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              Importar Historial
            </button>
            <button
              onClick={() => { setShowImport(true); resetImport() }}
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar Trabajadores
            </button>
            <Link
              href="/dashboard/trabajadores/nuevo"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Agregar Trabajador
            </Link>
          </>
        }
      />

      {/* KPIs premium — org-wide counts */}
      <KpiGrid>
        <KpiCard
          icon={Users}
          label="Total activos"
          value={stats ? stats.byStatus.ACTIVE : pagination.total}
          footer={stats && stats.recentlyAdded > 0 ? `+${stats.recentlyAdded} este mes` : 'Plantilla actual'}
          variant="accent"
        />
        <KpiCard
          icon={Users}
          label="En licencia"
          value={stats?.byStatus.ON_LEAVE ?? 0}
          footer="Ausencia justificada"
        />
        <KpiCard
          icon={AlertCircle}
          label="Suspendidos"
          value={stats?.byStatus.SUSPENDED ?? 0}
          variant={stats && stats.byStatus.SUSPENDED > 0 ? 'amber' : 'default'}
          footer="Sin goce temporal"
        />
        <KpiCard
          icon={Wallet}
          label="Sueldo promedio"
          value={stats?.avgSueldo ?? 0}
          prefix="S/"
          footer="Remuneración bruta media"
          formatValue={(n) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
        />
        <KpiCard
          icon={TrendingUp}
          label="Planilla mensual"
          value={stats?.totalPlanilla ?? 0}
          prefix="S/"
          footer="Costo laboral total"
          formatValue={(n) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
        />
        <KpiCard
          icon={BarChart2}
          label="Score legajo"
          value={stats?.avgLegajoScore ?? 0}
          unit="%"
          variant={
            stats == null
              ? 'default'
              : stats.avgLegajoScore >= 70
                ? 'default'
                : stats.avgLegajoScore >= 40
                  ? 'amber'
                  : 'crimson'
          }
          footer={
            stats && stats.lowLegajoCount > 0
              ? `${stats.lowLegajoCount} con legajo incompleto`
              : 'Completitud promedio'
          }
        />
      </KpiGrid>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Buscar por nombre, DNI o cargo..."
            className="w-full pl-10 pr-4 py-2.5 border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-gold/20 focus:border-gold/40 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors',
            showFilters
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-white/[0.06] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)]'
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
            onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
            className="px-3 py-2 border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={regimenFilter}
            onChange={e => { setRegimenFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
            className="px-3 py-2 border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Todos los regimenes</option>
            {Object.entries(REGIMEN_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {/* Department filter — populated from real org data */}
          {stats && stats.departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={e => { setDepartmentFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
              className="px-3 py-2 border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todas las áreas</option>
              {stats.departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          )}
          {(statusFilter || regimenFilter || departmentFilter) && (
            <button
              onClick={() => { setStatusFilter(''); setRegimenFilter(''); setDepartmentFilter('') }}
              className="text-xs text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Error banner — se muestra cuando la API falla. Ofrece reintento
           inmediato sin tener que refrescar toda la página. */}
      {fetchError && !loading && (
        <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
              <path fillRule="evenodd" clipRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-900">No pudimos cargar los trabajadores</p>
            <p className="text-sm text-red-700 mt-0.5">{fetchError}</p>
          </div>
          <button
            type="button"
            onClick={fetchWorkers}
            className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-white ring-1 ring-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : workers.length === 0 && !fetchError ? (
        <PremiumEmptyState
          icon={Users}
          variant="invite"
          eyebrow="Primer paso"
          title="Empieza protegiendo a tu <em>primer trabajador</em>."
          subtitle="Registra a un trabajador y desbloqueas cálculos automáticos de CTS, gratificación, alertas por vencimientos, y su legajo digital con 28 documentos obligatorios."
          hints={[
            { icon: BarChart2, text: 'Score de compliance automático' },
            { icon: Calendar, text: 'Alertas de CTS, vacaciones y SCTR' },
            { icon: Wallet, text: 'Cálculo de beneficios en vivo' },
          ]}
          cta={{
            label: 'Agregar primer trabajador',
            href: '/dashboard/trabajadores/nuevo',
          }}
          secondaryCta={{
            label: 'Importar desde Excel',
            onClick: () => { setShowImport(true); resetImport() },
          }}
          helpLink={{ label: 'Ver guía de 2 minutos', href: '/dashboard/ayuda' }}
        />
      ) : (
        <div className="bg-surface rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[color:var(--neutral-50)]">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-500 bg-[color:var(--neutral-100)] text-primary focus:ring-primary/30 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-6 py-3">
                    <button onClick={() => handleSort('lastName')} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
                      Trabajador <SortIcon field="lastName" />
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cargo / Área</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Régimen</th>
                  <th className="text-left px-6 py-3">
                    <button onClick={() => handleSort('fechaIngreso')} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
                      Ingreso <SortIcon field="fechaIngreso" />
                    </button>
                  </th>
                  <th className="text-left px-6 py-3">
                    <button onClick={() => handleSort('sueldoBruto')} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
                      Sueldo <SortIcon field="sueldoBruto" />
                    </button>
                  </th>
                  <th className="text-left px-6 py-3">
                    <button onClick={() => handleSort('legajoScore')} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
                      Legajo <SortIcon field="legajoScore" />
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {workers.map(worker => {
                  const st = STATUS_CONFIG[worker.status] || STATUS_CONFIG.ACTIVE
                  return (
                    <tr key={worker.id} className={cn('hover:bg-[color:var(--neutral-100)] transition-all duration-150', selected.has(worker.id) && 'bg-primary/5')}>
                      <td className="w-10 px-3 py-4">
                        <input
                          type="checkbox"
                          checked={selected.has(worker.id)}
                          onChange={() => toggleOne(worker.id)}
                          className="w-4 h-4 rounded border-gray-500 bg-[color:var(--neutral-100)] text-primary focus:ring-primary/30 cursor-pointer"
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
                      <td className="px-6 py-4 text-sm text-[color:var(--text-secondary)] font-mono">{worker.dni}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-[color:var(--text-secondary)]">{worker.position || '—'}</div>
                        {worker.department && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">{worker.department}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] px-2 py-0.5 rounded-full font-medium">
                          {REGIMEN_LABELS[worker.regimenLaboral] || worker.regimenLaboral}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[color:var(--text-secondary)]">
                        {new Date(worker.fechaIngreso).toLocaleDateString('es-PE')}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-white">
                        S/ {worker.sueldoBruto.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        {worker.legajoScore != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
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
                              const fullName = displayWorkerName(worker.firstName, worker.lastName)
                              const ok = await confirm({
                                title: `¿Eliminar a ${fullName}?`,
                                description:
                                  'Se borrará el trabajador junto con sus documentos, vacaciones, contratos y alertas asociadas. Esta acción no se puede deshacer.',
                                confirmLabel: 'Eliminar trabajador',
                                tone: 'danger',
                              })
                              if (!ok) return
                              try {
                                const res = await fetch(`/api/workers/${worker.id}`, { method: 'DELETE' })
                                if (res.ok) {
                                  setWorkers((prev) => prev.filter((w) => w.id !== worker.id))
                                  toast.success(`${fullName} eliminado`)
                                } else {
                                  toast.error('No se pudo eliminar. Intentá de nuevo.')
                                }
                              } catch {
                                toast.error('No se pudo eliminar. Revisa tu conexión.')
                              }
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
            <div className="flex items-center justify-between px-6 py-3 border-t border-white/[0.06]">
              <span className="text-sm text-gray-400">
                {pagination.total} trabajador{pagination.total !== 1 ? 'es' : ''} en total
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg hover:bg-[color:var(--neutral-100)] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-[color:var(--text-secondary)]">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg hover:bg-[color:var(--neutral-100)] disabled:opacity-30 disabled:cursor-not-allowed"
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-white hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <div className="relative">
            <button
              onClick={() => setBulkAction(bulkAction === 'status' ? '' : 'status')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-white hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors disabled:opacity-50"
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
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] transition-colors text-left"
                  >
                    <span className={cn('w-2 h-2 rounded-full', cfg.color.split(' ')[1]?.replace('text-', 'bg-').replace('-400', '-500'))} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="w-px h-6 bg-white/10" />
          <button
            onClick={() => { setSelected(new Set()); setBulkAction('') }}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
            title="Deseleccionar todo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
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
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
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
                      isActive ? 'text-primary' : isDone ? 'text-green-400' : 'text-gray-500'
                    )}>
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all',
                        isActive ? 'border-primary bg-primary text-white' :
                        isDone ? 'border-green-500 bg-green-500 text-white' :
                        'border-[color:var(--border-default)] text-gray-400'
                      )}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className="hidden sm:block">{labels[i]}</span>
                    </div>
                    {i < 2 && <div className={cn('flex-1 h-0.5 mx-2', isDone ? 'bg-green-400' : 'bg-[color:var(--neutral-200)]')} />}
                  </div>
                )
              })}
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Error banner */}
              {importError && (
                <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-800 rounded-xl">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{importError}</p>
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
                          ? 'border-green-400 bg-green-900/10'
                          : 'border-[color:var(--border-default)] hover:border-primary/50 hover:bg-[color:var(--neutral-100)]'
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
                          <div className="w-12 h-12 rounded-2xl bg-green-800/30 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          </div>
                          <p className="text-sm font-semibold text-green-300">{importFile.name}</p>
                          <p className="text-xs text-green-400">{(importFile.size / 1024).toFixed(1)} KB · Listo para procesar</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-[color:var(--neutral-100)] flex items-center justify-center">
                            <Upload className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
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
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
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
                  <p className="text-sm font-medium text-[color:var(--text-secondary)]">Analizando archivo...</p>
                  <p className="text-xs text-gray-500">Validando campos y detectando errores</p>
                </div>
              )}

              {/* ── STEP 2: PREVIEW ── */}
              {importStep === 'preview' && importPreview && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[color:var(--neutral-100)] rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-white">{importPreview.totalRows}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Filas totales</p>
                    </div>
                    <div className="bg-green-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{importPreview.validCount}</p>
                      <p className="text-xs text-green-400 mt-0.5">Válidos</p>
                    </div>
                    <div className={cn(
                      'rounded-xl p-3 text-center',
                      importPreview.errorCount > 0
                        ? 'bg-red-900/20'
                        : 'bg-[color:var(--neutral-100)]'
                    )}>
                      <p className={cn(
                        'text-2xl font-bold',
                        importPreview.errorCount > 0 ? 'text-red-400' : 'text-gray-500'
                      )}>{importPreview.errorCount}</p>
                      <p className={cn(
                        'text-xs mt-0.5',
                        importPreview.errorCount > 0 ? 'text-red-400' : 'text-gray-500'
                      )}>Con errores</p>
                    </div>
                  </div>

                  {/* Preview rows */}
                  {importPreview.validRows.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Primeros registros a importar
                      </p>
                      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                        {importPreview.validRows.slice(0, 4).map((row, i) => (
                          <div key={i} className={cn(
                            'flex items-center gap-3 px-3 py-2.5 text-sm',
                            i > 0 && 'border-t border-white/[0.06]'
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
                          <div className="px-3 py-2 bg-[color:var(--neutral-100)] border-t border-white/[0.06]">
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
                      <div className="max-h-28 overflow-y-auto rounded-xl border border-red-800 divide-y divide-red-900">
                        {importPreview.errors.slice(0, 8).map((err, i) => (
                          <div key={i} className="flex items-start gap-2 px-3 py-2 text-xs">
                            <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                            <span className="text-red-300">
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
                      className="flex-1 px-4 py-2.5 border border-[color:var(--border-default)] rounded-xl text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] transition-colors"
                    >
                      Cambiar archivo
                    </button>
                    <button
                      onClick={handleConfirmImport}
                      disabled={importPreview.validCount === 0}
                      className="flex-[2] flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
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
                    <div className="w-16 h-16 rounded-full bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-400" />
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
                      className="flex-1 px-4 py-2.5 border border-[color:var(--border-default)] rounded-xl text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] transition-colors"
                    >
                      Importar otro archivo
                    </button>
                    <button
                      onClick={() => { setShowImport(false); resetImport() }}
                      className="flex-1 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-semibold text-sm transition-colors"
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
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-900/30 flex items-center justify-center">
                  <History className="w-4 h-4 text-emerald-600" />
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
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
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
                        'border-[color:var(--border-default)] text-gray-400'
                      )}>
                        {isDone ? '✓' : i + 1}
                      </div>
                      <span className="hidden sm:block">{labels[i]}</span>
                    </div>
                    {i < 2 && <div className={cn('flex-1 h-0.5 mx-2', isDone ? 'bg-green-400' : 'bg-[color:var(--neutral-200)]')} />}
                  </div>
                )
              })}
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Error */}
              {payrollError && (
                <div className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-800 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{payrollError}</p>
                </div>
              )}

              {/* STEP 1 — Upload */}
              {payrollStep === 'upload' && (
                <>
                  <div className="p-3.5 rounded-xl bg-emerald-900/10 border border-emerald-800">
                    <p className="text-xs font-semibold text-emerald-600 mb-1">¿Qué datos se importan?</p>
                    <p className="text-xs text-emerald-500 leading-relaxed">
                      Sueldo básico · Asig. familiar · Gratificaciones · Bonificaciones · Descuentos AFP/ONP · Renta 5ta · Neto a pagar — por cada mes y cada trabajador
                    </p>
                  </div>

                  <div
                    onDragOver={e => { e.preventDefault(); setPayrollDragging(true) }}
                    onDragLeave={() => setPayrollDragging(false)}
                    onDrop={e => { e.preventDefault(); setPayrollDragging(false); const f = e.dataTransfer.files[0]; if (f) setPayrollFile(f) }}
                    className={cn(
                      'relative rounded-xl border-2 border-dashed transition-all cursor-pointer',
                      payrollDragging ? 'border-emerald-500 bg-emerald-900/10 scale-[1.01]' :
                      payrollFile ? 'border-green-400 bg-green-900/10' :
                      'border-[color:var(--border-default)] hover:border-emerald-400 hover:bg-[color:var(--neutral-100)]'
                    )}
                  >
                    <label className="flex flex-col items-center justify-center gap-2 py-7 cursor-pointer">
                      <input type="file" accept=".xlsx,.xls" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={e => setPayrollFile(e.target.files?.[0] || null)} />
                      {payrollFile ? (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-green-800/30 flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-400" />
                          </div>
                          <p className="text-sm font-semibold text-green-300">{payrollFile.name}</p>
                          <p className="text-xs text-green-400">{(payrollFile.size / 1024).toFixed(1)} KB · Listo</p>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-[color:var(--neutral-100)] flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-sm font-semibold text-[color:var(--text-secondary)]">
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
                  <p className="text-sm font-medium text-[color:var(--text-secondary)]">Procesando historial de pagos...</p>
                  <p className="text-xs text-gray-500">Esto puede tardar unos segundos</p>
                </div>
              )}

              {/* STEP 2 — Preview */}
              {payrollStep === 'preview' && payrollPreview && (
                <>
                  {/* Period range banner */}
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-900/10 border border-emerald-800">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-sm font-medium text-emerald-700">
                      Período: {formatPeriod(payrollPreview.periodStart)} → {formatPeriod(payrollPreview.periodEnd)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[color:var(--neutral-100)] rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-white">{payrollPreview.workerCount}</p>
                      <p className="text-xs text-gray-400 mt-0.5">Trabajadores en archivo</p>
                    </div>
                    <div className="bg-emerald-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{payrollPreview.importableRows}</p>
                      <p className="text-xs text-emerald-600 mt-0.5">Boletas a importar</p>
                    </div>
                    <div className="bg-green-900/20 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-400">{payrollPreview.foundWorkers}</p>
                      <p className="text-xs text-green-400 mt-0.5">Trabajadores encontrados</p>
                    </div>
                    <div className={cn('rounded-xl p-3 text-center',
                      payrollPreview.missingWorkers > 0 ? 'bg-amber-900/20' : 'bg-[color:var(--neutral-100)]'
                    )}>
                      <p className={cn('text-2xl font-bold',
                        payrollPreview.missingWorkers > 0 ? 'text-amber-400' : 'text-gray-400'
                      )}>{payrollPreview.missingWorkers}</p>
                      <p className={cn('text-xs mt-0.5',
                        payrollPreview.missingWorkers > 0 ? 'text-amber-400' : 'text-gray-400'
                      )}>DNIs no registrados</p>
                    </div>
                  </div>

                  {/* Missing DNIs warning */}
                  {payrollPreview.missingWorkers > 0 && (
                    <div className="p-3 bg-amber-900/10 border border-amber-800 rounded-xl">
                      <p className="text-xs font-semibold text-amber-400 mb-1">
                        {payrollPreview.missingWorkers} trabajador{payrollPreview.missingWorkers !== 1 ? 'es' : ''} no encontrado{payrollPreview.missingWorkers !== 1 ? 's' : ''} en el sistema
                      </p>
                      <p className="text-xs text-amber-500">
                        Importa primero los trabajadores con &ldquo;Importar Trabajadores&rdquo;, luego vuelve a importar el historial.
                      </p>
                      {payrollPreview.missingDnis.length > 0 && (
                        <p className="text-xs text-amber-500 mt-1 font-mono">
                          DNIs: {payrollPreview.missingDnis.join(', ')}{payrollPreview.missingWorkers > 10 ? '...' : ''}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setPayrollStep('upload'); setPayrollError('') }}
                      className="flex-1 px-4 py-2.5 border border-[color:var(--border-default)] rounded-xl text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] transition-colors">
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
                    <div className="w-16 h-16 rounded-full bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-emerald-600" />
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
                      className="flex-1 px-4 py-2.5 border border-[color:var(--border-default)] rounded-xl text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] transition-colors">
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
