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
  ChevronDown,
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
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Wallet,
  BarChart2,
  Building2,
  MoreHorizontal,
  Mail,
  FileText,
  Bell,
  ShieldCheck,
  FilePlus2,
  Ban,
  Scale,
  BookOpen,
  GraduationCap,
  HardHat,
  Banknote,
  Clock,
} from 'lucide-react'
import { cn, displayWorkerName, workerInitials } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { KpiCard, KpiGrid } from '@/components/comply360/kpi-card'
import { PremiumEmptyState } from '@/components/comply360/premium-empty-state'
import { confirm } from '@/components/ui/confirm-dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown'
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
  /** Foto subida desde portal worker (data URL base64). Null = mostrar iniciales. */
  photoUrl?: string | null
  /** Bio breve (max 200 chars) — humaniza el card del admin. */
  bio?: string | null
  /** Conteo de alertas críticas/altas activas (para badge "EN RIESGO"). */
  alertCount?: number
  /** True si el worker ya activó su portal (Worker.userId != null). */
  hasAccount?: boolean
  /** Email del worker (para acción "Reenviar invitación"). */
  email?: string | null
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

// Tipos de cese — alineados con enum TipoCese de Prisma. La etiqueta es para UI.
const TIPO_CESE_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: 'RENUNCIA_VOLUNTARIA', label: 'Renuncia voluntaria', hint: 'Art. 18 D.S. 003-97-TR' },
  { value: 'MUTUO_DISENSO', label: 'Mutuo disenso', hint: 'Acuerdo entre ambas partes' },
  { value: 'TERMINO_CONTRATO', label: 'Término de contrato', hint: 'Fin de plazo fijo' },
  { value: 'NO_RENOVACION', label: 'No renovación', hint: 'No se renueva contrato temporal' },
  { value: 'PERIODO_PRUEBA', label: 'Período de prueba', hint: 'Dentro de los 3 meses' },
  { value: 'DESPIDO_CAUSA_JUSTA', label: 'Despido con causa justa', hint: 'Falta grave probada' },
  { value: 'DESPIDO_ARBITRARIO', label: 'Despido arbitrario', hint: 'Sin causa — indemnización obligatoria' },
  { value: 'JUBILACION', label: 'Jubilación', hint: 'Art. 16.f' },
  { value: 'FALLECIMIENTO', label: 'Fallecimiento', hint: 'Art. 16.a' },
]

