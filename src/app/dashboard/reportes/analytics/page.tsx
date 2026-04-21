'use client'

import { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Shield,
  FileText,
  Download,
  Mail,
  Calendar,
  Sparkles,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Brain,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const periodOptions = [
  { label: 'Último mes', value: '1m' },
  { label: '3 meses', value: '3m' },
  { label: '6 meses', value: '6m' },
  { label: '12 meses', value: '12m' },
  { label: 'Todo', value: 'all' },
]

const complianceHistory = [
  { month: 'Abr 2025', score: 52 },
  { month: 'May', score: 55 },
  { month: 'Jun', score: 58 },
  { month: 'Jul', score: 62 },
  { month: 'Ago', score: 65 },
  { month: 'Sep', score: 68 },
  { month: 'Oct', score: 72 },
  { month: 'Nov', score: 75 },
  { month: 'Dic', score: 78 },
  { month: 'Ene 2026', score: 80 },
  { month: 'Feb', score: 83 },
  { month: 'Mar', score: 87 },
]

const riskAreas = [
  { name: 'Contratos Laborales', score: 92, icon: FileText },
  { name: 'Seguridad y Salud (SST)', score: 58, icon: Shield },
  { name: 'Remuneraciones', score: 85, icon: DollarSign },
  { name: 'Jornada Laboral', score: 71, icon: Calendar },
  { name: 'Igualdad Salarial', score: 67, icon: Target },
  { name: 'Capacitaciones', score: 89, icon: Brain },
  { name: 'Denuncias / Hostigamiento', score: 78, icon: AlertTriangle },
  { name: 'Documentación General', score: 94, icon: FileText },
]

const departments = [
  { name: 'RRHH', score: 95 },
  { name: 'Operaciones', score: 92 },
  { name: 'Administración', score: 88 },
  { name: 'Producción', score: 82 },
  { name: 'Ventas', score: 75 },
]

const predictiveInsights = [
  {
    type: 'prediction' as const,
    icon: TrendingUp,
    color: 'text-emerald-600',
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-800',
    title: 'Predicción de Cumplimiento',
    text: 'Si mantienes el ritmo actual, alcanzarás 95% de cumplimiento en 4 meses.',
  },
  {
    type: 'risk' as const,
    icon: AlertTriangle,
    color: 'text-amber-400',
    bg: 'bg-amber-950/40',
    border: 'border-amber-800',
    title: 'Riesgo Detectado',
    text: '3 contratos vencen en los próximos 60 días sin renovación programada.',
  },
  {
    type: 'opportunity' as const,
    icon: Sparkles,
    color: 'text-emerald-600',
    bg: 'bg-blue-950/40',
    border: 'border-blue-800',
    title: 'Oportunidad',
    text: 'Completar módulo SST reduciría la multa potencial en S/ 8,500.',
  },
]

function getRiskColor(score: number): string {
  if (score >= 85) return 'bg-emerald-600'
  if (score >= 70) return 'bg-yellow-500'
  return 'bg-red-600'
}

function getRiskBadge(score: number): { text: string; className: string } {
  if (score >= 85) return { text: 'Bajo', className: 'text-emerald-700 bg-emerald-900/50' }
  if (score >= 70) return { text: 'Medio', className: 'text-yellow-300 bg-yellow-900/50' }
  return { text: 'Alto', className: 'text-red-300 bg-red-900/50' }
}

function getBarColor(score: number): string {
  if (score >= 85) return 'bg-emerald-400'
  if (score >= 70) return 'bg-blue-400'
  return 'bg-amber-400'
}

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('12m')
  const [expandedArea, setExpandedArea] = useState<string | null>(null)
  const [monthlyEmail, setMonthlyEmail] = useState(false)

  return (
    <div className="min-h-screen bg-[color:var(--neutral-50)] bg-gray-950 p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-indigo-400" />
            Business Intelligence
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Análisis avanzado de cumplimiento, ROI e insights predictivos
          </p>
        </div>
        <div className="flex items-center bg-white bg-gray-900 border border-white/[0.08] border-gray-700 rounded-lg p-1 shadow-sm">
          {periodOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSelectedPeriod(opt.value)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                selectedPeriod === opt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:text-white hover:bg-[color:var(--neutral-100)] hover:bg-gray-800'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ROI Hero Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 from-indigo-700 via-purple-700 to-indigo-900 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-indigo-200" />
            <span className="text-sm font-medium text-indigo-200 uppercase tracking-wider">
              COMPLY 360 te ha ahorrado
            </span>
          </div>
          <p className="text-4xl md:text-5xl font-extrabold tracking-tight">
            S/ 127,500
          </p>
          <p className="text-lg text-indigo-200 mt-1">en multas evitadas</p>
          <p className="text-sm text-indigo-300 mt-3">
            Basado en brechas cerradas y cumplimiento mejorado
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium">
              <ArrowDownRight className="h-4 w-4" />
              Inversión: S/ 4,188
            </span>
            <span className="inline-flex items-center gap-1.5 bg-emerald-200 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-bold">
              <ArrowUpRight className="h-4 w-4" />
              ROI: 3,045%
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Score */}
        <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Compliance Score
            </span>
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-white">87%</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">
              +12 pts
            </span>
            <span className="text-xs text-gray-400 ml-1">
              vs hace 6 meses
            </span>
          </div>
        </div>

        {/* Multa Potencial */}
        <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Multa Potencial
            </span>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-white">S/ 23,400</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingDown className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">
              -68%
            </span>
            <span className="text-xs text-gray-400 ml-1">
              reducida
            </span>
          </div>
        </div>

        {/* Documentos al Día */}
        <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Documentos al Día
            </span>
            <FileText className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-white">94%</p>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-emerald-600">
              +15%
            </span>
            <span className="text-xs text-gray-400 ml-1">
              mejora
            </span>
          </div>
        </div>

        {/* Capacitaciones */}
        <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Capacitaciones
            </span>
            <Target className="h-5 w-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-white">89%</p>
          <div className="flex items-center gap-1 mt-1">
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-gray-400">
              completadas
            </span>
          </div>
        </div>
      </div>

      {/* Two-column layout: Compliance Evolution + Department Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compliance Score Evolution */}
        <div className="lg:col-span-2 bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Evolución del Compliance Score
              </h2>
              <p className="text-sm text-gray-400">
                Últimos 12 meses
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="space-y-2.5">
            {complianceHistory.map((item) => (
              <div key={item.month} className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-400 w-20 text-right shrink-0">
                  {item.month}
                </span>
                <div className="flex-1 h-6 bg-[color:var(--neutral-100)] bg-gray-800 rounded-full overflow-hidden relative">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      item.score >= 80
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 from-emerald-600 to-emerald-400'
                        : item.score >= 65
                        ? 'bg-gradient-to-r from-blue-500 to-blue-400 from-blue-600 to-blue-400'
                        : 'bg-gradient-to-r from-amber-500 to-amber-400 from-amber-600 to-amber-400'
                    )}
                    style={{ width: `${item.score}%` }}
                  />
                  <span className="absolute inset-y-0 right-2 flex items-center text-xs font-bold text-[color:var(--text-secondary)]">
                    {item.score}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Department Comparison */}
        <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-semibold text-white">
                Comparación por Área
              </h2>
              <p className="text-sm text-gray-400">
                Cumplimiento por departamento
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="space-y-4">
            {departments.map((dept) => (
              <div key={dept.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-[color:var(--text-secondary)]">
                    {dept.name}
                  </span>
                  <span className={cn(
                    'text-sm font-bold',
                    dept.score >= 90
                      ? 'text-emerald-600'
                      : dept.score >= 80
                      ? 'text-emerald-600'
                      : 'text-amber-400'
                  )}>
                    {dept.score}%
                  </span>
                </div>
                <div className="h-3 bg-[color:var(--neutral-100)] bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500', getBarColor(dept.score))}
                    style={{ width: `${dept.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Heatmap */}
      <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Mapa de Riesgo por Área
            </h2>
            <p className="text-sm text-gray-400">
              Haz clic en un área para ver el desglose detallado
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-red-500" /> Alto
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-yellow-400" /> Medio
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" /> Bajo
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {riskAreas.map((area) => {
            const badge = getRiskBadge(area.score)
            const isExpanded = expandedArea === area.name
            const IconComp = area.icon
            return (
              <button
                key={area.name}
                onClick={() => setExpandedArea(isExpanded ? null : area.name)}
                className={cn(
                  'relative text-left rounded-lg p-4 border transition-all',
                  'hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500',
                  isExpanded
                    ? 'border-indigo-500 ring-1 ring-indigo-200 ring-indigo-800'
                    : 'border-white/[0.08] border-gray-700'
                )}
              >
                <div className={cn('absolute top-0 left-0 w-1.5 h-full rounded-l-lg', getRiskColor(area.score))} />
                <div className="flex items-start justify-between mb-2 pl-2">
                  <IconComp className="h-5 w-5 text-gray-500" />
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', badge.className)}>
                    {badge.text}
                  </span>
                </div>
                <p className="text-sm font-semibold text-[color:var(--text-secondary)] pl-2">
                  {area.name}
                </p>
                <p className="text-2xl font-bold text-white mt-1 pl-2">
                  {area.score}%
                </p>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/[0.08] border-gray-700 pl-2">
                    <p className="text-xs text-gray-400">
                      Último diagnóstico: hace 5 días
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Brechas pendientes: {area.score < 70 ? 4 : area.score < 85 ? 2 : 1}
                    </p>
                    <p className="text-xs text-indigo-400 mt-1 font-medium">
                      Ver detalles completos &rarr;
                    </p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <Brain className="h-6 w-6 text-purple-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">
              Insights Predictivos
            </h2>
            <p className="text-sm text-gray-400">
              Análisis impulsado por IA
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {predictiveInsights.map((insight) => {
            const IconComp = insight.icon
            return (
              <div
                key={insight.title}
                className={cn(
                  'rounded-lg border p-4 transition-all hover:shadow-md',
                  insight.bg,
                  insight.border
                )}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-lg',
                    insight.type === 'prediction'
                      ? 'bg-emerald-900/60'
                      : insight.type === 'risk'
                      ? 'bg-amber-900/60'
                      : 'bg-blue-900/60'
                  )}>
                    <IconComp className={cn('h-4 w-4', insight.color)} />
                  </div>
                  <span className={cn('text-sm font-semibold', insight.color)}>
                    {insight.title}
                  </span>
                </div>
                <p className="text-sm text-[color:var(--text-secondary)] leading-relaxed">
                  {insight.text}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white bg-gray-900 rounded-xl border border-white/[0.08] border-gray-800 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Exportar Reportes
            </h2>
            <p className="text-sm text-gray-400">
              Descarga o programa el envío de reportes
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Download className="h-4 w-4" />
              Descargar Reporte PDF
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2.5 bg-white bg-gray-800 border border-white/10 border-gray-600 text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:bg-gray-700 text-sm font-medium rounded-lg transition-colors shadow-sm">
              <FileText className="h-4 w-4" />
              Exportar a Excel
            </button>
            <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[color:var(--neutral-50)] bg-gray-800 border border-white/[0.08] border-gray-700 rounded-lg">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-[color:var(--text-secondary)]">
                Envío mensual
              </span>
              <button
                onClick={() => setMonthlyEmail(!monthlyEmail)}
                className={cn(
                  'relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full transition-colors',
                  monthlyEmail
                    ? 'bg-indigo-600'
                    : 'bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5',
                    monthlyEmail ? 'translate-x-5 ml-0.5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
