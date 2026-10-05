'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  AlertTriangle,
  OctagonAlert,
  TriangleAlert,
  CircleAlert,
  Info,
  Clock,
  CheckCircle,
  Loader2,
  X,
  Filter,
  TrendingUp,
  Settings,
  CalendarDays,
  Users,
  Zap,
  BellOff,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Download,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Lightbulb,
  Scale,
} from 'lucide-react'
import { PageHeader } from '@/components/comply360/editorial-title'
import { KpiCard as PremiumKpi, KpiGrid } from '@/components/comply360/kpi-card'
import { PremiumEmptyState } from '@/components/comply360/premium-empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { formatSoles, formatSolesParts } from '@/lib/format/peruvian'
import { cn } from '@/lib/utils'
import { useCopilot } from '@/providers/copilot-provider'
import {
  buildNormAssistantPrompt,
  cleanAlertDescription,
  getWorkerAlertConfig,
  getWorkerAlertLabel,
  resolveNormAlertAction,
  resolveWorkerAlertAction,
  type AlertAction,
} from '@/lib/alerts/alert-actions'

// ─── Types ───────────────────────────────────────────────────────────────────

type ImpactLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
type StatusFilter = 'PENDIENTES' | 'RESUELTAS'
type SeverityFilter = 'TODAS' | 'CRITICAS' | 'ALTAS' | 'MEDIAS' | 'BAJAS'
type CategoryFilter = 'TODAS' | 'CONTRATOS' | 'CTS' | 'SST' | 'VACACIONES' | 'DOCUMENTOS' | 'LABORAL' | 'SUNAFIL' | 'TRIBUTARIO'

/** Alerta unificada (normativa o de trabajador) tal como la pinta la página. */
interface UnifiedAlert {
  id: string
  source: 'norm' | 'worker'
  title: string
  summary: string
  impactLevel: ImpactLevel
  publishedAt: string
  /** Código de la norma (solo alertas normativas). */
  normCode: string
  normCategory: string
  /** Nombre del tipo en lenguaje simple (solo alertas de trabajador). */
  typeLabel?: string
  affectedContractTypes: string[]
  isRead: boolean
  isDismissed: boolean
  orgStatus: string
  affectedWorkers: string[]
  dueDate?: string
  workerId?: string
  multaEstimada?: number
  whyItMatters?: string
  /** Acción "Resolver ahora" precalculada desde el mapeo centralizado. */
  action: AlertAction | null
}

