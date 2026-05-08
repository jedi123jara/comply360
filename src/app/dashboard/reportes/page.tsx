'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  FileText,
  Calendar,
  Clock,
  FileBarChart,
  Loader2,
  HardHat,
  AlertTriangle,
  Download,
  Mail,
  FileSpreadsheet,
  Filter,
  Play,
  Pause,
  Search,
  RefreshCw,
  Zap,
  GraduationCap,
  DollarSign,
  UserMinus,
  ClipboardList,
  Heart,
  Bell,
  Plus,
  ChevronDown,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { ScheduledReportsPanel } from '@/components/reports/scheduled-reports-panel'

// ─── Types ────────────────────────────────────────────────────────────
interface ReportData {
  summary: {
    totalWorkers: number
    activeWorkers: number
    totalCalculations: number
    recentCalculations: number
    calcTrend: number
    totalContracts: number
    recentContracts: number
    contractTrend: number
    topCalculatorType: string | null
    topCalculatorCount: number
    openAlerts: number
    alertsBySeverity: Record<string, number>
  }
  compliance: {
    latestScore: number | null
    latestMulta: number | null
    diagnosticHistory: { id: string; type: string; score: number; multa: number; date: string }[]
  }
  contracts: {
    byStatus: Record<string, number>
    byType: Record<string, number>
  }
  calculations: {
    byType: Record<string, number>
  }
  sst: {
    total: number
    completed: number
    overdue: number
    completionRate: number
  }
  complaints: {
    total: number
    resolved: number
    pending: number
  }
  activityFeed: { id: string; type: string; label: string; detail: string | null; createdAt: string }[]
}

interface GeneratedReport {
  id: string
  type: string
  typeLabel: string
  format: 'PDF' | 'Excel' | 'CSV'
  date: string
  size: string
  status: 'completed' | 'generating'
}

interface ScheduledReport {
  id: string
  typeLabel: string
  frequency: string
  recipients: string[]
  active: boolean
  nextRun: string
}

/**
 * IDs que usan endpoints dedicados react-pdf en vez del genérico `/api/reports/pdf`.
 * Mapea id → URL del endpoint ejecutivo.
 */
const EXECUTIVE_REPORT_ENDPOINTS: Record<string, string> = {
  'compliance-ejecutivo': '/api/reports/compliance-pdf',
  'sst-anual': '/api/reports/sst-anual',
}

