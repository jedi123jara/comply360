'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  History as HistoryIcon,
  UserPlus,
  UserMinus,
  UserCheck,
  FileEdit,
  FileText,
  Upload,
  Bell,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Banknote,
  Building2,
  Calendar,
  Briefcase,
  ShieldCheck,
  Lock,
  ArrowUpRight,
} from 'lucide-react'

/**
 * TabHistorial — línea de tiempo editorial del trabajador.
 *
 * Consume `/api/workers/[id]/history` que mergea:
 *   - WorkerHistoryEvent (Ola 2 — estructurado, before/after por campo)
 *   - AuditLog legacy (entityType=Worker)
 *
 * Plan-gating (Ola 1+2 decisión 2026-05-04):
 *   - STARTER → últimos 90 días
 *   - EMPRESA → últimos 12 meses
 *   - PRO+    → sin límite
 *
 * Cuando hay eventos ocultos por el plan, muestra banner CTA al upgrade.
 */

interface HistoryEntry {
  id: string
  source?: 'history' | 'audit'
  type: string
  action?: string
  before?: unknown
  after?: unknown
  reason?: string | null
  evidenceUrl?: string | null
  userId: string | null
  userName: string | null
  metadata: unknown
  createdAt: string
}

interface PlanInfo {
  current: string
  windowLabel: string
  windowDays: number | null
  truncated: boolean
  hiddenByPlan: number
  upgradeHint: string | null
}