interface NormAlertRaw {
  id: string
  title: string
  summary: string
  impactLevel: ImpactLevel
  publishedAt: string
  normCode: string
  normCategory: string
  normSourceUrl?: string | null
  affectedContractTypes: string[]
  isRead: boolean
  isDismissed: boolean
  orgStatus: string
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

interface AlertStats {
  total: number
  critical: number
  high: number
  medium: number
  multaTotalEstimada: number
}

const WORKER_ALERT_CATEGORY: Record<string, string> = {
  CONTRATO_POR_VENCER: 'CONTRATOS',
  CONTRATO_VENCIDO: 'CONTRATOS',
  CAMBIO_REGIMEN_SIN_ADENDA: 'CONTRATOS',
  CTS_PENDIENTE: 'CTS',
  GRATIFICACION_PENDIENTE: 'LABORAL',
  VACACIONES_ACUMULADAS: 'VACACIONES',
  VACACIONES_DOBLE_PERIODO: 'VACACIONES',
  DOCUMENTO_FALTANTE: 'DOCUMENTOS',
  DOCUMENTO_VENCIDO: 'DOCUMENTOS',
  DOCUMENTO_SOSPECHOSO: 'DOCUMENTOS',
  EXAMEN_MEDICO_VENCIDO: 'SST',
  CAPACITACION_PENDIENTE: 'SST',
  AFP_EN_MORA: 'LABORAL',
  REGISTRO_INCOMPLETO: 'DOCUMENTOS',
  T_REGISTRO_NO_PRESENTADO: 'LABORAL',
  SCTR_VENCIDO: 'SST',
  LICENCIA_MEDICA_VENCIDA: 'DOCUMENTOS',
  TARDANZAS_CRONICAS: 'LABORAL',
  AUSENTISMO_CRONICO: 'LABORAL',
  // Fase 5 — SST Premium
  IPERC_VENCIDO: 'SST',
  EMO_PROXIMO: 'SST',
  EMO_VENCIDO: 'SST',
  SAT_PLAZO_PROXIMO: 'SST',
  SAT_PLAZO_VENCIDO: 'SST',
  COMITE_REUNION_PENDIENTE: 'SST',
  COMITE_MANDATO_VENCE: 'SST',
  SIMULACRO_PENDIENTE: 'SST',
}

// ─── Config ──────────────────────────────────────────────────────────────────

/**
 * Severidad = ícono + texto + color. Nunca solo color: quien no distingue
 * rojo de ámbar igual lee "Urgente" o "Alta" y ve un ícono distinto.
 */
const SEVERITY_CONFIG: Record<ImpactLevel, {
  label: string
  hint: string
  icon: React.ComponentType<{ className?: string }>
  badge: 'critical' | 'high' | 'medium' | 'low'
  border: string
  iconWrap: string
  iconColor: string
  glow: string
}> = {
  CRITICAL: {
    label: 'Urgente',
    hint: 'Atiéndela hoy',
    icon: OctagonAlert,
    badge: 'critical',
    border: 'border-l-crimson-500',
    iconWrap: 'bg-crimson-500/12',
    iconColor: 'text-crimson-300',
    glow: 'bg-gradient-to-r from-crimson-500/5 via-transparent to-transparent',
  },
  HIGH: {
    label: 'Alta',
    hint: 'Atiéndela esta semana',
    icon: TriangleAlert,
    badge: 'high',
    border: 'border-l-amber-500',
    iconWrap: 'bg-amber-500/12',
    iconColor: 'text-amber-300',
    glow: 'bg-gradient-to-r from-amber-500/5 via-transparent to-transparent',
  },
  MEDIUM: {
    label: 'Media',
    hint: 'Planifícala este mes',
    icon: CircleAlert,
    badge: 'medium',
    border: 'border-l-amber-300',
    iconWrap: 'bg-amber-500/10',
    iconColor: 'text-amber-300',
    glow: '',
  },
  LOW: {
    label: 'Baja',
    hint: 'Revísala cuando puedas',
    icon: Info,
    badge: 'low',
    border: 'border-l-cyan-400',
    iconWrap: 'bg-cyan-500/12',
    iconColor: 'text-cyan-400',
    glow: '',
  },
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  LABORAL: { label: 'Laboral', color: 'bg-emerald-50 text-emerald-700' },
  SUNAFIL: { label: 'SUNAFIL', color: 'bg-red-900/30 text-red-400' },
  SEGURIDAD_SALUD: { label: 'SST', color: 'bg-orange-900/30 text-orange-400' },
  SST: { label: 'SST', color: 'bg-orange-900/30 text-orange-400' },
  TRIBUTARIO: { label: 'Tributario', color: 'bg-emerald-900/30 text-emerald-600' },
  PROCESAL: { label: 'Procesal', color: 'bg-purple-900/30 text-purple-400' },
  CONTRATOS: { label: 'Contratos', color: 'bg-indigo-900/30 text-indigo-400' },
  CTS: { label: 'CTS', color: 'bg-sky-900/30 text-sky-400' },
  VACACIONES: { label: 'Vacaciones', color: 'bg-cyan-900/30 text-cyan-400' },
  DOCUMENTOS: { label: 'Documentos', color: 'bg-violet-900/30 text-violet-400' },
  GENERAL: { label: 'General', color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]' },
}

const SEVERITY_ORDER: Record<ImpactLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCountdown(dueDate: string): { label: string; urgent: boolean } {
  const due = new Date(dueDate)
  const now = new Date()
  const diffMs = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { label: `Venció hace ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'día' : 'días'}`, urgent: true }
  if (diffDays === 0) return { label: 'Vence hoy', urgent: true }
  if (diffDays === 1) return { label: 'Vence mañana', urgent: true }
  if (diffDays <= 7) return { label: `Vence en ${diffDays} días`, urgent: true }
  return { label: `Vence en ${diffDays} días`, urgent: false }
}

function formatMultaSoles(amount: number): string {
  return `S/ ${formatSolesParts(amount).amount}`
}

function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

function errorMessage(err: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.'): string {
  return err instanceof Error && err.message ? err.message : fallback
}

/** Traduce el código HTTP a un mensaje entendible (las APIs responden en inglés). */
function describeHttpError(status: number): string {
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  if (status === 403) return 'Tu plan o tu rol no te permite hacer este cambio.'
  if (status === 404) return 'Esta alerta ya no existe. Actualiza la lista.'
  return 'No pudimos guardar el cambio. Intenta de nuevo en unos segundos.'
}

type FetchResult<T> = { ok: true; data: T } | { ok: false; gated: boolean }

/** GET JSON sin tragarse los errores: distingue "no incluido en tu plan" de una falla real. */
async function fetchJson<T>(url: string): Promise<FetchResult<T>> {
  try {
    const res = await fetch(url)
    if (!res.ok) return { ok: false, gated: res.status === 401 || res.status === 403 }
    return { ok: true, data: (await res.json()) as T }
  } catch {
    return { ok: false, gated: false }
  }
}

function normToUnified(a: NormAlertRaw): UnifiedAlert {
  return {
    id: a.id,
    source: 'norm',
    title: a.title,
    summary: a.summary,
    impactLevel: a.impactLevel,
    publishedAt: a.publishedAt,
    normCode: a.normCode,
    normCategory: a.normCategory,
    affectedContractTypes: a.affectedContractTypes ?? [],
    isRead: a.isRead,
    isDismissed: a.isDismissed,
    orgStatus: a.orgStatus,
    affectedWorkers: [],
    action: resolveNormAlertAction({ title: a.title, normCode: a.normCode, sourceUrl: a.normSourceUrl }),
  }
}

function workerToUnified(wa: WorkerAlertRaw): UnifiedAlert {
  const ref = { type: wa.type, title: wa.title, workerId: wa.workerId }
  const config = getWorkerAlertConfig(ref)
  const summary = cleanAlertDescription(wa.description)
  return {
    id: wa.id,
    source: 'worker',
    title: wa.title,
    summary: summary || wa.title,
    impactLevel: wa.severity,
    publishedAt: wa.createdAt,
    normCode: '',
    normCategory: WORKER_ALERT_CATEGORY[wa.type] || 'LABORAL',
    typeLabel: getWorkerAlertLabel(ref),
    affectedContractTypes: [],
    isRead: wa.resolvedAt !== null,
    isDismissed: false,
    orgStatus: wa.resolvedAt ? 'READ' : 'UNREAD',
    // Las alertas de empresa (IPERC, comité…) se guardan con un trabajador de
    // referencia; mostrar "Afecta a: <persona>" ahí confundiría.
    affectedWorkers: config?.scope === 'org' ? [] : [wa.workerName],
    dueDate: wa.dueDate ?? undefined,
    workerId: wa.workerId,
    multaEstimada: wa.multaEstimada ?? undefined,
    whyItMatters: config?.whyItMatters,
    action: resolveWorkerAlertAction(ref),
  }
}

/** Persiste el cambio de estado. Lanza un Error con mensaje entendible si falla. */
async function persistStatus(alert: UnifiedAlert, status: 'READ' | 'DISMISSED' | 'UNREAD'): Promise<void> {
  const isWorker = alert.source === 'worker'
  if (isWorker && status !== 'READ') {
    throw new Error('Las alertas de trabajadores solo se pueden marcar como resueltas.')
  }
  let res: Response
  try {
    res = await fetch(isWorker ? '/api/workers/alerts' : '/api/alerts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isWorker ? { alertId: alert.id } : { alertId: alert.id, status }),
    })
  } catch {
    throw new Error('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.')
  }
  if (!res.ok) throw new Error(describeHttpError(res.status))
}

