'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, BarChart3, Shield, AlertTriangle,
  DollarSign, Users, Download, Filter, Calendar, Building2,
  ChevronDown, ChevronRight, X, FileText, Award, Clock,
  Target, Layers, ArrowUpRight, ArrowDownRight,
} from 'lucide-react'

/* ================================================================== */
/*  Types                                                              */
/* ================================================================== */

interface MonthlyScore {
  month: string
  label: string
  score: number
  incidents: number
  resolved: number
}

interface Department {
  name: string
  score: number
  workers: number
  incidents: number
  trend: 'up' | 'down' | 'stable'
  details: { worker: string; role: string; status: string; score: number }[]
}

interface RiskCell {
  probability: 'Alta' | 'Media' | 'Baja'
  impact: 'Alto' | 'Medio' | 'Bajo'
  count: number
  color: string
  items: string[]
}

interface Violation {
  name: string
  count: number
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA'
  trend: number
  category: string
}

/* ================================================================== */
/*  Mock Data                                                          */
/* ================================================================== */

// Data is loaded from API — see useEffect in DrillDownPage component
// Risk matrix is generated from real WorkerAlert data

// Violations and other data loaded from API — see useEffect below

/* ================================================================== */
/*  Severity helpers                                                   */
/* ================================================================== */

const severityColors: Record<string, string> = {
  CRITICA: 'bg-red-100 text-red-700 bg-red-900/40 text-red-300',
  ALTA: 'bg-orange-100 text-orange-700 bg-orange-900/40 text-orange-300',
  MEDIA: 'bg-yellow-100 text-yellow-700 bg-yellow-900/40 text-yellow-300',
  BAJA: 'bg-green-100 text-green-700 bg-green-900/40 text-green-300',
}

