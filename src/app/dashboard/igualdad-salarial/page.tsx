'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Equal, Users, TrendingDown, AlertTriangle, CheckCircle2,
  Loader2, Plus, Download, BarChart3, X, Bell, Scale,
  FileText, ExternalLink, ShieldCheck, ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ============================
   Types
   ============================ */
interface GenderGroup {
  position: string | null
  department: string | null
  totalWorkers: number
  maleCount: number
  femaleCount: number
  noGenderCount: number
  avgSalaryMale: number
  avgSalaryFemale: number
  avgSalaryAll: number
  gapPercent: number
  requiresReview: boolean
}

interface Stats {
  totalWorkers: number
  totalMale: number
  totalFemale: number
  noGenderCount: number
  femalePercent: number
  overallAvgGap: number
  groupsAnalyzed: number
  groupsWithGap: number
  groupsCompliant: number
}

interface Categoria {
  id: string
  categoryName: string
  functions: string
  salaryRangeMin: number
  salaryRangeMax: number
  requirements: string
  level: string
  createdAt: string
}

interface SalaryAlert {
  name: string
  position: string
  department: string
  gender: string
  salary: number
  avgOther: number
  gapPercent: number
}

interface ComplianceItem {
  id: string
  label: string
  checked: boolean
}

/* ============================
   Helpers
   ============================ */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount)
}

function getGapBadgeColor(gap: number): string {
  const abs = Math.abs(gap)
  if (abs <= 5) return 'bg-green-100 text-green-700 bg-green-900/40 text-green-400'
  if (abs <= 15) return 'bg-yellow-100 text-yellow-700 bg-yellow-900/40 text-yellow-400'
  return 'bg-red-100 text-red-700 bg-red-900/40 text-red-400'
}

function getGapBarColor(gap: number): { male: string; female: string; indicator: string } {
  const abs = Math.abs(gap)
  if (abs <= 5) return { male: '#3b82f6', female: '#ec4899', indicator: '#22c55e' }
  if (abs <= 15) return { male: '#3b82f6', female: '#ec4899', indicator: '#eab308' }
  return { male: '#3b82f6', female: '#ec4899', indicator: '#ef4444' }
}

const INITIAL_COMPLIANCE: ComplianceItem[] = [
  { id: 'cuadro', label: 'Cuadro de categorias y funciones implementado', checked: false },
  { id: 'politica', label: 'Politica salarial documentada', checked: false },
  { id: 'evaluacion', label: 'Evaluacion de puestos objetiva', checked: false },
  { id: 'bandas', label: 'Bandas salariales definidas', checked: false },
  { id: 'sindiferencias', label: 'Sin diferencias >5% injustificadas', checked: false },
]

/* ============================
   SVG Bar Chart Component
   ============================ */
