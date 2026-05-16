'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Users, AlertTriangle, CheckCircle, Plus, X, Loader2, FileText, Scale, Shield, Gavel, Info, Calendar, Clock, Download, Bell, TrendingUp, ChevronRight, Copy, Building2, Handshake, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type SindicalRecordType =
  | 'SINDICATO'
  | 'CONVENIO_COLECTIVO'
  | 'NEGOCIACION'
  | 'PLIEGO_RECLAMOS'
  | 'FUERO_SINDICAL'
  | 'HUELGA'

interface SindicalRecord {
  id: string
  type: SindicalRecordType
  title: string
  description: string | null
  data: Record<string, unknown> | null
  startDate: string | null
  endDate: string | null
  status: string
  createdAt: string
}

interface Stats {
  total: number
  hasUnion: boolean
  activeConvenio: { title: string; endDate: string | null } | null
  activePliegos: number
  fueroWorkers: number
  activeHuelgas: number
}

interface SindicalData {
  stats: Stats
  records: SindicalRecord[]
  baseLegal: Record<string, string>
}

type NegotiationStage = 'PLIEGO' | 'TRATO_DIRECTO' | 'CONCILIACION' | 'ARBITRAJE_HUELGA'

// ─── Config ──────────────────────────────────────────────────────────────────

const EMPTY_SINDICAL_RECORDS: SindicalRecord[] = []

const TYPE_CONFIG: Record<SindicalRecordType, { label: string; icon: React.ElementType; color: string; darkColor: string; bg: string; darkBg: string }> = {
  SINDICATO: { label: 'Sindicato', icon: Users, color: 'text-blue-700', darkColor: 'text-emerald-600', bg: 'bg-blue-50', darkBg: 'bg-blue-900/20' },
  CONVENIO_COLECTIVO: { label: 'Convenio Colectivo', icon: FileText, color: 'text-green-700', darkColor: 'text-green-400', bg: 'bg-green-50', darkBg: 'bg-green-900/20' },
  NEGOCIACION: { label: 'Negociación Colectiva', icon: Scale, color: 'text-purple-700', darkColor: 'text-purple-400', bg: 'bg-purple-50', darkBg: 'bg-purple-900/20' },
  PLIEGO_RECLAMOS: { label: 'Pliego de Reclamos', icon: Gavel, color: 'text-orange-700', darkColor: 'text-orange-400', bg: 'bg-orange-50', darkBg: 'bg-orange-900/20' },
  FUERO_SINDICAL: { label: 'Fuero Sindical', icon: Shield, color: 'text-indigo-700', darkColor: 'text-indigo-400', bg: 'bg-indigo-50', darkBg: 'bg-indigo-900/20' },
  HUELGA: { label: 'Huelga', icon: AlertTriangle, color: 'text-red-700', darkColor: 'text-red-400', bg: 'bg-red-50', darkBg: 'bg-red-900/20' },
}

const TYPE_OPTIONS: SindicalRecordType[] = [
  'SINDICATO',
  'CONVENIO_COLECTIVO',
  'NEGOCIACION',
  'PLIEGO_RECLAMOS',
  'FUERO_SINDICAL',
  'HUELGA',
]

const NEGOTIATION_STAGES: { key: NegotiationStage; label: string; duration: string; icon: React.ElementType }[] = [
  { key: 'PLIEGO', label: 'Pliego de Reclamos Presentado', duration: 'Día 0', icon: FileText },
  { key: 'TRATO_DIRECTO', label: 'Trato Directo', duration: '20 días calendario', icon: Handshake },
  { key: 'CONCILIACION', label: 'Conciliación', duration: '30 días calendario', icon: Scale },
  { key: 'ARBITRAJE_HUELGA', label: 'Arbitraje / Huelga', duration: 'Variable', icon: Gavel },
]

