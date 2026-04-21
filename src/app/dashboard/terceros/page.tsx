'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Building2,
  AlertTriangle,
  CheckCircle,
  Users,
  Plus,
  X,
  Loader2,
  Calendar,
  FileText,
  Info,
  ShieldAlert,
  Shield,
  Clock,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  TrendingUp,
  FileCheck,
  CircleAlert,
  Eye,
} from 'lucide-react'

// =============================================
// TYPES
// =============================================

interface Tercero {
  id: string
  orgId: string
  razonSocial: string
  ruc: string
  actividadPrincipal: string | null
  tipoServicio: string | null
  contratoUrl: string | null
  fechaInicio: string
  fechaFin: string | null
  trabajadoresAsignados: number
  isActividadPrincipal: boolean
  isActive: boolean
  isContractExpired: boolean
  createdAt: string
  updatedAt: string
}

interface DocumentoRequerido {
  key: string
  label: string
  descripcion: string
}

interface RedFlag {
  key: string
  label: string
  descripcion: string
  baseLegal: string
  requiresManualCheck?: boolean // true = no se puede detectar automáticamente
  detectFn: (t: Tercero) => boolean
}

interface TercerosData {
  stats: {
    total: number
    active: number
    totalTrabajadores: number
    flaggedMainActivity: number
    expiredContracts: number
  }
  terceros: Tercero[]
  baseLegal: {
    tercerizacion: string
    intermediacion: string
    reglamento: string
    restriction: string
  }
}

// =============================================
// CONSTANTS
// =============================================

const TIPO_SERVICIO_CONFIG: Record<string, { label: string; color: string; darkColor: string }> = {
  TERCERIZACION: {
    label: 'Tercerización',
    color: 'bg-blue-100 text-blue-700',
    darkColor: 'bg-blue-900/30 text-emerald-600',
  },
  INTERMEDIACION: {
    label: 'Intermediación',
    color: 'bg-purple-100 text-purple-700',
    darkColor: 'bg-purple-900/30 text-purple-400',
  },
}

const DOCUMENTOS_REQUERIDOS: DocumentoRequerido[] = [
  {
    key: 'contrato',
    label: 'Contrato de intermediación/tercerización vigente',
    descripcion: 'Contrato escrito con objeto, plazo y condiciones del servicio',
  },
  {
    key: 'inscripcion_mtpe',
    label: 'Constancia de inscripción en MTPE (REITP)',
    descripcion: 'Registro Nacional de Empresas y Entidades de Intermediación y Tercerización',
  },
  {
    key: 'sctr',
    label: 'SCTR de trabajadores destacados',
    descripcion: 'Seguro Complementario de Trabajo de Riesgo para actividades de riesgo',
  },
  {
    key: 'planilla',
    label: 'Planilla de remuneraciones',
    descripcion: 'Constancia del pago oportuno de remuneraciones y beneficios sociales',
  },
  {
    key: 'poliza',
    label: 'Póliza de seguro complementario',
    descripcion: 'Cobertura por accidentes y enfermedades profesionales',
  },
  {
    key: 'ruc',
    label: 'RUC activo y habido',
    descripcion: 'Verificación de estado contributivo vigente ante SUNAT',
  },
]

const RED_FLAGS: RedFlag[] = [
  {
    key: 'actividad_principal',
    label: 'Actividad principal = actividad de la empresa contratante',
    descripcion:
      'La empresa tercera realiza labores que constituyen la actividad principal de la empresa usuaria, configurando subordinación directa prohibida.',
    baseLegal: 'Art. 2 Ley 29245; Art. 1 D.Leg. 1038',
    detectFn: (t) => t.isActividadPrincipal,
  },
  {
    key: 'pluralidad_clientes',
    label: 'No tiene pluralidad de clientes',
    descripcion:
      'La empresa tercerizadora presta servicios exclusivamente a una sola empresa usuaria, evidenciando falta de autonomía empresarial.',
    baseLegal: 'Art. 2 Ley 29245; Art. 4 D.S. 006-2008-TR',
    requiresManualCheck: true,
    detectFn: () => false,
  },
  {
    key: 'permanencia',
    label: 'Personal permanente en vez de temporal',
    descripcion:
      'Los trabajadores destacados prestan servicios de manera permanente y continua, superando los plazos razonables para actividades temporales.',
    baseLegal: 'Art. 3 Ley 27626; Art. 5 D.Leg. 1038',
    detectFn: (t) => {
      if (!t.fechaInicio) return false
      const inicio = new Date(t.fechaInicio)
      const ahora = new Date()
      const meses = (ahora.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 30)
      return meses > 36 && !t.fechaFin
    },
  },
  {
    key: 'autonomia',
    label: 'Sin autonomía técnica/funcional',
    descripcion:
      'La empresa tercera no demuestra contar con recursos propios, dirección técnica independiente ni equipamiento propio para prestar el servicio.',
    baseLegal: 'Art. 2 Ley 29245; Art. 2 D.Leg. 1038',
    requiresManualCheck: true,
    detectFn: () => false,
  },
]