function SalaryGapChart({ groups }: { groups: GenderGroup[] }) {
  // Only show groups that have both male and female workers
  const chartGroups = groups.filter(g => g.avgSalaryMale > 0 && g.avgSalaryFemale > 0).slice(0, 8)

  if (chartGroups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-[color:var(--text-tertiary)]">
        <BarChart3 className="h-10 w-10 mb-2" />
        <p className="text-sm">No hay datos suficientes para el grafico.</p>
        <p className="text-xs mt-1">Se necesitan grupos con ambos generos representados.</p>
      </div>
    )
  }

  const maxSalary = Math.max(
    ...chartGroups.map(g => Math.max(g.avgSalaryMale, g.avgSalaryFemale))
  )

  const barHeight = 18
  const groupHeight = barHeight * 2 + 24
  const chartHeight = chartGroups.length * groupHeight + 40
  const leftMargin = 160
  const rightMargin = 80
  const chartWidth = 700

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full min-w-[500px]"
        role="img"
        aria-label="Grafico de brecha salarial por departamento"
      >
        {/* Legend */}
        <g transform={`translate(${leftMargin}, 10)`}>
          <rect x="0" y="0" width="12" height="12" rx="2" fill="#3b82f6" />
          <text x="16" y="10" className="text-[10px] fill-slate-400" fontSize="10">Hombres</text>
          <rect x="80" y="0" width="12" height="12" rx="2" fill="#ec4899" />
          <text x="96" y="10" className="text-[10px] fill-slate-400" fontSize="10">Mujeres</text>
        </g>

        {chartGroups.map((g, i) => {
          const yOffset = i * groupHeight + 40
          const barWidth = chartWidth - leftMargin - rightMargin
          const maleWidth = maxSalary > 0 ? (g.avgSalaryMale / maxSalary) * barWidth : 0
          const femaleWidth = maxSalary > 0 ? (g.avgSalaryFemale / maxSalary) * barWidth : 0
          const colors = getGapBarColor(g.gapPercent)
          const label = `${g.department || 'N/A'}`

          return (
            <g key={i} transform={`translate(0, ${yOffset})`}>
              {/* Label */}
              <text
                x={leftMargin - 8}
                y={barHeight + 4}
                textAnchor="end"
                className="fill-slate-300"
                fontSize="11"
                fontWeight="500"
              >
                {label.length > 20 ? label.slice(0, 18) + '...' : label}
              </text>

              {/* Male bar */}
              <rect
                x={leftMargin}
                y={0}
                width={maleWidth}
                height={barHeight}
                rx="3"
                fill={colors.male}
                opacity="0.85"
              />
              <text
                x={leftMargin + maleWidth + 4}
                y={barHeight - 4}
                className="fill-slate-400"
                fontSize="9"
              >
                {formatCurrency(g.avgSalaryMale)}
              </text>

              {/* Female bar */}
              <rect
                x={leftMargin}
                y={barHeight + 4}
                width={femaleWidth}
                height={barHeight}
                rx="3"
                fill={colors.female}
                opacity="0.85"
              />
              <text
                x={leftMargin + femaleWidth + 4}
                y={barHeight * 2}
                className="fill-slate-400"
                fontSize="9"
              >
                {formatCurrency(g.avgSalaryFemale)}
              </text>

              {/* Gap indicator */}
              <circle
                cx={chartWidth - 30}
                cy={barHeight + 2}
                r="3"
                fill={colors.indicator}
              />
              <text
                x={chartWidth - 24}
                y={barHeight + 6}
                className="fill-slate-300"
                fontSize="10"
                fontWeight="600"
              >
                {Math.abs(g.gapPercent)}%
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/* ============================
   Main Page Component
   ============================ */
export default function IgualdadSalarialPage() {
  const [groups, setGroups] = useState<GenderGroup[]>([])
  const [stats, setStats] = useState<Stats>({
    totalWorkers: 0, totalMale: 0, totalFemale: 0, noGenderCount: 0,
    femalePercent: 0, overallAvgGap: 0, groupsAnalyzed: 0,
    groupsWithGap: 0, groupsCompliant: 0,
  })
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [alerts, setAlerts] = useState<SalaryAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    categoryName: '',
    functions: '',
    salaryRangeMin: '',
    salaryRangeMax: '',
    requirements: '',
    level: '',
  })

  // Compliance checklist state — persisted in localStorage
  const [compliance, setCompliance] = useState<ComplianceItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('igualdad-salarial-compliance')
        if (saved) return JSON.parse(saved)
      } catch { /* ignore */ }
    }
    return INITIAL_COMPLIANCE
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('igualdad-salarial-compliance', JSON.stringify(compliance))
    }
  }, [compliance])

  const complianceScore = useMemo(() => {
    const checked = compliance.filter(c => c.checked).length
    return Math.round((checked / compliance.length) * 100)
  }, [compliance])

  function toggleCompliance(id: string) {
    setCompliance(prev =>
      prev.map(c => c.id === id ? { ...c, checked: !c.checked } : c)
    )
  }

  async function loadData() {
    try {
      const res = await fetch('/api/igualdad-salarial')
      const data = await res.json()
      setGroups(data.groups || [])
      setStats(data.stats || {})
      setCategorias(data.categorias || [])
      setAlerts(data.alerts || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  async function saveCategoria() {
    if (!formData.categoryName) return
    setSaving(true)
    setSaveError(null)
    try {
      const res = await fetch('/api/igualdad-salarial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: formData.categoryName,
          functions: formData.functions,
          salaryRangeMin: formData.salaryRangeMin ? parseFloat(formData.salaryRangeMin) : 0,
          salaryRangeMax: formData.salaryRangeMax ? parseFloat(formData.salaryRangeMax) : 0,
          requirements: formData.requirements,
          level: formData.level,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar categoria')
      }
      setShowForm(false)
      setSaveError(null)
      setFormData({ categoryName: '', functions: '', salaryRangeMin: '', salaryRangeMax: '', requirements: '', level: '' })
      loadData()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar la categoría. Intente nuevamente.')
    }
    finally { setSaving(false) }
  }

  function exportReport() {
    const lines: string[] = []
    lines.push('=' .repeat(70))
    lines.push('INFORME DE IGUALDAD REMUNERATIVA')
    lines.push('Ley 30709 - Ley que prohibe la discriminacion remunerativa')
    lines.push('entre varones y mujeres')
    lines.push('=' .repeat(70))
    lines.push(`Fecha de emision: ${new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}`)
    lines.push('')
    lines.push('-'.repeat(70))
    lines.push('1. RESUMEN EJECUTIVO')
    lines.push('-'.repeat(70))
    lines.push(`   Total trabajadores analizados: ${stats.totalWorkers}`)
    lines.push(`   Hombres: ${stats.totalMale} | Mujeres: ${stats.totalFemale} (${stats.femalePercent}%)`)
    lines.push(`   Brecha salarial promedio general: ${stats.overallAvgGap}%`)
    lines.push(`   Grupos ocupacionales analizados: ${stats.groupsAnalyzed}`)
    lines.push(`   Grupos con brecha >5%: ${stats.groupsWithGap}`)
    lines.push(`   Grupos conformes: ${stats.groupsCompliant}`)
    lines.push('')

    lines.push('-'.repeat(70))
    lines.push('2. ANALISIS DETALLADO POR GRUPO OCUPACIONAL')
    lines.push('-'.repeat(70))
    lines.push('')
    lines.push('Puesto | Departamento | H | M | Prom.H | Prom.M | Brecha% | Estado')
    lines.push('-'.repeat(80))
    for (const g of groups) {
      const estado = Math.abs(g.gapPercent) > 5 ? 'REVISAR' : 'CONFORME'
      lines.push(`${g.position || 'N/A'} | ${g.department || 'N/A'} | ${g.maleCount} | ${g.femaleCount} | ${formatCurrency(g.avgSalaryMale)} | ${formatCurrency(g.avgSalaryFemale)} | ${g.gapPercent}% | ${estado}`)
    }
    lines.push('')

    if (alerts.length > 0) {
      lines.push('-'.repeat(70))
      lines.push('3. ALERTAS CRITICAS (Brecha >15%)')
      lines.push('-'.repeat(70))
      lines.push('')
      for (const a of alerts) {
        lines.push(`   ALERTA: ${a.name} - ${a.position} (${a.department})`)
        lines.push(`   Sueldo: ${formatCurrency(a.salary)} vs Promedio otro genero: ${formatCurrency(a.avgOther)}`)
        lines.push(`   Brecha: ${Math.abs(a.gapPercent)}%`)
        lines.push('')
      }
    }

    lines.push('-'.repeat(70))
    lines.push('4. CUMPLIMIENTO LEY 30709')
    lines.push('-'.repeat(70))
    lines.push('')
    for (const c of compliance) {
      lines.push(`   [${c.checked ? 'X' : ' '}] ${c.label}`)
    }
    lines.push(`   Nivel de cumplimiento: ${complianceScore}%`)
    lines.push('')

    if (categorias.length > 0) {
      lines.push('-'.repeat(70))
      lines.push('5. CUADRO DE CATEGORIAS Y FUNCIONES')
      lines.push('-'.repeat(70))
      lines.push('')
      lines.push('Categoria | Funciones | Rango Salarial | Requisitos | Nivel')
      lines.push('-'.repeat(80))
      for (const c of categorias) {
        lines.push(`${c.categoryName} | ${c.functions} | ${formatCurrency(c.salaryRangeMin)} - ${formatCurrency(c.salaryRangeMax)} | ${c.requirements} | ${c.level}`)
      }
      lines.push('')
    }

    lines.push('-'.repeat(70))
    lines.push('BASE LEGAL')
    lines.push('-'.repeat(70))
    lines.push('Ley 30709 - Ley que prohibe la discriminacion remunerativa entre varones y mujeres')
    lines.push('D.S. 002-2018-TR - Reglamento de la Ley 30709')
    lines.push('https://busquedas.elperuano.pe/normaslegales/ley-que-prohibe-la-discriminacion-remunerativa-entre-varones-ley-n-30709-1600963-1/')
    lines.push('')
    lines.push('Documento generado automaticamente por COMPLY360')

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-ley-30709-${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-700" />
      </div>
    )
  }

  const criticalGroups = groups.filter(g => Math.abs(g.gapPercent) > 15 && g.avgSalaryMale > 0 && g.avgSalaryFemale > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Scale className="h-6 w-6 text-emerald-700" />
            Igualdad Salarial
          </h1>
          <p className="mt-1 text-[color:var(--text-tertiary)]">
            Analisis de brecha salarial y cumplimiento de la Ley 30709
          </p>
        </div>
        <button
          onClick={exportReport}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600/90 shadow-sm"
        >
          <Download className="h-4 w-4" /> Descargar Reporte Ley 30709
        </button>
      </div>

      {/* Legal basis banner */}
      <div className="rounded-xl border border-blue-800 bg-blue-900/30 px-4 py-3">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-emerald-600">
              Base Legal: Ley 30709 — Ley que prohibe la discriminacion remunerativa entre varones y mujeres
            </p>
            <p className="mt-0.5 text-xs text-emerald-600">
              Obligacion: Mantener un cuadro de categorias y funciones con bandas salariales objetivas. Brecha mayor al 5% requiere justificacion documentada.
            </p>
            <a
              href="https://busquedas.elperuano.pe/normaslegales/ley-que-prohibe-la-discriminacion-remunerativa-entre-varones-ley-n-30709-1600963-1/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Ver norma completa en El Peruano
            </a>
          </div>
        </div>
      </div>

      {/* Banner: workers without gender */}
      {stats.noGenderCount > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-700 bg-amber-900/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">{stats.noGenderCount} trabajador{stats.noGenderCount !== 1 ? 'es' : ''} sin género registrado</span>
            {' '}no aparecen en el análisis de brecha salarial. Para incluirlos, ve al perfil de cada trabajador y establece el campo <span className="font-semibold">Género</span> (Información → Datos Personales).
          </p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-[color:var(--text-tertiary)]" />
          <p className="mt-1 text-2xl font-bold text-white">{stats.totalWorkers}</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Trabajadores</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-center">
          <Equal className="mx-auto h-5 w-5 text-purple-500" />
          <p className="mt-1 text-2xl font-bold text-purple-400">{stats.femalePercent}%</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Mujeres</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-center">
          <TrendingDown className="mx-auto h-5 w-5 text-blue-500" />
          {stats.totalMale > 0 && stats.totalFemale > 0 ? (
            <p className={cn('mt-1 text-2xl font-bold', Math.abs(stats.overallAvgGap) > 5 ? 'text-red-400' : 'text-green-400')}>
              {stats.overallAvgGap}%
            </p>
          ) : (
            <p className="mt-1 text-2xl font-bold text-[color:var(--text-tertiary)]">N/A</p>
          )}
          <p className="text-xs text-[color:var(--text-tertiary)]">Brecha Promedio</p>
        </div>
        <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4 text-center">
          <AlertTriangle className="mx-auto h-5 w-5 text-red-500" />
          <p className="mt-1 text-2xl font-bold text-red-400">{stats.groupsWithGap}</p>
          <p className="text-xs text-[color:var(--text-tertiary)]">Grupos con Brecha</p>
        </div>
      </div>

      {/* ============================
          ALERTS SECTION
          ============================ */}
      {(alerts.length > 0 || criticalGroups.length > 0) && (
        <div className="rounded-xl border border-red-800 bg-red-900/20">
          <div className="flex items-center gap-2 border-b border-red-800 px-4 py-3">
            <Bell className="h-5 w-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-300">
              Alertas Automaticas — Brecha Critica (&gt;15%)
            </h2>
          </div>
          <div className="divide-y divide-red-200 divide-red-800">
            {alerts.length > 0 ? (
              alerts.map((a, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-300">
                      {a.name || 'Trabajador'} — {a.position}
                    </p>
                    <p className="text-xs text-red-400 mt-0.5">
                      Departamento: {a.department} | Sueldo: {formatCurrency(a.salary)} |
                      Promedio {a.gender === 'F' ? 'masculino' : 'femenino'}: {formatCurrency(a.avgOther)}
                    </p>
                    <span className={cn('inline-block mt-1 rounded-full px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 bg-red-900/60 text-red-300')}>
                      Brecha: {Math.abs(a.gapPercent)}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              criticalGroups.map((g, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-300">
                      {g.position || 'Sin Puesto'} — {g.department || 'Sin Departamento'}
                    </p>
                    <p className="text-xs text-red-400 mt-0.5">
                      H: {formatCurrency(g.avgSalaryMale)} | M: {formatCurrency(g.avgSalaryFemale)} | Brecha: {Math.abs(g.gapPercent)}%
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================
          SALARY GAP CHART
          ============================ */}
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white">
        <div className="border-b border-[color:var(--border-default)] px-4 py-3">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-700" />
            Grafico de Brecha Salarial por Departamento
          </h2>
          <p className="text-xs text-[color:var(--text-tertiary)]">Comparacion de salario promedio hombres vs mujeres</p>
        </div>
        <div className="p-4">
          <SalaryGapChart groups={groups} />
        </div>
      </div>

      {/* ============================
          GENDER PAY GAP TABLE
          ============================ */}
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white">
        <div className="border-b border-[color:var(--border-default)] px-4 py-3">
          <h2 className="text-lg font-semibold text-white">Analisis por Grupo Ocupacional</h2>
          <p className="text-xs text-[color:var(--text-tertiary)]">Comparacion salarial por genero agrupada por puesto y departamento</p>
        </div>

        {groups.length === 0 ? (
          <div className="p-8 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-[color:var(--text-secondary)]" />
            <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">No hay datos suficientes para analisis.</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">Registre trabajadores con puesto, departamento, genero y sueldo.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/50 text-left text-xs font-medium uppercase text-[color:var(--text-tertiary)]">
                  <th className="px-4 py-3">Puesto</th>
                  <th className="px-4 py-3">Departamento</th>
                  <th className="px-4 py-3 text-center">Total</th>
                  <th className="px-4 py-3 text-center">H</th>
                  <th className="px-4 py-3 text-center">M</th>
                  <th className="px-4 py-3 text-right">Prom. H</th>
                  <th className="px-4 py-3 text-right">Prom. M</th>
                  <th className="px-4 py-3 text-right">Prom. Total</th>
                  <th className="px-4 py-3 text-center">Brecha</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={i} className="border-b border-[color:var(--border-default)] last:border-b-0 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/50">
                    <td className="px-4 py-3 font-medium text-white">
                      <div className="flex items-center gap-1.5">
                        {g.position || 'Sin Puesto'}
                        {g.noGenderCount > 0 && (
                          <span
                            title={`${g.noGenderCount} trabajador${g.noGenderCount !== 1 ? 'es' : ''} sin género registrado`}
                            className="inline-flex items-center rounded-full bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 cursor-help"
                          >
                            {g.noGenderCount} S/G
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--text-secondary)]">{g.department || 'Sin Departamento'}</td>
                    <td className="px-4 py-3 text-center font-semibold text-white">{g.totalWorkers}</td>
                    <td className="px-4 py-3 text-center text-emerald-600 font-medium">{g.maleCount || '-'}</td>
                    <td className="px-4 py-3 text-center text-pink-300 font-medium">{g.femaleCount || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-600">
                      {g.avgSalaryMale > 0 ? formatCurrency(g.avgSalaryMale) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-pink-300">
                      {g.avgSalaryFemale > 0 ? formatCurrency(g.avgSalaryFemale) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-white">
                      {g.avgSalaryAll > 0 ? formatCurrency(g.avgSalaryAll) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {g.avgSalaryMale > 0 && g.avgSalaryFemale > 0 ? (
                        <span className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-semibold', getGapBadgeColor(g.gapPercent))}>
                          {g.gapPercent > 0 ? '+' : ''}{g.gapPercent}%
                        </span>
                      ) : g.noGenderCount > 0 ? (
                        <span className="text-xs text-amber-400 font-medium">Sin género</span>
                      ) : (
                        <span className="text-xs text-[color:var(--text-tertiary)]">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {g.requiresReview ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Revisar
                        </span>
                      ) : g.maleCount === 0 && g.femaleCount === 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Sin género
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-400">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ============================
          LEY 30709 COMPLIANCE CHECKLIST
          ============================ */}
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white">
        <div className="flex items-center justify-between border-b border-[color:var(--border-default)] px-4 py-3">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-700" />
            <div>
              <h2 className="text-lg font-semibold text-white">Cumplimiento Ley 30709</h2>
              <p className="text-xs text-[color:var(--text-tertiary)]">Checklist de requisitos de la norma de igualdad remunerativa</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              'rounded-full px-3 py-1 text-xs font-bold',
              complianceScore === 100 ? 'bg-green-100 text-green-700 bg-green-900/40 text-green-400' :
              complianceScore >= 60 ? 'bg-yellow-100 text-yellow-700 bg-yellow-900/40 text-yellow-400' :
              'bg-red-100 text-red-700 bg-red-900/40 text-red-400'
            )}>
              {complianceScore}%
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pt-3">
          <div className="h-2 w-full rounded-full bg-gray-200 bg-[color:var(--neutral-100)]">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-500',
                complianceScore === 100 ? 'bg-green-500' :
                complianceScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${complianceScore}%` }}
            />
          </div>
        </div>

        <div className="p-4 space-y-2">
          {compliance.map(item => (
            <label
              key={item.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer transition-colors',
                item.checked
                  ? 'border-green-200 bg-green-50 border-green-800 bg-green-900/20'
                  : 'border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-50)] border-[color:var(--border-default)] bg-white hover:bg-[color:var(--neutral-100)]/50'
              )}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => toggleCompliance(item.id)}
                className="h-4 w-4 rounded border-white/10 text-emerald-700 focus:ring-primary border-[color:var(--border-default)] bg-[color:var(--neutral-100)]"
              />
              <span className={cn(
                'text-sm',
                item.checked
                  ? 'text-green-400 font-medium'
                  : 'text-[color:var(--text-secondary)]'
              )}>
                {item.label}
              </span>
              {item.checked && (
                <ShieldCheck className="h-4 w-4 text-green-500 ml-auto shrink-0" />
              )}
            </label>
          ))}
        </div>
      </div>

      {/* ============================
          CUADRO DE CATEGORIAS
          ============================ */}
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white">
        <div className="flex items-center justify-between border-b border-[color:var(--border-default)] px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Cuadro de Categorias y Funciones</h2>
            <p className="text-xs text-[color:var(--text-tertiary)]">Definicion de categorias con bandas salariales objetivas (Art. 2, Ley 30709)</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-600/90"
          >
            <Plus className="h-4 w-4" /> Agregar Categoria
          </button>
        </div>

        {categorias.length === 0 ? (
          <div className="p-8 text-center">
            <Equal className="mx-auto h-10 w-10 text-[color:var(--text-secondary)]" />
            <p className="mt-2 text-sm text-[color:var(--text-tertiary)]">No hay categorias definidas.</p>
            <p className="text-xs text-[color:var(--text-tertiary)]">Defina las categorias de puestos con sus bandas salariales.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            >
              + Crear primera categoria
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/50 text-left text-xs font-medium uppercase text-[color:var(--text-tertiary)]">
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Nivel</th>
                  <th className="px-4 py-3">Funciones</th>
                  <th className="px-4 py-3 text-right">Rango Min</th>
                  <th className="px-4 py-3 text-right">Rango Max</th>
                  <th className="px-4 py-3">Requisitos</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map(c => (
                  <tr key={c.id} className="border-b border-[color:var(--border-default)] last:border-b-0 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/50">
                    <td className="px-4 py-3 font-medium text-white">{c.categoryName}</td>
                    <td className="px-4 py-3 text-[color:var(--text-secondary)]">{c.level || '-'}</td>
                    <td className="px-4 py-3 text-[color:var(--text-secondary)] max-w-xs truncate">{c.functions || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono text-[color:var(--text-secondary)]">{formatCurrency(c.salaryRangeMin)}</td>
                    <td className="px-4 py-3 text-right font-mono text-[color:var(--text-secondary)]">{formatCurrency(c.salaryRangeMax)}</td>
                    <td className="px-4 py-3 text-[color:var(--text-secondary)] max-w-xs truncate">{c.requirements || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gap Legend */}
      <div className="rounded-xl border border-[color:var(--border-default)] bg-white p-4">
        <h3 className="text-sm font-semibold text-white">Referencia de Indicadores</h3>
        <div className="mt-2 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-green-500" />
            <span className="text-xs text-[color:var(--text-secondary)]">Brecha &le; 5% (Conforme)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-yellow-500" />
            <span className="text-xs text-[color:var(--text-secondary)]">Brecha 5-15% (Requiere revision)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-red-500" />
            <span className="text-xs text-[color:var(--text-secondary)]">Brecha &gt; 15% (Critico)</span>
          </div>
        </div>
      </div>

      {/* ============================
          ADD CATEGORY MODAL
          ============================ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Nueva Categoria</h3>
              <button
                onClick={() => { setShowForm(false); setSaveError(null) }}
                aria-label="Cerrar modal"
                className="rounded p-1 hover:bg-[color:var(--neutral-100)]"
              >
                <X className="h-5 w-5 text-[color:var(--text-tertiary)]" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Inline error — replaces native alert() */}
              {saveError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{saveError}</p>
                </div>
              )}

              <div>
                <label htmlFor="cat-categoryName" className="block text-sm font-medium text-[color:var(--text-secondary)]">Nombre de categoria *</label>
                <input
                  id="cat-categoryName"
                  type="text"
                  value={formData.categoryName}
                  onChange={e => setFormData(p => ({ ...p, categoryName: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-sm bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
                  placeholder="Ej: Gerente de Area"
                />
              </div>
              <div>
                <label htmlFor="cat-level" className="block text-sm font-medium text-[color:var(--text-secondary)]">Nivel</label>
                <select
                  id="cat-level"
                  value={formData.level}
                  onChange={e => setFormData(p => ({ ...p, level: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-sm bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
                >
                  <option value="">Seleccionar...</option>
                  <option value="Directivo">Directivo</option>
                  <option value="Gerencial">Gerencial</option>
                  <option value="Jefatura">Jefatura</option>
                  <option value="Profesional">Profesional</option>
                  <option value="Tecnico">Tecnico</option>
                  <option value="Auxiliar">Auxiliar</option>
                  <option value="Operativo">Operativo</option>
                </select>
              </div>
              <div>
                <label htmlFor="cat-functions" className="block text-sm font-medium text-[color:var(--text-secondary)]">Funciones principales</label>
                <textarea
                  id="cat-functions"
                  value={formData.functions}
                  onChange={e => setFormData(p => ({ ...p, functions: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-sm bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
                  rows={3}
                  placeholder="Describir las funciones principales del puesto..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cat-salaryRangeMin" className="block text-sm font-medium text-[color:var(--text-secondary)]">Rango salarial minimo (S/)</label>
                  <input
                    id="cat-salaryRangeMin"
                    type="number"
                    value={formData.salaryRangeMin}
                    onChange={e => setFormData(p => ({ ...p, salaryRangeMin: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-sm bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label htmlFor="cat-salaryRangeMax" className="block text-sm font-medium text-[color:var(--text-secondary)]">Rango salarial maximo (S/)</label>
                  <input
                    id="cat-salaryRangeMax"
                    type="number"
                    value={formData.salaryRangeMax}
                    onChange={e => setFormData(p => ({ ...p, salaryRangeMax: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-sm bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="cat-requirements" className="block text-sm font-medium text-[color:var(--text-secondary)]">Requisitos del puesto</label>
                <textarea
                  id="cat-requirements"
                  value={formData.requirements}
                  onChange={e => setFormData(p => ({ ...p, requirements: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-[color:var(--border-default)] px-3 py-2 text-sm bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]"
                  rows={2}
                  placeholder="Formacion, experiencia, competencias..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowForm(false); setSaveError(null) }}
                className="rounded-lg border border-[color:var(--border-default)] px-4 py-2 text-sm text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
              >
                Cancelar
              </button>
              <button
                onClick={saveCategoria}
                disabled={!formData.categoryName || saving}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600/90 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Categoria'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