const TEMPLATES = [
  {
    id: 'convenio',
    title: 'Modelo de Convenio Colectivo',
    description: 'Plantilla estándar de convenio colectivo de trabajo conforme al TUO LRCT',
    icon: FileText,
    content: `CONVENIO COLECTIVO DE TRABAJO\n\nEntre la empresa _________________ (en adelante "LA EMPRESA"), debidamente representada por _________________, identificado con DNI N° _________________, en su calidad de _________________;\n\nY el Sindicato _________________ (en adelante "EL SINDICATO"), debidamente representado por _________________, identificado con DNI N° _________________, en su calidad de Secretario General;\n\nCLÁUSULAS:\n\nPRIMERA.- ÁMBITO DE APLICACIÓN\nEl presente convenio es de aplicación a todos los trabajadores afiliados al sindicato y/o a la totalidad de trabajadores de la empresa, según corresponda.\n\nSEGUNDA.- VIGENCIA\nEl presente convenio tendrá una vigencia de _____ año(s), contados desde el _____ de _____ de 20___.\n\nTERCERA.- INCREMENTO REMUNERATIVO\nLA EMPRESA otorgará un incremento remunerativo de S/ _____ (_____ soles) mensuales.\n\nCUARTA.- BONIFICACIONES\n[Detallar bonificaciones acordadas]\n\nQUINTA.- CONDICIONES DE TRABAJO\n[Detallar mejoras en condiciones de trabajo]\n\nSEXTA.- CLÁUSULA DE PAZ SOCIAL\nAmbas partes se comprometen a mantener la paz social durante la vigencia del presente convenio.\n\nFirmado en _________________, a los _____ días del mes de _____ de 20___.`,
  },
  {
    id: 'respuesta-pliego',
    title: 'Modelo de Respuesta a Pliego',
    description: 'Respuesta del empleador al pliego de reclamos presentado por el sindicato',
    icon: Gavel,
    content: `RESPUESTA AL PLIEGO DE RECLAMOS\n\nSeñores del Sindicato _________________\nPresente.-\n\nDe nuestra consideración:\n\nEn atención al Pliego de Reclamos presentado con fecha _____ de _____ de 20___, la empresa procede a formular su respuesta conforme al Art. 57 del D.S. 010-2003-TR:\n\n1. SOBRE EL INCREMENTO REMUNERATIVO:\n[Contrapropuesta de la empresa]\n\n2. SOBRE LAS BONIFICACIONES:\n[Contrapropuesta de la empresa]\n\n3. SOBRE CONDICIONES DE TRABAJO:\n[Contrapropuesta de la empresa]\n\nLa empresa reitera su disposición al diálogo y negociación directa conforme a la legislación vigente.\n\nAtentamente,\n\n_________________\nRepresentante de la Empresa`,
  },
  {
    id: 'acta-negociacion',
    title: 'Acta de Negociación',
    description: 'Acta de reunión de negociación colectiva entre empresa y sindicato',
    icon: Scale,
    content: `ACTA DE NEGOCIACIÓN COLECTIVA\n\nEn la ciudad de _________________, siendo las _____ horas del día _____ de _____ de 20___, se reunieron:\n\nPOR LA EMPRESA:\n- _________________ (cargo)\n- _________________ (cargo)\n\nPOR EL SINDICATO:\n- _________________ (Secretario General)\n- _________________ (Secretario de Defensa)\n\nAGENDA:\n1. _________________\n2. _________________\n3. _________________\n\nDESARROLLO:\n[Describir los puntos tratados y posiciones de cada parte]\n\nACUERDOS:\n1. _________________\n2. _________________\n\nPUNTOS PENDIENTES:\n1. _________________\n\nPRÓXIMA REUNIÓN: _____ de _____ de 20___, a las _____ horas.\n\nNo habiendo más que tratar, se cierra la sesión siendo las _____ horas.\n\n_________________          _________________\nPor la Empresa              Por el Sindicato`,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (24 * 60 * 60 * 1000))
}

function isExpiringSoon(endDate: string | null, days = 30): boolean {
  const d = daysUntil(endDate)
  return d !== null && d > 0 && d <= days
}

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false
  return new Date(endDate) < new Date()
}