// =============================================
// UTILITY FUNCTIONS
// =============================================

function calcularDocumentacion(tercero: Tercero): {
  completados: string[]
  pendientes: string[]
  status: 'completo' | 'parcial' | 'sin_documentos'
  porcentaje: number
} {
  const completados: string[] = []
  const pendientes: string[] = []

  // Simulate document checks based on available data
  if (tercero.contratoUrl || tercero.fechaFin) {
    completados.push('contrato')
  } else {
    pendientes.push('contrato')
  }

  // RUC check
  if (tercero.ruc && /^20\d{9}$/.test(tercero.ruc)) {
    completados.push('ruc')
  } else {
    pendientes.push('ruc')
  }

  // The rest are simulated as pending (in real app, these would come from DB)
  const autoKeys = ['inscripcion_mtpe', 'sctr', 'planilla', 'poliza']
  // Simulate: if tercero has been active for a while and has contract, assume some docs exist
  if (tercero.isActive && tercero.contratoUrl) {
    completados.push('inscripcion_mtpe', 'planilla')
    pendientes.push('sctr', 'poliza')
  } else {
    pendientes.push(...autoKeys)
  }

  const porcentaje = Math.round((completados.length / DOCUMENTOS_REQUERIDOS.length) * 100)
  const status =
    completados.length === DOCUMENTOS_REQUERIDOS.length
      ? 'completo'
      : completados.length > 0
        ? 'parcial'
        : 'sin_documentos'

  return { completados, pendientes, status, porcentaje }
}

function detectarRedFlags(tercero: Tercero): { flag: RedFlag; detected: boolean }[] {
  return RED_FLAGS.map((flag) => ({
    flag,
    detected: flag.detectFn(tercero),
  }))
}

function calcularComplianceScore(tercero: Tercero): number {
  const docs = calcularDocumentacion(tercero)
  const flags = detectarRedFlags(tercero)
  const flagsDetected = flags.filter((f) => f.detected).length

  // Score: 60% documentation, 40% no red flags
  const docScore = docs.porcentaje * 0.6
  const flagPenalty = flagsDetected * 25 // Each flag deducts 25 from the 40 points
  const flagScore = Math.max(0, 40 - flagPenalty)

  // Extra penalty for expired contract
  const expiredPenalty = tercero.isContractExpired ? 15 : 0

  return Math.max(0, Math.min(100, Math.round(docScore + flagScore - expiredPenalty)))
}

function getScoreColor(score: number) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-500', ring: 'ring-emerald-200 ring-emerald-800' }
  if (score >= 60) return { text: 'text-amber-400', bg: 'bg-amber-500', ring: 'ring-amber-200 ring-amber-800' }
  return { text: 'text-red-400', bg: 'bg-red-500', ring: 'ring-red-200 ring-red-800' }
}

function getRiskLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Bajo', color: 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-600' }
  if (score >= 60) return { label: 'Medio', color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400' }
  return { label: 'Alto', color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' }
}

function diasParaVencimiento(fecha: string | null): number | null {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// =============================================
// MAIN PAGE
// =============================================

export default function TercerosPage() {
  const [data, setData] = useState<TercerosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [expandedTercero, setExpandedTercero] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRisk, setFilterRisk] = useState<'all' | 'alto' | 'medio' | 'bajo'>('all')
  const [activeTab, setActiveTab] = useState<'lista' | 'alertas'>('lista')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/terceros')
      if (!res.ok) throw new Error('Error al cargar datos')
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Computed values
  const enrichedTerceros = useMemo(() => {
    if (!data) return []
    return data.terceros.map((t) => ({
      ...t,
      docs: calcularDocumentacion(t),
      redFlags: detectarRedFlags(t),
      complianceScore: calcularComplianceScore(t),
      diasVencimiento: diasParaVencimiento(t.fechaFin),
    }))
  }, [data])

  const filteredTerceros = useMemo(() => {
    let result = enrichedTerceros

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (t) =>
          t.razonSocial.toLowerCase().includes(term) ||
          t.ruc.includes(term) ||
          (t.actividadPrincipal && t.actividadPrincipal.toLowerCase().includes(term))
      )
    }

    if (filterRisk !== 'all') {
      result = result.filter((t) => {
        const risk = getRiskLevel(t.complianceScore)
        return risk.label.toLowerCase() === filterRisk
      })
    }

    return result
  }, [enrichedTerceros, searchTerm, filterRisk])

  const alertasVencimiento = useMemo(() => {
    return enrichedTerceros
      .filter((t) => t.diasVencimiento !== null && t.diasVencimiento <= 30 && t.isActive)
      .sort((a, b) => (a.diasVencimiento ?? 0) - (b.diasVencimiento ?? 0))
  }, [enrichedTerceros])

  const computedStats = useMemo(() => {
    if (!data) return null
    const conDocsVigentes = enrichedTerceros.filter((t) => t.docs.status === 'completo').length
    const conAlertas = enrichedTerceros.filter(
      (t) => t.redFlags.some((f) => f.detected) || t.isContractExpired
    ).length
    const riesgoAlto = enrichedTerceros.filter((t) => t.complianceScore < 60).length
    return { conDocsVigentes, conAlertas, riesgoAlto }
  }, [data, enrichedTerceros])

  async function handleCreate(formData: FormData) {
    setSaving(true)
    setCreateError(null)
    try {
      const payload = {
        razonSocial: formData.get('razonSocial') as string,
        ruc: formData.get('ruc') as string,
        actividadPrincipal: (formData.get('actividadPrincipal') as string) || null,
        tipoServicio: (formData.get('tipoServicio') as string) || null,
        fechaInicio: formData.get('fechaInicio') as string,
        fechaFin: (formData.get('fechaFin') as string) || null,
        trabajadoresAsignados: parseInt((formData.get('trabajadoresAsignados') as string) || '0'),
        isActividadPrincipal: formData.get('isActividadPrincipal') === 'true',
      }

      const res = await fetch('/api/terceros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear tercero')
      }

      setShowModal(false)
      setCreateError(null)
      setLoading(true)
      await fetchData()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Error al crear el tercero. Intente nuevamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-900/20 border-red-800 p-6 text-red-400">
        {error || 'No se pudieron cargar los datos'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Tercerización e Intermediación
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Gestión y monitoreo continuo de empresas de tercerización e intermediación laboral
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Nuevo Tercero
        </button>
      </div>

      {/* Critical Alerts Banner */}
      {(data.stats.flaggedMainActivity > 0 || alertasVencimiento.some((a) => (a.diasVencimiento ?? 0) < 0)) && (
        <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-900/20 p-4">
          <ShieldAlert className="h-6 w-6 text-red-400 shrink-0 mt-0.5" />
          <div>
            {data.stats.flaggedMainActivity > 0 && (
              <p className="font-semibold text-red-300">
                ALERTA CRITICA: {data.stats.flaggedMainActivity} tercero(s) realizando actividad
                principal de la empresa
              </p>
            )}
            {alertasVencimiento.some((a) => (a.diasVencimiento ?? 0) < 0) && (
              <p className="font-semibold text-red-300 mt-1">
                {alertasVencimiento.filter((a) => (a.diasVencimiento ?? 0) < 0).length} contrato(s)
                vencido(s) requieren accion inmediata
              </p>
            )}
            <p className="text-sm text-red-400 mt-1">
              Segun Art. 2 Ley 29245 y Art. 1 D.Leg. 1038, la desnaturalizacion del contrato genera
              responsabilidad solidaria. Revise y corrija estas situaciones inmediatamente.
            </p>
          </div>
        </div>
      )}

      {/* KPI Dashboard Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          label="Total Terceros"
          value={data.stats.total}
          subtitle={`${data.stats.active} activos`}
          icon={<Building2 className="h-5 w-5 text-emerald-600" />}
          bgIcon="bg-blue-900/30"
        />
        <KPICard
          label="Documentación Vigente"
          value={computedStats?.conDocsVigentes ?? 0}
          subtitle={`de ${data.stats.total} terceros`}
          icon={<FileCheck className="h-5 w-5 text-emerald-600" />}
          bgIcon="bg-emerald-900/30"
        />
        <KPICard
          label="Con Alertas"
          value={computedStats?.conAlertas ?? 0}
          subtitle="requieren atención"
          icon={<CircleAlert className="h-5 w-5 text-amber-400" />}
          bgIcon="bg-amber-900/30"
          highlight={!!computedStats && computedStats.conAlertas > 0}
          highlightColor="amber"
        />
        <KPICard
          label="Riesgo Alto"
          value={computedStats?.riesgoAlto ?? 0}
          subtitle="compliance < 60%"
          icon={<ShieldAlert className="h-5 w-5 text-red-400" />}
          bgIcon="bg-red-900/30"
          highlight={!!computedStats && computedStats.riesgoAlto > 0}
          highlightColor="red"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-900/30 flex items-center justify-center">
            <Users className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">
              {data.stats.totalTrabajadores}
            </p>
            <p className="text-xs text-gray-400">Trabajadores Asignados</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">
              {data.stats.expiredContracts}
            </p>
            <p className="text-xs text-gray-400">Contratos Vencidos</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">
              {data.stats.flaggedMainActivity}
            </p>
            <p className="text-xs text-gray-400">Act. Principal (Red Flag)</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/[0.08]">
        <button
          onClick={() => setActiveTab('lista')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'lista'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Registro de Terceros ({data.stats.total})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('alertas')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'alertas'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Alertas de Vencimiento
            {alertasVencimiento.length > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-900/40 text-[10px] font-bold text-red-400">
                {alertasVencimiento.length}
              </span>
            )}
          </div>
        </button>
      </div>

      {/* Tab: Lista de Terceros */}
      {activeTab === 'lista' && (
        <>
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por razón social, RUC o actividad..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-white/10 border-[color:var(--border-default)] rounded-xl text-sm bg-white text-white text-[color:var(--text-secondary)] focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value as typeof filterRisk)}
                className="border border-white/10 border-[color:var(--border-default)] rounded-xl px-3 py-2.5 text-sm bg-white text-white text-[color:var(--text-secondary)] focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="all">Todos los riesgos</option>
                <option value="alto">Riesgo Alto</option>
                <option value="medio">Riesgo Medio</option>
                <option value="bajo">Riesgo Bajo</option>
              </select>
            </div>
          </div>

          {/* Terceros List */}
          {filteredTerceros.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-white flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 mb-3 text-[color:var(--text-secondary)]" />
              <p className="text-lg font-medium text-gray-400">
                {searchTerm || filterRisk !== 'all'
                  ? 'No se encontraron terceros con los filtros aplicados'
                  : 'No hay terceros registrados'}
              </p>
              <p className="text-sm text-slate-500">
                {searchTerm || filterRisk !== 'all'
                  ? 'Intente con otros criterios de busqueda'
                  : 'Agregue empresas de tercerización o intermediación'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTerceros.map((tercero) => {
                const isExpanded = expandedTercero === tercero.id
                const risk = getRiskLevel(tercero.complianceScore)
                const scoreColor = getScoreColor(tercero.complianceScore)
                const detectedFlags = tercero.redFlags.filter((f) => f.detected)

                return (
                  <div
                    key={tercero.id}
                    className={`rounded-xl border transition-all ${
                      detectedFlags.length > 0
                        ? 'border-red-800/60'
                        : 'border-white/[0.08]'
                    } bg-white`}
                  >
                    {/* Card Header */}
                    <div
                      className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/50 transition-colors rounded-xl"
                      onClick={() => setExpandedTercero(isExpanded ? null : tercero.id)}
                    >
                      {/* Compliance Score Circle */}
                      <div className="shrink-0">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center ring-4 ${scoreColor.ring}`}
                          style={{
                            background: `conic-gradient(${
                              tercero.complianceScore >= 80
                                ? '#10b981'
                                : tercero.complianceScore >= 60
                                  ? '#f59e0b'
                                  : '#ef4444'
                            } ${tercero.complianceScore * 3.6}deg, #e5e7eb ${tercero.complianceScore * 3.6}deg)`,
                          }}
                        >
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                            <span className={`text-sm font-bold ${scoreColor.text}`}>
                              {tercero.complianceScore}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-white truncate">
                            {tercero.razonSocial}
                          </h3>
                          {tercero.tipoServicio && (
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                TIPO_SERVICIO_CONFIG[tercero.tipoServicio]?.color || ''
                              } ${TIPO_SERVICIO_CONFIG[tercero.tipoServicio]?.darkColor || ''}`}
                            >
                              {TIPO_SERVICIO_CONFIG[tercero.tipoServicio]?.label || tercero.tipoServicio}
                            </span>
                          )}
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${risk.color}`}>
                            Riesgo {risk.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span className="font-mono">RUC: {tercero.ruc}</span>
                          <span>{tercero.trabajadoresAsignados} trabajadores</span>
                          {tercero.actividadPrincipal && (
                            <span className="truncate">{tercero.actividadPrincipal}</span>
                          )}
                        </div>
                      </div>

                      {/* Right Side Indicators */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Doc Status Badge */}
                        <DocStatusBadge status={tercero.docs.status} />

                        {/* Red Flags Count */}
                        {detectedFlags.length > 0 && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-red-900/30 px-2 py-1 text-xs font-bold text-red-400">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {detectedFlags.length}
                          </span>
                        )}

                        {/* Contract Status */}
                        {tercero.isContractExpired && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-900/30 px-2 py-1 text-xs font-bold text-amber-400">
                            <Clock className="h-3.5 w-3.5" />
                            Vencido
                          </span>
                        )}

                        {/* Active/Inactive */}
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            tercero.isActive
                              ? 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-600'
                              : 'bg-[color:var(--neutral-100)] text-gray-500 bg-[color:var(--neutral-100)] text-gray-400'
                          }`}
                        >
                          {tercero.isActive ? 'Activo' : 'Inactivo'}
                        </span>

                        {/* Expand Toggle */}
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-white/[0.08] px-5 py-5 space-y-5">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                          {/* Column 1: Documentación Requerida */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              Documentación Requerida
                            </h4>
                            <div className="space-y-2">
                              {DOCUMENTOS_REQUERIDOS.map((doc) => {
                                const isCompleted = tercero.docs.completados.includes(doc.key)
                                return (
                                  <div
                                    key={doc.key}
                                    className={`flex items-start gap-2 rounded-lg p-2 text-xs ${
                                      isCompleted
                                        ? 'bg-emerald-900/10'
                                        : 'bg-red-900/10'
                                    }`}
                                  >
                                    <span className="mt-0.5 shrink-0">
                                      {isCompleted ? (
                                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                                      ) : (
                                        <X className="h-4 w-4 text-red-500" />
                                      )}
                                    </span>
                                    <div>
                                      <p
                                        className={`font-medium ${
                                          isCompleted
                                            ? 'text-emerald-600'
                                            : 'text-red-400'
                                        }`}
                                      >
                                        {doc.label}
                                      </p>
                                      <p className="text-slate-500 mt-0.5">
                                        {doc.descripcion}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                            {/* Doc Summary */}
                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-xs font-medium text-gray-400">
                                Estado:
                              </span>
                              <DocStatusBadge status={tercero.docs.status} showLabel />
                              <span className="text-xs text-slate-500">
                                ({tercero.docs.porcentaje}%)
                              </span>
                            </div>
                          </div>

                          {/* Column 2: Red Flags Detection */}
                          <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                              <ShieldAlert className="h-4 w-4 text-red-500" />
                              Red Flags (D.Leg. 1038 / Ley 29245)
                            </h4>
                            <div className="space-y-2">
                              {tercero.redFlags.map(({ flag, detected }) => {
                                const isManual = flag.requiresManualCheck && !detected
                                return (
                                  <div
                                    key={flag.key}
                                    className={`rounded-lg p-3 text-xs border ${
                                      detected
                                        ? 'border-red-800 bg-red-900/20'
                                        : isManual
                                          ? 'border-amber-800/60 bg-amber-900/10'
                                          : 'border-white/[0.06] border-white/[0.08] bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/30'
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      {detected ? (
                                        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                                      ) : isManual ? (
                                        <CircleAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                      )}
                                      <div>
                                        <p
                                          className={`font-medium ${
                                            detected
                                              ? 'text-red-400'
                                              : isManual
                                                ? 'text-amber-400'
                                                : 'text-slate-300'
                                          }`}
                                        >
                                          {flag.label}
                                        </p>
                                        {isManual && (
                                          <p className="text-amber-500 font-semibold mt-0.5">
                                            Requiere verificación manual
                                          </p>
                                        )}
                                        <p className="text-slate-500 mt-1">
                                          {flag.descripcion}
                                        </p>
                                        <p className="text-[10px] font-mono text-[color:var(--text-secondary)] mt-1">
                                          Base legal: {flag.baseLegal}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>

                          {/* Column 3: Compliance Score + Contract Info */}
                          <div className="space-y-4">
                            {/* Compliance Score Panel */}
                            <div className="rounded-xl border border-white/[0.08] p-4 text-center">
                              <h4 className="text-sm font-semibold text-white mb-3 flex items-center justify-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Compliance Score
                              </h4>
                              <div className="relative inline-flex items-center justify-center">
                                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    className="stroke-gray-200 stroke-slate-700"
                                    strokeWidth="8"
                                  />
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="none"
                                    className={
                                      tercero.complianceScore >= 80
                                        ? 'stroke-emerald-500'
                                        : tercero.complianceScore >= 60
                                          ? 'stroke-amber-500'
                                          : 'stroke-red-500'
                                    }
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${tercero.complianceScore * 2.51} 251`}
                                  />
                                </svg>
                                <span
                                  className={`absolute text-2xl font-bold ${scoreColor.text}`}
                                >
                                  {tercero.complianceScore}%
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-2">
                                60% documentación + 40% sin red flags
                              </p>
                            </div>

                            {/* Contract Details */}
                            <div className="rounded-xl border border-white/[0.08] p-4 space-y-3">
                              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                Datos del Contrato
                              </h4>
                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Inicio:</span>
                                  <span className="font-medium text-white">
                                    {new Date(tercero.fechaInicio).toLocaleDateString('es-PE')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Fin:</span>
                                  <span
                                    className={`font-medium ${
                                      tercero.isContractExpired
                                        ? 'text-red-400'
                                        : 'text-white'
                                    }`}
                                  >
                                    {tercero.fechaFin
                                      ? new Date(tercero.fechaFin).toLocaleDateString('es-PE')
                                      : 'Indefinido'}
                                    {tercero.isContractExpired && ' (VENCIDO)'}
                                  </span>
                                </div>
                                {tercero.diasVencimiento !== null && tercero.diasVencimiento > 0 && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">
                                      Vence en:
                                    </span>
                                    <span
                                      className={`font-medium ${
                                        tercero.diasVencimiento <= 30
                                          ? 'text-amber-400'
                                          : 'text-white'
                                      }`}
                                    >
                                      {tercero.diasVencimiento} dias
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-gray-400">
                                    Trabajadores:
                                  </span>
                                  <span className="font-medium text-white">
                                    {tercero.trabajadoresAsignados}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: Alertas de Vencimiento */}
      {activeTab === 'alertas' && (
        <div className="rounded-xl border border-white/[0.08] bg-white">
          <div className="px-6 py-4 border-b border-white/[0.08]">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Alertas de Vencimiento de Contratos
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Contratos que vencen en los proximos 30 dias o ya vencidos
            </p>
          </div>

          {alertasVencimiento.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 mb-3 text-emerald-800" />
              <p className="text-lg font-medium text-gray-400">
                Sin alertas de vencimiento
              </p>
              <p className="text-sm text-slate-500">
                Todos los contratos vigentes estan al dia
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 divide-slate-700">
              {alertasVencimiento.map((tercero) => {
                const dias = tercero.diasVencimiento ?? 0
                const isExpired = dias < 0
                return (
                  <div
                    key={tercero.id}
                    className={`px-6 py-4 flex items-center justify-between ${
                      isExpired ? 'bg-red-900/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isExpired
                            ? 'bg-red-900/30'
                            : dias <= 7
                              ? 'bg-amber-900/30'
                              : 'bg-yellow-900/30'
                        }`}
                      >
                        {isExpired ? (
                          <X className="h-5 w-5 text-red-400" />
                        ) : (
                          <Clock className="h-5 w-5 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {tercero.razonSocial}
                        </p>
                        <p className="text-xs text-gray-400">
                          RUC: {tercero.ruc} | Vencimiento:{' '}
                          {tercero.fechaFin
                            ? new Date(tercero.fechaFin).toLocaleDateString('es-PE')
                            : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          isExpired
                            ? 'bg-red-100 text-red-700 bg-red-900/30 text-red-400'
                            : dias <= 7
                              ? 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400'
                              : 'bg-yellow-100 text-yellow-700 bg-yellow-900/30 text-yellow-400'
                        }`}
                      >
                        {isExpired ? `Vencido hace ${Math.abs(dias)} dias` : `Vence en ${dias} dias`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Legal Reference Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-800/50 bg-blue-900/10 p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-600">
                Marco Legal - Tercerización
              </p>
              <p className="text-sm text-emerald-600 mt-1">
                {data.baseLegal.tercerizacion}
              </p>
              <p className="text-xs text-blue-500 mt-1 font-mono">
                D.Leg. 1038 - Decreto Legislativo que precisa los alcances de la Ley 29245
              </p>
              <ul className="mt-2 space-y-1 text-xs text-blue-500">
                <li>
                  - Art. 2: La empresa tercerizadora debe asumir la dirección y control de los
                  servicios prestados
                </li>
                <li>
                  - Art. 2: Debe contar con recursos propios (equipos, personal, patrimonio) y ser
                  responsable por los resultados
                </li>
                <li>
                  - Art. 1: No se puede tercerizar la actividad principal de la empresa usuaria
                </li>
                <li>
                  - Art. 9: Responsabilidad solidaria si se desnaturaliza el contrato de
                  tercerización
                </li>
                <li>
                  - Art. 4: Pluralidad de clientes como indicador de autonomía empresarial
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-800/50 bg-purple-900/10 p-5">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-300">
                Marco Legal - Intermediación
              </p>
              <p className="text-sm text-purple-400 mt-1">
                {data.baseLegal.intermediacion}
              </p>
              <p className="text-xs text-purple-500 mt-1 font-mono">
                D.S. 003-2002-TR - Reglamento de la Ley de Intermediación Laboral
              </p>
              <ul className="mt-2 space-y-1 text-xs text-purple-500">
                <li>
                  - Art. 3 Ley 27626: Solo para actividades complementarias, temporales o
                  especializadas
                </li>
                <li>
                  - Art. 6: Limite del 20% del total de trabajadores de la empresa usuaria
                </li>
                <li>
                  - Art. 13: La empresa debe estar inscrita en el REITP del MTPE
                </li>
                <li>
                  - Art. 24: Carta fianza obligatoria como garantia de cumplimiento
                </li>
                <li>
                  - Art. 5 D.Leg. 1038: Personal temporal, no permanente, para actividades
                  intermediadas
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Restriction Notice */}
      <div className="rounded-xl border border-amber-800/50 bg-amber-900/10 p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-700">
              Restricciones Legales Vigentes
            </p>
            <p className="text-sm text-amber-400 mt-1">
              {data.baseLegal.restriction}
            </p>
            <p className="text-xs text-amber-500 mt-2">
              El incumplimiento puede generar la desnaturalización del contrato (Art. 5 Ley 29245),
              reconocimiento de relación laboral directa con la empresa usuaria, y responsabilidad
              solidaria por obligaciones laborales y de seguridad social.
            </p>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <CreateTerceroModal
          onClose={() => { setShowModal(false); setCreateError(null) }}
          onSubmit={handleCreate}
          saving={saving}
          errorMessage={createError}
        />
      )}
    </div>
  )
}