const statusColors: Record<string, string> = {
  Vigente: 'text-emerald-600',
  Observado: 'text-amber-400',
  Critico: 'text-red-400',
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function DrillDownAnalyticsPage() {
  /* ---- Filters ---- */
  const [dateRange, setDateRange] = useState<'3m' | '6m' | '12m'>('12m')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  /* ---- Drill-down state ---- */
  const [selectedMonth, setSelectedMonth] = useState<MonthlyScore | null>(null)
  const [expandedDept, setExpandedDept] = useState<string | null>(null)
  const [selectedRiskCell, setSelectedRiskCell] = useState<RiskCell | null>(null)

  /* ---- Real data from API ---- */
  const [MONTHLY_DATA, setMonthlyData] = useState<MonthlyScore[]>([])
  const [DEPARTMENTS, setDepartments] = useState<Department[]>([])
  const [VIOLATIONS, setViolations] = useState<Violation[]>([])
  const [RISK_MATRIX, setRiskMatrix] = useState<RiskCell[]>([])

  useEffect(() => {
    // Load compliance score history
    fetch('/api/compliance/score?months=12')
      .then(r => r.json())
      .then(data => {
        if (data.history && Array.isArray(data.history)) {
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          setMonthlyData(data.history.map((h: { calculatedAt: string; scoreGlobal: number }) => {
            const d = new Date(h.calculatedAt)
            return {
              month: h.calculatedAt.slice(0, 7),
              label: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
              score: h.scoreGlobal,
              incidents: 0,
              resolved: 0,
            }
          }))
        }
        // If no history, generate current score as single data point
        if ((!data.history || data.history.length === 0) && data.current) {
          const now = new Date()
          const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          setMonthlyData([{
            month: now.toISOString().slice(0, 7),
            label: `${months[now.getMonth()]} ${String(now.getFullYear()).slice(2)}`,
            score: data.current.scoreGlobal || 0,
            incidents: 0,
            resolved: 0,
          }])
        }
      })
      .catch(() => {})

    // Load workers grouped by department
    fetch('/api/workers?limit=500')
      .then(r => r.json())
      .then(data => {
        const workers = data.data || []
        const deptMap = new Map<string, { workers: typeof workers }>()
        for (const w of workers) {
          const dept = w.department || 'Sin area'
          if (!deptMap.has(dept)) deptMap.set(dept, { workers: [] })
          deptMap.get(dept)!.workers.push(w)
        }
        const depts: Department[] = Array.from(deptMap.entries()).map(([name, { workers: dw }]) => ({
          name,
          score: Math.round(dw.reduce((s: number, w: { legajoScore?: number }) => s + (w.legajoScore ?? 0), 0) / (dw.length || 1)),
          workers: dw.length,
          incidents: dw.filter((w: { status: string }) => w.status !== 'ACTIVE').length,
          trend: 'stable' as const,
          details: dw.slice(0, 5).map((w: { firstName: string; lastName: string; position?: string; status: string; legajoScore?: number }) => ({
            worker: `${w.firstName} ${w.lastName}`,
            role: w.position || '—',
            status: w.status === 'ACTIVE' ? 'Vigente' : w.status === 'SUSPENDED' ? 'Observado' : 'Critico',
            score: w.legajoScore ?? 0,
          })),
        }))
        setDepartments(depts)
      })
      .catch(() => {})

    // Load alerts as violations
    fetch('/api/workers/alerts?includeResolved=false')
      .then(r => r.json())
      .then(data => {
        const alerts = data.data || []
        // Group by type
        const typeMap = new Map<string, { count: number; severity: string }>()
        for (const a of alerts) {
          const type = a.type || 'OTRO'
          if (!typeMap.has(type)) typeMap.set(type, { count: 0, severity: a.severity })
          typeMap.get(type)!.count++
        }
        const violations: Violation[] = Array.from(typeMap.entries()).map(([name, v]) => ({
          name: name.replace(/_/g, ' '),
          count: v.count,
          severity: (v.severity === 'CRITICAL' ? 'CRITICA' : v.severity === 'HIGH' ? 'ALTA' : v.severity === 'MEDIUM' ? 'MEDIA' : 'BAJA') as Violation['severity'],
          trend: 0,
          category: name.includes('CONTRATO') ? 'Contratos' : name.includes('DOCUMENT') ? 'Documentos' : name.includes('SST') || name.includes('EXAMEN') ? 'SST' : 'Cumplimiento',
        }))
        setViolations(violations)

        // Generate risk matrix from alerts
        const critical = alerts.filter((a: { severity: string }) => a.severity === 'CRITICAL').length
        const high = alerts.filter((a: { severity: string }) => a.severity === 'HIGH').length
        const medium = alerts.filter((a: { severity: string }) => a.severity === 'MEDIUM').length
        const low = alerts.filter((a: { severity: string }) => a.severity === 'LOW').length
        setRiskMatrix(([
          { probability: 'Alta' as const, impact: 'Alto' as const, count: critical, color: 'bg-red-600', items: violations.filter(v => v.severity === 'CRITICA').map(v => v.name) },
          { probability: 'Alta' as const, impact: 'Medio' as const, count: high, color: 'bg-red-400', items: violations.filter(v => v.severity === 'ALTA').map(v => v.name) },
          { probability: 'Media' as const, impact: 'Medio' as const, count: medium, color: 'bg-yellow-500', items: violations.filter(v => v.severity === 'MEDIA').map(v => v.name) },
          { probability: 'Baja' as const, impact: 'Bajo' as const, count: low, color: 'bg-green-300', items: violations.filter(v => v.severity === 'BAJA').map(v => v.name) },
        ] as RiskCell[]).filter(r => r.count > 0))
      })
      .catch(() => {})
  }, [])

  /* ---- Filtered data ---- */
  const filteredMonths = useMemo(() => {
    const count = dateRange === '3m' ? 3 : dateRange === '6m' ? 6 : 12
    return MONTHLY_DATA.slice(-count)
  }, [dateRange, MONTHLY_DATA])

  const filteredDepartments = useMemo(() => {
    if (selectedDepartment === 'all') return DEPARTMENTS
    return DEPARTMENTS.filter((d) => d.name === selectedDepartment)
  }, [selectedDepartment, DEPARTMENTS])

  const filteredViolations = useMemo(() => {
    if (severityFilter === 'all') return VIOLATIONS
    return VIOLATIONS.filter((v) => v.severity === severityFilter)
  }, [severityFilter, VIOLATIONS])

  /* ---- Computed metrics ---- */
  const currentScore = MONTHLY_DATA.length > 0 ? MONTHLY_DATA[MONTHLY_DATA.length - 1].score : 0
  const prevScore = MONTHLY_DATA.length > 1 ? MONTHLY_DATA[MONTHLY_DATA.length - 2].score : currentScore
  const scoreDelta = currentScore - prevScore
  const totalWorkers = DEPARTMENTS.reduce((s, d) => s + d.workers, 0)
  const avgTenure = 2.4
  const trainingCompletion = 87
  const turnoverRate = 4.2
  const finesAvoided = 485_000
  const subscriptionCost = 12_000

  /* ---- Chart geometry ---- */
  const chartHeight = 200
  const maxScore = 100
  const minScore = Math.min(...filteredMonths.map((m) => m.score)) - 5

  function scoreToY(score: number): number {
    return chartHeight - ((score - minScore) / (maxScore - minScore)) * chartHeight
  }

  const linePath = filteredMonths
    .map((m, i) => {
      const x = (i / (filteredMonths.length - 1)) * 100
      const y = scoreToY(m.score)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  const areaPath = `${linePath} L 100 ${chartHeight} L 0 ${chartHeight} Z`

  /* ---- Risk matrix layout ---- */
  const probLevels: Array<'Alta' | 'Media' | 'Baja'> = ['Alta', 'Media', 'Baja']
  const impactLevels: Array<'Alto' | 'Medio' | 'Bajo'> = ['Alto', 'Medio', 'Bajo']

  function getRiskCell(prob: string, impact: string): RiskCell | undefined {
    return RISK_MATRIX.find((c) => c.probability === prob && c.impact === impact)
  }

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-7 w-7 text-indigo-400" />
            Analitica Avanzada con Drill-down
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Explora metricas detalladas de cumplimiento. Haz clic en cualquier dato para profundizar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 px-4 py-2.5 text-sm font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:bg-gray-700 transition-colors"
          >
            <Filter className="h-4 w-4" /> Filtros <ChevronDown className="h-3 w-3" />
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
            <Download className="h-4 w-4" /> Exportar Reporte PDF
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-emerald-700 bg-emerald-900/20 px-4 py-2.5 text-sm font-medium text-emerald-700 hover:bg-emerald-900/30 transition-colors">
            <FileText className="h-4 w-4" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* ---- Filter panel ---- */}
      {showFilters && (
        <div className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Filtros activos</h3>
            <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-[color:var(--text-secondary)]">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date range */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                <Calendar className="inline h-3.5 w-3.5 mr-1" />Rango de fechas
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as '3m' | '6m' | '12m')}
                className="w-full rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="3m">Ultimos 3 meses</option>
                <option value="6m">Ultimos 6 meses</option>
                <option value="12m">Ultimos 12 meses</option>
              </select>
            </div>
            {/* Department */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                <Building2 className="inline h-3.5 w-3.5 mr-1" />Departamento
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Todos los departamentos</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d.name} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
            {/* Severity */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">
                <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />Severidad
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full rounded-lg border border-white/10 border-gray-600 bg-white bg-gray-800 px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="all">Todas</option>
                <option value="CRITICA">Critica</option>
                <option value="ALTA">Alta</option>
                <option value="MEDIA">Media</option>
                <option value="BAJA">Baja</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ---- KPI Cards Row ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Puntaje Actual',
            value: `${currentScore}/100`,
            delta: `+${scoreDelta}`,
            icon: <Shield className="h-5 w-5 text-indigo-500" />,
            positive: true,
          },
          {
            label: 'Trabajadores',
            value: String(totalWorkers),
            delta: `${turnoverRate}% rotacion`,
            icon: <Users className="h-5 w-5 text-blue-500" />,
            positive: false,
          },
          {
            label: 'Multas Evitadas',
            value: `S/ ${finesAvoided.toLocaleString('es-PE')}`,
            delta: `vs S/ ${subscriptionCost.toLocaleString('es-PE')} suscripcion`,
            icon: <DollarSign className="h-5 w-5 text-emerald-500" />,
            positive: true,
          },
          {
            label: 'Capacitaciones',
            value: `${trainingCompletion}%`,
            delta: 'completadas',
            icon: <Award className="h-5 w-5 text-amber-500" />,
            positive: true,
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400">{kpi.label}</span>
              <div className="rounded-lg bg-[color:var(--neutral-100)] bg-gray-800 p-1.5">{kpi.icon}</div>
            </div>
            <p className="text-xl font-bold text-white">{kpi.value}</p>
            <p className={`text-xs mt-1 flex items-center gap-1 ${kpi.positive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {kpi.positive && <ArrowUpRight className="h-3 w-3" />}
              {kpi.delta}
            </p>
          </div>
        ))}
      </div>

      {/* ---- Row 1: Compliance Trends + Department Breakdown ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Trends */}
        <div className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Tendencia de Cumplimiento
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Haz clic en un punto para ver el detalle del mes.
          </p>

          {/* SVG chart */}
          <div className="relative">
            <svg viewBox={`0 0 100 ${chartHeight}`} className="w-full h-48" preserveAspectRatio="none">
              {/* Grid lines */}
              {[70, 80, 90, 100].map((v) => (
                <line
                  key={v}
                  x1="0" y1={scoreToY(v)} x2="100" y2={scoreToY(v)}
                  stroke="currentColor" strokeWidth="0.2"
                  className="text-[color:var(--text-secondary)]"
                />
              ))}
              {/* Area */}
              <path d={areaPath} fill="url(#areaGrad)" opacity="0.3" />
              {/* Line */}
              <path d={linePath} fill="none" stroke="currentColor" strokeWidth="0.8"
                className="text-indigo-400" />
              {/* Dots */}
              {filteredMonths.map((m, i) => {
                const cx = (i / (filteredMonths.length - 1)) * 100
                const cy = scoreToY(m.score)
                const isSelected = selectedMonth?.month === m.month
                return (
                  <circle
                    key={m.month}
                    cx={cx} cy={cy} r={isSelected ? 2.5 : 1.5}
                    className={`cursor-pointer transition-all ${isSelected ? 'fill-indigo-300 stroke-white' : 'fill-indigo-400'}`}
                    strokeWidth={isSelected ? 0.5 : 0}
                    onClick={() => setSelectedMonth(isSelected ? null : m)}
                  />
                )
              })}
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            {/* X labels */}
            <div className="flex justify-between mt-1">
              {filteredMonths.map((m, i) => (
                i % Math.max(1, Math.floor(filteredMonths.length / 6)) === 0 || i === filteredMonths.length - 1 ? (
                  <span key={m.month} className="text-[10px] text-gray-500">{m.label}</span>
                ) : <span key={m.month} />
              ))}
            </div>
          </div>

          {/* Drill-down detail */}
          {selectedMonth && (
            <div className="mt-4 rounded-lg bg-indigo-900/20 border border-indigo-800 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-indigo-200">
                  Detalle: {selectedMonth.label}
                </h3>
                <button onClick={() => setSelectedMonth(null)} className="text-indigo-400 hover:text-indigo-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-xl font-bold text-indigo-300">{selectedMonth.score}</p>
                  <p className="text-xs text-indigo-400">Puntaje</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-red-400">{selectedMonth.incidents}</p>
                  <p className="text-xs text-indigo-400">Incidencias</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-emerald-600">{selectedMonth.resolved}</p>
                  <p className="text-xs text-indigo-400">Resueltas</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Department Breakdown */}
        <div className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-1">
            Cumplimiento por Departamento
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Haz clic en una barra para ver los trabajadores del area.
          </p>

          <div className="space-y-3">
            {filteredDepartments.map((dept) => {
              const isExpanded = expandedDept === dept.name
              return (
                <div key={dept.name}>
                  <button
                    onClick={() => setExpandedDept(isExpanded ? null : dept.name)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <ChevronRight className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        <span className="text-sm font-medium text-white">{dept.name}</span>
                        <span className="text-xs text-gray-400">({dept.workers})</span>
                        {dept.trend === 'up' && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                        {dept.trend === 'down' && <ArrowDownRight className="h-3 w-3 text-red-500" />}
                      </div>
                      <span className={`text-sm font-bold ${dept.score >= 95 ? 'text-emerald-600' : dept.score >= 90 ? 'text-emerald-600' : dept.score >= 85 ? 'text-amber-400' : 'text-red-400'}`}>
                        {dept.score}%
                      </span>
                    </div>
                    <div className="w-full bg-[color:var(--neutral-100)] bg-gray-800 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${dept.score >= 95 ? 'bg-emerald-500' : dept.score >= 90 ? 'bg-blue-500' : dept.score >= 85 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${dept.score}%` }}
                      />
                    </div>
                  </button>

                  {/* Drill-down: worker list */}
                  {isExpanded && (
                    <div className="mt-2 ml-5 rounded-lg bg-[color:var(--neutral-50)] bg-gray-800/50 border border-white/[0.08] border-gray-700 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.08] border-gray-700">
                            <th className="px-3 py-2 text-left text-gray-400 font-medium">Trabajador</th>
                            <th className="px-3 py-2 text-left text-gray-400 font-medium">Cargo</th>
                            <th className="px-3 py-2 text-center text-gray-400 font-medium">Estado</th>
                            <th className="px-3 py-2 text-right text-gray-400 font-medium">Puntaje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dept.details.map((w) => (
                            <tr key={w.worker} className="border-b last:border-0 border-white/[0.06] border-gray-700/50">
                              <td className="px-3 py-2 text-white font-medium">{w.worker}</td>
                              <td className="px-3 py-2 text-gray-400">{w.role}</td>
                              <td className={`px-3 py-2 text-center font-medium ${statusColors[w.status] ?? 'text-gray-500'}`}>{w.status}</td>
                              <td className="px-3 py-2 text-right font-bold text-white">{w.score}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---- Row 2: Risk Matrix + Top Violations ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Matrix */}
        <div className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Target className="h-5 w-5 text-red-500" />
            Matriz de Riesgos
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Probabilidad vs Impacto. Haz clic en una celda para ver los riesgos.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-20" />
                  {impactLevels.map((imp) => (
                    <th key={imp} className="px-2 py-2 text-center text-xs font-medium text-gray-400">
                      Impacto {imp}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {probLevels.map((prob) => (
                  <tr key={prob}>
                    <td className="px-2 py-2 text-xs font-medium text-gray-400 whitespace-nowrap">
                      Prob. {prob}
                    </td>
                    {impactLevels.map((imp) => {
                      const cell = getRiskCell(prob, imp)
                      if (!cell) return <td key={imp} />
                      const isSelected = selectedRiskCell === cell
                      return (
                        <td key={imp} className="px-1.5 py-1.5">
                          <button
                            onClick={() => setSelectedRiskCell(isSelected ? null : cell)}
                            className={`w-full rounded-lg p-3 text-center transition-all hover:scale-105 ${cell.color} ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-900' : ''}`}
                          >
                            <span className="text-lg font-bold text-white drop-shadow">{cell.count}</span>
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Risk cell detail */}
          {selectedRiskCell && (
            <div className="mt-4 rounded-lg bg-[color:var(--neutral-50)] bg-gray-800/50 border border-white/[0.08] border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-white">
                  Prob. {selectedRiskCell.probability} / Impacto {selectedRiskCell.impact}
                </h3>
                <button onClick={() => setSelectedRiskCell(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ul className="space-y-1">
                {selectedRiskCell.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-[color:var(--text-secondary)]">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Top Violations */}
        <div className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Layers className="h-5 w-5 text-orange-500" />
            Top Incumplimientos
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            Problemas de cumplimiento mas frecuentes, ordenados por cantidad.
          </p>

          <div className="space-y-3">
            {filteredViolations
              .sort((a, b) => b.count - a.count)
              .map((v, idx) => (
                <div
                  key={v.name}
                  className="flex items-center gap-3 rounded-lg bg-[color:var(--neutral-50)] bg-gray-800/50 p-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-xs font-bold text-[color:var(--text-secondary)]">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{v.name}</p>
                    <p className="text-xs text-gray-400">{v.category}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${severityColors[v.severity]}`}>
                    {v.severity}
                  </span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{v.count}</p>
                    <p className={`text-[10px] flex items-center gap-0.5 ${v.trend <= 0 ? 'text-emerald-600' : 'text-red-400'}`}>
                      {v.trend <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                      {v.trend > 0 ? '+' : ''}{v.trend}%
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ---- Row 3: Cost Analysis + Worker Metrics ---- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost Analysis */}
        <div className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-500" />
            Analisis de Costos
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            Multas potenciales evitadas vs costo de suscripcion COMPLY 360.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg bg-emerald-900/20 border border-emerald-800 p-4 text-center">
              <p className="text-xs text-emerald-600 mb-1">Multas evitadas (anual)</p>
              <p className="text-2xl font-bold text-emerald-700">S/ {finesAvoided.toLocaleString('es-PE')}</p>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-800 p-4 text-center">
              <p className="text-xs text-emerald-600 mb-1">Costo suscripcion (anual)</p>
              <p className="text-2xl font-bold text-emerald-600">S/ {subscriptionCost.toLocaleString('es-PE')}</p>
            </div>
          </div>

          <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-blue-50 from-emerald-900/10 to-blue-900/10 border border-white/[0.08] border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[color:var(--text-secondary)]">Retorno de Inversion (ROI)</span>
              <span className="text-2xl font-bold text-emerald-600">
                {Math.round(((finesAvoided - subscriptionCost) / subscriptionCost) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                style={{ width: '100%' }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Ahorro neto: S/ {(finesAvoided - subscriptionCost).toLocaleString('es-PE')} al a&ntilde;o
            </p>
          </div>

          {/* Breakdown by type */}
          <div className="mt-4 space-y-2">
            {[
              { label: 'Multas por contratos irregulares', amount: 180_000, pct: 37 },
              { label: 'Sanciones SST (SUNAFIL)', amount: 150_000, pct: 31 },
              { label: 'Incumplimiento de capacitaciones', amount: 85_000, pct: 18 },
              { label: 'Documentacion laboral faltante', amount: 70_000, pct: 14 },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-gray-400 truncate">{item.label}</span>
                    <span className="text-white font-medium">S/ {item.amount.toLocaleString('es-PE')}</span>
                  </div>
                  <div className="w-full bg-[color:var(--neutral-100)] bg-gray-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-400" style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Worker Metrics */}
        <div className="rounded-xl border border-white/[0.08] border-gray-700 bg-white bg-gray-900 p-6">
          <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            Metricas de Trabajadores
          </h2>
          <p className="text-xs text-gray-400 mb-5">
            Indicadores clave de gestion del talento humano.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            {[
              { label: 'Tasa de Rotacion', value: `${turnoverRate}%`, sub: 'anualizada', icon: <TrendingDown className="h-4 w-4 text-emerald-500" />, good: true },
              { label: 'Antiguedad Promedio', value: `${avgTenure} anos`, sub: 'por trabajador', icon: <Clock className="h-4 w-4 text-blue-500" />, good: true },
              { label: 'Capacitacion Completada', value: `${trainingCompletion}%`, sub: 'del total requerido', icon: <Award className="h-4 w-4 text-amber-500" />, good: true },
              { label: 'Contratos Vigentes', value: `${Math.round(totalWorkers * 0.94)}`, sub: `de ${totalWorkers} totales`, icon: <FileText className="h-4 w-4 text-indigo-500" />, good: true },
            ].map((m) => (
              <div key={m.label} className="rounded-lg bg-[color:var(--neutral-50)] bg-gray-800/50 border border-white/[0.08] border-gray-700 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">{m.label}</span>
                  {m.icon}
                </div>
                <p className="text-xl font-bold text-white">{m.value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Department headcount breakdown */}
          <h3 className="text-sm font-semibold text-white mb-3">Distribucion por Area</h3>
          <div className="space-y-2">
            {DEPARTMENTS.sort((a, b) => b.workers - a.workers).map((dept) => {
              const pct = Math.round((dept.workers / totalWorkers) * 100)
              return (
                <div key={dept.name} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-gray-400 truncate">{dept.name}</span>
                  <div className="flex-1 bg-[color:var(--neutral-100)] bg-gray-800 rounded-full h-2">
                    <div className="h-2 rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs text-gray-400">{dept.workers} ({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