function getExpiryBadge(endDate: string | null): { label: string; className: string } | null {
  const d = daysUntil(endDate)
  if (d === null) return null
  if (d < 0) return { label: 'Vencido', className: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' }
  if (d <= 30) return { label: `Vence en ${d} días`, className: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' }
  if (d <= 60) return { label: `Vence en ${d} días`, className: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400' }
  if (d <= 90) return { label: `Vence en ${d} días`, className: 'bg-yellow-100 text-yellow-700 bg-yellow-900/30 text-yellow-400' }
  return null
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, subtext, colorClass, bgClass }: {
  icon: React.ElementType
  label: string
  value: string | number
  subtext?: string
  colorClass: string
  bgClass: string
}) {
  return (
    <div className={cn('rounded-xl border p-4 border-white/[0.08]', bgClass)}>
      <div className="flex items-center gap-2 mb-2">
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', bgClass)}>
          <Icon className={cn('h-5 w-5', colorClass)} />
        </div>
        <span className="text-sm font-medium text-gray-400">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold', colorClass)}>{value}</p>
      {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
    </div>
  )
}

function NegotiationTimeline({ activeStage }: { activeStage: NegotiationStage | null }) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-400" />
            Timeline de Negociación Colectiva
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Proceso conforme al D.S. 010-2003-TR (TUO LRCT)
          </p>
        </div>
      </div>
      <div className="relative">
        {/* Progress bar background */}
        <div className="absolute top-5 left-5 right-5 h-1 bg-[color:var(--neutral-200)] rounded-full" />
        {/* Active progress */}
        {activeStage && (
          <div
            className="absolute top-5 left-5 h-1 bg-purple-400 rounded-full transition-all duration-500"
            style={{
              width: `${(NEGOTIATION_STAGES.findIndex(s => s.key === activeStage) + 1) / NEGOTIATION_STAGES.length * 100}%`,
              maxWidth: 'calc(100% - 40px)',
            }}
          />
        )}
        <div className="relative grid grid-cols-4 gap-2">
          {NEGOTIATION_STAGES.map((stage, idx) => {
            const stageIdx = NEGOTIATION_STAGES.findIndex(s => s.key === activeStage)
            const isActive = activeStage === stage.key
            const isCompleted = activeStage ? idx < stageIdx : false
            const Icon = stage.icon
            return (
              <div key={stage.key} className="flex flex-col items-center text-center">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 z-10 transition-all',
                  isActive
                    ? 'border-purple-500 bg-purple-500 border-purple-400 bg-purple-400 text-white shadow-lg shadow-purple-200 shadow-purple-900/30'
                    : isCompleted
                      ? 'border-purple-400 bg-purple-100 border-purple-500 bg-purple-900/40 text-purple-400'
                      : 'border-white/10 bg-white border-[color:var(--border-default)] bg-[color:var(--neutral-100)] text-slate-500'
                )}>
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                <p className={cn(
                  'text-xs font-medium mt-2 leading-tight',
                  isActive ? 'text-purple-300' : 'text-gray-400'
                )}>
                  {stage.label}
                </p>
                <p className={cn(
                  'text-[10px] mt-0.5',
                  isActive ? 'text-purple-400 font-medium' : 'text-slate-500'
                )}>
                  {stage.duration}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AlertsPanel({ records }: { records: SindicalRecord[] }) {
  const alerts = useMemo(() => {
    const list: { id: string; type: 'danger' | 'warning' | 'info'; icon: React.ElementType; title: string; description: string }[] = []

    records.forEach(r => {
      // Convenios por vencer
      if (r.type === 'CONVENIO_COLECTIVO' && r.status === 'ACTIVE' && r.endDate) {
        const d = daysUntil(r.endDate)
        if (d !== null && d > 0 && d <= 90) {
          list.push({
            id: `conv-${r.id}`,
            type: d <= 30 ? 'danger' : 'warning',
            icon: Calendar,
            title: `Convenio "${r.title}" vence en ${d} días`,
            description: `Fecha de vencimiento: ${formatDate(r.endDate)}. ${d <= 30 ? 'Iniciar proceso de renovación de inmediato.' : 'Planificar la negociación del nuevo convenio.'}`,
          })
        }
      }

      // Pliegos pendientes
      if (r.type === 'PLIEGO_RECLAMOS' && r.status === 'ACTIVE') {
        list.push({
          id: `pliego-${r.id}`,
          type: 'warning',
          icon: Gavel,
          title: `Pliego de reclamos pendiente: "${r.title}"`,
          description: `Presentado el ${formatDate(r.startDate)}. El empleador debe responder dentro de los plazos del Art. 57 TUO LRCT.`,
        })
      }

      // Fuero sindical activo
      if (r.type === 'FUERO_SINDICAL' && r.status === 'ACTIVE') {
        list.push({
          id: `fuero-${r.id}`,
          type: 'info',
          icon: Shield,
          title: `Fuero sindical activo: "${r.title}"`,
          description: 'Trabajador protegido. No puede ser despedido ni trasladado sin autorización judicial (Art. 30-31 TUO LRCT).',
        })
      }
    })

    return list.sort((a, b) => {
      const order = { danger: 0, warning: 1, info: 2 }
      return order[a.type] - order[b.type]
    })
  }, [records])

  if (alerts.length === 0) return null

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white p-5">
      <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5 text-amber-400" />
        Alertas y Avisos
        <span className="ml-auto text-xs font-normal bg-amber-900/30 text-amber-400 px-2 py-0.5 rounded-full">
          {alerts.length}
        </span>
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {alerts.map(alert => {
          const Icon = alert.icon
          const colors = {
            danger: 'border-red-800 bg-red-900/20',
            warning: 'border-amber-800 bg-amber-900/20',
            info: 'border-blue-800 bg-blue-900/20',
          }
          const iconColors = {
            danger: 'text-red-400',
            warning: 'text-amber-400',
            info: 'text-emerald-600',
          }
          return (
            <div key={alert.id} className={cn('rounded-lg border p-3 flex items-start gap-3', colors[alert.type])}>
              <Icon className={cn('h-4 w-4 mt-0.5 shrink-0', iconColors[alert.type])} />
              <div>
                <p className={cn('text-sm font-medium', iconColors[alert.type])}>{alert.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{alert.description}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TemplatesPanel() {
  const [openTemplate, setOpenTemplate] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleDownload = (title: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white p-5">
      <h3 className="font-semibold text-white flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-green-400" />
        Plantillas y Modelos
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TEMPLATES.map(tpl => {
          const Icon = tpl.icon
          const isOpen = openTemplate === tpl.id
          return (
            <div key={tpl.id} className="flex flex-col">
              <button
                onClick={() => setOpenTemplate(isOpen ? null : tpl.id)}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 text-left transition-all hover:shadow-sm',
                  isOpen
                    ? 'border-green-700 bg-green-900/20'
                    : 'border-white/[0.08] border-[color:var(--border-default)] hover:border-green-200 hover:border-green-800'
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-900/30 shrink-0">
                  <Icon className="h-4 w-4 text-green-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{tpl.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{tpl.description}</p>
                </div>
              </button>
              {isOpen && (
                <div className="mt-2 rounded-lg border border-white/[0.08] border-[color:var(--border-default)] bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/50 p-3">
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-sans max-h-48 overflow-y-auto">
                    {tpl.content}
                  </pre>
                  <div className="flex gap-2 mt-3 justify-end">
                    <button
                      onClick={() => handleCopy(tpl.id, tpl.content)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 border-[color:var(--border-default)] text-slate-300 hover:bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-200)]"
                    >
                      {copied === tpl.id ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied === tpl.id ? 'Copiado' : 'Copiar'}
                    </button>
                    <button
                      onClick={() => handleDownload(tpl.title, tpl.content)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-600"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DerechosSindicalesCard() {
  const [expanded, setExpanded] = useState(false)
  const derechos = [
    {
      title: 'Libertad Sindical',
      base: 'Convenio OIT N° 87',
      description: 'Los trabajadores tienen derecho a constituir sindicatos sin autorización previa y a afiliarse libremente.',
      icon: Users,
    },
    {
      title: 'Negociación Colectiva',
      base: 'Convenio OIT N° 98',
      description: 'Derecho a negociar colectivamente las condiciones de trabajo. El empleador está obligado a negociar de buena fe.',
      icon: Handshake,
    },
    {
      title: 'Fuero Sindical',
      base: 'Art. 30-31 TUO LRCT',
      description: 'Protección contra el despido o traslado de dirigentes sindicales. Alcanza a los miembros de la junta directiva.',
      icon: Shield,
    },
    {
      title: 'Derecho de Huelga',
      base: 'Art. 72-86 TUO LRCT',
      description: 'Los trabajadores pueden ejercer el derecho de huelga conforme a ley, garantizando servicios esenciales mínimos.',
      icon: AlertTriangle,
    },
  ]

  return (
    <div className="rounded-xl border border-indigo-800 bg-indigo-900/20 p-5">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-semibold text-indigo-300 flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Derechos Sindicales — Marco Legal
        </h3>
        <ChevronRight className={cn('h-5 w-5 text-indigo-400 transition-transform', expanded && 'rotate-90')} />
      </button>
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
          {derechos.map(d => {
            const Icon = d.icon
            return (
              <div key={d.title} className="flex items-start gap-3 rounded-lg bg-white border border-indigo-800 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-900/40 shrink-0">
                  <Icon className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-300">{d.title}</p>
                  <p className="text-xs font-medium text-indigo-400">{d.base}</p>
                  <p className="text-xs text-gray-400 mt-1">{d.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function SindicalPage() {
  const [data, setData] = useState<SindicalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<SindicalRecordType | 'ALL'>('ALL')
  const [activeTab, setActiveTab] = useState<'registros' | 'timeline' | 'plantillas'>('registros')
  const [form, setForm] = useState({
    type: 'SINDICATO' as SindicalRecordType,
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    status: 'ACTIVE',
    // Enhanced sindicato fields
    tipoSindicato: 'empresa' as 'empresa' | 'rama' | 'gremio',
    numAfiliados: '',
    totalTrabajadores: '',
    cuotaSindical: '',
    tipoCuota: 'porcentaje' as 'porcentaje' | 'monto',
    dirigentes: '',
  })

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const url = filterType === 'ALL' ? '/api/sindical' : `/api/sindical?type=${filterType}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Error al cargar registros sindicales')
      const json = await res.json()
      setData(json.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [filterType])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      load()
    })
    return () => {
      cancelled = true
    }
  }, [load])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) return
    try {
      setSubmitting(true)
      const extraData: Record<string, unknown> = {}
      if (form.type === 'SINDICATO') {
        extraData.tipoSindicato = form.tipoSindicato
        extraData.numAfiliados = form.numAfiliados ? parseInt(form.numAfiliados) : null
        extraData.totalTrabajadores = form.totalTrabajadores ? parseInt(form.totalTrabajadores) : null
        extraData.cuotaSindical = form.cuotaSindical ? parseFloat(form.cuotaSindical) : null
        extraData.tipoCuota = form.tipoCuota
        extraData.dirigentes = form.dirigentes || null
      }
      const res = await fetch('/api/sindical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          description: form.description || null,
          startDate: form.startDate || null,
          endDate: form.endDate || null,
          status: form.status,
          data: Object.keys(extraData).length > 0 ? extraData : null,
        }),
      })
      if (!res.ok) throw new Error('Error al crear registro')
      setShowForm(false)
      setSubmitError(null)
      setForm({
        type: 'SINDICATO', title: '', description: '', startDate: '', endDate: '', status: 'ACTIVE',
        tipoSindicato: 'empresa', numAfiliados: '', totalTrabajadores: '', cuotaSindical: '', tipoCuota: 'porcentaje', dirigentes: '',
      })
      load()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Error al crear el registro. Intente nuevamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const records = data?.records ?? EMPTY_SINDICAL_RECORDS

  const filtered = records.filter(
    (r) => filterType === 'ALL' || r.type === filterType
  )

  // Determine active negotiation stage from records
  const activeNegotiationStage = useMemo((): NegotiationStage | null => {
    if (records.length === 0) return null
    const activeNeg = records.find(r => r.type === 'NEGOCIACION' && r.status === 'ACTIVE')
    if (activeNeg) {
      const stageData = activeNeg.data as Record<string, unknown> | null
      if (stageData?.stage) return stageData.stage as NegotiationStage
      return 'TRATO_DIRECTO'
    }
    const hasActivePliego = records.some(r => r.type === 'PLIEGO_RECLAMOS' && r.status === 'ACTIVE')
    if (hasActivePliego) return 'PLIEGO'
    const hasActiveHuelga = records.some(r => r.type === 'HUELGA' && r.status === 'ACTIVE')
    if (hasActiveHuelga) return 'ARBITRAJE_HUELGA'
    return null
  }, [records])

  // Count stats for KPI
  const kpiStats = useMemo(() => {
    if (records.length === 0) return { sindicatosActivos: 0, conveniosVigentes: 0, negociacionesEnCurso: 0, proximosVencimientos: 0 }
    const sindicatosActivos = records.filter(r => r.type === 'SINDICATO' && r.status === 'ACTIVE').length
    const conveniosVigentes = records.filter(r => r.type === 'CONVENIO_COLECTIVO' && r.status === 'ACTIVE' && !isExpired(r.endDate)).length
    const negociacionesEnCurso = records.filter(r => (r.type === 'NEGOCIACION' || r.type === 'PLIEGO_RECLAMOS') && r.status === 'ACTIVE').length
    const proximosVencimientos = records.filter(r => r.status === 'ACTIVE' && r.endDate && isExpiringSoon(r.endDate, 90)).length
    return { sindicatosActivos, conveniosVigentes, negociacionesEnCurso, proximosVencimientos }
  }, [records])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 text-red-400">
        <p className="font-medium">Error al cargar datos</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    )
  }

  const stats = data?.stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <span>Terceros</span>
            <span>/</span>
            <span className="text-primary font-medium">Relaciones Colectivas</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Relaciones Colectivas de Trabajo</h1>
          <p className="text-gray-400 mt-1">
            Gestión de sindicatos, convenios colectivos, pliegos de reclamos y fuero sindical
            (D.S. 010-2003-TR — TUO LRCT)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Nuevo Registro
        </button>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          icon={Building2}
          label="Sindicatos Activos"
          value={kpiStats.sindicatosActivos}
          subtext={kpiStats.sindicatosActivos > 0 ? 'registrados' : 'sin sindicatos'}
          colorClass="text-emerald-600"
          bgClass="bg-blue-900/20"
        />
        <KPICard
          icon={FileText}
          label="Convenios Vigentes"
          value={kpiStats.conveniosVigentes}
          subtext={stats?.activeConvenio ? `Último: ${stats.activeConvenio.title}` : 'sin convenios'}
          colorClass="text-green-400"
          bgClass="bg-green-900/20"
        />
        <KPICard
          icon={Scale}
          label="Negociaciones en Curso"
          value={kpiStats.negociacionesEnCurso}
          subtext={kpiStats.negociacionesEnCurso > 0 ? 'en proceso' : 'sin negociaciones'}
          colorClass="text-purple-400"
          bgClass="bg-purple-900/20"
        />
        <KPICard
          icon={Clock}
          label="Próximos Vencimientos"
          value={kpiStats.proximosVencimientos}
          subtext="en los próximos 90 días"
          colorClass={kpiStats.proximosVencimientos > 0 ? 'text-amber-400' : 'text-slate-500'}
          bgClass={kpiStats.proximosVencimientos > 0 ? 'bg-amber-900/20' : 'bg-[color:var(--neutral-50)] bg-white'}
        />
      </div>

      {/* Alert: Active Huelga */}
      {(stats?.activeHuelgas || 0) > 0 && (
        <div className="rounded-lg border border-red-800 bg-red-900/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Huelga en curso</p>
            <p className="text-sm text-red-400 mt-1">
              Hay {stats?.activeHuelgas} huelga(s) activa(s). Verifique el cumplimiento de los
              servicios mínimos y notifique a la Autoridad Administrativa de Trabajo.
            </p>
          </div>
        </div>
      )}

      {/* Alerts Panel */}
      <AlertsPanel records={data?.records || []} />

      {/* Tabs */}
      <div className="flex gap-1 bg-[color:var(--neutral-100)] bg-white rounded-lg p-1">
        {[
          { key: 'registros' as const, label: 'Registros', icon: FileText },
          { key: 'timeline' as const, label: 'Timeline Negociación', icon: TrendingUp },
          { key: 'plantillas' as const, label: 'Plantillas', icon: Download },
        ].map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1 justify-center',
                activeTab === tab.key
                  ? 'bg-white bg-[color:var(--neutral-100)] text-white shadow-sm'
                  : 'text-gray-400 hover:text-slate-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content: Registros */}
      {activeTab === 'registros' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterType('ALL')}
              className={cn(
                'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                filterType === 'ALL'
                  ? 'bg-primary text-white'
                  : 'bg-[color:var(--neutral-100)] text-slate-300 hover:bg-[color:var(--neutral-200)]'
              )}
            >
              Todos ({data?.stats.total || 0})
            </button>
            {TYPE_OPTIONS.map((t) => {
              const cfg = TYPE_CONFIG[t]
              const Icon = cfg.icon
              return (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                    filterType === t
                      ? 'bg-primary text-white'
                      : `${cfg.bg} ${cfg.darkBg} ${cfg.color} ${cfg.darkColor} hover:opacity-80`
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </button>
              )
            })}
          </div>

          {/* Records List */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 border-[color:var(--border-default)] p-12 text-center bg-white">
              <Scale className="mx-auto h-10 w-10 text-[color:var(--text-secondary)] mb-3" />
              <p className="text-gray-400 font-medium">Sin registros sindicales</p>
              <p className="text-sm text-slate-500 mt-1">
                Registre sindicatos, convenios, pliegos de reclamos y fuero sindical para su empresa.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
              >
                Crear primer registro
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((record) => {
                const cfg = TYPE_CONFIG[record.type]
                const Icon = cfg.icon
                const expiring = isExpiringSoon(record.endDate)
                const expired = isExpired(record.endDate)
                const expiryBadge = getExpiryBadge(record.endDate)
                const recordData = record.data as Record<string, unknown> | null
                const sindPercent = recordData?.numAfiliados && recordData?.totalTrabajadores
                  ? Math.round((Number(recordData.numAfiliados) / Number(recordData.totalTrabajadores)) * 100)
                  : null

                return (
                  <div
                    key={record.id}
                    className={cn(
                      'rounded-xl border p-4 transition-shadow hover:shadow-sm bg-white',
                      expired
                        ? 'border-red-800'
                        : expiring
                          ? 'border-amber-800'
                          : 'border-white/[0.08]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', cfg.bg, cfg.darkBg)}>
                        <Icon className={cn('h-5 w-5', cfg.color, cfg.darkColor)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg.bg, cfg.darkBg, cfg.color, cfg.darkColor)}>
                            {cfg.label}
                          </span>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            record.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-700 bg-green-900/30 text-green-400'
                              : 'bg-[color:var(--neutral-100)] text-gray-600 bg-[color:var(--neutral-100)] text-gray-400'
                          )}>
                            {record.status === 'ACTIVE' ? 'Activo' : 'Inactivo'}
                          </span>
                          {expiryBadge && (
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', expiryBadge.className)}>
                              <Clock className="h-3 w-3" /> {expiryBadge.label}
                            </span>
                          )}
                          {record.type === 'FUERO_SINDICAL' && record.status === 'ACTIVE' && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 bg-red-900/30 text-red-400 flex items-center gap-1">
                              <Shield className="h-3 w-3" /> No despedir
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-white mt-1">{record.title}</p>
                        {record.description && (
                          <p className="text-sm text-gray-400 mt-0.5 line-clamp-2">{record.description}</p>
                        )}

                        {/* Enhanced sindicato info */}
                        {record.type === 'SINDICATO' && recordData && (
                          <div className="mt-2 flex flex-wrap gap-3 text-xs">
                            {!!recordData.tipoSindicato && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <Building2 className="h-3 w-3" />
                                Tipo: <span className="font-medium text-slate-300 capitalize">{String(recordData.tipoSindicato)}</span>
                              </span>
                            )}
                            {sindPercent !== null && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <Users className="h-3 w-3" />
                                Sindicalización: <span className="font-medium text-slate-300">{String(recordData.numAfiliados)}/{String(recordData.totalTrabajadores)} ({sindPercent}%)</span>
                              </span>
                            )}
                            {!!recordData.cuotaSindical && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <CircleDot className="h-3 w-3" />
                                Cuota: <span className="font-medium text-slate-300">
                                  {recordData.tipoCuota === 'porcentaje' ? `${String(recordData.cuotaSindical)}%` : `S/ ${String(recordData.cuotaSindical)}`}
                                </span>
                              </span>
                            )}
                            {!!recordData.dirigentes && (
                              <span className="flex items-center gap-1 text-gray-400">
                                <Shield className="h-3 w-3" />
                                Dirigentes: <span className="font-medium text-slate-300">{String(recordData.dirigentes)}</span>
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          {record.startDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Inicio: {formatDate(record.startDate)}
                            </span>
                          )}
                          {record.endDate && (
                            <span className={cn('flex items-center gap-1', expired ? 'text-red-400' : expiring ? 'text-amber-400' : '')}>
                              <Calendar className="h-3 w-3" />
                              Fin: {formatDate(record.endDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Tab Content: Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <NegotiationTimeline activeStage={activeNegotiationStage} />
          <div className="rounded-xl border border-white/[0.08] bg-white p-5">
            <h3 className="font-semibold text-white mb-3">Etapas del Proceso de Negociación Colectiva</h3>
            <div className="space-y-3">
              {[
                {
                  stage: '1. Presentación del Pliego',
                  desc: 'El sindicato presenta el pliego de reclamos al empleador. Debe contener un proyecto de convenio colectivo.',
                  legal: 'Art. 51-56 TUO LRCT',
                  days: 'Dentro de los 60 días anteriores al vencimiento del convenio vigente',
                },
                {
                  stage: '2. Trato Directo',
                  desc: 'Negociación directa entre empleador y sindicato. Ambas partes deben negociar de buena fe.',
                  legal: 'Art. 57-58 TUO LRCT',
                  days: 'Plazo: 20 días calendario (prorrogable por acuerdo)',
                },
                {
                  stage: '3. Conciliación',
                  desc: 'Intervención de la Autoridad Administrativa de Trabajo como mediador. Se realizan audiencias de conciliación.',
                  legal: 'Art. 59-60 TUO LRCT',
                  days: 'Plazo: 30 días calendario',
                },
                {
                  stage: '4. Arbitraje o Huelga',
                  desc: 'Si no hay acuerdo, las partes pueden optar por arbitraje voluntario o los trabajadores pueden ejercer su derecho de huelga.',
                  legal: 'Art. 61-71 / Art. 72-86 TUO LRCT',
                  days: 'Variable según el procedimiento elegido',
                },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-3 items-start">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-900/30 text-purple-400 text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">{item.stage}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    <div className="flex gap-4 mt-1">
                      <span className="text-xs text-purple-400 font-medium">{item.legal}</span>
                      <span className="text-xs text-slate-500">{item.days}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Plantillas */}
      {activeTab === 'plantillas' && (
        <TemplatesPanel />
      )}

      {/* Derechos Sindicales */}
      <DerechosSindicalesCard />

      {/* Base Legal */}
      <div className="rounded-xl border border-blue-800 bg-blue-900/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Info className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-semibold text-emerald-600">Base Legal Aplicable</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {data?.baseLegal && Object.entries(data.baseLegal).map(([k, v]) => (
            <p key={k} className="text-xs text-emerald-600">• {v}</p>
          ))}
        </div>
      </div>

      {/* Enhanced Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.06] border-white/[0.08] p-6">
              <h2 className="text-lg font-bold text-white">Nuevo Registro Sindical</h2>
              <button
                onClick={() => { setShowForm(false); setSubmitError(null) }}
                aria-label="Cerrar modal"
                className="rounded-lg p-1.5 text-gray-400 hover:bg-[color:var(--neutral-100)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Inline error — replaces native alert() */}
              {submitError && (
                <div className="flex items-start gap-2 rounded-lg border border-red-800 bg-red-900/20 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{submitError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SindicalRecordType }))}
                  className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Título *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Sindicato de Trabajadores ACME S.A."
                  className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  required
                />
              </div>

              {/* Enhanced Sindicato Fields */}
              {form.type === 'SINDICATO' && (
                <div className="space-y-3 rounded-lg border border-blue-800 bg-blue-900/10 p-3">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Datos del Sindicato</p>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Tipo de Sindicato</label>
                    <select
                      value={form.tipoSindicato}
                      onChange={(e) => setForm(f => ({ ...f, tipoSindicato: e.target.value as 'empresa' | 'rama' | 'gremio' }))}
                      className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="empresa">De Empresa</option>
                      <option value="rama">De Rama de Actividad</option>
                      <option value="gremio">De Gremio</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">N° Afiliados</label>
                      <input
                        type="number"
                        value={form.numAfiliados}
                        onChange={(e) => setForm(f => ({ ...f, numAfiliados: e.target.value }))}
                        placeholder="Ej: 50"
                        className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Total Trabajadores</label>
                      <input
                        type="number"
                        value={form.totalTrabajadores}
                        onChange={(e) => setForm(f => ({ ...f, totalTrabajadores: e.target.value }))}
                        placeholder="Ej: 200"
                        className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">Cuota Sindical</label>
                      <input
                        type="number"
                        step="0.01"
                        value={form.cuotaSindical}
                        onChange={(e) => setForm(f => ({ ...f, cuotaSindical: e.target.value }))}
                        placeholder={form.tipoCuota === 'porcentaje' ? 'Ej: 2.5' : 'Ej: 50.00'}
                        className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Tipo</label>
                      <select
                        value={form.tipoCuota}
                        onChange={(e) => setForm(f => ({ ...f, tipoCuota: e.target.value as 'porcentaje' | 'monto' }))}
                        className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                        <option value="porcentaje">%</option>
                        <option value="monto">S/</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Dirigentes Sindicales (con fuero)</label>
                    <input
                      value={form.dirigentes}
                      onChange={(e) => setForm(f => ({ ...f, dirigentes: e.target.value }))}
                      placeholder="Ej: Juan Pérez (Sec. General), María López (Sec. Defensa)"
                      className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  placeholder="Detalles adicionales..."
                  className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 border-[color:var(--border-default)] bg-white bg-[color:var(--neutral-100)] px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="ACTIVE">Activo</option>
                  <option value="INACTIVE">Inactivo</option>
                  <option value="EXPIRED">Vencido</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-white/10 border-[color:var(--border-default)] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
