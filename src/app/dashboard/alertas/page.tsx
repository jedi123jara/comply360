'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bell,
  AlertTriangle,
  Info,
  Clock,
  CheckCircle,
  Loader2,
  X,
  Filter,
  ChevronDown,
  TrendingUp,
  Settings,
  Plus,
  ToggleLeft,
  ToggleRight,
  CalendarDays,
  Users,
  Zap,
  BellOff,
  RefreshCw,
  AlertCircle,
  FileText,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

type ImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type StatusFilter = 'PENDIENTES' | 'RESUELTAS' | 'IGNORADAS'
type SeverityFilter = 'TODAS' | 'CRITICAS' | 'ALTAS' | 'MEDIAS'
type CategoryFilter = 'TODAS' | 'CONTRATOS' | 'CTS' | 'SST' | 'VACACIONES' | 'DOCUMENTOS' | 'LABORAL' | 'SUNAFIL' | 'TRIBUTARIO'
type ActiveSection = 'alerts' | 'rules'

interface NormAlert {
  id: string
  title: string
  summary: string
  impactLevel: ImpactLevel
  publishedAt: string
  normCode: string
  normCategory: string
  affectedContractTypes: string[]
  isRead: boolean
  isDismissed: boolean
  orgStatus: string
  // Extended fields for enhanced display
  affectedWorkers?: string[]
  dueDate?: string
  category?: string
  escalationHours?: number
  // Worker alert fields
  source?: 'norm' | 'worker'
  workerId?: string
  multaEstimada?: number
}

interface WorkerAlertRaw {
  id: string
  workerId: string
  workerName: string
  type: string
  severity: ImpactLevel
  title: string
  description: string | null
  dueDate: string | null
  multaEstimada: number | null
  resolvedAt: string | null
  createdAt: string
}

const WORKER_ALERT_CATEGORY: Record<string, string> = {
  CONTRATO_POR_VENCER: 'CONTRATOS',
  CONTRATO_VENCIDO: 'CONTRATOS',
  CTS_PENDIENTE: 'CTS',
  GRATIFICACION_PENDIENTE: 'LABORAL',
  VACACIONES_ACUMULADAS: 'VACACIONES',
  VACACIONES_DOBLE_PERIODO: 'VACACIONES',
  DOCUMENTO_FALTANTE: 'DOCUMENTOS',
  DOCUMENTO_VENCIDO: 'DOCUMENTOS',
  EXAMEN_MEDICO_VENCIDO: 'SST',
  CAPACITACION_PENDIENTE: 'SST',
  AFP_EN_MORA: 'LABORAL',
  REGISTRO_INCOMPLETO: 'DOCUMENTOS',
  SEGURO_VIDA_LEY: 'LABORAL',
}

interface AlertRule {
  id: string
  label: string
  description: string
  category: string
  enabled: boolean
  triggerDays?: number
}

// ─── Config ──────────────────────────────────────────────────────────────────

const IMPACT_CONFIG: Record<ImpactLevel, {
  label: string
  color: string
  darkColor: string
  dot: string
  border: string
  bg: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  CRITICAL: {
    label: 'Crítico',
    color: 'bg-red-100 text-red-700',
    darkColor: 'bg-red-900/30 text-red-400',
    dot: 'bg-red-500',
    border: 'border-l-red-500',
    bg: 'bg-red-50 bg-red-900/10',
    icon: AlertTriangle,
  },
  HIGH: {
    label: 'Alto',
    color: 'bg-amber-100 text-amber-700',
    darkColor: 'bg-amber-900/30 text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
    bg: 'bg-amber-50 bg-amber-900/10',
    icon: AlertCircle,
  },
  MEDIUM: {
    label: 'Medio',
    color: 'bg-yellow-100 text-yellow-700',
    darkColor: 'bg-yellow-900/30 text-yellow-400',
    dot: 'bg-yellow-400',
    border: 'border-l-yellow-400',
    bg: 'bg-yellow-50 bg-yellow-900/10',
    icon: Info,
  },
  LOW: {
    label: 'Info',
    color: 'bg-blue-100 text-blue-700',
    darkColor: 'bg-blue-900/30 text-blue-400',
    dot: 'bg-blue-400',
    border: 'border-l-blue-400',
    bg: 'bg-blue-50 bg-blue-900/10',
    icon: Bell,
  },
}