// =============================================
// SUBCOMPONENTS
// =============================================

function KPICard({
  label,
  value,
  subtitle,
  icon,
  bgIcon,
  highlight,
  highlightColor,
}: {
  label: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  bgIcon: string
  highlight?: boolean
  highlightColor?: 'red' | 'amber'
}) {
  const borderClass = highlight
    ? highlightColor === 'red'
      ? 'border-red-800/60 bg-red-900/10'
      : 'border-amber-800/60 bg-amber-900/10'
    : 'border-white/[0.08] bg-white'

  return (
    <div className={`rounded-xl border p-5 ${borderClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-400">{label}</p>
        <div className={`rounded-lg p-2 ${bgIcon}`}>{icon}</div>
      </div>
      <p
        className={`mt-2 text-2xl font-bold ${
          highlight
            ? highlightColor === 'red'
              ? 'text-red-400'
              : 'text-amber-400'
            : 'text-white'
        }`}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      )}
    </div>
  )
}

function DocStatusBadge({
  status,
  showLabel,
}: {
  status: 'completo' | 'parcial' | 'sin_documentos'
  showLabel?: boolean
}) {
  const config = {
    completo: {
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      label: 'Completo',
      color: 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-600',
    },
    parcial: {
      icon: <Eye className="h-3.5 w-3.5" />,
      label: 'Parcial',
      color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400',
    },
    sin_documentos: {
      icon: <X className="h-3.5 w-3.5" />,
      label: 'Sin documentos',
      color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
    },
  }

  const c = config[status]
  return (
    <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium ${c.color}`}>
      {c.icon}
      {showLabel && c.label}
    </span>
  )
}

