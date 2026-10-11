'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  FileText,
  Calendar,
  Clock,
  FileBarChart,
  HardHat,
  AlertTriangle,
  Download,
  FileSpreadsheet,
  Search,
  Zap,
  ClipboardList,
  Heart,
  Bell,
  ChevronDown,
  X,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { ScheduledReportsPanel } from '@/components/reports/scheduled-reports-panel'

// ─── Types ────────────────────────────────────────────────────────────
type ReportFormat = 'PDF' | 'Excel' | 'CSV'

interface GeneratedReport {
  id: string
  type: string
  typeLabel: string
  format: ReportFormat
  date: string
  /** Opciones usadas (año del informe SST); se reutilizan al generarlo de nuevo. */
  year?: number
}

interface CatalogEntry {
  id: string
  title: string
  description: string
  icon: typeof FileText
  color: string
  bg: string
  /** Formatos que de verdad genera el servidor para este reporte. */
  formats: ReportFormat[]
  /** Tipo de /api/export para Excel/CSV (solo si el reporte los ofrece). */
  exportType?: string
  /** El informe SST anual se genera por año. */
  byYear?: boolean
}

// ─── Report Catalog ───────────────────────────────────────────────────
// Solo reportes que el servidor genera de verdad. Antes había tarjetas
// (planilla, SST, costos, rotación, capacitaciones) que en realidad
// descargaban el reporte de trabajadores, y filtros de fechas/área/régimen que
// el servidor ignoraba. Se retiraron para no mostrar nada falso.
const REPORT_CATALOG: CatalogEntry[] = [
  {
    id: 'compliance-ejecutivo',
    title: 'Reporte ejecutivo de cumplimiento',
    description: 'Puntaje global, detalle por área, cifras clave y multa estimada. Pensado para presentar al directorio o a una auditoría.',
    icon: FileBarChart,
    color: 'text-emerald-600',
    bg: 'bg-emerald-900/30',
    formats: ['PDF'],
  },
  {
    id: 'sst-anual',
    title: 'Informe anual de SST (Ley 29783)',
    description: 'Informe del Comité de SST: accidentes, incidentes, capacitaciones, exámenes médicos, EPP y avance del plan anual. Lo exige el art. 32 de la Ley 29783.',
    icon: Heart,
    color: 'text-red-400',
    bg: 'bg-red-900/30',
    formats: ['PDF'],
    byYear: true,
  },
  {
    id: 'trabajadores',
    title: 'Reporte de trabajadores',
    description: 'Lista de tus trabajadores con cargo, área, régimen laboral, tipo de contrato y sueldo.',
    icon: HardHat,
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    formats: ['PDF', 'Excel', 'CSV'],
    exportType: 'workers',
  },
  {
    id: 'cumplimiento',
    title: 'Reporte de cumplimiento normativo',
    description: 'Tu puntaje de cumplimiento, el detalle por área y las alertas que siguen pendientes.',
    icon: ClipboardList,
    color: 'text-emerald-600',
    bg: 'bg-emerald-900/30',
    formats: ['PDF'],
  },
  {
    id: 'contratos',
    title: 'Reporte de contratos',
    description: 'Contratos registrados con su tipo, estado y fecha de vencimiento.',
    icon: FileText,
    color: 'text-purple-400',
    bg: 'bg-purple-900/30',
    formats: ['PDF', 'Excel', 'CSV'],
    exportType: 'contracts',
  },
  {
    id: 'alertas',
    title: 'Reporte de alertas y riesgos',
    description: 'Alertas pendientes de tus trabajadores, ordenadas por gravedad.',
    icon: AlertTriangle,
    color: 'text-red-400',
    bg: 'bg-red-900/30',
    formats: ['PDF', 'Excel', 'CSV'],
    exportType: 'alerts',
  },
]

/** Endpoints PDF dedicados (react-pdf). El resto usa el genérico /api/reports/pdf. */
const EXECUTIVE_REPORT_ENDPOINTS: Record<string, string> = {
  'compliance-ejecutivo': '/api/reports/compliance-pdf',
  'sst-anual': '/api/reports/sst-anual',
}

/** URL que genera el reporte. `null` si ese reporte no existe en ese formato. */
function buildReportUrl(reportId: string, format: ReportFormat, year?: number): string | null {
  const entry = REPORT_CATALOG.find(r => r.id === reportId)
  if (!entry || !entry.formats.includes(format)) return null

  if (format === 'PDF') {
    const executive = EXECUTIVE_REPORT_ENDPOINTS[reportId]
    if (executive) {
      return entry.byYear && year ? `${executive}?year=${year}` : executive
    }
    return `/api/reports/pdf?type=${encodeURIComponent(reportId)}`
  }

  if (!entry.exportType) return null
  const exportFormat = format === 'Excel' ? 'xlsx' : 'csv'
  return `/api/export?type=${entry.exportType}&format=${exportFormat}`
}