const SEVERITY_EMOJI: Record<ImpactLevel, string> = {
  CRITICAL: '🔴',
  HIGH: '🟠',
  MEDIUM: '🟡',
  LOW: '🔵',
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  LABORAL: { label: 'Laboral', color: 'bg-primary/10 text-primary' },
  SUNAFIL: { label: 'SUNAFIL', color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' },
  SEGURIDAD_SALUD: { label: 'SST', color: 'bg-orange-100 text-orange-700 bg-orange-900/30 text-orange-400' },
  SST: { label: 'SST', color: 'bg-orange-100 text-orange-700 bg-orange-900/30 text-orange-400' },
  TRIBUTARIO: { label: 'Tributario', color: 'bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-400' },
  PROCESAL: { label: 'Procesal', color: 'bg-purple-100 text-purple-700 bg-purple-900/30 text-purple-400' },
  CONTRATOS: { label: 'Contratos', color: 'bg-indigo-100 text-indigo-700 bg-indigo-900/30 text-indigo-400' },
  CTS: { label: 'CTS', color: 'bg-teal-100 text-teal-700 bg-teal-900/30 text-teal-400' },
  VACACIONES: { label: 'Vacaciones', color: 'bg-cyan-100 text-cyan-700 bg-cyan-900/30 text-cyan-400' },
  DOCUMENTOS: { label: 'Documentos', color: 'bg-violet-100 text-violet-700 bg-violet-900/30 text-violet-400' },
  GENERAL: { label: 'General', color: 'bg-white/[0.04] text-gray-600 bg-white/[0.04] text-slate-300' },
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'r1',
    label: 'Contrato por vencer',
    description: 'Notificar cuando contrato vence en 30 días',
    category: 'CONTRATOS',
    enabled: true,
    triggerDays: 30,
  },
  {
    id: 'r2',
    label: 'CTS no depositada',
    description: 'Notificar cuando CTS no depositada 10 días después del plazo',
    category: 'CTS',
    enabled: true,
    triggerDays: 10,
  },
  {
    id: 'r3',
    label: 'Vacaciones vencidas',
    description: 'Notificar cuando trabajador cumple 1 año sin vacaciones',
    category: 'VACACIONES',
    enabled: true,
    triggerDays: 365,
  },
  {
    id: 'r4',
    label: 'Documento faltante',
    description: 'Notificar cuando falta un documento obligatorio en el legajo',
    category: 'DOCUMENTOS',
    enabled: false,
    triggerDays: 0,
  },
  {
    id: 'r5',
    label: 'Examen médico ocupacional',
    description: 'Notificar cuando el EMO del trabajador está próximo a vencer en 60 días',
    category: 'SST',
    enabled: true,
    triggerDays: 60,
  },
  {
    id: 'r6',
    label: 'Cambio normativo SUNAFIL',
    description: 'Notificar inmediatamente ante nuevas resoluciones o directivas de SUNAFIL',
    category: 'SUNAFIL',
    enabled: true,
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCountdown(dueDate: string): { label: string; urgent: boolean } {
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: `Vencido hace ${Math.abs(diffDays)} días`, urgent: true }
  if (diffDays === 0) return { label: 'Vence hoy', urgent: true }
  if (diffDays === 1) return { label: 'Vence mañana', urgent: true }
  if (diffDays <= 7) return { label: `Vence en ${diffDays} días`, urgent: true }
  return { label: `Vence en ${diffDays} días`, urgent: false }
}

function workerAlertToNormAlert(wa: WorkerAlertRaw): NormAlert {
  return {
    id: wa.id,
    title: wa.title,
    summary: wa.description || wa.title,
    impactLevel: wa.severity,
    publishedAt: wa.createdAt,
    normCode: wa.type.replace(/_/g, ' '),
    normCategory: WORKER_ALERT_CATEGORY[wa.type] || 'LABORAL',
    affectedContractTypes: [],
    isRead: wa.resolvedAt !== null,
    isDismissed: false,
    orgStatus: wa.resolvedAt ? 'READ' : 'UNREAD',
    affectedWorkers: [wa.workerName],
    dueDate: wa.dueDate ?? undefined,
    escalationHours: wa.severity === 'CRITICAL' ? 24 : wa.severity === 'HIGH' ? 48 : undefined,
    source: 'worker',
    workerId: wa.workerId,
    multaEstimada: wa.multaEstimada ?? undefined,
  }
}

// Generate heatmap data for last 30 days
function generateHeatmapData(alerts: NormAlert[]): { date: string; count: number }[] {
  const days: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const count = alerts.filter(a => a.publishedAt.startsWith(dateStr)).length
    days.push({ date: dateStr, count })
  }
  return days
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  value,
  label,
  iconBg,
  iconColor,
  trend,
}: {
  icon: React.ComponentType<{ className?: string }>
  value: number
  label: string
  iconBg: string
  iconColor: string
  trend?: string
}) {
  return (
    <div className="bg-[#141824] rounded-xl border border-white/[0.08] p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs font-medium text-gray-500 text-gray-400 truncate">{label}</p>
      </div>
      {trend && (
        <span className="text-xs font-semibold text-emerald-600 text-emerald-400 flex items-center gap-0.5">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </span>
      )}
    </div>
  )
}

