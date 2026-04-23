'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
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
  DollarSign,
  Download,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { KpiCard as PremiumKpi, KpiGrid } from '@/components/comply360/kpi-card'
import { PremiumEmptyState } from '@/components/comply360/premium-empty-state'
import { toast } from 'sonner'

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

interface AlertStats {
  total: number
  critical: number
  high: number
  medium: number
  multaTotalEstimada: number
}

// ─── Config ──────────────────────────────────────────────────────────────────

const IMPACT_CONFIG: Record<ImpactLevel, {
  label: string
  color: string
  dot: string
  border: string
  bg: string
  icon: React.ComponentType<{ className?: string }>
}> = {
  CRITICAL: {
    label: 'Crítico',
    color: 'bg-red-900/30 text-red-400',
    dot: 'bg-red-500',
    border: 'border-l-red-500',
    bg: 'bg-red-900/10',
    icon: AlertTriangle,
  },
  HIGH: {
    label: 'Alto',
    color: 'bg-amber-900/30 text-amber-400',
    dot: 'bg-amber-500',
    border: 'border-l-amber-500',
    bg: 'bg-amber-900/10',
    icon: AlertCircle,
  },
  MEDIUM: {
    label: 'Medio',
    color: 'bg-yellow-900/30 text-yellow-400',
    dot: 'bg-yellow-400',
    border: 'border-l-yellow-400',
    bg: 'bg-yellow-900/10',
    icon: Info,
  },
  LOW: {
    label: 'Info',
    color: 'bg-blue-900/30 text-emerald-600',
    dot: 'bg-blue-400',
    border: 'border-l-blue-400',
    bg: 'bg-blue-900/10',
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
  LABORAL: { label: 'Laboral', color: 'bg-emerald-50 text-emerald-700' },
  SUNAFIL: { label: 'SUNAFIL', color: 'bg-red-900/30 text-red-400' },
  SEGURIDAD_SALUD: { label: 'SST', color: 'bg-orange-900/30 text-orange-400' },
  SST: { label: 'SST', color: 'bg-orange-900/30 text-orange-400' },
  TRIBUTARIO: { label: 'Tributario', color: 'bg-emerald-900/30 text-emerald-600' },
  PROCESAL: { label: 'Procesal', color: 'bg-purple-900/30 text-purple-400' },
  CONTRATOS: { label: 'Contratos', color: 'bg-indigo-900/30 text-indigo-400' },
  CTS: { label: 'CTS', color: 'bg-teal-900/30 text-teal-400' },
  VACACIONES: { label: 'Vacaciones', color: 'bg-cyan-900/30 text-cyan-400' },
  DOCUMENTOS: { label: 'Documentos', color: 'bg-violet-900/30 text-violet-400' },
  GENERAL: { label: 'General', color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]' },
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
      className={`bg-surface rounded-2xl border border-l-4 ${impact.border} p-5 transition-all hover:shadow-md ${
        isResolved ? 'border-[color:var(--border-default)] opacity-75' : 'border-[color:var(--border-default)] shadow-sm'
      } ${alert.impactLevel === 'CRITICAL' ? 'bg-gradient-to-r from-red-500/5 via-transparent to-transparent' : ''} ${alert.impactLevel === 'HIGH' ? 'bg-gradient-to-r from-amber-500/5 via-transparent to-transparent' : ''}`}
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
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${impact.color}`}>
              <span>{SEVERITY_EMOJI[alert.impactLevel]}</span>
              {impact.label}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${category.color}`}>
              {category.label}
            </span>
            {alert.normCode && (
              <span className="px-2 py-0.5 bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)] text-xs rounded-md font-mono">
                {alert.normCode}
              </span>
            )}
            {isResolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-900/30 text-emerald-600">
                <CheckCircle className="w-3 h-3" />
                Resuelto
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className={`text-sm font-bold mb-1 ${isResolved ? 'text-[color:var(--text-tertiary)] line-through' : 'text-white'}`}>
            {alert.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-[color:var(--text-tertiary)] leading-relaxed line-clamp-2 mb-3">
            {alert.summary}
          </p>

          {/* Affected workers */}
          {alert.affectedWorkers && alert.affectedWorkers.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-[color:var(--text-tertiary)] flex-shrink-0" />
              <span className="text-xs text-[color:var(--text-tertiary)]">
                Afecta a: <span className="font-medium text-[color:var(--text-secondary)]">{alert.affectedWorkers.join(', ')}</span>
              </span>
            </div>
          )}

          {/* Due date + countdown */}
          {countdown && (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${
              countdown.urgent
                ? 'bg-red-900/20 text-red-400'
                : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]'
            }`}>
              <Clock className="w-3 h-3" />
              {countdown.label}
            </div>
          )}

          {/* Escalation indicator */}
          {alert.escalationHours && !isResolved && (
            <div className="flex items-center gap-1.5 text-xs text-amber-400 mb-3">
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
                  className="px-2 py-0.5 bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] text-xs rounded-md font-medium"
                >
                  {type.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[color:var(--text-tertiary)] flex-shrink-0">
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
        <div className="mt-4 pt-4 border-t border-[color:var(--border-default)] flex items-center gap-2 flex-wrap">
          <button
            onClick={() => onResolve(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-900/20 hover:bg-emerald-900/30 rounded-lg transition-colors"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Resolver
          </button>
          <button
            onClick={() => onViewDetail(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {alert.source === 'worker' && alert.workerId ? 'Ver trabajador' : 'Ver detalle'}
          </button>

          {/* Remind dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowRemindOptions(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-blue-900/20 hover:bg-blue-900/30 rounded-lg transition-colors"
            >
              <Bell className="w-3.5 h-3.5" />
              Recordar
              <ChevronDown className="w-3 h-3" />
            </button>
            {showRemindOptions && (
              <div className="absolute bottom-full mb-1 left-0 bg-surface border border-[color:var(--border-default)] rounded-xl shadow-lg z-10 py-1 min-w-[140px]">
                {[1, 3, 7, 14].map(days => (
                  <button
                    key={days}
                    onClick={() => { onRemind(alert.id, days); setShowRemindOptions(false) }}
                    className="w-full text-left px-4 py-2 text-xs font-medium text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] transition-colors"
                  >
                    En {days} {days === 1 ? 'día' : 'días'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onDismiss(alert.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[color:var(--text-tertiary)] bg-[color:var(--neutral-100)] hover:bg-[color:var(--neutral-200)] rounded-lg transition-colors"
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
    <div className="bg-white backdrop-blur-xl rounded-2xl border border-[color:var(--border-default)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Timeline de alertas</h3>
          <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">Últimos 30 días · más oscuro = más alertas</p>
        </div>
        <TrendingUp className="w-4 h-4 text-[color:var(--text-tertiary)]" />
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
      <div className="flex justify-between mt-2 text-xs text-[color:var(--text-tertiary)]">
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
    CONTRATOS: 'bg-indigo-900/30 text-indigo-400',
    CTS: 'bg-teal-900/30 text-teal-400',
    SST: 'bg-orange-900/30 text-orange-400',
    VACACIONES: 'bg-cyan-900/30 text-cyan-400',
    DOCUMENTOS: 'bg-violet-900/30 text-violet-400',
    SUNAFIL: 'bg-red-900/30 text-red-400',
  }

  return (
    <div className="bg-white backdrop-blur-xl rounded-2xl border border-[color:var(--border-default)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[color:var(--border-default)]">
        <div>
          <h3 className="text-sm font-bold text-white">Reglas de alerta activas</h3>
          <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">Configura cuándo y cómo recibes notificaciones</p>
        </div>
        <button
          onClick={onAddRule}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-50 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nueva regla
        </button>
      </div>
      <div className="divide-y divide-slate-700">
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[color:var(--neutral-100)]/50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-white">{rule.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${categoryColors[rule.category] ?? 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]'}`}>
                  {rule.category}
                </span>
              </div>
              <p className="text-xs text-[color:var(--text-tertiary)]">{rule.description}</p>
            </div>
            <button
              onClick={() => onToggle(rule.id)}
              className={`flex-shrink-0 transition-colors ${rule.enabled ? 'text-emerald-700' : 'text-[color:var(--text-secondary)]'}`}
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
  const [stats, setStats] = useState<AlertStats>({ total: 0, critical: 0, high: 0, medium: 0, multaTotalEstimada: 0 })
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<ActiveSection>('alerts')
  const [regenerateMsg, setRegenerateMsg] = useState<string | null>(null)

  // Filters
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('TODAS')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('TODAS')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDIENTES')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Alert rules
  const [alertRules, setAlertRules] = useState<AlertRule[]>(DEFAULT_ALERT_RULES)

  // ── Unified data loader ──
  const loadAlerts = useCallback(async () => {
    const [normData, workerData, statsData] = await Promise.all([
      fetch('/api/alerts').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/workers/alerts?includeResolved=true').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/workers/alerts?stats=1').then(r => r.json()).catch(() => null),
    ])
    const normAlerts: NormAlert[] = (normData.data || []).map((a: NormAlert) => ({ ...a, source: 'norm' as const }))
    const workerAlerts: NormAlert[] = (workerData.data || []).map(workerAlertToNormAlert)
    setAlerts([...normAlerts, ...workerAlerts])
    if (statsData) setStats(statsData as AlertStats)
  }, [])

  useEffect(() => {
    setLoading(true)
    loadAlerts().catch(err => console.error('Error loading alerts:', err)).finally(() => setLoading(false))
  }, [loadAlerts])

  // ── KPI counts (from DB stats for accuracy) ──
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

  const handleRemind = (_id: string, days: number) => {
    // Feature planned: schedule reminder via cron + push notification.
    // Hasta que esté wireado al backend, damos feedback honesto en lugar de
    // un silent no-op que deja al usuario sin saber qué pasó.
    toast.info(`Recordatorio en ${days} día${days > 1 ? 's' : ''} — disponible pronto`, {
      description: 'Estamos integrando recordatorios con nuestro sistema de notificaciones.',
    })
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
    // Reglas custom están planeadas en el roadmap de alertas. Hasta entonces,
    // los usuarios pueden configurar las 12 reglas built-in desde esta misma
    // página (toggle). Damos feedback claro en lugar de un no-op silencioso.
    toast.info('Reglas personalizadas — disponible pronto', {
      description:
        'Mientras tanto, podés activar o desactivar las 12 reglas estándar desde la sección "Reglas automáticas" debajo.',
    })
  }

  const [regenerating, setRegenerating] = useState(false)
  const handleRegenerateAlerts = async () => {
    setRegenerating(true)
    setRegenerateMsg(null)
    try {
      const res = await fetch('/api/workers/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const result = await res.json()
      await loadAlerts()
      const count = result?.data?.alertsGenerated ?? 0
      setRegenerateMsg(`Barrido completado: ${count} alertas generadas`)
      setTimeout(() => setRegenerateMsg(null), 5000)
    } catch (err) {
      console.error('Error regenerating alerts:', err)
      setRegenerateMsg('Error al ejecutar el barrido')
      setTimeout(() => setRegenerateMsg(null), 4000)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header editorial (Emerald Light) ── */}
      <PageHeader
        eyebrow={pendientes > 0 ? `${pendientes} pendientes` : 'Centro de mando'}
        title={
          pendientes > 0
            ? 'Alertas <em>exigen acción</em> para evitar multa.'
            : 'Todas las alertas <em>bajo control</em>.'
        }
        subtitle="Alertas normativas y de trabajadores en un solo lugar: contratos, documentos, beneficios y compliance SUNAFIL."
        actions={
          <>
            <button
              onClick={() => setActiveSection(s => s === 'rules' ? 'alerts' : 'rules')}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeSection === 'rules'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-[color:var(--text-emerald-700)] border border-[color:var(--border-default)] hover:border-emerald-500/60'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Reglas
            </button>
            {pendientes > 0 && (
              <button
                onClick={handleResolveAll}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
                style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Resolver todas
              </button>
            )}
          </>
        }
      />

      {/* ── KPIs premium (5 columns) ── */}
      <KpiGrid>
        <PremiumKpi
          icon={Bell}
          label="Alertas activas"
          value={stats.total}
          footer="Incluye normativas + trabajadores"
          variant="accent"
        />
        <PremiumKpi
          icon={AlertTriangle}
          label="Críticas"
          value={stats.critical}
          variant={stats.critical > 0 ? 'crimson' : 'default'}
          footer="Multa inminente"
        />
        <PremiumKpi
          icon={AlertCircle}
          label="Altas"
          value={stats.high}
          variant={stats.high > 0 ? 'amber' : 'default'}
          footer="Actuar esta semana"
        />
        <PremiumKpi
          icon={Clock}
          label="Pendientes resolución"
          value={pendientes}
          footer="Sin marcar como resueltas"
        />
        <PremiumKpi
          icon={DollarSign}
          label="Multa potencial"
          value={stats.multaTotalEstimada}
          prefix="S/"
          formatValue={(n) => n.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
          variant={stats.multaTotalEstimada > 5000 ? 'crimson' : 'amber'}
          footer="Expuesto si hay inspección"
        />
      </KpiGrid>

      {/* ── Regenerate Alerts Banner ── */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-300 bg-emerald-600/[0.04] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <RefreshCw className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Ejecutar barrido de alertas</p>
            {regenerateMsg ? (
              <p className={`text-xs font-semibold mt-0.5 ${regenerateMsg.startsWith('Error') ? 'text-red-400' : 'text-emerald-600'}`}>
                {regenerateMsg}
              </p>
            ) : (
              <p className="text-xs text-[color:var(--text-tertiary)]">Analiza todos los trabajadores y genera alertas de contratos, documentos, vacaciones, CTS y mas</p>
            )}
          </div>
        </div>
        <button
          onClick={handleRegenerateAlerts}
          disabled={regenerating}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-600/90 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
          <div className="bg-white backdrop-blur-xl rounded-2xl border border-[color:var(--border-default)] p-4">
            {/* Top row: status + filter toggle */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* Status tabs */}
              <div className="flex items-center gap-1 bg-[color:var(--neutral-100)] rounded-xl p-1">
                {(['PENDIENTES', 'RESUELTAS', 'IGNORADAS'] as StatusFilter[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors capitalize ${
                      statusFilter === s
                        ? 'bg-surface text-white shadow-sm'
                        : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-emerald-700)]'
                    }`}
                  >
                    {s.charAt(0) + s.slice(1).toLowerCase()}
                    {s === 'PENDIENTES' && pendientes > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-red-900/30 text-red-400 rounded-full text-xs font-bold">
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
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : 'bg-transparent text-[color:var(--text-tertiary)] border-[color:var(--border-default)] hover:bg-[color:var(--neutral-100)]'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filtros
                {(severityFilter !== 'TODAS' || categoryFilter !== 'TODAS' || dateFrom || dateTo) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                )}
              </button>
            </div>

            {/* Expanded filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-[color:var(--border-default)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Severity */}
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Severidad</label>
                  <select
                    value={severityFilter}
                    onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
                    className="w-full text-sm bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="CRITICAS">🔴 Críticas</option>
                    <option value="ALTAS">🟠 Altas</option>
                    <option value="MEDIAS">🟡 Medias</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Categoría</label>
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value as CategoryFilter)}
                    className="w-full text-sm bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                  <label className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="w-full text-sm bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Date to */}
                <div>
                  <label className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="w-full text-sm bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Clear filters */}
                {(severityFilter !== 'TODAS' || categoryFilter !== 'TODAS' || dateFrom || dateTo) && (
                  <div className="sm:col-span-2 lg:col-span-4 flex">
                    <button
                      onClick={() => { setSeverityFilter('TODAS'); setCategoryFilter('TODAS'); setDateFrom(''); setDateTo('') }}
                      className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--text-tertiary)] hover:text-[color:var(--text-emerald-700)] transition-colors"
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
            <p className="text-sm text-[color:var(--text-tertiary)]">
              <span className="font-semibold text-white">{filtered.length}</span> alertas
              {statusFilter === 'PENDIENTES' && stats.critical > 0 && (
                <span className="ml-2 text-red-400 font-medium">· {stats.critical} críticas requieren atención inmediata</span>
              )}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => window.location.assign(`/api/export?type=alerts&format=xlsx`)}
                className="flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] transition-colors"
                title="Exportar alertas a Excel"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar
              </button>
              <button
                onClick={() => { setLoading(true); loadAlerts().finally(() => setLoading(false)) }}
                className="flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizar
              </button>
            </div>
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
              statusFilter === 'PENDIENTES' ? (
                <PremiumEmptyState
                  icon={CheckCircle}
                  variant="celebrate"
                  eyebrow="Todo al día"
                  title="Sin alertas pendientes — <em>excelente</em>."
                  subtitle="Tu empresa está cumpliendo con todos los plazos monitoreados. Las próximas alertas aparecerán automáticamente cuando detectemos un vencimiento."
                  hints={[
                    { icon: Bell, text: 'Monitoreo continuo 24/7' },
                    { icon: Zap, text: 'Detección automática SUNAFIL' },
                  ]}
                  cta={{ label: 'Ver calendario', href: '/dashboard/calendario' }}
                  secondaryCta={{
                    label: 'Ejecutar barrido manual',
                    onClick: handleRegenerateAlerts,
                  }}
                  compact
                />
              ) : (
                <PremiumEmptyState
                  icon={Filter}
                  variant="invite"
                  title="No hay resultados para estos <em>filtros</em>."
                  subtitle="Ajustá los filtros o ampliá la búsqueda para ver más alertas."
                  cta={{
                    label: 'Limpiar filtros',
                    onClick: () => {
                      setStatusFilter('PENDIENTES')
                      setSeverityFilter('TODAS')
                      setCategoryFilter('TODAS')
                    },
                  }}
                  compact
                />
              )
            )}
          </div>

          {/* Alert Timeline */}
          <AlertTimeline alerts={alerts} />
        </>
      )}

    </div>
  )
}