// ─── Historial: se guarda solo en este navegador (localStorage) ───────
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
  const [reportError, setReportError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'galeria' | 'historial' | 'programados'>('galeria')

  const [currentYear] = useState(() => new Date().getFullYear())
  const [format, setFormat] = useState<ReportFormat>('PDF')
  const [year, setYear] = useState<number>(currentYear)

  // Historial — guardado en este navegador
  const [recentReports, setRecentReports] = useState<GeneratedReport[]>(() => loadReportHistory())
  // Programados activos — dato real de /api/scheduled-reports
  const [activeScheduled, setActiveScheduled] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/scheduled-reports', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((body: { reports?: { active: boolean }[] } | null) => {
        if (cancelled || !body?.reports) return
        setActiveScheduled(body.reports.filter(r => r.active).length)
      })
      .catch(() => { /* se muestra "—" */ })
    return () => { cancelled = true }
  }, [activeTab])

  const openReport = useCallback((reportId: string, reportFormat: ReportFormat, reportYear?: number) => {
    const url = buildReportUrl(reportId, reportFormat, reportYear)
    if (!url) {
      setReportError('Este reporte no está disponible en ese formato.')
      return false
    }
    window.open(url, '_blank')
    return true
  }, [])

  const handleGenerate = useCallback((reportId: string) => {
    const catalog = REPORT_CATALOG.find(r => r.id === reportId)
    if (!catalog) return
    const reportFormat = catalog.formats.includes(format) ? format : catalog.formats[0]
    const reportYear = catalog.byYear ? year : undefined
    if (!openReport(reportId, reportFormat, reportYear)) return

    const newReport: GeneratedReport = {
      id: Date.now().toString(),
      type: reportId,
      typeLabel: catalog.title,
      format: reportFormat,
      date: new Date().toISOString(),
      year: reportYear,
    }
    setRecentReports(prev => {
      const updated = [newReport, ...prev].slice(0, 50)
      saveReportHistory(updated)
      return updated
    })
  }, [format, year, openReport])

  const selectReport = (reportId: string | null) => {
    setSelectedReport(reportId)
    const entry = REPORT_CATALOG.find(r => r.id === reportId)
    if (entry && !entry.formats.includes(format)) setFormat(entry.formats[0])
  }

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
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2]

  return (
    <div className="space-y-6">
      {/* Error banner */}
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
        title="Descarga tus <em>reportes</em> listos para presentar."
        subtitle="Genera reportes de tu organización en PDF o Excel y programa envíos automáticos por correo."
        actions={
          <>
            <a
              href="/api/export?type=workers&format=xlsx"
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-emerald-700)] px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar trabajadores
            </a>
            <a
              href="/api/export?type=calculations&format=xlsx"
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)] text-[color:var(--text-emerald-700)] px-3.5 py-2 text-xs font-semibold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Exportar cálculos
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
          sub="Generados desde este navegador"
          iconBg="bg-blue-900/30"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Último reporte generado"
          value={lastReport ? lastReport.typeLabel : 'Ninguno'}
          sub={lastReport ? new Date(lastReport.date).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined}
          iconBg="bg-emerald-900/30"
          iconColor="text-emerald-600"
        />
        <StatCard
          icon={Bell}
          label="Reportes programados activos"
          value={activeScheduled ?? '—'}
          sub="Se envían por correo automáticamente"
          iconBg="bg-purple-900/30"
          iconColor="text-purple-400"
        />
      </div>

      {/* ─── Tab Navigation ─────────────────────────────────────────── */}
      <div className="border-b border-[color:var(--border-default)]">
        <nav className="flex gap-6">
          {([
            { key: 'galeria' as const, label: 'Galería de reportes', icon: BarChart3 },
            { key: 'historial' as const, label: 'Historial', icon: Clock },
            { key: 'programados' as const, label: 'Reportes programados', icon: Calendar },
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

      {/* ─── Tab: Galería de reportes ───────────────────────────────── */}
      {activeTab === 'galeria' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[color:var(--text-tertiary)]" />
            <input
              type="text"
              placeholder="Buscar tipo de reporte…"
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

              return (
                <div
                  key={report.id}
                  className={cn(
                    'group rounded-xl bg-white backdrop-blur-xl border border-[color:var(--border-default)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 cursor-pointer',
                    isSelected
                      ? 'border-blue-500 shadow-md ring-2 ring-blue-500/10'
                      : 'hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(0,0,0,0.2),0_0_10px_var(--color-gold-glow)]'
                  )}
                  onClick={() => selectReport(isSelected ? null : report.id)}
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
                          {report.formats.join(' / ')}
                        </span>
                        <span className="flex-1" />
                        <span className="text-xs text-[color:var(--text-tertiary)]">
                          Haz clic para generarlo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Expanded Form */}
                  {isSelected && (
                    <div className="border-t border-[color:var(--border-default)] p-5 space-y-4" onClick={e => e.stopPropagation()}>
                      {report.byYear && (
                        <div>
                          <label htmlFor={`year-${report.id}`} className="text-[11px] font-semibold text-[color:var(--text-tertiary)] mb-2 block">
                            Año del informe
                          </label>
                          <select
                            id={`year-${report.id}`}
                            value={year}
                            onChange={e => setYear(Number(e.target.value))}
                            className="w-full rounded-lg border border-[color:var(--border-default)] bg-[color:var(--neutral-100)] px-3 py-2 text-xs text-[color:var(--text-secondary)] focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          >
                            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                        </div>
                      )}

                      {/* Format */}
                      {report.formats.length > 1 ? (
                        <div>
                          <span className="text-[11px] font-semibold text-[color:var(--text-tertiary)] mb-2 block">Formato</span>
                          <div className="flex gap-2">
                            {report.formats.map(fmt => (
                              <button
                                key={fmt}
                                onClick={() => setFormat(fmt)}
                                className={cn(
                                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors',
                                  format === fmt
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
                      ) : (
                        <p className="text-[11px] text-[color:var(--text-tertiary)]">Se descarga en PDF.</p>
                      )}

                      <p className="flex items-start gap-1.5 text-[11px] text-[color:var(--text-tertiary)]">
                        <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
                        Usa los datos actuales de tu empresa al momento de generarlo.
                      </p>

                      {/* Generate Button */}
                      <button
                        onClick={() => handleGenerate(report.id)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20"
                      >
                        <Zap className="h-4 w-4" />
                        Generar reporte
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

      {/* ─── Tab: Historial ─────────────────────────────────────────── */}
      {activeTab === 'historial' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[color:var(--text-secondary)]">Últimos reportes generados</h2>
            <span className="text-xs text-[color:var(--text-tertiary)]">{recentReports.length} reportes · guardados solo en este navegador</span>
          </div>

          <div className="rounded-xl border border-[color:var(--border-default)] bg-surface shadow-sm overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-surface/80 border-b border-[color:var(--border-default)]">
              <span className="col-span-5 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Reporte</span>
              <span className="col-span-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Fecha</span>
              <span className="col-span-1 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Formato</span>
              <span className="col-span-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider text-right">Acciones</span>
            </div>

            {/* Table Rows */}
            {recentReports.map((report, idx) => {
              const catalog = REPORT_CATALOG.find(c => c.id === report.type)
              const Icon = catalog?.icon || FileText
              const canRegenerate = buildReportUrl(report.type, report.format, report.year) !== null

              return (
                <div
                  key={report.id}
                  className={cn(
                    'grid grid-cols-12 gap-4 px-5 py-4 items-center transition-colors hover:bg-[color:var(--neutral-100)]',
                    idx < recentReports.length - 1 && 'border-b border-[color:var(--border-default)]'
                  )}
                >
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', catalog?.bg || 'bg-[color:var(--neutral-100)]')}>
                      <Icon className={cn('h-4 w-4', catalog?.color || 'text-[color:var(--text-tertiary)]')} />
                    </div>
                    <span className="text-sm font-medium text-[color:var(--text-secondary)] truncate">
                      {report.typeLabel}{report.year ? ` ${report.year}` : ''}
                    </span>
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
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    {canRegenerate ? (
                      <button
                        onClick={() => openReport(report.type, report.format, report.year)}
                        title="Se genera otra vez con los datos actuales"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Generar de nuevo
                      </button>
                    ) : (
                      <span className="text-xs text-[color:var(--text-tertiary)]">Ya no disponible</span>
                    )}
                  </div>
                </div>
              )
            })}

            {recentReports.length === 0 && (
              <div className="py-12 text-center">
                <FileText className="h-10 w-10 text-gray-600 mx-auto" />
                <p className="mt-3 text-sm text-[color:var(--text-tertiary)]">Todavía no has generado reportes en este navegador.</p>
                <p className="text-xs text-[color:var(--text-tertiary)] mt-1">Genera tu primer reporte desde la galería.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Tab: Reportes programados (datos reales) ───────────────── */}
      {activeTab === 'programados' && (
        <div className="space-y-6">
          <ScheduledReportsPanel />
        </div>
      )}
    </div>
  )
}