// ─── Report Catalog ───────────────────────────────────────────────────
const REPORT_CATALOG = [
  {
    id: 'compliance-ejecutivo',
    title: 'Reporte Ejecutivo de Compliance',
    description: 'Documento ejecutivo con score global, desglose por área, métricas clave y estimación de multa. Formato profesional para directorio o auditoría.',
    icon: FileBarChart,
    color: 'text-emerald-600',
    bg: 'bg-emerald-900/30',
    borderColor: 'border-emerald-800',
    gradientFrom: 'from-emerald-500',
    filters: [],
  },
  {
    id: 'sst-anual',
    title: 'Informe Anual de SST (Ley 29783)',
    description: 'Informe del Comité de SST: accidentes, incidentes, capacitaciones, exámenes médicos, EPP y avance del plan anual. Exigido por el art. 32 de la Ley 29783.',
    icon: Heart,
    color: 'text-red-400',
    bg: 'bg-red-900/30',
    borderColor: 'border-red-800',
    gradientFrom: 'from-red-500',
    filters: [],
  },
  {
    id: 'planilla',
    title: 'Reporte de Planilla Mensual',
    description: 'Detalle de remuneraciones, descuentos, aportes y netos por trabajador.',
    icon: BarChart3,
    color: 'text-emerald-600',
    bg: 'bg-blue-900/30',
    borderColor: 'border-blue-800',
    gradientFrom: 'from-blue-500',
    filters: ['department', 'regime'],
  },
  {
    id: 'cumplimiento',
    title: 'Reporte de Cumplimiento Normativo',
    description: 'Score de compliance, areas criticas, obligaciones pendientes y multas evitadas.',
    icon: ClipboardList,
    color: 'text-emerald-600',
    bg: 'bg-emerald-900/30',
    borderColor: 'border-emerald-800',
    gradientFrom: 'from-emerald-500',
    filters: [],
  },
  {
    id: 'trabajadores',
    title: 'Reporte de Trabajadores por Regimen',
    description: 'Listado completo de trabajadores agrupados por regimen laboral y tipo de contrato.',
    icon: HardHat,
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    borderColor: 'border-amber-800',
    gradientFrom: 'from-amber-500',
    filters: ['regime'],
  },
  {
    id: 'contratos',
    title: 'Reporte de Contratos',
    description: 'Contratos vencidos, vigentes y por vencer con alertas de renovacion.',
    icon: FileText,
    color: 'text-purple-400',
    bg: 'bg-purple-900/30',
    borderColor: 'border-purple-800',
    gradientFrom: 'from-purple-500',
    filters: ['department'],
  },
  {
    id: 'alertas',
    title: 'Reporte de Alertas y Riesgos',
    description: 'Alertas activas por severidad, acciones requeridas y riesgos identificados.',
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-900/30',
    borderColor: 'border-red-800',
    gradientFrom: 'from-red-500',
    filters: [],
  },
  {
    id: 'sst',
    title: 'Reporte SST',
    description: 'Accidentes laborales, capacitaciones SST, IPERC, examenes medicos y EPP.',
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-900/30',
    borderColor: 'border-pink-800',
    gradientFrom: 'from-pink-500',
    filters: ['department'],
  },
  {
    id: 'costos',
    title: 'Reporte de Costos Laborales',
    description: 'Analisis de costos laborales totales: sueldos, beneficios, cargas sociales y provisiones.',
    icon: DollarSign,
    color: 'text-sky-400',
    bg: 'bg-sky-900/30',
    borderColor: 'border-sky-800',
    gradientFrom: 'from-sky-500',
    filters: ['department'],
  },
  {
    id: 'rotacion',
    title: 'Reporte de Rotacion de Personal',
    description: 'Indice de rotacion, ingresos, ceses, motivos de salida y tendencias.',
    icon: UserMinus,
    color: 'text-orange-400',
    bg: 'bg-orange-900/30',
    borderColor: 'border-orange-800',
    gradientFrom: 'from-orange-500',
    filters: ['department'],
  },
  {
    id: 'capacitaciones',
    title: 'Reporte de Capacitaciones',
    description: 'Capacitaciones realizadas, asistencia, horas invertidas y cumplimiento del plan anual.',
    icon: GraduationCap,
    color: 'text-indigo-400',
    bg: 'bg-indigo-900/30',
    borderColor: 'border-indigo-800',
    gradientFrom: 'from-indigo-500',
    filters: ['department'],
  },
]

const DEPARTMENTS = [
  'Todos',
  'Administracion',
  'Recursos Humanos',
  'Operaciones',
  'Ventas',
  'Legal',
  'Finanzas',
  'TI',
]

const REGIMES = [
  'Todos',
  'General',
  'MYPE',
  'Micro Empresa',
  'Agrario',
  'Construccion Civil',
]

// ─── localStorage persistence for report history ─────────────────────
const REPORTS_STORAGE_KEY = 'comply360_report_history'

function loadReportHistory(): GeneratedReport[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(REPORTS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveReportHistory(reports: GeneratedReport[]) {
  try {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports.slice(0, 50)))
  } catch { /* ignore */ }
}

const SCHEDULED_STORAGE_KEY = 'comply360_scheduled_reports'
const DEFAULT_SCHEDULED: ScheduledReport[] = [
  { id: '1', typeLabel: 'Planilla Mensual', frequency: 'Mensual', recipients: ['rrhh@empresa.com'], active: false, nextRun: '' },
  { id: '2', typeLabel: 'Cumplimiento Normativo', frequency: 'Semanal', recipients: ['legal@empresa.com'], active: false, nextRun: '' },
]

function loadScheduled(): ScheduledReport[] {
  if (typeof window === 'undefined') return DEFAULT_SCHEDULED
  try {
    const raw = localStorage.getItem(SCHEDULED_STORAGE_KEY)
    return raw ? JSON.parse(raw) : DEFAULT_SCHEDULED
  } catch { return DEFAULT_SCHEDULED }
}