function decrementStats(prev: AlertStats, alert: UnifiedAlert): AlertStats {
  return {
    total: Math.max(0, prev.total - 1),
    critical: alert.impactLevel === 'CRITICAL' ? Math.max(0, prev.critical - 1) : prev.critical,
    high: alert.impactLevel === 'HIGH' ? Math.max(0, prev.high - 1) : prev.high,
    medium: alert.impactLevel === 'MEDIUM' ? Math.max(0, prev.medium - 1) : prev.medium,
    multaTotalEstimada: Math.max(0, prev.multaTotalEstimada - (alert.multaEstimada ?? 0)),
  }
}

// Generate heatmap data for last 30 days
function generateHeatmapData(alerts: UnifiedAlert[]): { date: string; count: number }[] {
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

function SeverityBadge({ level }: { level: ImpactLevel }) {
  const sev = SEVERITY_CONFIG[level]
  const Icon = sev.icon
  return (
    <Badge variant={sev.badge} size="pill" className="font-bold">
      <Icon className="w-3 h-3" aria-hidden />
      {sev.label}
    </Badge>
  )
}

function actionHint(action: AlertAction): string {
  if (action.kind === 'external') return 'Abre el texto oficial en otra pestaña'
  if (action.kind === 'assistant') return action.destination
  return `Te lleva a: ${action.destination}`
}

function ResolveNowButton({
  action,
  onAskAssistant,
}: {
  action: AlertAction
  onAskAssistant: (prompt: string) => void
}) {
  if (action.kind === 'link') {
    return (
      <Button asChild size="sm">
        <Link href={action.href}>
          Resolver ahora
          <ArrowRight className="w-4 h-4" aria-hidden />
        </Link>
      </Button>
    )
  }
  if (action.kind === 'external') {
    return (
      <Button asChild size="sm">
        <a href={action.href} target="_blank" rel="noopener noreferrer">
          Resolver ahora
          <ExternalLink className="w-4 h-4" aria-hidden />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
      </Button>
    )
  }
  return (
    <Button size="sm" onClick={() => onAskAssistant(action.prompt)} iconRight={<Sparkles className="w-4 h-4" />}>
      Resolver ahora
    </Button>
  )
}

function AlertCard({
  alert,
  onMarkResolved,
  onDismiss,
  onAskAssistant,
}: {
  alert: UnifiedAlert
  onMarkResolved: (alert: UnifiedAlert) => void
  onDismiss: (alert: UnifiedAlert) => void
  onAskAssistant: (prompt: string) => void
}) {
  const sev = SEVERITY_CONFIG[alert.impactLevel]
  const SevIcon = sev.icon
  const category = CATEGORY_CONFIG[alert.normCategory] || CATEGORY_CONFIG.GENERAL
  const isResolved = alert.isRead
  const countdown = alert.dueDate ? getCountdown(alert.dueDate) : null
  const multa = alert.multaEstimada ?? 0
  const titleId = `alerta-${alert.id}-titulo`
  const { action } = alert

  return (
    <article
      aria-labelledby={titleId}
      className={cn(
        'bg-surface rounded-2xl border border-l-4 border-[color:var(--border-default)] p-5 transition-all hover:shadow-md',
        sev.border,
        isResolved ? 'opacity-75' : 'shadow-sm',
        !isResolved && sev.glow,
      )}
    >
      <div className="flex items-start gap-4">
        {/* Severity icon */}
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', sev.iconWrap)}>
          <SevIcon className={cn('w-5 h-5', sev.iconColor)} aria-hidden />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <SeverityBadge level={alert.impactLevel} />
            {!isResolved && (
              <span className="text-xs font-medium text-[color:var(--text-tertiary)]">{sev.hint}</span>
            )}
            <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', category.color)}>
              {category.label}
            </span>
            {alert.typeLabel && (
              <span className="px-2 py-0.5 bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] text-xs rounded-md font-medium">
                {alert.typeLabel}
              </span>
            )}
            {alert.source === 'norm' && alert.normCode && (
              <span className="px-2 py-0.5 bg-[color:var(--neutral-100)] text-[color:var(--text-tertiary)] text-xs rounded-md font-mono">
                {alert.normCode}
              </span>
            )}
            {isResolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[color:var(--color-success-bg)] text-[color:var(--color-success-text)]">
                <CheckCircle className="w-3 h-3" aria-hidden />
                Resuelta
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            id={titleId}
            className={cn('text-sm font-bold mb-1', isResolved ? 'text-[color:var(--text-tertiary)] line-through' : 'text-white')}
          >
            {alert.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-[color:var(--text-tertiary)] leading-relaxed line-clamp-3 mb-3">
            {alert.summary}
          </p>

          {/* Multa estimada */}
          {multa > 0 && !isResolved && (
            <p className="inline-flex items-center gap-1.5 rounded-lg border border-[color:var(--border-crimson)] bg-[color:var(--color-danger-bg)] px-2.5 py-1 mb-3 text-xs font-semibold text-[color:var(--color-danger-text)]">
              <Scale className="w-3.5 h-3.5 flex-shrink-0" aria-hidden />
              Multa si no se corrige: hasta {formatMultaSoles(multa)}
            </p>
          )}

          {/* Por qué importa */}
          {alert.whyItMatters && !isResolved && (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-[color:var(--text-secondary)] mb-3">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-300" aria-hidden />
              <span>
                <span className="font-semibold">Por qué importa:</span> {alert.whyItMatters}
              </span>
            </p>
          )}

          {/* Affected workers */}
          {alert.affectedWorkers.length > 0 && (
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-[color:var(--text-tertiary)] flex-shrink-0" aria-hidden />
              <span className="text-xs text-[color:var(--text-tertiary)]">
                Afecta a: <span className="font-medium text-[color:var(--text-secondary)]">{alert.affectedWorkers.join(', ')}</span>
              </span>
            </div>
          )}

          {/* Due date + countdown */}
          {countdown && !isResolved && (
            <div className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3',
              countdown.urgent
                ? 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-text)]'
                : 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]',
            )}>
              <Clock className="w-3 h-3" aria-hidden />
              {countdown.label}
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
              <CalendarDays className="w-3 h-3" aria-hidden />
              <span>
                Detectada el{' '}
                {new Date(alert.publishedAt).toLocaleDateString('es-PE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isResolved && (
        <div className="mt-4 pt-4 border-t border-[color:var(--border-default)] flex flex-col gap-3 sm:flex-row sm:items-center">
          {action && (
            <div className="flex items-center gap-3 flex-wrap">
              <ResolveNowButton action={action} onAskAssistant={onAskAssistant} />
              <span className="text-xs text-[color:var(--text-tertiary)]">{actionHint(action)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            {alert.source === 'norm' && action?.kind === 'external' && (
              <Button
                variant="ghost"
                size="xs"
                icon={<Sparkles className="w-3.5 h-3.5" />}
                onClick={() => onAskAssistant(buildNormAssistantPrompt({ title: alert.title, normCode: alert.normCode }))}
              >
                Preguntar al asistente
              </Button>
            )}
            <Button
              variant="secondary"
              size="xs"
              icon={<CheckCircle className="w-3.5 h-3.5" />}
              onClick={() => onMarkResolved(alert)}
            >
              Ya lo resolví
            </Button>
            {/* Ocultar solo se guarda para alertas normativas: la API de
                alertas de trabajador no tiene ese estado. */}
            {alert.source === 'norm' && (
              <Button
                variant="ghost"
                size="xs"
                icon={<BellOff className="w-3.5 h-3.5" />}
                onClick={() => onDismiss(alert)}
              >
                Ignorar
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function AlertTimeline({ alerts }: { alerts: UnifiedAlert[] }) {
  const heatmap = useMemo(() => generateHeatmapData(alerts), [alerts])
  const maxCount = Math.max(...heatmap.map(d => d.count), 1)

  return (
    <div className="bg-white backdrop-blur-xl rounded-2xl border border-[color:var(--border-default)] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Alertas nuevas en los últimos 30 días</h3>
          <p className="text-xs text-[color:var(--text-tertiary)] mt-0.5">Cada barra es un día · más alta = más alertas detectadas</p>
        </div>
        <TrendingUp className="w-4 h-4 text-[color:var(--text-tertiary)]" aria-hidden />
      </div>
      <div className="flex items-end gap-1 h-12">
        {heatmap.map((day, i) => {
          const intensity = maxCount > 0 ? day.count / maxCount : 0
          const opacity = intensity === 0 ? 0.08 : 0.2 + intensity * 0.8
          return (
            <div
              key={i}
              title={`${day.date}: ${plural(day.count, 'alerta', 'alertas')}`}
              className="flex-1 rounded-sm transition-all hover:opacity-100"
              style={{
                height: `${Math.max(8, intensity * 100)}%`,
                backgroundColor: `color-mix(in srgb, var(--cyan-500) ${Math.round(opacity * 100)}%, transparent)`,
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlertasPage() {
  const copilot = useCopilot()
  const [alerts, setAlerts] = useState<UnifiedAlert[]>([])
  const [stats, setStats] = useState<AlertStats>({ total: 0, critical: 0, high: 0, medium: 0, multaTotalEstimada: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reviewMsg, setReviewMsg] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  // El objetivo se conserva al cerrar para que el diálogo no cambie de texto
  // durante la animación de salida; `confirmOpen` controla la visibilidad.
  const [confirmTarget, setConfirmTarget] = useState<UnifiedAlert | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Filters
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('TODAS')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('TODAS')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('PENDIENTES')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // ── Unified data loader ──
  const loadAlerts = useCallback(async () => {
    const [normRes, workerRes, statsRes] = await Promise.all([
      fetchJson<{ data?: NormAlertRaw[] }>('/api/alerts'),
      fetchJson<{ data?: WorkerAlertRaw[] }>('/api/workers/alerts?includeResolved=true'),
      fetchJson<AlertStats>('/api/workers/alerts?stats=1'),
    ])
    const normAlerts = normRes.ok ? (normRes.data.data ?? []).map(normToUnified) : []
    const workerAlerts = workerRes.ok ? (workerRes.data.data ?? []).map(workerToUnified) : []
    setAlerts([...normAlerts, ...workerAlerts])
    if (statsRes.ok) setStats(statsRes.data)
    // "Sin permiso / no incluido en tu plan" (401/403) no es un error: simplemente
    // no hay alertas de ese tipo. Cualquier otra falla sí se avisa.
    const failed = [normRes, workerRes, statsRes].some(r => !r.ok && !r.gated)
    setLoadError(failed ? 'No pudimos cargar todas las alertas. Lo que ves podría estar incompleto.' : null)
  }, [])

  useEffect(() => {
    let cancelled = false
    void Promise.resolve().then(() => {
      if (cancelled) return
      setLoading(true)
      loadAlerts().finally(() => setLoading(false))
    })
    return () => {
      cancelled = true
    }
  }, [loadAlerts])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadAlerts()
    } finally {
      setRefreshing(false)
    }
  }

  // ── KPI counts ──
  // `stats` viene agregado de la base (solo alertas de trabajadores, sin el
  // límite de 500 de la lista); le sumamos las normativas pendientes.
  const pendientes = alerts.filter(a => !a.isRead && !a.isDismissed).length
  const normPending = useMemo(
    () => alerts.filter(a => a.source === 'norm' && !a.isRead && !a.isDismissed),
    [alerts],
  )
  const kpiTotal = stats.total + normPending.length
  const kpiCritical = stats.critical + normPending.filter(a => a.impactLevel === 'CRITICAL').length
  const kpiHigh = stats.high + normPending.filter(a => a.impactLevel === 'HIGH').length

  // ── Filtered + sorted alerts ──
  const filtered = useMemo(() => {
    let list = [...alerts]

    // Status filter
    if (statusFilter === 'PENDIENTES') list = list.filter(a => !a.isRead && !a.isDismissed)
    else if (statusFilter === 'RESUELTAS') list = list.filter(a => a.isRead)

    // Severity filter
    if (severityFilter === 'CRITICAS') list = list.filter(a => a.impactLevel === 'CRITICAL')
    else if (severityFilter === 'ALTAS') list = list.filter(a => a.impactLevel === 'HIGH')
    else if (severityFilter === 'MEDIAS') list = list.filter(a => a.impactLevel === 'MEDIUM')
    else if (severityFilter === 'BAJAS') list = list.filter(a => a.impactLevel === 'LOW')

    // Category filter
    if (categoryFilter !== 'TODAS') {
      list = list.filter(a => a.normCategory === categoryFilter || a.normCategory === (categoryFilter === 'SST' ? 'SEGURIDAD_SALUD' : categoryFilter))
    }

    // Date range
    if (dateFrom) list = list.filter(a => a.publishedAt >= dateFrom)
    if (dateTo) list = list.filter(a => a.publishedAt <= dateTo + 'T23:59:59Z')

    // Sort: severity first, then by due date
    list.sort((a, b) => {
      const diff = SEVERITY_ORDER[a.impactLevel] - SEVERITY_ORDER[b.impactLevel]
      if (diff !== 0) return diff
      return new Date(a.dueDate ?? a.publishedAt).getTime() - new Date(b.dueDate ?? b.publishedAt).getTime()
    })

    return list
  }, [alerts, severityFilter, categoryFilter, statusFilter, dateFrom, dateTo])

  const hasActiveFilters = severityFilter !== 'TODAS' || categoryFilter !== 'TODAS' || dateFrom !== '' || dateTo !== ''

  // ── Actions ──

  /** Se ejecuta desde el ConfirmDialog; si lanza, el diálogo muestra el error. */
  const confirmResolved = async () => {
    const target = confirmTarget
    if (!target) return
    await persistStatus(target, 'READ')
    setAlerts(prev => prev.map(a => (a.id === target.id ? { ...a, isRead: true, orgStatus: 'READ' } : a)))
    if (target.source === 'worker') setStats(prev => decrementStats(prev, target))
    toast.success('Alerta marcada como resuelta', {
      description: target.source === 'worker'
        ? 'Si el problema sigue, la alerta volverá a aparecer en la próxima revisión.'
        : undefined,
    })
  }

  const openResolveConfirm = (alert: UnifiedAlert) => {
    setConfirmTarget(alert)
    setConfirmOpen(true)
  }

  const restoreDismissed = async (alert: UnifiedAlert) => {
    try {
      await persistStatus(alert, 'UNREAD')
      setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, isDismissed: false, isRead: false, orgStatus: 'UNREAD' } : a)))
    } catch (err) {
      toast.error('No pudimos restaurar la alerta', { description: errorMessage(err) })
    }
  }

  const handleDismiss = async (alert: UnifiedAlert) => {
    setAlerts(prev => prev.map(a => (a.id === alert.id ? { ...a, isDismissed: true, orgStatus: 'DISMISSED' } : a)))
    try {
      await persistStatus(alert, 'DISMISSED')
      toast('Alerta ocultada', {
        description: 'Ya no aparecerá en tu lista.',
        action: { label: 'Deshacer', onClick: () => void restoreDismissed(alert) },
      })
    } catch (err) {
      setAlerts(prev => prev.map(a => (a.id === alert.id ? alert : a)))
      toast.error('No pudimos ocultar la alerta', { description: errorMessage(err) })
    }
  }

  const askAssistant = (prompt: string) => copilot.open(prompt)

  const [reviewing, setReviewing] = useState(false)
  const handleReviewNow = async () => {
    setReviewing(true)
    setReviewMsg(null)
    try {
      const res = await fetch('/api/workers/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        throw new Error(res.status === 403
          ? 'Tu plan o tu rol no te permite revisar las alertas.'
          : 'No pudimos completar la revisión. Intenta de nuevo en unos segundos.')
      }
      const result = (await res.json()) as { data?: { alertsGenerated?: number; workersProcessed?: number } }
      await loadAlerts()
      const count = result.data?.alertsGenerated ?? 0
      const workers = result.data?.workersProcessed
      setReviewMsg({
        tone: 'ok',
        text: workers !== undefined
          ? `Listo: revisamos ${plural(workers, 'trabajador', 'trabajadores')} y encontramos ${plural(count, 'alerta por corregir', 'alertas por corregir')}.`
          : `Listo: encontramos ${plural(count, 'alerta por corregir', 'alertas por corregir')}.`,
      })
    } catch (err) {
      const text = err instanceof TypeError
        ? 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.'
        : errorMessage(err, 'No pudimos completar la revisión.')
      setReviewMsg({ tone: 'error', text })
      toast.error('No pudimos revisar las alertas', { description: text })
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Cargando alertas">
        <Loader2 className="w-8 h-8 text-emerald-700 animate-spin" aria-hidden />
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Header editorial ── */}
      <PageHeader
        eyebrow={pendientes > 0 ? `${pendientes} pendientes` : 'Centro de alertas'}
        title={
          pendientes > 0
            ? 'Alertas que <em>exigen acción</em> para evitar multas.'
            : 'Todas las alertas <em>bajo control</em>.'
        }
        subtitle="Alertas de normas y de tus trabajadores en un solo lugar. Cada una te lleva directo a la pantalla donde se corrige."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/configuracion/notificaciones">
              <Settings className="w-3.5 h-3.5" aria-hidden />
              Configurar avisos
            </Link>
          </Button>
        }
      />

      {/* ── KPIs ── */}
      <KpiGrid>
        <PremiumKpi
          icon={Bell}
          label="Alertas activas"
          value={kpiTotal}
          footer="De normas y de trabajadores"
          variant="accent"
        />
        <PremiumKpi
          icon={AlertTriangle}
          label="Urgentes"
          value={kpiCritical}
          variant={kpiCritical > 0 ? 'crimson' : 'default'}
          footer="Atiéndelas hoy"
        />
        <PremiumKpi
          icon={AlertCircle}
          label="Prioridad alta"
          value={kpiHigh}
          variant={kpiHigh > 0 ? 'amber' : 'default'}
          footer="Atiéndelas esta semana"
        />
        <PremiumKpi
          icon={Clock}
          label="Por resolver"
          value={pendientes}
          footer="Aún no marcadas como resueltas"
        />
        <PremiumKpi
          icon={DollarSign}
          label="Multa potencial"
          value={stats.multaTotalEstimada}
          formatValue={(n) => formatSoles(n)}
          variant={stats.multaTotalEstimada > 5000 ? 'crimson' : 'amber'}
          footer="Si llega una inspección hoy"
        />
      </KpiGrid>

      {/* ── Load error ── */}
      {loadError && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-[color:var(--border-crimson)] bg-[color:var(--color-danger-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 text-sm font-medium text-[color:var(--color-danger-text)]">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" aria-hidden />
            {loadError}
          </p>
          <Button variant="secondary" size="xs" loading={refreshing} onClick={handleRefresh} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            Reintentar
          </Button>
        </div>
      )}

      {/* ── Revisar ahora ── */}
      <div className="flex flex-col gap-4 rounded-2xl border border-emerald-300 bg-emerald-600/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <RefreshCw className="h-5 w-5 text-emerald-700" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Revisar a todos tus trabajadores</p>
            {reviewMsg ? (
              <p
                role="status"
                className={cn(
                  'text-xs font-semibold mt-0.5',
                  reviewMsg.tone === 'error' ? 'text-[color:var(--color-danger-text)]' : 'text-[color:var(--color-success-text)]',
                )}
              >
                {reviewMsg.text}
              </p>
            ) : (
              <p className="text-xs text-[color:var(--text-tertiary)]">
                Revisamos contratos, documentos, vacaciones, CTS y más, y actualizamos esta lista.
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleReviewNow}
          loading={reviewing}
          icon={reviewing ? undefined : <RefreshCw className="w-4 h-4" />}
          className="shrink-0"
        >
          {reviewing ? 'Revisando…' : 'Revisar ahora'}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white backdrop-blur-xl rounded-2xl border border-[color:var(--border-default)] p-4">
        {/* Top row: status + filter toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Status tabs */}
          <div className="flex items-center gap-1 bg-[color:var(--neutral-100)] rounded-xl p-1" role="group" aria-label="Estado de las alertas">
            {(['PENDIENTES', 'RESUELTAS'] as StatusFilter[]).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                aria-pressed={statusFilter === s}
                className={cn(
                  'px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                  statusFilter === s
                    ? 'bg-surface text-white shadow-sm'
                    : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-emerald-700)]',
                )}
              >
                {s === 'PENDIENTES' ? 'Pendientes' : 'Resueltas'}
                {s === 'PENDIENTES' && pendientes > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-text)] rounded-full text-xs font-bold">
                    {pendientes}
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            aria-expanded={showFilters}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors',
              showFilters
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-transparent text-[color:var(--text-tertiary)] border-[color:var(--border-default)] hover:bg-[color:var(--neutral-100)]',
            )}
          >
            <Filter className="w-3.5 h-3.5" aria-hidden />
            Filtros
            {hasActiveFilters && (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-600" aria-hidden />
                <span className="sr-only">(hay filtros activos)</span>
              </>
            )}
          </button>
        </div>

        {/* Expanded filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-[color:var(--border-default)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Severity */}
            <div>
              <label htmlFor="filtro-severidad" className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Prioridad</label>
              <select
                id="filtro-severidad"
                value={severityFilter}
                onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
                className="w-full text-sm bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="TODAS">Todas</option>
                <option value="CRITICAS">Urgentes</option>
                <option value="ALTAS">Altas</option>
                <option value="MEDIAS">Medias</option>
                <option value="BAJAS">Bajas</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="filtro-categoria" className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Categoría</label>
              <select
                id="filtro-categoria"
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
              <label htmlFor="filtro-desde" className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Desde</label>
              <input
                id="filtro-desde"
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="w-full text-sm bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Date to */}
            <div>
              <label htmlFor="filtro-hasta" className="block text-xs font-semibold text-[color:var(--text-tertiary)] mb-1.5">Hasta</label>
              <input
                id="filtro-hasta"
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="w-full text-sm bg-[color:var(--neutral-100)] border border-[color:var(--border-default)] rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Clear filters */}
            {hasActiveFilters && (
              <div className="sm:col-span-2 lg:col-span-4 flex">
                <button
                  type="button"
                  onClick={() => { setSeverityFilter('TODAS'); setCategoryFilter('TODAS'); setDateFrom(''); setDateTo('') }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[color:var(--text-tertiary)] hover:text-[color:var(--text-emerald-700)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results summary */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-[color:var(--text-tertiary)]">
          <span className="font-semibold text-white">{filtered.length}</span> {filtered.length === 1 ? 'alerta' : 'alertas'}
          {statusFilter === 'PENDIENTES' && kpiCritical > 0 && (
            <span className="ml-2 text-[color:var(--color-danger-text)] font-medium">
              · {kpiCritical} {kpiCritical === 1 ? 'urgente requiere' : 'urgentes requieren'} atención hoy
            </span>
          )}
        </p>
        <div className="flex items-center gap-3">
          <a
            href="/api/export?type=alerts&format=xlsx"
            className="flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] transition-colors"
            title="Descargar las alertas en Excel"
          >
            <Download className="w-3.5 h-3.5" aria-hidden />
            Descargar Excel
          </a>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-xs text-[color:var(--text-tertiary)] hover:text-[color:var(--text-secondary)] transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} aria-hidden />
            {refreshing ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Priority queue */}
      <div className="space-y-3">
        {filtered.map(alert => (
          <AlertCard
            key={`${alert.source}-${alert.id}`}
            alert={alert}
            onMarkResolved={openResolveConfirm}
            onDismiss={handleDismiss}
            onAskAssistant={askAssistant}
          />
        ))}

        {filtered.length === 0 && (
          statusFilter === 'PENDIENTES' && !hasActiveFilters ? (
            <PremiumEmptyState
              icon={CheckCircle}
              variant="celebrate"
              eyebrow="Todo al día"
              title="Sin alertas pendientes — <em>excelente</em>."
              subtitle="Tu empresa está cumpliendo con todos los plazos que vigilamos. Las próximas alertas aparecerán aquí apenas detectemos un vencimiento."
              hints={[
                { icon: Bell, text: 'Revisión automática todos los días' },
                { icon: Zap, text: 'Cada alerta te lleva a donde se corrige' },
              ]}
              cta={{ label: 'Ver calendario', href: '/dashboard/calendario' }}
              secondaryCta={{
                label: 'Revisar ahora',
                onClick: handleReviewNow,
              }}
              compact
            />
          ) : (
            <PremiumEmptyState
              icon={Filter}
              variant="invite"
              title={statusFilter === 'RESUELTAS' && !hasActiveFilters
                ? 'Todavía no hay alertas <em>resueltas</em>.'
                : 'No hay resultados para estos <em>filtros</em>.'}
              subtitle={statusFilter === 'RESUELTAS' && !hasActiveFilters
                ? 'Cuando corrijas una alerta y la marques con "Ya lo resolví", aparecerá aquí.'
                : 'Ajusta los filtros o amplía las fechas para ver más alertas.'}
              cta={{
                label: hasActiveFilters ? 'Limpiar filtros' : 'Ver pendientes',
                onClick: () => {
                  setStatusFilter('PENDIENTES')
                  setSeverityFilter('TODAS')
                  setCategoryFilter('TODAS')
                  setDateFrom('')
                  setDateTo('')
                },
              }}
              compact
            />
          )
        )}
      </div>

      {/* Alert Timeline */}
      <AlertTimeline alerts={alerts} />

      {/* Confirmación "Ya lo resolví" */}
      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmResolved}
        title={confirmTarget?.source === 'norm' ? '¿Ya revisaste esta norma?' : '¿Ya corregiste esta alerta?'}
        description={confirmTarget ? (
          <>
            <span className="block font-medium text-[color:var(--text-primary)]">{confirmTarget.title}</span>
            <span className="mt-2 block">
              {confirmTarget.source === 'norm'
                ? 'La marcaremos como revisada para toda tu empresa.'
                : 'Márcala como resuelta solo si ya hiciste la corrección. Si el problema sigue, la alerta volverá a aparecer en la próxima revisión.'}
            </span>
          </>
        ) : undefined}
        confirmLabel="Sí, ya lo resolví"
        cancelLabel="Todavía no"
      />
    </div>
  )
}