export default function TrabajadoresPage() {
  const [workers, setWorkers] = useState<WorkerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [regimenFilter, setRegimenFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0, limit: 20 })
  // Ola 1 — toggle "Ver cesados" para OWNER/SUPER_ADMIN (auditoría)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [incluirCesados, setIncluirCesados] = useState(false)

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
    if (incluirCesados) params.set('incluirCesados', 'true')
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
  }, [search, statusFilter, regimenFilter, departmentFilter, incluirCesados, pagination.page, sortBy, sortDir])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      fetchWorkers()
    })
    return () => {
      cancelled = true
    }
  }, [fetchWorkers])

  // Cargar rol del usuario (define si puede ver cesados)
  useEffect(() => {
    fetch('/api/me')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { role?: string } | null) => {
        if (d?.role) setUserRole(d.role)
      })
      .catch(() => {
        /* ignore — el toggle simplemente no aparece */
      })
  }, [])

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
  const [, setBulkAction] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)
  // Modal de acciones masivas que requieren input adicional (Fase 1 + Fase 2 + Fase 3)
  type BulkModalKind =
    | 'department' | 'regimen' | 'terminate'
    | 'enroll-course' | 'generate-payslips' | 'capacitacion' | 'entrega-epp'
    | 'transfer-area' | 'salary-raise' | 'renew-contracts' | 'terminate-liquidacion'
    | 'set-schedule'
    | null
  const [bulkModal, setBulkModal] = useState<BulkModalKind>(null)
  const [bulkDeptInput, setBulkDeptInput] = useState('')
  const [bulkRegimenInput, setBulkRegimenInput] = useState<string>('GENERAL')
  const [bulkTerminateForm, setBulkTerminateForm] = useState({
    tipoCese: 'MUTUO_DISENSO',
    fechaCese: new Date().toISOString().split('T')[0] ?? '',
    motivoCese: '',
  })

  // Fase 2 — Operaciones laborales recurrentes
  type CourseLite = { id: string; title: string; category: string; isObligatory: boolean }
  const [coursesList, setCoursesList] = useState<CourseLite[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [bulkCourseId, setBulkCourseId] = useState<string>('')
  const [bulkPayslipForm, setBulkPayslipForm] = useState({
    periodo: new Date().toISOString().slice(0, 7), // 'YYYY-MM'
    incluirGratificacion: false,
  })
  const [bulkCapacitacionForm, setBulkCapacitacionForm] = useState({
    title: '',
    topic: '',
    fechaCapacitacion: new Date().toISOString().split('T')[0] ?? '',
    instructor: '',
    horas: 2,
  })
  const [bulkEppForm, setBulkEppForm] = useState({
    eppsRaw: '', // textarea con un EPP por línea
    fechaEntrega: new Date().toISOString().split('T')[0] ?? '',
    serie: '',
  })

  // Fase 3 — Compliance avanzado
  const [bulkTransferForm, setBulkTransferForm] = useState({
    department: '',
    position: '',
  })
  const [bulkRaiseForm, setBulkRaiseForm] = useState({
    mode: 'percent' as 'percent' | 'amount',
    value: 5,
    effectiveDate: new Date().toISOString().split('T')[0] ?? '',
  })
  const [bulkRenewForm, setBulkRenewForm] = useState({
    extensionMonths: 12,
  })
  const [bulkTermLiqForm, setBulkTermLiqForm] = useState({
    tipoCese: 'MUTUO_DISENSO',
    fechaCese: new Date().toISOString().split('T')[0] ?? '',
    motivoCese: '',
  })
  // Fase 1.2 — Asignar horario laboral masivo
  const [bulkScheduleForm, setBulkScheduleForm] = useState({
    expectedClockInHour: 8,
    expectedClockInMinute: 0,
    expectedClockOutHour: 17,
    expectedClockOutMinute: 0,
    lateToleranceMinutes: 15,
  })

  // Lazy-load del catálogo de cursos cuando se abre el modal de "Asignar curso"
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      if (bulkModal !== 'enroll-course') return
      if (coursesList.length > 0) return
      setCoursesLoading(true)
      fetch('/api/courses')
        .then(r => r.json())
        .then((d: { courses?: { id: string; title: string; category: string; isObligatory: boolean; isActive: boolean }[] }) => {
          const active = (d.courses ?? []).filter(c => c.isActive)
          setCoursesList(active.map(c => ({
            id: c.id,
            title: c.title,
            category: c.category,
            isObligatory: c.isObligatory,
          })))
          if (active[0]) setBulkCourseId(prev => prev || active[0].id)
        })
        .catch(() => toast.error('No pudimos cargar el catálogo de cursos'))
        .finally(() => setCoursesLoading(false))
    })
    return () => {
      cancelled = true
    }
  }, [bulkModal, coursesList.length])

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

  const handleBulkExport = () => {
    const ids = [...selected].join(',')
    window.open(`/api/export?type=workers&format=xlsx&ids=${ids}`, '_blank')
  }

  // Atajo a /api/export para descargar el inventario de legajo de la selección.
  // Útil en auditorías SUNAFIL — devuelve un row por documento con datos del trabajador.
  const handleBulkExportLegajo = () => {
    const ids = [...selected].join(',')
    window.open(`/api/export?type=legajo-inventory&format=xlsx&ids=${ids}`, '_blank')
  }

  // Reenvía la invitación al portal del worker reusando el endpoint de
  // onboarding-cascade en modo "solo email" (no re-pide legajo).
  const handleResendInvite = useCallback(async (worker: WorkerItem) => {
    const fullName = displayWorkerName(worker.firstName, worker.lastName)
    if (!worker.email) {
      toast.error(`${fullName} no tiene email registrado. Edítalo y agrega uno antes de invitarlo.`)
      return
    }
    const tid = `invite-${worker.id}`
    toast.loading(`Enviando invitación a ${fullName}...`, { id: tid })
    try {
      const res = await fetch(`/api/workers/${worker.id}/onboarding-cascade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, sendEmail: true, requestLegajo: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo reenviar la invitación')
      if (data.data?.emailSent) {
        toast.success(`Invitación enviada a ${worker.email}`, { id: tid })
      } else {
        toast.error(data.message || 'El email no pudo enviarse. Revisa la configuración.', { id: tid })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reenviar invitación', { id: tid })
    }
  }, [])

  // Clear selection when page/filter/sort changes
  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      setSelected(new Set())
    })
    return () => {
      cancelled = true
    }
  }, [pagination.page, statusFilter, regimenFilter, departmentFilter, search, sortBy, sortDir])

  // Refresh stats after imports
  const refreshAll = () => { fetchWorkers(); fetchStats() }

  // Handler genérico para acciones masivas (POST /api/workers/bulk-action).
  // El backend reporta `updated` y `skipped[]`; mostramos un toast unificado:
  //  - "N actualizados" si todos pasaron
  //  - "N actualizados, M saltados" + razón del primero, si hubo skips
  //  - error si nadie se actualizó
  const handleBulkAction = useCallback(async (
    action: string,
    bodyExtras: Record<string, unknown> = {},
  ) => {
    if (selected.size === 0) return
    setBulkLoading(true)
    const tid = `bulk-${action}`
    toast.loading('Procesando trabajadores...', { id: tid })
    try {
      const res = await fetch('/api/workers/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [...selected], action, ...bodyExtras }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la operación')

      const updated: number = data.updated ?? 0
      const skipped: { id: string; reason: string }[] = data.skipped ?? []

      if (updated > 0 && skipped.length === 0) {
        toast.success(
          `${updated} ${updated === 1 ? 'trabajador actualizado' : 'trabajadores actualizados'}`,
          { id: tid },
        )
      } else if (updated > 0) {
        toast.success(`${updated} ${updated === 1 ? 'actualizado' : 'actualizados'}`, {
          id: tid,
          description: `${skipped.length} ${skipped.length === 1 ? 'saltado' : 'saltados'} — ${skipped[0]?.reason ?? ''}`,
        })
      } else {
        toast.error('Ningún trabajador actualizado', {
          id: tid,
          description: skipped[0]?.reason ?? 'Revisa la selección',
        })
      }

      setSelected(new Set())
      setBulkAction('')
      setBulkModal(null)
      refreshAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error en operación masiva', { id: tid })
    } finally {
      setBulkLoading(false)
    }
  // refreshAll cambia en cada render (no useCallback) pero no hay deps reales que afecten
  // el cuerpo — lo omitimos a propósito.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected])

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

  const renderSortIcon = (field: string) => {
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 transition-colors data-[state=open]:border-emerald-500/60"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar / Exportar
                  <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[260px]">
                <DropdownMenuLabel>Importar</DropdownMenuLabel>
                <DropdownMenuItem onSelect={() => { setShowImport(true); resetImport() }}>
                  <Upload className="w-4 h-4 text-emerald-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Importar Trabajadores</span>
                    <span className="text-[11px] text-[color:var(--text-tertiary)]">Excel o CSV con tu planilla</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setShowPayroll(true); resetPayroll() }}>
                  <History className="w-4 h-4 text-emerald-600" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Importar Historial</span>
                    <span className="text-[11px] text-[color:var(--text-tertiary)]">Boletas y pagos pasados</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Exportar</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <a href="/api/export?type=workers&format=xlsx" className="cursor-pointer">
                    <Download className="w-4 h-4 text-emerald-600" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-[color:var(--text-primary)]">Exportar Excel</span>
                      <span className="text-[11px] text-[color:var(--text-tertiary)]">Toda tu planilla en .xlsx</span>
                    </div>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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

      {/* CTA accionable: si hay trabajadores con legajo incompleto, ofrecemos
          un atajo para reordenar la tabla por score asc — lleva al admin
          directo a los casos más urgentes sin pelear con filtros. */}
      {stats && stats.lowLegajoCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {stats.lowLegajoCount === 1
                  ? '1 trabajador tiene su legajo incompleto'
                  : `${stats.lowLegajoCount} trabajadores tienen su legajo incompleto`}
              </p>
              <p className="text-[11px] text-amber-800/80">
                Sin legajo completo no podemos calcular bien beneficios ni protegerte de multas SUNAFIL.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setSortBy('legajoScore')
              setSortDir('asc')
              setPagination(p => ({ ...p, page: 1 }))
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors flex-shrink-0"
          >
            Completar legajos ahora
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

          {/* Toggle "Ver cesados" — solo OWNER/SUPER_ADMIN (auditoría SUNAFIL Ley 27444) */}
          {(userRole === 'OWNER' || userRole === 'SUPER_ADMIN') && (
            <label
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors text-xs font-medium',
                incluirCesados
                  ? 'border-amber-300 bg-amber-50 text-amber-800'
                  : 'border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] hover:border-amber-300',
              )}
              title="Incluir trabajadores eliminados (soft-delete) en la lista. Solo visible para OWNER/SUPER_ADMIN."
            >
              <input
                type="checkbox"
                checked={incluirCesados}
                onChange={e => {
                  setIncluirCesados(e.target.checked)
                  setPagination(p => ({ ...p, page: 1 }))
                }}
                className="w-3.5 h-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500/20"
              />
              <span>Ver eliminados (auditoría)</span>
            </label>
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
                      Trabajador {renderSortIcon('lastName')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">DNI</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Cargo / Área</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Régimen</th>
                  <th className="text-left px-6 py-3">
                    <button onClick={() => handleSort('fechaIngreso')} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
                      Ingreso {renderSortIcon('fechaIngreso')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3">
                    <button onClick={() => handleSort('sueldoBruto')} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
                      Sueldo {renderSortIcon('sueldoBruto')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3">
                    <button onClick={() => handleSort('legajoScore')} className="flex items-center text-xs font-semibold text-gray-400 uppercase tracking-wider hover:text-white transition-colors">
                      Legajo {renderSortIcon('legajoScore')}
                    </button>
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Riesgo</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {workers.map(worker => {
                  const st = STATUS_CONFIG[worker.status] || STATUS_CONFIG.ACTIVE
                  return (
                    <tr key={worker.id} className={cn('hover:bg-[color:var(--neutral-100)] transition-colors duration-[var(--motion-short)] ease-[var(--ease-standard)]', selected.has(worker.id) && 'bg-primary/5')}>
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
                          {/* Foto subida desde portal o iniciales como fallback */}
                          {worker.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={worker.photoUrl}
                              alt={`Foto de ${worker.firstName}`}
                              className="w-9 h-9 rounded-full object-cover flex-shrink-0 ring-1 ring-emerald-200"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-primary">
                                {workerInitials(worker.firstName, worker.lastName)}
                              </span>
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors block">
                              {displayWorkerName(worker.firstName, worker.lastName)}
                            </span>
                            {/* Bio personal — humaniza el card */}
                            {worker.bio && (
                              <span className="text-[11px] text-slate-500 italic block truncate max-w-[260px]" title={worker.bio}>
                                💬 {worker.bio}
                              </span>
                            )}
                          </div>
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
                          <div className="flex flex-col gap-1">
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
                            {worker.legajoScore < 100 && (
                              <Link
                                href={`/dashboard/trabajadores/${worker.id}?tab=legajo`}
                                className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-0.5"
                              >
                                Subir docs
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={`/dashboard/trabajadores/${worker.id}?tab=legajo`}
                            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-800 hover:underline inline-flex items-center gap-0.5"
                          >
                            Subir docs
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold', st.color)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(worker.alertCount ?? 0) > 0 ? (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200"
                            title="Este trabajador tiene alertas críticas o altas activas"
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {worker.alertCount} {worker.alertCount === 1 ? 'alerta' : 'alertas'}
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title="Sin alertas críticas activas"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            Sin alertas
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Acciones rápidas — agrupadas en dropdown para no saturar la fila.
                              Las URLs llevan al admin a la pantalla correspondiente con
                              autofill por query string cuando aplica. */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors data-[state=open]:bg-primary/10 data-[state=open]:text-primary"
                                title="Más acciones"
                              >
                                <MoreHorizontal className="w-4 h-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-[240px]">
                              <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
                              <DropdownMenuItem
                                disabled={!worker.email}
                                onSelect={() => handleResendInvite(worker)}
                              >
                                <Mail className="w-4 h-4 text-emerald-600" />
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-[color:var(--text-primary)]">
                                    {worker.hasAccount ? 'Reenviar invitación' : 'Invitar al portal'}
                                  </span>
                                  <span className="text-[11px] text-[color:var(--text-tertiary)]">
                                    {worker.email ? worker.email : 'Sin email registrado'}
                                  </span>
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/contratos/nuevo?dni=${encodeURIComponent(worker.dni)}&workerName=${encodeURIComponent(displayWorkerName(worker.firstName, worker.lastName))}&cargo=${encodeURIComponent(worker.position ?? '')}&sueldo=${worker.sueldoBruto}`}
                                  className="cursor-pointer"
                                >
                                  <FilePlus2 className="w-4 h-4 text-emerald-600" />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Generar contrato</span>
                                    <span className="text-[11px] text-[color:var(--text-tertiary)]">Pre-llenado con sus datos</span>
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/trabajadores/${worker.id}?tab=alertas`}
                                  className="cursor-pointer"
                                >
                                  <Bell className={cn(
                                    'w-4 h-4',
                                    (worker.alertCount ?? 0) > 0 ? 'text-red-600' : 'text-emerald-600',
                                  )} />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Ver alertas</span>
                                    <span className="text-[11px] text-[color:var(--text-tertiary)]">
                                      {(worker.alertCount ?? 0) > 0
                                        ? `${worker.alertCount} ${worker.alertCount === 1 ? 'activa' : 'activas'}`
                                        : 'Sin alertas activas'}
                                    </span>
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/calculadoras/cts?dni=${encodeURIComponent(worker.dni)}`}
                                  className="cursor-pointer"
                                >
                                  <Wallet className="w-4 h-4 text-emerald-600" />
                                  <div className="flex flex-col">
                                    <span className="text-sm font-medium text-[color:var(--text-primary)]">Calcular CTS</span>
                                    <span className="text-[11px] text-[color:var(--text-tertiary)]">Compensación semestral</span>
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/trabajadores/${worker.id}`}
                                  className="cursor-pointer"
                                >
                                  <FileText className="w-4 h-4 text-[color:var(--text-secondary)]" />
                                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Ver perfil completo</span>
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Bulk action bar — dropdown unificado "Acciones masivas".
          El dropdown abre hacia arriba (side="top") porque la barra está pegada
          al bottom; así no se cubre en pantallas pequeñas. */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 bg-[#1a2035] border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/40">
          <span className="text-sm font-semibold text-white">
            {selected.size} seleccionado{selected.size !== 1 ? 's' : ''}
          </span>
          <div className="w-px h-6 bg-white/10" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[color:var(--text-secondary)] hover:text-white hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors disabled:opacity-50 data-[state=open]:bg-[color:var(--neutral-100)] data-[state=open]:text-white"
              >
                {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                Acciones masivas
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="min-w-[280px] mb-2">
              <DropdownMenuLabel>Cambios</DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => { setBulkDeptInput(''); setBulkModal('department') }}
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Cambiar área</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Reasignar departamento del grupo</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => { setBulkRegimenInput('GENERAL'); setBulkModal('regimen') }}
              >
                <Scale className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Cambiar régimen</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">D.Leg. 728, MYPE, agrario, etc.</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setBulkTransferForm({ department: '', position: '' })
                  setBulkModal('transfer-area')
                }}
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Transferir a otra área</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Cambia área + cargo + audit log</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setBulkRaiseForm({
                    mode: 'percent',
                    value: 5,
                    effectiveDate: new Date().toISOString().split('T')[0] ?? '',
                  })
                  setBulkModal('salary-raise')
                }}
              >
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Aplicar aumento de sueldo</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">% o monto fijo a la selección</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => {
                  setBulkScheduleForm({
                    expectedClockInHour: 8,
                    expectedClockInMinute: 0,
                    expectedClockOutHour: 17,
                    expectedClockOutMinute: 0,
                    lateToleranceMinutes: 15,
                  })
                  setBulkModal('set-schedule')
                }}
              >
                <Clock className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Asignar horario laboral</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Entrada/salida + tolerancia (R.M. 037)</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuLabel>Cambiar estado</DropdownMenuLabel>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => handleBulkAction('change-status', { status: key })}
                >
                  <span className={cn('w-2 h-2 rounded-full', cfg.color.split(' ')[1]?.replace('text-', 'bg-').replace('-400', '-500').replace('-600', '-500'))} />
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">{cfg.label}</span>
                </DropdownMenuItem>
              ))}

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Compliance / SST</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => { setBulkCourseId(coursesList[0]?.id ?? ''); setBulkModal('enroll-course') }}>
                <BookOpen className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Asignar curso</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Inscribir al grupo en un curso obligatorio</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                setBulkCapacitacionForm({
                  title: '',
                  topic: '',
                  fechaCapacitacion: new Date().toISOString().split('T')[0] ?? '',
                  instructor: '',
                  horas: 2,
                })
                setBulkModal('capacitacion')
              }}>
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Registrar capacitación</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Asistencia grupal — suma al score SST</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                setBulkEppForm({
                  eppsRaw: '',
                  fechaEntrega: new Date().toISOString().split('T')[0] ?? '',
                  serie: '',
                })
                setBulkModal('entrega-epp')
              }}>
                <HardHat className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Entrega de EPP</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Cascos, lentes, guantes — Ley 29783</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Nómina</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => {
                setBulkPayslipForm({
                  periodo: new Date().toISOString().slice(0, 7),
                  incluirGratificacion: false,
                })
                setBulkModal('generate-payslips')
              }}>
                <Wallet className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Generar boletas masivas</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Una boleta por trabajador para el periodo</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => {
                setBulkRenewForm({ extensionMonths: 12 })
                setBulkModal('renew-contracts')
              }}>
                <Calendar className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Renovar contratos a plazo fijo</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Extiende expiresAt N meses</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Exportar</DropdownMenuLabel>
              <DropdownMenuItem onSelect={handleBulkExport}>
                <Download className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Exportar selección (Excel)</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Datos básicos de los seleccionados</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleBulkExportLegajo}>
                <FileText className="w-4 h-4 text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-[color:var(--text-primary)]">Inventario de legajo</span>
                  <span className="text-[11px] text-[color:var(--text-tertiary)]">Documentos por trabajador (auditoría)</span>
                </div>
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuLabel>Acciones críticas</DropdownMenuLabel>
              <DropdownMenuItem
                destructive
                onSelect={() => {
                  setBulkTerminateForm({
                    tipoCese: 'MUTUO_DISENSO',
                    fechaCese: new Date().toISOString().split('T')[0] ?? '',
                    motivoCese: '',
                  })
                  setBulkModal('terminate')
                }}
              >
                <Ban className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Terminar masivo</span>
                  <span className="text-[11px] opacity-70">Crea proceso de cese para cada uno</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                destructive
                onSelect={() => {
                  setBulkTermLiqForm({
                    tipoCese: 'MUTUO_DISENSO',
                    fechaCese: new Date().toISOString().split('T')[0] ?? '',
                    motivoCese: '',
                  })
                  setBulkModal('terminate-liquidacion')
                }}
              >
                <Banknote className="w-4 h-4" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Terminar con liquidación</span>
                  <span className="text-[11px] opacity-70">Calcula CTS, vac., grati e indemnización</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

      {/* Modales de Acciones masivas (Fase 1) */}
      {bulkModal === 'department' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cambiar área</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} seleccionados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkModal(null)}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nueva área / departamento
                </label>
                <input
                  type="text"
                  list="dept-suggestions"
                  value={bulkDeptInput}
                  onChange={(e) => setBulkDeptInput(e.target.value)}
                  placeholder="Ej: Operaciones, Administración, Ventas"
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  autoFocus
                />
                <datalist id="dept-suggestions">
                  {(stats?.departments ?? []).map(d => <option key={d} value={d} />)}
                </datalist>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Deja vacío para quitar el área. Los trabajadores cesados no se ven afectados.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                onClick={() => setBulkModal(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('change-department', {
                  department: bulkDeptInput.trim() || null,
                })}
                disabled={bulkLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Aplicar a {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkModal === 'regimen' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Scale className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Cambiar régimen laboral</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} seleccionados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkModal(null)}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nuevo régimen
                </label>
                <select
                  value={bulkRegimenInput}
                  onChange={(e) => setBulkRegimenInput(e.target.value)}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  autoFocus
                >
                  {Object.entries(REGIMEN_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
                <p className="text-[11px] text-amber-700 mt-1.5 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200">
                  ⚠ Cambiar el régimen recalcula CTS, gratificación y vacaciones según las reglas del nuevo régimen. Verifica que los contratos vigentes sean compatibles antes de aplicar.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                onClick={() => setBulkModal(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('change-regimen', {
                  regimenLaboral: bulkRegimenInput,
                })}
                disabled={bulkLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Aplicar a {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkModal === 'terminate' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <Ban className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Terminar masivo</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} a cesar
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkModal(null)}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tipo de cese
                </label>
                <select
                  value={bulkTerminateForm.tipoCese}
                  onChange={(e) => setBulkTerminateForm(f => ({ ...f, tipoCese: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 text-sm"
                >
                  {TIPO_CESE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}{o.hint ? ` — ${o.hint}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Fecha de cese
                </label>
                <input
                  type="date"
                  value={bulkTerminateForm.fechaCese}
                  onChange={(e) => setBulkTerminateForm(f => ({ ...f, fechaCese: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Motivo / observaciones
                </label>
                <textarea
                  value={bulkTerminateForm.motivoCese}
                  onChange={(e) => setBulkTerminateForm(f => ({ ...f, motivoCese: e.target.value }))}
                  placeholder="Ej: Cierre de sucursal Lima Norte por reorganización"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 text-sm resize-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">Mínimo 3 caracteres. Aplica a todos los trabajadores seleccionados.</p>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-800">
                  Esto crea un proceso de cese en etapa <strong>Iniciado</strong> (sin liquidación calculada). La liquidación se calcula trabajador por trabajador desde el detalle. Acción irreversible.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                onClick={() => setBulkModal(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: `¿Terminar a ${selected.size} ${selected.size === 1 ? 'trabajador' : 'trabajadores'}?`,
                    description: 'Cada uno quedará con estado Cesado y se creará su proceso de cese. La liquidación deberá calcularse desde el detalle de cada uno.',
                    confirmLabel: 'Sí, terminar',
                    tone: 'danger',
                  })
                  if (!ok) return
                  handleBulkAction('terminate-bulk', {
                    tipoCese: bulkTerminateForm.tipoCese,
                    fechaCese: bulkTerminateForm.fechaCese,
                    motivoCese: bulkTerminateForm.motivoCese,
                  })
                }}
                disabled={
                  bulkLoading ||
                  !bulkTerminateForm.fechaCese ||
                  bulkTerminateForm.motivoCese.trim().length < 3
                }
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                Terminar {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Asignar curso (Fase 2 — Compliance/SST) */}
      {bulkModal === 'enroll-course' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Asignar curso</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} seleccionados
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Curso a asignar
                </label>
                {coursesLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Cargando catálogo...
                  </div>
                ) : coursesList.length === 0 ? (
                  <p className="text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
                    No hay cursos activos en el catálogo. Crea o activa al menos uno desde <strong>/dashboard/elearning</strong>.
                  </p>
                ) : (
                  <select
                    value={bulkCourseId}
                    onChange={(e) => setBulkCourseId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                    autoFocus
                  >
                    {coursesList.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title}{c.isObligatory ? ' • Obligatorio' : ''} — {c.category}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Los trabajadores ya inscritos en este curso o cesados se omiten automáticamente.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('enroll-course', { courseId: bulkCourseId })}
                disabled={bulkLoading || !bulkCourseId || coursesLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                Inscribir a {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Generar boletas masivas (Fase 2 — Nómina) */}
      {bulkModal === 'generate-payslips' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generar boletas masivas</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} seleccionados
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Periodo
                </label>
                <input
                  type="month"
                  value={bulkPayslipForm.periodo}
                  onChange={(e) => setBulkPayslipForm(f => ({ ...f, periodo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  autoFocus
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bulkPayslipForm.incluirGratificacion}
                  onChange={(e) => setBulkPayslipForm(f => ({ ...f, incluirGratificacion: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30"
                />
                <span className="text-sm text-slate-700">
                  Incluir gratificación (auto-detectada en julio y diciembre)
                </span>
              </label>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-700">
                  Se omiten trabajadores cesados, sin sueldo o que ya tienen boleta para este periodo. La renta de 5ta usa el acumulado del año en curso.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('bulk-generate-payslips', {
                  periodo: bulkPayslipForm.periodo,
                  incluirGratificacion: bulkPayslipForm.incluirGratificacion,
                })}
                disabled={
                  bulkLoading ||
                  !bulkPayslipForm.periodo ||
                  !/^\d{4}-\d{2}$/.test(bulkPayslipForm.periodo)
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                Generar para {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar capacitación (Fase 2 — SST) */}
      {bulkModal === 'capacitacion' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Registrar capacitación</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'asistente' : 'asistentes'}
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Título
                </label>
                <input
                  type="text"
                  value={bulkCapacitacionForm.title}
                  onChange={(e) => setBulkCapacitacionForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Capacitación SST en altura"
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tema (opcional)
                </label>
                <input
                  type="text"
                  value={bulkCapacitacionForm.topic}
                  onChange={(e) => setBulkCapacitacionForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="Ej: Trabajos en altura > 1.80m, arnés y línea de vida"
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={bulkCapacitacionForm.fechaCapacitacion}
                    onChange={(e) => setBulkCapacitacionForm(f => ({ ...f, fechaCapacitacion: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Horas
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={bulkCapacitacionForm.horas}
                    onChange={(e) => setBulkCapacitacionForm(f => ({ ...f, horas: Number(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Instructor (opcional)
                </label>
                <input
                  type="text"
                  value={bulkCapacitacionForm.instructor}
                  onChange={(e) => setBulkCapacitacionForm(f => ({ ...f, instructor: e.target.value }))}
                  placeholder="Nombre o empresa que dictó la capacitación"
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('register-capacitacion', {
                  title: bulkCapacitacionForm.title,
                  topic: bulkCapacitacionForm.topic || undefined,
                  fechaCapacitacion: bulkCapacitacionForm.fechaCapacitacion,
                  instructor: bulkCapacitacionForm.instructor || undefined,
                  horas: bulkCapacitacionForm.horas,
                })}
                disabled={
                  bulkLoading ||
                  bulkCapacitacionForm.title.trim().length < 3 ||
                  !bulkCapacitacionForm.fechaCapacitacion ||
                  !bulkCapacitacionForm.horas
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Entrega de EPP (Fase 2 — SST) */}
      {bulkModal === 'entrega-epp' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <HardHat className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Entrega de EPP</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'}
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  EPP entregados (uno por línea)
                </label>
                <textarea
                  value={bulkEppForm.eppsRaw}
                  onChange={(e) => setBulkEppForm(f => ({ ...f, eppsRaw: e.target.value }))}
                  placeholder={'Casco de seguridad clase A\nLentes de seguridad transparentes\nBotas dieléctricas\nGuantes de cuero'}
                  rows={5}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm resize-none"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Fecha de entrega
                  </label>
                  <input
                    type="date"
                    value={bulkEppForm.fechaEntrega}
                    onChange={(e) => setBulkEppForm(f => ({ ...f, fechaEntrega: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Lote / Serie
                  </label>
                  <input
                    type="text"
                    value={bulkEppForm.serie}
                    onChange={(e) => setBulkEppForm(f => ({ ...f, serie: e.target.value }))}
                    placeholder="Opcional"
                    className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  />
                </div>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-700">
                  Se crea un registro SST tipo <strong>ENTREGA_EPP</strong> con la lista de trabajadores como participantes — válido como evidencia ante SUNAFIL (Ley 29783, art. 60).
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const epps = bulkEppForm.eppsRaw
                    .split('\n')
                    .map(l => l.trim())
                    .filter(Boolean)
                  handleBulkAction('register-entrega-epp', {
                    epps,
                    fechaEntrega: bulkEppForm.fechaEntrega,
                    serie: bulkEppForm.serie || undefined,
                  })
                }}
                disabled={
                  bulkLoading ||
                  bulkEppForm.eppsRaw.trim().length === 0 ||
                  !bulkEppForm.fechaEntrega
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Registrar entrega
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Transferir a otra área (Fase 3) */}
      {bulkModal === 'transfer-area' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Transferir a otra área</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} seleccionados
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nueva área
                </label>
                <input
                  type="text"
                  list="dept-suggestions-transfer"
                  value={bulkTransferForm.department}
                  onChange={(e) => setBulkTransferForm(f => ({ ...f, department: e.target.value }))}
                  placeholder="Ej: Operaciones — Sede Lima Norte"
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  autoFocus
                />
                <datalist id="dept-suggestions-transfer">
                  {(stats?.departments ?? []).map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Cargo (opcional)
                </label>
                <input
                  type="text"
                  value={bulkTransferForm.position}
                  onChange={(e) => setBulkTransferForm(f => ({ ...f, position: e.target.value }))}
                  placeholder="Si todos pasan al mismo cargo. Vacío = mantener cargos actuales"
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                />
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-700">
                  Se crea 1 entrada en AuditLog por trabajador con el cambio (área anterior → nueva). Cesados quedan fuera.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('transfer-area', {
                  department: bulkTransferForm.department,
                  position: bulkTransferForm.position || undefined,
                })}
                disabled={bulkLoading || !bulkTransferForm.department.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                Transferir a {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aplicar aumento de sueldo (Fase 3) */}
      {bulkModal === 'salary-raise' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Aplicar aumento de sueldo</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} con sueldo &gt; 0
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tipo de aumento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['percent', 'amount'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setBulkRaiseForm(f => ({ ...f, mode: m, value: m === 'percent' ? 5 : 200 }))}
                      className={cn(
                        'px-3 py-2 text-sm font-medium rounded-lg transition-colors border',
                        bulkRaiseForm.mode === m
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-[color:var(--border-default)] bg-white text-slate-600 hover:bg-slate-50',
                      )}
                    >
                      {m === 'percent' ? 'Porcentaje %' : 'Monto fijo S/'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  {bulkRaiseForm.mode === 'percent' ? 'Aumento (%)' : 'Aumento (S/)'}
                </label>
                <input
                  type="number"
                  min={0.01}
                  step={bulkRaiseForm.mode === 'percent' ? 0.5 : 50}
                  max={bulkRaiseForm.mode === 'percent' ? 100 : 50000}
                  value={bulkRaiseForm.value}
                  onChange={(e) => setBulkRaiseForm(f => ({ ...f, value: Number(e.target.value) || 0 }))}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Vigencia desde
                </label>
                <input
                  type="date"
                  value={bulkRaiseForm.effectiveDate}
                  onChange={(e) => setBulkRaiseForm(f => ({ ...f, effectiveDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                />
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800">
                  Esto actualiza <strong>sueldoBruto</strong> y crea AuditLog por trabajador con el delta. <strong>No</strong> genera addendum — para eso usa el detalle del trabajador. Recalcula CTS y gratificación a partir de la próxima.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: `¿Aplicar ${bulkRaiseForm.mode === 'percent' ? `+${bulkRaiseForm.value}%` : `+S/ ${bulkRaiseForm.value}`} a ${selected.size}?`,
                    description: 'Cambia el sueldo bruto de cada trabajador inmediatamente. Acción rastreada en AuditLog. Verifica el monto antes de confirmar.',
                    confirmLabel: 'Aplicar aumento',
                    tone: 'danger',
                  })
                  if (!ok) return
                  handleBulkAction('apply-salary-raise', {
                    mode: bulkRaiseForm.mode,
                    value: bulkRaiseForm.value,
                    effectiveDate: bulkRaiseForm.effectiveDate,
                  })
                }}
                disabled={bulkLoading || !bulkRaiseForm.value || bulkRaiseForm.value <= 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
                Aplicar a {selected.size}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Renovar contratos a plazo fijo (Fase 3) */}
      {bulkModal === 'renew-contracts' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Renovar contratos a plazo fijo</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} seleccionados
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Meses de extensión
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={bulkRenewForm.extensionMonths}
                  onChange={(e) => setBulkRenewForm({ extensionMonths: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40 text-sm"
                  autoFocus
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Los D.Leg. 728 contratos a plazo fijo no pueden superar 5 años acumulados sin pasar a indeterminado.
                </p>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-700">
                  Solo se renuevan contratos tipo <strong>LABORAL_PLAZO_FIJO</strong> con fecha de vencimiento. Los workers sin contrato a plazo fijo se reportan como saltados.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('renew-contracts', { extensionMonths: bulkRenewForm.extensionMonths })}
                disabled={bulkLoading || bulkRenewForm.extensionMonths < 1 || bulkRenewForm.extensionMonths > 60}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                Renovar +{bulkRenewForm.extensionMonths}m
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Terminar con liquidación (Fase 3) */}
      {bulkModal === 'terminate-liquidacion' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Terminar con liquidación</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} a cesar
                  </p>
                </div>
              </div>
              <button onClick={() => setBulkModal(null)} className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tipo de cese
                </label>
                <select
                  value={bulkTermLiqForm.tipoCese}
                  onChange={(e) => setBulkTermLiqForm(f => ({ ...f, tipoCese: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 text-sm"
                >
                  {TIPO_CESE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}{o.hint ? ` — ${o.hint}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Fecha de cese
                </label>
                <input
                  type="date"
                  value={bulkTermLiqForm.fechaCese}
                  onChange={(e) => setBulkTermLiqForm(f => ({ ...f, fechaCese: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Motivo / observaciones
                </label>
                <textarea
                  value={bulkTermLiqForm.motivoCese}
                  onChange={(e) => setBulkTermLiqForm(f => ({ ...f, motivoCese: e.target.value }))}
                  placeholder="Ej: Cierre de sucursal Lima Norte"
                  rows={2}
                  className="w-full px-3 py-2.5 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500/40 text-sm resize-none"
                />
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-red-800">
                  Para cada trabajador: marca <strong>Cesado</strong>, calcula CTS, vacaciones, gratificación e indemnización con <strong>calcularLiquidacion()</strong>, y persiste todo en CeseRecord etapa <strong>LIQUIDACION_CALCULADA</strong>. Microempresa: CTS y grati en cero. Acción irreversible.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button onClick={() => setBulkModal(null)} className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: `¿Terminar a ${selected.size} con liquidación?`,
                    description: 'Cada uno quedará Cesado y tendrá su liquidación calculada y persistida. Verifica los datos antes de confirmar — esto es irreversible.',
                    confirmLabel: 'Sí, terminar y liquidar',
                    tone: 'danger',
                  })
                  if (!ok) return
                  handleBulkAction('terminate-with-liquidacion', {
                    tipoCese: bulkTermLiqForm.tipoCese,
                    fechaCese: bulkTermLiqForm.fechaCese,
                    motivoCese: bulkTermLiqForm.motivoCese,
                  })
                }}
                disabled={
                  bulkLoading ||
                  !bulkTermLiqForm.fechaCese ||
                  bulkTermLiqForm.motivoCese.trim().length < 3
                }
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Banknote className="w-3.5 h-3.5" />}
                Terminar y liquidar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Asignar horario laboral (Fase 1.2) */}
      {bulkModal === 'set-schedule' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Asignar horario laboral</h3>
                  <p className="text-xs text-gray-500">
                    {selected.size} {selected.size === 1 ? 'trabajador' : 'trabajadores'} seleccionados
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBulkModal(null)}
                className="p-1.5 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Hora entrada
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      step={1}
                      value={bulkScheduleForm.expectedClockInHour}
                      onChange={(e) => setBulkScheduleForm(f => ({
                        ...f,
                        expectedClockInHour: Math.max(0, Math.min(23, Math.floor(Number(e.target.value) || 0))),
                      }))}
                      className="w-14 px-2 py-2 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
                    />
                    <span className="text-slate-400">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={1}
                      value={bulkScheduleForm.expectedClockInMinute}
                      onChange={(e) => setBulkScheduleForm(f => ({
                        ...f,
                        expectedClockInMinute: Math.max(0, Math.min(59, Math.floor(Number(e.target.value) || 0))),
                      }))}
                      className="w-14 px-2 py-2 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Hora salida
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={23}
                      step={1}
                      value={bulkScheduleForm.expectedClockOutHour}
                      onChange={(e) => setBulkScheduleForm(f => ({
                        ...f,
                        expectedClockOutHour: Math.max(0, Math.min(23, Math.floor(Number(e.target.value) || 0))),
                      }))}
                      className="w-14 px-2 py-2 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
                    />
                    <span className="text-slate-400">:</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={1}
                      value={bulkScheduleForm.expectedClockOutMinute}
                      onChange={(e) => setBulkScheduleForm(f => ({
                        ...f,
                        expectedClockOutMinute: Math.max(0, Math.min(59, Math.floor(Number(e.target.value) || 0))),
                      }))}
                      className="w-14 px-2 py-2 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-lg text-sm font-mono text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Tolerancia (minutos)
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  step={1}
                  value={bulkScheduleForm.lateToleranceMinutes}
                  onChange={(e) => setBulkScheduleForm(f => ({
                    ...f,
                    lateToleranceMinutes: Math.max(0, Math.min(120, Math.floor(Number(e.target.value) || 0))),
                  }))}
                  className="w-32 px-3 py-2 border border-[color:var(--border-default)] bg-white text-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/40"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Margen de gracia post-hora de entrada (0-120 min). Después es tardanza.
                </p>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-700">
                  R.M. 037-2024-TR exige documentar la política de entrada y tolerancia.
                  Se aplica a workers no cesados. Cesados se ignoran.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[color:var(--border-default)] bg-[color:var(--neutral-50)] rounded-b-2xl">
              <button
                onClick={() => setBulkModal(null)}
                className="px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleBulkAction('set-schedule', bulkScheduleForm)}
                disabled={
                  bulkLoading ||
                  bulkScheduleForm.expectedClockOutHour * 60 + bulkScheduleForm.expectedClockOutMinute <=
                    bulkScheduleForm.expectedClockInHour * 60 + bulkScheduleForm.expectedClockInMinute
                }
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                Aplicar a {selected.size}
              </button>
            </div>
          </div>
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
                                  accept=".xlsx,.csv"
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
                                  <p className="text-xs text-gray-500">Excel (.xlsx) o CSV — máx. 5 MB</p>
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
                              <p className="font-medium text-slate-900 truncate">
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
                                  <input type="file" accept=".xlsx,.csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
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
                                  <p className="text-xs text-gray-500">Excel (.xlsx) o CSV — máx. 20 MB</p>
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
