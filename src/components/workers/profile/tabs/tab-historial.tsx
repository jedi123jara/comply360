'use client'

import { useEffect, useState } from 'react'
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
} from 'lucide-react'

/**
 * TabHistorial — línea de tiempo editorial del trabajador.
 *
 * Consume `/api/workers/[id]/history` (Prisma AuditLog filtrado por entityType=Worker).
 * Renderiza como timeline vertical con:
 *  - Dot colored por acción (verde=crear, amarillo=editar, rojo=cese, azul=documento)
 *  - Copy en español natural derivado del `action`
 *  - Usuario (firstName lastName o email)
 *  - Fecha relativa ("hace 3 horas") + absoluta (tooltip)
 */

interface HistoryEntry {
  id: string
  action: string
  userId: string | null
  userName: string | null
  metadata: unknown
  createdAt: string
}

interface TabHistorialProps {
  workerId: string
  workerFirstName: string
}

export function TabHistorial({ workerId, workerFirstName }: TabHistorialProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
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
      .then((json: { data?: HistoryEntry[] }) => {
        if (!mounted) return
        setEntries(json.data ?? [])
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

  if (entries.length === 0) {
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
            Últimos {entries.length} movimientos de su expediente (cambios, documentos, alertas, contratos).
          </p>
        </div>
        <button
          onClick={() => setRefreshTick((n) => n + 1)}
          className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold hover:border-emerald-500/60 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Actualizar
        </button>
      </div>

      {/* Timeline */}
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
    </div>
  )
}

/* ── TimelineItem ─────────────────────────────────────────────────────── */

function TimelineItem({ entry }: { entry: HistoryEntry }) {
  const meta = actionMeta(entry.action)
  const Icon = meta.icon
  const relative = formatRelative(entry.createdAt)
  const absolute = formatAbsolute(entry.createdAt)

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
            </p>
          </div>
        </div>
      </div>
    </li>
  )
}

/* ── Action metadata ─────────────────────────────────────────────────── */

function actionMeta(action: string): {
  label: string
  color: string
  icon: React.ComponentType<{ className?: string }>
} {
  const a = action.toUpperCase()
  if (a.includes('CREATE') || a.includes('ADD')) {
    return { label: humanize(action, 'Trabajador registrado'), color: '#10b981', icon: UserPlus }
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
    return { label: humanize(action, 'Contrato generado'), color: '#047857', icon: FileText }
  }
  if (a.includes('ALERT') && (a.includes('RESOLVE') || a.includes('DISMISS'))) {
    return { label: humanize(action, 'Alerta resuelta'), color: '#10b981', icon: CheckCircle2 }
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
  // Convert WORKER_CREATE, DOCUMENT_UPLOAD_RESOLVED etc. to readable form
  const parts = action.split(/[_\s]+/).filter(Boolean)
  if (parts.length === 0) return fallback
  const first = parts[0]
  const rest = parts.slice(1).join(' ').toLowerCase()
  // If too generic, use the fallback
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