interface HistoryResponse {
  data: HistoryEntry[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  plan?: PlanInfo
}

interface TabHistorialProps {
  workerId: string
  workerFirstName: string
}

export function TabHistorial({ workerId, workerFirstName }: TabHistorialProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    let mounted = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch pattern estándar; migrar a useApiQuery en refactor futuro.
    setLoading(true)
    setError(null)
    fetch(`/api/workers/${workerId}/history?pageSize=30`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`status ${r.status}`)
        return r.json()
      })
      .then((json: HistoryResponse) => {
        if (!mounted) return
        setEntries(json.data ?? [])
        setPlanInfo(json.plan ?? null)
      })
      .catch((e: Error) => {
        if (!mounted) return
        setError(e.message || 'No pudimos cargar el historial')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [workerId, refreshTick])

  if (loading) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <Loader2 className="h-5 w-5 animate-spin text-emerald-600 mx-auto mb-2" />
        <p className="text-sm text-[color:var(--text-tertiary)]">Cargando historial…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm text-[color:var(--text-secondary)] mb-3">
          No pudimos cargar el historial: {error}
        </p>
        <button
          onClick={() => setRefreshTick((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-1.5 text-xs font-semibold hover:border-emerald-500/60"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reintentar
        </button>
      </div>
    )
  }

  if (entries.length === 0 && !planInfo?.truncated) {
    return (
      <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 mb-3">
          <HistoryIcon className="h-5 w-5" />
        </div>
        <h3
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 22,
            fontWeight: 400,
            letterSpacing: '-0.015em',
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          Aún no hay movimientos en su expediente
        </h3>
        <p className="text-sm text-[color:var(--text-tertiary)] max-w-md mx-auto">
          Cada cambio de datos, documento subido, alerta generada o resuelta quedará
          registrado aquí con fecha, usuario y detalles.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Eyebrow + header editorial */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 mb-2">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-500"
              style={{ boxShadow: '0 0 0 3px rgba(16,185,129,0.15)' }}
            />
            <span>Línea de tiempo</span>
            {planInfo && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full bg-[color:var(--neutral-100)] text-[10px] font-medium text-[color:var(--text-tertiary)] uppercase tracking-wider"
                title={`Plan ${planInfo.current} — ${planInfo.windowLabel}`}
              >
                {planInfo.windowLabel}
              </span>
            )}
          </div>
          <h2
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 26,
              fontWeight: 400,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
            dangerouslySetInnerHTML={{
              __html: `Todo lo que pasó con <em style="color: var(--emerald-700); font-style: italic">${workerFirstName}</em>.`,
            }}
          />
          <p className="text-sm text-[color:var(--text-secondary)] mt-1">
            {entries.length === 0
              ? 'Sin movimientos en la ventana visible para tu plan.'
              : `Mostrando ${entries.length} movimientos del expediente (cambios, documentos, alertas, contratos).`}
          </p>
        </div>
        <button
          onClick={() => setRefreshTick((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold hover:border-emerald-500/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Banner de upgrade — Ola 2 plan gating (Starter 90d / Empresa 12m / PRO infinito) */}
      {planInfo?.truncated && planInfo.hiddenByPlan > 0 && (
        <UpgradeBanner planInfo={planInfo} />
      )}

      {/* Timeline */}
      {entries.length > 0 ? (
        <ol
          className="relative"
          style={{
            paddingLeft: 24,
            borderLeft: '1.5px solid var(--border-subtle)',
          }}
        >
          {entries.map((entry) => (
            <TimelineItem key={entry.id} entry={entry} />
          ))}
        </ol>
      ) : (
        <div className="rounded-2xl border border-[color:var(--border-default)] bg-white p-8 text-center">
          <HistoryIcon className="h-6 w-6 text-[color:var(--text-tertiary)] mx-auto mb-2" />
          <p className="text-sm text-[color:var(--text-secondary)]">
            Sin movimientos recientes en {planInfo?.windowLabel.toLowerCase() ?? 'la ventana visible'}.
          </p>
        </div>
      )}
    </div>
  )
}

/* ── Banner de upgrade ─────────────────────────────────────────────────────── */

function UpgradeBanner({ planInfo }: { planInfo: PlanInfo }) {
  const isStarter = planInfo.current === 'STARTER' || planInfo.current === 'FREE'
  const targetPlan = isStarter ? 'EMPRESA' : 'PRO'

  return (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-amber-50 to-orange-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <Lock className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-amber-900">
            {planInfo.hiddenByPlan === 1
              ? '1 evento oculto en tu plan'
              : `${planInfo.hiddenByPlan} eventos ocultos en tu plan`}
          </p>
          <p className="text-xs text-amber-800 mt-0.5">
            {planInfo.upgradeHint ??
              `Tu plan ${planInfo.current} muestra solo ${planInfo.windowLabel.toLowerCase()}. Actualiza a ${targetPlan} para ver más historia.`}
          </p>
        </div>
        <Link
          href="/dashboard/planes"
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shadow-sm"
        >
          Ver planes
          <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}

/* ── TimelineItem ─────────────────────────────────────────────────────── */

function TimelineItem({ entry }: { entry: HistoryEntry }) {
  // Si es un WorkerHistoryEvent (source=history), usa el `type` estructurado.
  // Si es AuditLog legacy (source=audit), usa el `action`.
  const meta = entry.source === 'history'
    ? historyEventMeta(entry.type)
    : actionMeta(entry.action ?? entry.type)
  const Icon = meta.icon
  const relative = formatRelative(entry.createdAt)
  const absolute = formatAbsolute(entry.createdAt)

  // Detalle adicional para eventos estructurados (before → after)
  const change = entry.source === 'history' ? extractChange(entry) : null

  return (
    <li className="relative pb-6 last:pb-0" style={{ marginLeft: 0 }}>
      {/* Dot */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: -32,
          top: 4,
          width: 16,
          height: 16,
          borderRadius: 9999,
          background: 'var(--bg-base)',
          border: `2px solid ${meta.color}`,
          display: 'grid',
          placeItems: 'center',
          boxShadow: `0 0 0 3px color-mix(in srgb, ${meta.color} 12%, transparent)`,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 9999,
            background: meta.color,
          }}
        />
      </span>

      <div className="rounded-xl border border-[color:var(--border-subtle)] bg-white px-4 py-3 hover:border-emerald-500/40 transition-colors">
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
            style={{
              background: `color-mix(in srgb, ${meta.color} 12%, transparent)`,
              color: meta.color,
            }}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[color:var(--text-primary)]">
              {meta.label}
            </p>
            {change && (
              <p className="mt-0.5 text-xs text-[color:var(--text-secondary)]">
                <span className="line-through text-[color:var(--text-tertiary)]">{change.before}</span>
                {' → '}
                <span className="font-semibold text-[color:var(--text-primary)]">{change.after}</span>
              </p>
            )}
            {entry.reason && (
              <p className="mt-0.5 text-xs italic text-[color:var(--text-tertiary)]">
                &ldquo;{entry.reason}&rdquo;
              </p>
            )}
            <p className="mt-0.5 text-xs text-[color:var(--text-tertiary)]">
              {entry.userName ? (
                <>
                  por <span className="font-medium text-[color:var(--text-secondary)]">{entry.userName}</span>
                </>
              ) : (
                <span className="italic">Sistema</span>
              )}
              {' · '}
              <time dateTime={entry.createdAt} title={absolute}>
                {relative}
              </time>
              {entry.evidenceUrl && (
                <>
                  {' · '}
                  <a
                    href={entry.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-600 hover:underline font-medium"
                  >
                    Ver evidencia
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </li>
  )
}

/* ── Action / Event metadata ─────────────────────────────────────────── */

interface MetaInfo {
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
}

// Mapa para los `WorkerEventType` de la nueva tabla (Ola 2)
const HISTORY_EVENT_META: Record<string, MetaInfo> = {
  ALTA: { label: 'Trabajador registrado', color: '#2563eb', icon: UserPlus },
  CAMBIO_SUELDO: { label: 'Cambio de sueldo', color: '#0ea5e9', icon: Banknote },
  CAMBIO_CARGO: { label: 'Cambio de cargo', color: '#8b5cf6', icon: Briefcase },
  CAMBIO_DEPARTAMENTO: { label: 'Cambio de departamento', color: '#8b5cf6', icon: Building2 },
  CAMBIO_REGIMEN: { label: 'Cambio de régimen laboral', color: '#f59e0b', icon: FileEdit },
  CAMBIO_TIPO_CONTRATO: { label: 'Cambio de tipo de contrato', color: '#f59e0b', icon: FileText },
  CAMBIO_HORARIO: { label: 'Ajuste de horario', color: '#0ea5e9', icon: Calendar },
  CAMBIO_REGIMEN_PREVISIONAL: { label: 'Cambio AFP/ONP', color: '#0ea5e9', icon: ShieldCheck },
  SUSPENSION: { label: 'Suspensión registrada', color: '#f59e0b', icon: UserCheck },
  REINCORPORACION: { label: 'Reincorporación', color: '#2563eb', icon: UserPlus },
  LICENCIA_MEDICA: { label: 'Licencia médica', color: '#0ea5e9', icon: HistoryIcon },
  LICENCIA_MATERNIDAD: { label: 'Licencia de maternidad', color: '#ec4899', icon: HistoryIcon },
  LICENCIA_PATERNIDAD: { label: 'Licencia de paternidad', color: '#06b6d4', icon: HistoryIcon },
  VACACIONES_INICIO: { label: 'Inicio de vacaciones', color: '#2563eb', icon: Calendar },
  VACACIONES_FIN: { label: 'Fin de vacaciones', color: '#2563eb', icon: Calendar },
  CESE: { label: 'Cese registrado', color: '#ef4444', icon: UserMinus },
  REINGRESO: { label: 'Reingreso del trabajador', color: '#2563eb', icon: UserPlus },
  ACTUALIZACION_LEGAJO: { label: 'Actualización de legajo', color: '#64748b', icon: FileEdit },
  T_REGISTRO_PRESENTADO: { label: 'T-REGISTRO presentado', color: '#1e40af', icon: ShieldCheck },
}

function historyEventMeta(type: string): MetaInfo {
  return (
    HISTORY_EVENT_META[type] ?? {
      label: type.replace(/_/g, ' ').toLowerCase(),
      color: '#64748b',
      icon: HistoryIcon,
    }
  )
}

function actionMeta(action: string): MetaInfo {
  const a = action.toUpperCase()
  if (a.includes('CREATE') || a.includes('ADD')) {
    return { label: humanize(action, 'Trabajador registrado'), color: '#2563eb', icon: UserPlus }
  }
  if (a.includes('DELETE') || a.includes('TERMINAT')) {
    return { label: humanize(action, 'Cese registrado'), color: '#ef4444', icon: UserMinus }
  }
  if (a.includes('UPDATE') || a.includes('EDIT')) {
    return { label: humanize(action, 'Datos actualizados'), color: '#f59e0b', icon: FileEdit }
  }
  if (a.includes('DOCUMENT') || a.includes('UPLOAD')) {
    return { label: humanize(action, 'Documento subido al legajo'), color: '#3b82f6', icon: Upload }
  }
  if (a.includes('CONTRACT')) {
    return { label: humanize(action, 'Contrato generado'), color: '#1e40af', icon: FileText }
  }
  if (a.includes('ALERT') && (a.includes('RESOLVE') || a.includes('DISMISS'))) {
    return { label: humanize(action, 'Alerta resuelta'), color: '#2563eb', icon: CheckCircle2 }
  }
  if (a.includes('ALERT')) {
    return { label: humanize(action, 'Alerta generada'), color: '#ef4444', icon: Bell }
  }
  if (a.includes('STATUS') || a.includes('CHANGE')) {
    return { label: humanize(action, 'Estado actualizado'), color: '#8b5cf6', icon: UserCheck }
  }
  return { label: humanize(action, 'Actividad registrada'), color: '#64748b', icon: HistoryIcon }
}

function humanize(action: string, fallback: string): string {
  const parts = action.split(/[_\s]+/).filter(Boolean)
  if (parts.length === 0) return fallback
  const first = parts[0]
  const rest = parts.slice(1).join(' ').toLowerCase()
  if (parts.length <= 1) return fallback
  return `${capitalize(first)} ${rest}`.trim()
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diffMs = now - then
  const min = 60_000
  const hr = 60 * min
  const day = 24 * hr
  if (diffMs < min) return 'hace un momento'
  if (diffMs < hr) return `hace ${Math.floor(diffMs / min)} min`
  if (diffMs < day) return `hace ${Math.floor(diffMs / hr)} h`
  if (diffMs < 30 * day) return `hace ${Math.floor(diffMs / day)} días`
  if (diffMs < 365 * day) return `hace ${Math.floor(diffMs / (30 * day))} meses`
  return `hace ${Math.floor(diffMs / (365 * day))} años`
}

function formatAbsolute(iso: string): string {
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

/**
 * Extrae el cambio principal (before → after) cuando es un evento estructurado
 * de WorkerHistoryEvent. Solo muestra cambios "interesantes" (sueldo, cargo,
 * régimen). Para cambios de horario u otros vagos, devuelve null y deja que la
 * card muestre solo el label.
 */
function extractChange(entry: HistoryEntry): { before: string; after: string } | null {
  const before = entry.before as Record<string, unknown> | null | undefined
  const after = entry.after as Record<string, unknown> | null | undefined
  if (!before || !after) return null

  // Sueldo
  if (entry.type === 'CAMBIO_SUELDO' && 'sueldoBruto' in before && 'sueldoBruto' in after) {
    const fmt = (v: unknown) =>
      v == null
        ? '—'
        : new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', maximumFractionDigits: 0 }).format(Number(v))
    return { before: fmt(before.sueldoBruto), after: fmt(after.sueldoBruto) }
  }
  // Cargo
  if (entry.type === 'CAMBIO_CARGO' && 'position' in before && 'position' in after) {
    return { before: String(before.position ?? '—'), after: String(after.position ?? '—') }
  }
  // Departamento
  if (entry.type === 'CAMBIO_DEPARTAMENTO' && 'department' in before && 'department' in after) {
    return { before: String(before.department ?? '—'), after: String(after.department ?? '—') }
  }
  // Régimen
  if (entry.type === 'CAMBIO_REGIMEN' && 'regimenLaboral' in before && 'regimenLaboral' in after) {
    return { before: String(before.regimenLaboral ?? '—'), after: String(after.regimenLaboral ?? '—') }
  }
  // Tipo contrato
  if (entry.type === 'CAMBIO_TIPO_CONTRATO' && 'tipoContrato' in before && 'tipoContrato' in after) {
    return { before: String(before.tipoContrato ?? '—'), after: String(after.tipoContrato ?? '—') }
  }
  return null
}