// ─── Helper components ───────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, iconBg, iconColor }: {
  icon: typeof FileText
  label: string
  value: string | number
  sub?: string
  iconBg: string
  iconColor: string
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl bg-white backdrop-blur-xl border border-[color:var(--border-default)] p-5 shadow-sm">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className={cn('h-6 w-6', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-[color:var(--text-tertiary)]">{label}</p>
        {sub && <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function FormatBadge({ format }: { format: string }) {
  const styles: Record<string, string> = {
    PDF: 'bg-red-900/30 text-red-400',
    Excel: 'bg-green-900/30 text-green-400',
    CSV: 'bg-blue-900/30 text-emerald-600',
  }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', styles[format] || 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]')}>
      {format}
    </span>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function ReportesPage() {
  const [, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<string | null>(null)
  const [reportError, setReportError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'galeria' | 'historial' | 'programados'>('galeria')

  // Form state for selected report — dates derived at render time so they stay current
  const today = new Date()
  const defaultEndDate = today.toISOString().slice(0, 10)
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)

  const [formState, setFormState] = useState<{
    startDate: string
    endDate: string
    format: 'PDF' | 'Excel' | 'CSV'
    department: string
    regime: string
  }>({
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    format: 'PDF',
    department: 'Todos',
    regime: 'Todos',
  })

  // Recent reports — persisted in localStorage
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>(() => loadReportHistory())
  const [scheduledReports] = useState<ScheduledReport[]>(() => loadScheduled())

  useEffect(() => {
    fetch('/api/reports')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleGenerate = useCallback(async (reportId: string) => {
    setGenerating(reportId)
    try {
      const params = new URLSearchParams({ type: reportId })
      if (formState.startDate) params.set('start', formState.startDate)
      if (formState.endDate) params.set('end', formState.endDate)
      if (formState.department !== 'Todos') params.set('department', formState.department)
      if (formState.regime !== 'Todos') params.set('regime', formState.regime)

      if (formState.format === 'PDF') {
        const executiveEndpoint = EXECUTIVE_REPORT_ENDPOINTS[reportId]
        if (executiveEndpoint) {
          // Los reportes ejecutivos tienen su propio endpoint (react-pdf), no
          // aceptan los filtros genéricos — solo el año si aplica.
          const execParams = new URLSearchParams()
          if (reportId === 'sst-anual' && formState.startDate) {
            execParams.set('year', String(new Date(formState.startDate).getFullYear()))
          }
          const qs = execParams.toString()
          window.open(`${executiveEndpoint}${qs ? `?${qs}` : ''}`, '_blank')
        } else {
          window.open(`/api/reports/pdf?${params}`, '_blank')
        }
      } else {
        // Excel / CSV export
        const exportType = reportId === 'trabajadores' ? 'workers' : reportId === 'planilla' ? 'calculations' : 'workers'
        const exportFormat = formState.format === 'Excel' ? 'xlsx' : 'csv'
        window.open(`/api/export?type=${exportType}&format=${exportFormat}`, '_blank')
      }

      const catalog = REPORT_CATALOG.find(r => r.id === reportId)
      const newReport: GeneratedReport = {
        id: Date.now().toString(),
        type: reportId,
        typeLabel: catalog?.title.replace('Reporte de ', '').replace('Reporte ', '') || reportId,
        format: formState.format,
        date: new Date().toISOString(),
        size: formState.format === 'PDF' ? 'PDF generado' : formState.format === 'Excel' ? 'XLSX' : 'CSV',
        status: 'completed',
      }
      setRecentReports(prev => {
        const updated = [newReport, ...prev].slice(0, 50)
        saveReportHistory(updated)
        return updated
      })
    } catch (err) {
      console.error('Report generation error:', err)
      setReportError('Error al generar el reporte. Intente de nuevo.')
    } finally {
      setGenerating(null)
    }
  }, [formState])

  const filteredCatalog = REPORT_CATALOG.filter(r =>
    r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const reportsThisMonth = recentReports.filter(r => {
    const d = new Date(r.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const lastReport = recentReports[0]
  const activeScheduled = scheduledReports.filter(s => s.active).length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error banner — replaces native alert() */}
      {reportError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-800 bg-red-900/20 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-300 flex-1">{reportError}</p>
          <button
            onClick={() => setReportError(null)}
            className="ml-auto p-1 rounded hover:bg-red-800/50"
            aria-label="Cerrar error"
          >
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <PageHeader
        eyebrow="Reportes"
        title="Extrae tu data en <em>reportes ejecutivos</em>."
        subtitle="Genera, descarga y programa reportes de tu organización en PDF, Excel o CSV."
        actions={
          <>
            <a
              href="/api/export?type=workers&format=xlsx"
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-emerald-700)] px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Trabajadores
            </a>
            <a
              href="/api/export?type=calculations&format=xlsx"
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-emerald-700)] px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar Cálculos
            </a>
          </>
        }
      />

      {/* ─── Quick Stats ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={FileBarChart}
          label="Reportes este mes"
          value={reportsThisMonth}
          sub={`${recentReports.length} total generados`}
          iconBg="bg-blue-900/30"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Ultimo reporte generado"
          value={lastReport ? lastReport.typeLabel : 'Ninguno'}
          sub={lastReport ? new Date(lastReport.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
          iconBg="bg-emerald-900/30"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={Bell}
          label="Reportes programados activos"
          value={activeScheduled}
          sub={`${scheduledReports.length} configurados en total`}
          iconBg="bg-purple-900/30"
          iconColor="text-purple-400"
        />
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────────────── */}
      <div className="border-b border-[color:var(--border-default)]">
        <nav className="flex gap-6">
          {([
            { key: 'galeria' as const, label: 'Galeria de Reportes', icon: BarChart3 },
            { key: 'historial' as const, label: 'Historial de Reportes', icon: Clock },
            { key: 'programados' as const, label: 'Reportes Programados', icon: Calendar },
          ]).map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-2 py-3 px-1 text-sm font-medium border-b-2 transition-colors -mb-px',
                  activeTab === tab.key
                    ? 'border-blue-400 text-emerald-600'
                    : 'border-transparent text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] hover:border-[color:var(--border-default)]'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* ─── Tab: Galeria de Reportes ───────────────────────────────── */}
      {activeTab === 'galeria' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Buscar tipo de reporte..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[color:var(--border-default)] bg-surface text-sm text-[color:var(--text-secondary)] placeholder:text-[color:var(--text-tertiary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Report Cards Grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredCatalog.map(report => {
              const Icon = report.icon
              const isSelected = selectedReport === report.id
              const isGenerating = generating === report.id

              return (
                <div
                  key={report.id}
                  className={cn(
                    'group rounded-xl bg-white backdrop-blur-xl border border-[color:var(--border-default)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 cursor-pointer',
                    isSelected
                      ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
                      : 'hover:border-[color:var(--border-default)]-hover hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.2),0_0_10px_var(--color-gold-glow)]'
                  )}
                  onClick={() => setSelectedReport(isSelected ? null : report.id)}
                >
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105',
                        report.bg
                      )}>
                        <Icon className={cn('h-6 w-6', report.color)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-bold text-[color:var(--text-secondary)] leading-tight">{report.title}</h3>
                        <p className="mt-1.5 text-xs text-[color:var(--text-tertiary)] leading-relaxed">{report.description}</p>
                      </div>
                      <ChevronDown className={cn(
                        'h-4 w-4 text-[color:var(--text-tertiary)] shrink-0 transition-transform',
                        isSelected && 'rotate-180'
                      )} />
                    </div>

                    {/* Quick action row */}
                    {!isSelected && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-[color:var(--text-tertiary)]">
                          PDF / Excel / CSV
                        </span>
                        <span className="flex-1" />
                        <span className="text-xs text-[color:var(--text-tertiary)]">
                          Click para configurar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Form */}
                  {isSelected && (
                    <div className="border-t border-[color:var(--border-default)] p-5 space-y-4" onClick={e => e.stopPropagation()}>
                      {/* Date Range */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-[color:var(--text-tertiary)]" />
                          <span className="text-xs font-semibold text-[color:var(--text-tertiary)]">Periodo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-[color:var(--text-tertiary)] mb-1 block">Desde</label>
                            <input
                              type="date"
                              value={formState.startDate}
                              onChange={e => setFormState(s => ({ ...s, startDate: e.target.value }))}
                              className="w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] px-3 py-2 text-xs text-[color:var(--text-secondary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-[color:var(--text-tertiary)] mb-1 block">Hasta</label>
                            <input
                              type="date"
                              value={formState.endDate}
                              onChange={e => setFormState(s => ({ ...s, endDate: e.target.value }))}
                              className="w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] px-3 py-2 text-xs text-[color:var(--text-secondary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Format */}
                      <div>
                        <label className="text-[11px] font-semibold text-[color:var(--text-tertiary)] mb-2 block">Formato de salida</label>
                        <div className="flex gap-2">
                          {(['PDF', 'Excel', 'CSV'] as const).map(fmt => (
                            <button
                              key={fmt}
                              onClick={() => setFormState(s => ({ ...s, format: fmt }))}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors',
                                formState.format === fmt
                                  ? fmt === 'PDF'
                                    ? 'bg-red-900/30 border-red-700 text-red-400'
                                    : fmt === 'Excel'
                                      ? 'bg-green-900/30 border-green-700 text-green-400'
                                      : 'bg-blue-900/30 border-blue-700 text-emerald-600'
                                  : 'bg-[color:var(--neutral-100)] border-[color:var(--border-default)] text-[color:var(--text-tertiary)] hover:bg-[color:var(--neutral-100)]'
                              )}
                            >
                              {fmt === 'PDF' && <FileText className="h-3.5 w-3.5" />}
                              {fmt === 'Excel' && <FileSpreadsheet className="h-3.5 w-3.5" />}
                              {fmt === 'CSV' && <FileBarChart className="h-3.5 w-3.5" />}
                              {fmt}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Filters */}
                      {report.filters.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {report.filters.includes('department') && (
                            <div>
                              <label className="text-[11px] font-semibold text-[color:var(--text-tertiary)] mb-1 block">
                                <Filter className="h-3 w-3 inline mr-1" />Area
                              </label>
                              <select
                                value={formState.department}
                                onChange={e => setFormState(s => ({ ...s, department: e.target.value }))}
                                className="w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] px-3 py-2 text-xs text-[color:var(--text-secondary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                              >
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                          )}
                          {report.filters.includes('regime') && (
                            <div>
                              <label className="text-[11px] font-semibold text-[color:var(--text-tertiary)] mb-1 block">
                                <Filter className="h-3 w-3 inline mr-1" />Regimen
                              </label>
                              <select
                                value={formState.regime}
                                onChange={e => setFormState(s => ({ ...s, regime: e.target.value }))}
                                className="w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] px-3 py-2 text-xs text-[color:var(--text-secondary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                              >
                                {REGIMES.map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Generate Button */}
                      <button
                        onClick={() => handleGenerate(report.id)}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-600-dark text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generando reporte...
                          </>
                        ) : (
                          <>
                            <Zap className="h-4 w-4" />
                            Generar Reporte
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {filteredCatalog.length === 0 && (
            <div className="text-center py-12 rounded-xl border border-dashed border-[color:var(--border-default)]">
              <Search className="h-8 w-8 text-gray-600 mx-auto" />
              <p className="mt-3 text-sm text-[color:var(--text-tertiary)]">No se encontraron reportes con &ldquo;{searchTerm}&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Historial de Reportes ─────────────────────────────── */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[color:var(--text-secondary)]">Ultimos reportes generados</h2>
            <span className="text-xs text-[color:var(--text-tertiary)]">{recentReports.length} reportes</span>
          </div>

          <div className="rounded-xl border border-[color:var(--border-default)] bg-surface shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-surface/80 border-b border-[color:var(--border-default)]">
              <span className="col-span-4 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Tipo de Reporte</span>
              <span className="col-span-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Fecha</span>
              <span className="col-span-1 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Formato</span>
              <span className="col-span-1 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Tamano</span>
              <span className="col-span-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider text-right">Acciones</span>
            </div>

            {/* Table Rows */}
            {recentReports.map((report, idx) => {
              const catalog = REPORT_CATALOG.find(c => c.id === report.type)
              const Icon = catalog?.icon || FileText

              return (
                <div
                  key={report.id}
                  className={cn(
                    'grid grid-cols-12 gap-4 px-5 py-4 items-center transition-colors hover:bg-[color:var(--neutral-100)]',
                    idx < recentReports.length - 1 && 'border-b border-[color:var(--border-default)]'
                  )}
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', catalog?.bg || 'bg-[color:var(--neutral-100)]')}>
                      <Icon className={cn('h-4 w-4', catalog?.color || 'text-[color:var(--text-tertiary)]')} />
                    </div>
                    <span className="text-sm font-medium text-[color:var(--text-secondary)] truncate">{report.typeLabel}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-[color:var(--text-tertiary)]">
                      {new Date(report.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="block text-xs text-[color:var(--text-tertiary)]">
                      {new Date(report.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <FormatBadge format={report.format} />
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm text-[color:var(--text-tertiary)]">{report.size}</span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <button
                      disabled
                      title="Regenera el reporte para descargarlo"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white opacity-50 cursor-not-allowed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </button>
                    <button
                      disabled
                      title="Proximamente"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[color:var(--border-default)] text-[color:var(--text-tertiary)] opacity-50 cursor-not-allowed"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      Enviar
                    </button>
                  </div>
                </div>
              )
            })}

            {recentReports.length === 0 && (
              <div className="py-12 text-center">
                <FileText className="h-10 w-10 text-gray-600 mx-auto" />
                <p className="mt-3 text-sm text-[color:var(--text-tertiary)]">No hay reportes generados aun.</p>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">Genera tu primer reporte desde la galeria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Reportes Programados ──────────────────────────────── */}
      {activeTab === 'programados' && (
        <div className="space-y-6">
          <ScheduledReportsPanel />

          {/* New scheduled report card */}
          <div className="rounded-xl border-2 border-dashed border-[color:var(--border-default)] bg-surface p-6 hover:border-primary transition-colors cursor-pointer group">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--neutral-100)] group-hover:bg-emerald-50 transition-colors">
                <Plus className="h-7 w-7 text-[color:var(--text-tertiary)] group-hover:text-emerald-600 transition-colors" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[color:var(--text-secondary)] group-hover:text-emerald-600 transition-colors">
                  Programar envio automatico
                </h3>
                <p className="mt-1 text-xs text-[color:var(--text-tertiary)]">
                  Selecciona un reporte, frecuencia y destinatarios
                </p>
              </div>
            </div>
          </div>

          {/* Existing scheduled reports */}
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--text-secondary)] mb-4">Reportes configurados</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {scheduledReports.map(sched => (
                <div key={sched.id} className="rounded-xl border border-[color:var(--border-default)] bg-white backdrop-blur-xl p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-[color:var(--text-secondary)]">{sched.typeLabel}</h4>
                      <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">Envio {sched.frequency.toLowerCase()}</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                      sched.active
                        ? 'bg-green-900/30 text-green-400'
                        : 'bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)]'
                    )}>
                      {sched.active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      {sched.active ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
                      <span className="text-xs text-[color:var(--text-tertiary)]">
                        Frecuencia: <span className="font-medium text-[color:var(--text-secondary)]">{sched.frequency}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-[color:var(--text-tertiary)]" />
                      <span className="text-xs text-[color:var(--text-tertiary)]">
                        Proximo envio: <span className="font-medium text-[color:var(--text-secondary)]">
                          {new Date(sched.nextRun).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="h-3.5 w-3.5 text-[color:var(--text-tertiary)] mt-0.5" />
                      <div className="flex-1">
                        <span className="text-xs text-[color:var(--text-tertiary)]">Destinatarios:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {sched.recipients.map(email => (
                            <span key={email} className="inline-flex items-center px-2 py-0.5 rounded-md bg-[color:var(--neutral-100)] text-[10px] font-medium text-[color:var(--text-tertiary)]">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[color:var(--border-default)] flex items-center gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[color:var(--border-default)] text-[color:var(--text-tertiary)] hover:bg-[color:var(--neutral-100)] transition-colors">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      sched.active
                        ? 'bg-amber-900/20 text-amber-400 border border-amber-800 hover:bg-amber-900/30'
                        : 'bg-green-900/20 text-green-400 border border-green-800 hover:bg-green-900/30'
                    )}>
                      {sched.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {sched.active ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