function CreateTerceroModal({
  onClose,
  onSubmit,
  saving,
  errorMessage,
}: {
  onClose: () => void
  onSubmit: (data: FormData) => void
  saving: boolean
  errorMessage: string | null
}) {
  const inputCls =
    'mt-1 w-full rounded-lg border border-white/10 border-[color:var(--border-default)] px-3 py-2 text-sm bg-white bg-[color:var(--neutral-100)] text-white text-[color:var(--text-secondary)] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative mx-4 w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4 sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-white">Registrar Tercero</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="rounded-lg p-1 hover:bg-[color:var(--neutral-100)] transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(new FormData(e.currentTarget))
          }}
          className="space-y-4 p-6"
        >
          {/* Inline error banner — replaces native alert() */}
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{errorMessage}</p>
            </div>
          )}

          <div>
            <label htmlFor="tercero-razonSocial" className="block text-sm font-medium text-slate-300">
              Razón Social *
            </label>
            <input
              id="tercero-razonSocial"
              name="razonSocial"
              required
              className={inputCls}
              placeholder="Nombre de la empresa"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tercero-ruc" className="block text-sm font-medium text-slate-300">
                RUC *
              </label>
              <input
                id="tercero-ruc"
                name="ruc"
                required
                pattern="\d{11}"
                maxLength={11}
                className={inputCls}
                placeholder="20XXXXXXXXX"
              />
            </div>
            <div>
              <label htmlFor="tercero-tipoServicio" className="block text-sm font-medium text-slate-300">
                Tipo de Servicio
              </label>
              <select
                id="tercero-tipoServicio"
                name="tipoServicio"
                className={inputCls}
              >
                <option value="">Seleccionar...</option>
                <option value="TERCERIZACION">Tercerización</option>
                <option value="INTERMEDIACION">Intermediación</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="tercero-actividadPrincipal" className="block text-sm font-medium text-slate-300">
              Actividad Principal
            </label>
            <input
              id="tercero-actividadPrincipal"
              name="actividadPrincipal"
              className={inputCls}
              placeholder="Descripción del servicio"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tercero-fechaInicio" className="block text-sm font-medium text-slate-300">
                Fecha Inicio *
              </label>
              <input
                id="tercero-fechaInicio"
                name="fechaInicio"
                type="date"
                required
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="tercero-fechaFin" className="block text-sm font-medium text-slate-300">
                Fecha Fin
              </label>
              <input
                id="tercero-fechaFin"
                name="fechaFin"
                type="date"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="tercero-trabajadoresAsignados" className="block text-sm font-medium text-slate-300">
              Trabajadores Asignados
            </label>
            <input
              id="tercero-trabajadoresAsignados"
              name="trabajadoresAsignados"
              type="number"
              min={0}
              defaultValue={0}
              className={inputCls}
            />
          </div>

          <div className="rounded-lg border border-red-800 bg-red-900/10 p-3">
            <div className="flex items-center gap-2">
              <input
                id="isActividadPrincipal"
                name="isActividadPrincipal"
                type="checkbox"
                value="true"
                className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary"
              />
              <label
                htmlFor="isActividadPrincipal"
                className="text-sm text-slate-300"
              >
                Involucra actividad principal de la empresa
              </label>
            </div>
            <p className="text-xs text-red-400 mt-1 ml-6">
              RED FLAG: Prohibido por Art. 2 Ley 29245 y Art. 1 D.Leg. 1038. Genera responsabilidad
              solidaria.
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 border-[color:var(--border-default)] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
