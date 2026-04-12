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

// ─── Report Catalog ───────────────────────────────────────────────────
const REPORT_CATALOG = [
  {
    id: 'planilla',
    title: 'Reporte de Planilla Mensual',
    description: 'Detalle de remuneraciones, descuentos, aportes y netos por trabajador.',
    icon: BarChart3,
    color: 'text-blue-600 text-blue-400',
    bg: 'bg-blue-50 bg-blue-900/30',
    borderColor: 'border-blue-200 border-blue-800',
    gradientFrom: 'from-blue-500',
    filters: ['department', 'regime'],
  },
  {
    id: 'cumplimiento',
    title: 'Reporte de Cumplimiento Normativo',
    description: 'Score de compliance, areas criticas, obligaciones pendientes y multas evitadas.',
    icon: ClipboardList,
    color: 'text-emerald-600 text-emerald-400',
    bg: 'bg-emerald-50 bg-emerald-900/30',
    borderColor: 'border-emerald-200 border-emerald-800',
    gradientFrom: 'from-emerald-500',
    filters: [],
  },
  {
    id: 'trabajadores',
    title: 'Reporte de Trabajadores por Regimen',
    description: 'Listado completo de trabajadores agrupados por regimen laboral y tipo de contrato.',
    icon: HardHat,
    color: 'text-amber-600 text-amber-400',
    bg: 'bg-amber-50 bg-amber-900/30',
    borderColor: 'border-amber-200 border-amber-800',
    gradientFrom: 'from-amber-500',
    filters: ['regime'],
  },
  {
    id: 'contratos',
    title: 'Reporte de Contratos',
    description: 'Contratos vencidos, vigentes y por vencer con alertas de renovacion.',
    icon: FileText,
    color: 'text-purple-600 text-purple-400',
    bg: 'bg-purple-50 bg-purple-900/30',
    borderColor: 'border-purple-200 border-purple-800',
    gradientFrom: 'from-purple-500',
    filters: ['department'],
  },
  {
    id: 'alertas',
    title: 'Reporte de Alertas y Riesgos',
    description: 'Alertas activas por severidad, acciones requeridas y riesgos identificados.',
    icon: AlertTriangle,
    color: 'text-red-600 text-red-400',
    bg: 'bg-red-50 bg-red-900/30',
    borderColor: 'border-red-200 border-red-800',
    gradientFrom: 'from-red-500',
    filters: [],
  },
  {
    id: 'sst',
    title: 'Reporte SST',
    description: 'Accidentes laborales, capacitaciones SST, IPERC, examenes medicos y EPP.',
    icon: Heart,
    color: 'text-pink-600 text-pink-400',
    bg: 'bg-pink-50 bg-pink-900/30',
    borderColor: 'border-pink-200 border-pink-800',
    gradientFrom: 'from-pink-500',
    filters: ['department'],
  },
  {
    id: 'costos',
    title: 'Reporte de Costos Laborales',
    description: 'Analisis de costos laborales totales: sueldos, beneficios, cargas sociales y provisiones.',
    icon: DollarSign,
    color: 'text-teal-600 text-teal-400',
    bg: 'bg-teal-50 bg-teal-900/30',
    borderColor: 'border-teal-200 border-teal-800',
    gradientFrom: 'from-teal-500',
    filters: ['department'],
  },
  {
    id: 'rotacion',
    title: 'Reporte de Rotacion de Personal',
    description: 'Indice de rotacion, ingresos, ceses, motivos de salida y tendencias.',
    icon: UserMinus,
    color: 'text-orange-600 text-orange-400',
    bg: 'bg-orange-50 bg-orange-900/30',
    borderColor: 'border-orange-200 border-orange-800',
    gradientFrom: 'from-orange-500',
    filters: ['department'],
  },
  {
    id: 'capacitaciones',
    title: 'Reporte de Capacitaciones',
    description: 'Capacitaciones realizadas, asistencia, horas invertidas y cumplimiento del plan anual.',
    icon: GraduationCap,
    color: 'text-indigo-600 text-indigo-400',
    bg: 'bg-indigo-50 bg-indigo-900/30',
    borderColor: 'border-indigo-200 border-indigo-800',
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
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#141824] p-5 shadow-sm">
      <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', iconBg)}>
        <Icon className={cn('h-6 w-6', iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-gray-500 text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-400 text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function FormatBadge({ format }: { format: string }) {
  const styles: Record<string, string> = {
    PDF: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
    Excel: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400',
    CSV: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400',
  }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold', styles[format] || 'bg-white/[0.04] text-gray-600')}>
      {format}
    </span>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function ReportesPage() {
  const [data, setData] = useState<ReportData | null>(null)
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
        window.open(`/api/reports/pdf?${params}`, '_blank')
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error banner — replaces native alert() */}
      {reportError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 border-red-800 bg-red-50 bg-red-900/20 px-4 py-3">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-800 text-red-300 flex-1">{reportError}</p>
          <button
            onClick={() => setReportError(null)}
            className="ml-auto p-1 rounded hover:bg-red-100 hover:bg-red-800/50"
            aria-label="Cerrar error"
          >
            <X className="h-4 w-4 text-red-400" />
          </button>
        </div>
      )}

      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Centro de Reportes</h1>
          <p className="mt-1 text-gray-500 text-gray-400">
            Genera, descarga y programa reportes de tu organizacion.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="/api/export?type=workers&format=xlsx"
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm font-medium text-gray-300 text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Trabajadores
          </a>
          <a
            href="/api/export?type=calculations&format=xlsx"
            className="flex items-center gap-2 px-4 py-2.5 border border-white/10 border-slate-600 rounded-xl text-sm font-medium text-gray-300 text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar Calculos
          </a>
        </div>
      </div>

      {/* ─── Quick Stats ────────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          icon={FileBarChart}
          label="Reportes este mes"
          value={reportsThisMonth}
          sub={`${recentReports.length} total generados`}
          iconBg="bg-blue-50 bg-blue-900/30"
          iconColor="text-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Ultimo reporte generado"
          value={lastReport ? lastReport.typeLabel : 'Ninguno'}
          sub={lastReport ? new Date(lastReport.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
          iconBg="bg-emerald-50 bg-emerald-900/30"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={Bell}
          label="Reportes programados activos"
          value={activeScheduled}
          sub={`${scheduledReports.length} configurados en total`}
          iconBg="bg-purple-50 bg-purple-900/30"
          iconColor="text-purple-600"
        />
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────────────── */}
      <div className="border-b border-white/[0.08]">
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
                    ? 'border-[#1e3a6e] text-[#1e3a6e] border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-500 text-gray-400 hover:text-gray-300 hover:text-slate-300 hover:border-white/10 hover:border-slate-600'
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar tipo de reporte..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 border-slate-600 bg-[#141824] text-sm text-gray-300 text-slate-300 placeholder:text-gray-400 placeholder:text-slate-500 focus:ring-2 focus:ring-[#1e3a6e]/20 focus:ring-gold/30/20 focus:border-[#1e3a6e] focus:border-gold/50 outline-none"
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
                    'group rounded-xl border-2 bg-[#141824] shadow-sm transition-all duration-200 cursor-pointer',
                    isSelected
                      ? 'border-[#1e3a6e] border-blue-500 shadow-md ring-2 ring-[#1e3a6e]/10 ring-blue-500/10'
                      : 'border-white/[0.08] hover:border-white/10 hover:border-slate-600 hover:shadow-md'
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
                        <h3 className="text-sm font-bold text-white text-gray-200 leading-tight">{report.title}</h3>
                        <p className="mt-1.5 text-xs text-gray-500 text-gray-400 leading-relaxed">{report.description}</p>
                      </div>
                      <ChevronDown className={cn(
                        'h-4 w-4 text-gray-400 text-slate-500 shrink-0 transition-transform',
                        isSelected && 'rotate-180'
                      )} />
                    </div>

                    {/* Quick action row */}
                    {!isSelected && (
                      <div className="mt-4 flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400 text-slate-500">
                          PDF / Excel / CSV
                        </span>
                        <span className="flex-1" />
                        <span className="text-xs text-gray-400 text-slate-500">
                          Click para configurar
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Form */}
                  {isSelected && (
                    <div className="border-t border-white/[0.06] border-white/[0.08] p-5 space-y-4" onClick={e => e.stopPropagation()}>
                      {/* Date Range */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-gray-400 text-slate-500" />
                          <span className="text-xs font-semibold text-gray-400">Periodo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] text-gray-400 text-slate-500 mb-1 block">Desde</label>
                            <input
                              type="date"
                              value={formState.startDate}
                              onChange={e => setFormState(s => ({ ...s, startDate: e.target.value }))}
                              className="w-full rounded-lg border border-white/10 border-slate-600 bg-[#141824] bg-white/[0.04] px-3 py-2 text-xs text-gray-300 text-slate-300 focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] focus:ring-gold/30/20 focus:border-gold/50 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-400 text-slate-500 mb-1 block">Hasta</label>
                            <input
                              type="date"
                              value={formState.endDate}
                              onChange={e => setFormState(s => ({ ...s, endDate: e.target.value }))}
                              className="w-full rounded-lg border border-white/10 border-slate-600 bg-[#141824] bg-white/[0.04] px-3 py-2 text-xs text-gray-300 text-slate-300 focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] focus:ring-gold/30/20 focus:border-gold/50 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Format */}
                      <div>
                        <label className="text-[11px] font-semibold text-gray-400 mb-2 block">Formato de salida</label>
                        <div className="flex gap-2">
                          {(['PDF', 'Excel', 'CSV'] as const).map(fmt => (
                            <button
                              key={fmt}
                              onClick={() => setFormState(s => ({ ...s, format: fmt }))}
                              className={cn(
                                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors',
                                formState.format === fmt
                                  ? fmt === 'PDF'
                                    ? 'bg-red-50 bg-red-900/30 border-red-300 border-red-700 text-red-700 text-red-400'
                                    : fmt === 'Excel'
                                      ? 'bg-green-50 bg-green-900/30 border-green-300 border-green-700 text-green-700 text-green-400'
                                      : 'bg-blue-50 bg-blue-900/30 border-blue-300 border-blue-700 text-blue-700 text-blue-400'
                                  : 'bg-white/[0.02] bg-white/[0.04] border-white/[0.08] border-slate-600 text-gray-500 text-gray-400 hover:bg-white/[0.04] hover:bg-slate-600'
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
                              <label className="text-[11px] font-semibold text-gray-400 mb-1 block">
                                <Filter className="h-3 w-3 inline mr-1" />Area
                              </label>
                              <select
                                value={formState.department}
                                onChange={e => setFormState(s => ({ ...s, department: e.target.value }))}
                                className="w-full rounded-lg border border-white/10 border-slate-600 bg-[#141824] bg-white/[0.04] px-3 py-2 text-xs text-gray-300 text-slate-300 focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] focus:ring-gold/30/20 focus:border-gold/50 outline-none"
                              >
                                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                          )}
                          {report.filters.includes('regime') && (
                            <div>
                              <label className="text-[11px] font-semibold text-gray-400 mb-1 block">
                                <Filter className="h-3 w-3 inline mr-1" />Regimen
                              </label>
                              <select
                                value={formState.regime}
                                onChange={e => setFormState(s => ({ ...s, regime: e.target.value }))}
                                className="w-full rounded-lg border border-white/10 border-slate-600 bg-[#141824] bg-white/[0.04] px-3 py-2 text-xs text-gray-300 text-slate-300 focus:ring-2 focus:ring-[#1e3a6e]/20 focus:border-[#1e3a6e] focus:ring-gold/30/20 focus:border-gold/50 outline-none"
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
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1e3a6e] hover:bg-[#162d57] bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-[#1e3a6e]/20 shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="text-center py-12 rounded-xl border border-dashed border-white/10 border-white/[0.08]">
              <Search className="h-8 w-8 text-gray-300 text-slate-600 mx-auto" />
              <p className="mt-3 text-sm text-gray-500 text-gray-400">No se encontraron reportes con "{searchTerm}"</p>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: Historial de Reportes ─────────────────────────────── */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white text-gray-200">Ultimos reportes generados</h2>
            <span className="text-xs text-gray-400 text-slate-500">{recentReports.length} reportes</span>
          </div>

          <div className="rounded-xl border border-white/[0.08] bg-[#141824] shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-white/[0.02] bg-[#141824]/80 border-b border-white/[0.08]">
              <span className="col-span-4 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Tipo de Reporte</span>
              <span className="col-span-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Fecha</span>
              <span className="col-span-1 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Formato</span>
              <span className="col-span-1 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Tamano</span>
              <span className="col-span-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider text-right">Acciones</span>
            </div>

            {/* Table Rows */}
            {recentReports.map((report, idx) => {
              const catalog = REPORT_CATALOG.find(c => c.id === report.type)
              const Icon = catalog?.icon || FileText

              return (
                <div
                  key={report.id}
                  className={cn(
                    'grid grid-cols-12 gap-4 px-5 py-4 items-center transition-colors hover:bg-white/[0.02] hover:bg-white/[0.04]/50',
                    idx < recentReports.length - 1 && 'border-b border-white/[0.06] border-white/[0.08]/50'
                  )}
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', catalog?.bg || 'bg-white/[0.04]')}>
                      <Icon className={cn('h-4 w-4', catalog?.color || 'text-gray-500')} />
                    </div>
                    <span className="text-sm font-medium text-white text-gray-200 truncate">{report.typeLabel}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-sm text-gray-400">
                      {new Date(report.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="block text-xs text-gray-400 text-slate-500">
                      {new Date(report.date).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <FormatBadge format={report.format} />
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm text-gray-500 text-gray-400">{report.size}</span>
                  </div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <button
                      disabled
                      title="Regenera el reporte para descargarlo"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1e3a6e] bg-gold text-black font-bold opacity-50 cursor-not-allowed"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </button>
                    <button
                      disabled
                      title="Proximamente"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 border-slate-600 text-gray-400 opacity-50 cursor-not-allowed"
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
                <FileText className="h-10 w-10 text-gray-300 text-slate-600 mx-auto" />
                <p className="mt-3 text-sm text-gray-500 text-gray-400">No hay reportes generados aun.</p>
                <p className="text-xs text-gray-400 text-slate-500 mt-1">Genera tu primer reporte desde la galeria.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Reportes Programados ──────────────────────────────── */}
      {activeTab === 'programados' && (
        <div className="space-y-6">
          {/* "Coming soon" banner */}
          <div className="rounded-xl border-2 border-dashed border-amber-300 border-amber-700 bg-amber-50/50 bg-amber-900/10 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 bg-amber-900/30">
                <Zap className="h-5 w-5 text-amber-600 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-800 text-amber-300">Programacion automatica - Proximamente</h3>
                <p className="mt-1 text-xs text-amber-700 text-amber-400/80 leading-relaxed">
                  Configura envios automaticos de reportes por email con frecuencia diaria, semanal o mensual.
                  Esta funcionalidad estara disponible en la proxima actualizacion.
                </p>
              </div>
            </div>
          </div>

          {/* New scheduled report card */}
          <div className="rounded-xl border-2 border-dashed border-white/10 border-slate-600 bg-[#141824] p-6 hover:border-[#1e3a6e] hover:border-blue-500 transition-colors cursor-pointer group">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] group-hover:bg-[#1e3a6e]/10 group-hover:bg-blue-900/30 transition-colors">
                <Plus className="h-7 w-7 text-gray-400 text-slate-500 group-hover:text-[#1e3a6e] group-hover:text-blue-400 transition-colors" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-300 text-slate-300 group-hover:text-[#1e3a6e] group-hover:text-blue-400 transition-colors">
                  Programar envio automatico
                </h3>
                <p className="mt-1 text-xs text-gray-400 text-slate-500">
                  Selecciona un reporte, frecuencia y destinatarios
                </p>
              </div>
            </div>
          </div>

          {/* Existing scheduled reports */}
          <div>
            <h3 className="text-sm font-semibold text-white text-gray-200 mb-4">Reportes configurados</h3>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {scheduledReports.map(sched => (
                <div key={sched.id} className="rounded-xl border border-white/[0.08] bg-[#141824] p-5 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white text-gray-200">{sched.typeLabel}</h4>
                      <p className="text-xs text-gray-500 text-gray-400 mt-0.5">Envio {sched.frequency.toLowerCase()}</p>
                    </div>
                    <span className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                      sched.active
                        ? 'bg-green-100 text-green-700 bg-green-900/30 text-green-400'
                        : 'bg-white/[0.04] text-gray-500 bg-white/[0.04] text-gray-400'
                    )}>
                      {sched.active ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                      {sched.active ? 'Activo' : 'Pausado'}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gray-400 text-slate-500" />
                      <span className="text-xs text-gray-400">
                        Frecuencia: <span className="font-medium text-white text-gray-200">{sched.frequency}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-gray-400 text-slate-500" />
                      <span className="text-xs text-gray-400">
                        Proximo envio: <span className="font-medium text-white text-gray-200">
                          {new Date(sched.nextRun).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400 text-slate-500 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-xs text-gray-400">Destinatarios:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {sched.recipients.map(email => (
                            <span key={email} className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/[0.04] text-[10px] font-medium text-gray-400">
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/[0.06] border-white/[0.08] flex items-center gap-2">
                    <button className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-white/[0.08] border-slate-600 text-gray-400 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <RefreshCw className="h-3.5 w-3.5" />
                      Editar
                    </button>
                    <button className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                      sched.active
                        ? 'bg-amber-50 bg-amber-900/20 text-amber-700 text-amber-400 border border-amber-200 border-amber-800 hover:bg-amber-100 hover:bg-amber-900/30'
                        : 'bg-green-50 bg-green-900/20 text-green-700 text-green-400 border border-green-200 border-green-800 hover:bg-green-100 hover:bg-green-900/30'
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