function AlertCard({
  alert,
  onResolve,
  onDismiss,
  onRemind,
  onViewDetail,
}: {
  alert: NormAlert
  onResolve: (id: string) => void
  onDismiss: (id: string) => void
  onRemind: (id: string, days: number) => void
  onViewDetail: (id: string) => void
}) {
  const [showRemindOptions, setShowRemindOptions] = useState(false)
  const impact = IMPACT_CONFIG[alert.impactLevel]
  const category = CATEGORY_CONFIG[alert.normCategory] || CATEGORY_CONFIG.GENERAL
  const ImpactIcon = impact.icon
  const isResolved = alert.isRead
  const countdown = alert.dueDate ? getCountdown(alert.dueDate) : null

  return (
    <div
      className={`bg-[#141824] rounded-2xl border border-l-4 ${impact.border} p-5 transition-all hover:shadow-md ${
        isResolved ? 'border-white/[0.08] opacity-75' : 'border-white/[0.08] shadow-sm'
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Severity icon */}
        <div className={`w-10 h-10 rounded-xl ${impact.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <ImpactIcon className={`w-5 h-5 ${impact.color.split(' ')[1]}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${impact.color} ${impact.darkColor}`}>
              <span>{SEVERITY_EMOJI[alert.impactLevel]}</span>
              {impact.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${category.color}`}>
              {category.label}
            </span>
            {alert.normCode && (
              <span className="px-2 py-0.5 bg-white/[0.02] bg-white/[0.04] text-gray-500 text-gray-400 text-xs rounded-md font-mono">
                {alert.normCode}
              </span>
            )}
            {isResolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 bg-emerald-900/30 text-emerald-400">
                <CheckCircle className="w-3 h-3" />
                Resuelto
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`text-sm font-bold mb-1 ${isResolved ? 'text-gray-500 text-gray-400 line-through' : 'text-white'}`}>
            {alert.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-500 text-gray-400 leading-relaxed line-clamp-2 mb-3">
            {alert.summary}
          </p>

          {/* Affected workers */}
          {alert.affectedWorkers && alert.affectedWorkers.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-gray-400 text-slate-500 flex-shrink-0" />
              <span className="text-xs text-gray-500 text-gray-400">
                Afecta a: <span className="font-medium text-gray-300 text-slate-300">{alert.affectedWorkers.join(', ')}</span>
              </span>
            </div>
          )}

          {/* Due date + countdown */}
          {countdown && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${
              countdown.urgent
                ? 'bg-red-50 text-red-700 bg-red-900/20 text-red-400'
                : 'bg-white/[0.02] text-gray-600 bg-white/[0.04] text-slate-300'
            }`}>
              <Clock className="w-3 h-3" />
              {countdown.label}
            </div>
          )}

          {/* Escalation indicator */}
          {alert.escalationHours && !isResolved && (
            <div className="flex items-center gap-1.5 text-xs text-amber-600 text-amber-400 mb-3">
              <Zap className="w-3.5 h-3.5" />
              <span className="font-medium">Escalar a gerencia si no se resuelve en {alert.escalationHours}h</span>
            </div>
          )}

          {/* Affected contract types + date */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 flex-wrap">
              {alert.affectedContractTypes.map(type => (
                <span
                  key={type}
                  className="px-2 py-0.5 bg-white/[0.04] text-slate-300 text-xs rounded-md font-medium"
                >
                  {type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 text-slate-500 flex-shrink-0">
              <CalendarDays className="w-3 h-3" />
              {new Date(alert.publishedAt).toLocaleDateString('es-PE', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {!isResolved && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] border-white/[0.08] flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onResolve(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Resolver
          </button>
          <button
            onClick={() => onViewDetail(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {alert.source === 'worker' && alert.workerId ? 'Ver trabajador' : 'Ver detalle'}
          </button>

          {/* Remind dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRemindOptions(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 text-blue-400 bg-blue-900/20 hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Recordar
              <ChevronDown className="w-3 h-3" />
            </button>
            {showRemindOptions && (
              <div className="absolute bottom-full mb-1 left-0 bg-[#141824] border border-white/[0.08] rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                {[1, 3, 7, 14].map(days => (
                  <button
                    key={days}
                    onClick={() => { onRemind(alert.id, days); setShowRemindOptions(false) }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-gray-300 text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                  >
                    En {days} {days === 1 ? 'día' : 'días'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onDismiss(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white/[0.02] hover:bg-white/[0.04] text-gray-400 bg-white/[0.04] hover:bg-slate-600 rounded-lg transition-colors"
          >
            <BellOff className="w-3.5 h-3.5" />
            Ignorar
          </button>
        </div>
      )}
    </div>
  )
}

function AlertTimeline({ alerts }: { alerts: NormAlert[] }) {
  const heatmap = useMemo(() => generateHeatmapData(alerts), [alerts])
  const maxCount = Math.max(...heatmap.map(d => d.count), 1)

  return (
    <div className="bg-[#141824] rounded-2xl border border-white/[0.08] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Timeline de alertas</h3>
          <p className="text-xs text-gray-500 text-gray-400 mt-0.5">Últimos 30 días · más oscuro = más alertas</p>
        </div>
        <TrendingUp className="w-4 h-4 text-gray-400 text-slate-500" />
      </div>
      <div className="flex items-end gap-1 h-12">
        {heatmap.map((day, i) => {
          const intensity = maxCount > 0 ? day.count / maxCount : 0
          const opacity = intensity === 0 ? 0.08 : 0.2 + intensity * 0.8
          return (
            <div
              key={i}
              title={`${day.date}: ${day.count} alertas`}
              className="flex-1 rounded-sm cursor-pointer transition-all hover:opacity-100"
              style={{
                height: `${Math.max(8, intensity * 100)}%`,
                backgroundColor: `rgba(99, 102, 241, ${opacity})`,
              }}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400 text-slate-500">
        <span>hace 30 días</span>
        <span>hoy</span>
      </div>
    </div>
  )
}

function AlertRulesSection({
  rules,
  onToggle,
  onAddRule,
}: {
  rules: AlertRule[]
  onToggle: (id: string) => void
  onAddRule: () => void
}) {
  const categoryColors: Record<string, string> = {
    CONTRATOS: 'bg-indigo-100 text-indigo-700 bg-indigo-900/30 text-indigo-400',
    CTS: 'bg-teal-100 text-teal-700 bg-teal-900/30 text-teal-400',
    SST: 'bg-orange-100 text-orange-700 bg-orange-900/30 text-orange-400',
    VACACIONES: 'bg-cyan-100 text-cyan-700 bg-cyan-900/30 text-cyan-400',
    DOCUMENTOS: 'bg-violet-100 text-violet-700 bg-violet-900/30 text-violet-400',
    SUNAFIL: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400',
  }

  return (
    <div className="bg-[#141824] rounded-2xl border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] border-white/[0.08]">
        <div>
          <h3 className="text-sm font-bold text-white">Reglas de alerta activas</h3>
          <p className="text-xs text-gray-500 text-gray-400 mt-0.5">Configura cuándo y cómo recibes notificaciones</p>
        </div>
        <button
          onClick={onAddRule}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva regla
        </button>
      </div>
      <div className="divide-y divide-gray-50 divide-slate-700">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] hover:bg-white/[0.04]/50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{rule.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[rule.category] ?? 'bg-white/[0.04] text-gray-600 bg-white/[0.04] text-slate-300'}`}>
                  {rule.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 text-gray-400">{rule.description}</p>
            </div>
            <button
              onClick={() => onToggle(rule.id)}
              className={`flex-shrink-0 transition-colors ${rule.enabled ? 'text-primary' : 'text-gray-300 text-slate-600'}`}
              title={rule.enabled ? 'Desactivar regla' : 'Activar regla'}
            >
              {rule.enabled
                ? <ToggleRight className="w-8 h-8" />
                : <ToggleLeft className="w-8 h-8" />
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertasPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<NormAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<ActiveSection>('alerts')

  // Filters
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('TODAS')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('TODAS')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDIENTES')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Alert rules
  const [alertRules, setAlertRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES)

  // Load both norm alerts and worker alerts
  useEffect(() => {
    Promise.all([
      fetch('/api/alerts').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/workers/alerts?includeResolved=true').then(r => r.json()).catch(() => ({ data: [] })),
    ]).then(([normData, workerData]) => {
      const normAlerts: NormAlert[] = (normData.data || []).map((a: NormAlert) => ({ ...a, source: 'norm' as const }))
      const workerAlerts: NormAlert[] = (workerData.data || []).map(workerAlertToNormAlert)
      setAlerts([...normAlerts, ...workerAlerts])
    }).catch(err => console.error('Error loading alerts:', err))
      .finally(() => setLoading(false))
  }, [])

  // ── KPI counts ──
  const total = alerts.length
  const criticas = alerts.filter(a => a.impactLevel === 'CRITICAL').length
  const altas = alerts.filter(a => a.impactLevel === 'HIGH').length
  const pendientes = alerts.filter(a => !a.isRead && !a.isDismissed).length

  // ── Filtered + sorted alerts ──
  const filtered = useMemo(() => {
    let list = [...alerts]

    // Status filter
    if (statusFilter === 'PENDIENTES') list = list.filter(a => !a.isRead && !a.isDismissed)
    else if (statusFilter === 'RESUELTAS') list = list.filter(a => a.isRead)
    else if (statusFilter === 'IGNORADAS') list = list.filter(a => a.isDismissed)

    // Severity filter
    if (severityFilter === 'CRITICAS') list = list.filter(a => a.impactLevel === 'CRITICAL')
    else if (severityFilter === 'ALTAS') list = list.filter(a => a.impactLevel === 'HIGH')
    else if (severityFilter === 'MEDIAS') list = list.filter(a => a.impactLevel === 'MEDIUM')

    // Category filter
    if (categoryFilter !== 'TODAS') {
      list = list.filter(a => a.normCategory === categoryFilter || a.normCategory === (categoryFilter === 'SST' ? 'SEGURIDAD_SALUD' : categoryFilter))
    }

    // Date range
    if (dateFrom) list = list.filter(a => a.publishedAt >= dateFrom)
    if (dateTo) list = list.filter(a => a.publishedAt <= dateTo + 'T23:59:59Z')

    // Sort: severity first, then by due date
    const severityOrder: Record<ImpactLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
    list.sort((a, b) => {
      const diff = severityOrder[a.impactLevel] - severityOrder[b.impactLevel]
      if (diff !== 0) return diff
      return new Date(a.dueDate ?? a.publishedAt).getTime() - new Date(b.dueDate ?? b.publishedAt).getTime()
    })

    return list
  }, [alerts, severityFilter, categoryFilter, statusFilter, dateFrom, dateTo])

  // ── Actions ──
  const updateAlertStatus = async (id: string, status: 'READ' | 'DISMISSED' | 'UNREAD') => {
    const alert = alerts.find(a => a.id === id)
    setAlerts(prev => prev.map(a => {
      if (a.id !== id) return a
      return {
        ...a,
        isRead: status === 'READ',
        isDismissed: status === 'DISMISSED',
        orgStatus: status,
      }
    }))
    try {
      if (alert?.source === 'worker') {
        // Resolve worker alert
        if (status === 'READ') {
          await fetch('/api/workers/alerts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alertId: id }),
          })
        }
      } else {
        await fetch('/api/alerts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alertId: id, status }),
        })
      }
    } catch {
      // No revert for simplicity
    }
  }

  const handleResolveAll = async () => {
    const pendingIds = alerts.filter(a => !a.isRead && !a.isDismissed).map(a => a.id)
    for (const id of pendingIds) {
      await updateAlertStatus(id, 'READ')
    }
  }

  const handleRemind = (id: string, days: number) => {
    // In production: would schedule a reminder via API
    console.log(`Reminder set for alert ${id} in ${days} days`)
  }

  const handleViewDetail = (id: string) => {
    const alert = alerts.find(a => a.id === id)
    updateAlertStatus(id, 'READ')
    // Navigate to worker profile if this is a worker-specific alert
    if (alert?.source === 'worker' && alert.workerId) {
      router.push(`/dashboard/trabajadores/${alert.workerId}`)
    }
  }

  const toggleRule = (id: string) => {
    setAlertRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r))
  }

  const handleAddRule = () => {
    // In production: open a modal
    console.log('Add custom rule')
  }

  const [regenerating, setRegenerating] = useState(false)
  const handleRegenerateAlerts = async () => {
    setRegenerating(true)
    try {
      await fetch('/api/workers/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      // Reload alerts
      const [normData, workerData] = await Promise.all([
        fetch('/api/alerts').then(r => r.json()).catch(() => ({ data: [] })),
        fetch('/api/workers/alerts?includeResolved=true').then(r => r.json()).catch(() => ({ data: [] })),
      ])
      const normAlerts: NormAlert[] = (normData.data || []).map((a: NormAlert) => ({ ...a, source: 'norm' as const }))
      const workerAlerts: NormAlert[] = (workerData.data || []).map(workerAlertToNormAlert)
      setAlerts([...normAlerts, ...workerAlerts])
    } catch (err) {
      console.error('Error regenerating alerts:', err)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Command Center Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">Centro de Alertas</h1>
            {pendientes > 0 && (
              <span className="flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                {pendientes}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 text-gray-400">
            Alertas normativas y de trabajadores · Contratos, documentos, beneficios y compliance
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setActiveSection(s => s === 'rules' ? 'alerts' : 'rules')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border transition-colors ${
              activeSection === 'rules'
                ? 'bg-primary text-white border-primary'
                : 'bg-[#141824] text-slate-300 border-white/[0.08] hover:bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            <Settings className="w-4 h-4" />
            Reglas
          </button>
          {pendientes > 0 && (
            <button
              onClick={handleResolveAll}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Resolver todas
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Bell}
          value={total}
          label="Total alertas"
          iconBg="bg-primary/10"
          iconColor="text-primary"
        />
        <KpiCard
          icon={AlertTriangle}
          value={criticas}
          label="Críticas"
          iconBg="bg-red-100 bg-red-900/30"
          iconColor="text-red-600 text-red-400"
        />
        <KpiCard
          icon={AlertCircle}
          value={altas}
          label="Altas"
          iconBg="bg-amber-100 bg-amber-900/30"
          iconColor="text-amber-600 text-amber-400"
        />
        <KpiCard
          icon={Clock}
          value={pendientes}
          label="Pendientes resolución"
          iconBg="bg-blue-100 bg-blue-900/30"
          iconColor="text-blue-600 text-blue-400"
        />
      </div>

      {/* ── Regenerate Alerts Banner ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <RefreshCw className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Ejecutar barrido de alertas</p>
            <p className="text-xs text-gray-400">Analiza todos los trabajadores y genera alertas de contratos, documentos, vacaciones, CTS y mas</p>
          </div>
        </div>
        <button
          onClick={handleRegenerateAlerts}
          disabled={regenerating}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
        >
          {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {regenerating ? 'Analizando trabajadores...' : 'Ejecutar Barrido'}
        </button>
      </div>

      {/* ── Alert Rules Section ── */}
      {activeSection === 'rules' && (
        <AlertRulesSection
          rules={alertRules}
          onToggle={toggleRule}
          onAddRule={handleAddRule}
        />
      )}

      {/* ── Alerts Section ── */}
      {activeSection === 'alerts' && (
        <>
          {/* Filter Bar */}
          <div className="bg-[#141824] rounded-2xl border border-white/[0.08] p-4">
            {/* Top row: status + filter toggle */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Status tabs */}
              <div className="flex items-center gap-1 bg-white/[0.02] bg-white/[0.04] rounded-xl p-1">
                {(['PENDIENTES', 'RESUELTAS', 'IGNORADAS'] as StatusFilter[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                      statusFilter === s
                        ? 'bg-[#141824] text-white shadow-sm'
                        : 'text-gray-500 text-gray-400 hover:text-gray-300 hover:text-slate-200'
                    }`}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                    {s === 'PENDIENTES' && pendientes > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 bg-red-900/30 text-red-600 text-red-400 rounded-full text-xs font-bold">
                        {pendientes}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  showFilters
                    ? 'bg-primary/5 text-primary border-primary/20'
                    : 'bg-transparent text-gray-500 text-gray-400 border-white/[0.08] border-slate-600 hover:bg-white/[0.02] hover:bg-white/[0.04]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtros
                {(severityFilter !== 'TODAS' || categoryFilter !== 'TODAS' || dateFrom || dateTo) && (
                  <span className="w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] border-white/[0.08] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Severity */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 text-gray-400 mb-1.5">Severidad</label>
                  <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
                    className="w-full text-sm bg-white/[0.02] bg-white/[0.04] border border-white/[0.08] border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="CRITICAS">🔴 Críticas</option>
                    <option value="ALTAS">🟠 Altas</option>
                    <option value="MEDIAS">🟡 Medias</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 text-gray-400 mb-1.5">Categoría</label>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
                    className="w-full text-sm bg-white/[0.02] bg-white/[0.04] border border-white/[0.08] border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="CONTRATOS">Contratos</option>
                    <option value="CTS">CTS</option>
                    <option value="SST">SST</option>
                    <option value="VACACIONES">Vacaciones</option>
                    <option value="DOCUMENTOS">Documentos</option>
                    <option value="LABORAL">Laboral</option>
                    <option value="SUNAFIL">SUNAFIL</option>
                    <option value="TRIBUTARIO">Tributario</option>
                  </select>
                </div>

                {/* Date from */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 text-gray-400 mb-1.5">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full text-sm bg-white/[0.02] bg-white/[0.04] border border-white/[0.08] border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Date to */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 text-gray-400 mb-1.5">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full text-sm bg-white/[0.02] bg-white/[0.04] border border-white/[0.08] border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Clear filters */}
                {(severityFilter !== 'TODAS' || categoryFilter !== 'TODAS' || dateFrom || dateTo) && (
                  <div className="sm:col-span-2 lg:col-span-4 flex">
                    <button
                      onClick={() => { setSeverityFilter('TODAS'); setCategoryFilter('TODAS'); setDateFrom(''); setDateTo('') }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 text-gray-400 hover:text-gray-300 hover:text-slate-200 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Limpiar filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results summary */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 text-gray-400">
              <span className="font-semibold text-white">{filtered.length}</span> alertas
              {statusFilter === 'PENDIENTES' && criticas > 0 && (
                <span className="ml-2 text-red-600 text-red-400 font-medium">· {criticas} críticas requieren atención inmediata</span>
              )}
            </p>
            <button
              onClick={() => {
                setLoading(true)
                Promise.all([
                  fetch('/api/alerts').then(r => r.json()).catch(() => ({ data: [] })),
                  fetch('/api/workers/alerts?includeResolved=true').then(r => r.json()).catch(() => ({ data: [] })),
                ]).then(([normData, workerData]) => {
                  const normAlerts: NormAlert[] = (normData.data || []).map((a: NormAlert) => ({ ...a, source: 'norm' as const }))
                  const workerAlerts: NormAlert[] = (workerData.data || []).map(workerAlertToNormAlert)
                  setAlerts([...normAlerts, ...workerAlerts])
                }).catch(console.error)
                  .finally(() => setLoading(false))
              }}
              className="flex items-center gap-1 text-xs text-gray-400 text-slate-500 hover:text-gray-600 hover:text-slate-300 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualizar
            </button>
          </div>

          {/* Priority queue */}
          <div className="space-y-3">
            {filtered.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onResolve={id => updateAlertStatus(id, 'READ')}
                onDismiss={id => updateAlertStatus(id, 'DISMISSED')}
                onRemind={handleRemind}
                onViewDetail={handleViewDetail}
              />
            ))}

            {filtered.length === 0 && (
              <div className="bg-[#141824] rounded-2xl border border-white/[0.08] p-14 text-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-gray-300 text-gray-200">
                  {statusFilter === 'PENDIENTES' ? 'Sin alertas pendientes' : 'No hay alertas en esta categoría'}
                </p>
                <p className="text-xs text-gray-400 text-slate-500 mt-1">
                  {statusFilter === 'PENDIENTES'
                    ? 'Todo está al día. Las nuevas alertas aparecerán aquí.'
                    : 'Ajusta los filtros para ver más resultados.'}
                </p>
              </div>
            )}
          </div>

          {/* Alert Timeline */}
          <AlertTimeline alerts={alerts} />
        </>
      )}

    </div>
  )
}
