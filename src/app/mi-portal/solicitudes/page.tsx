'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck2,
  Plane,
  Plus,
  Sparkles,
  Timer,
  XCircle,
} from 'lucide-react'
import { EmptyState, ErrorState, Chip, ListSkeleton } from '@/components/mi-portal'
import { formatShortDate } from '@/lib/format/peruvian'

interface RequestItem {
  id: string
  type: string
  status: string
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  daysRequested: number | null
  reviewedAt: string | null
  reviewNotes: string | null
  createdAt: string
}

const MOCK_REQUESTS: RequestItem[] = [
  {
    id: 'vac-2026',
    type: 'VACACIONES',
    status: 'EN_REVISION',
    title: 'Vacaciones de junio',
    description: 'Solicitud para coordinar descanso familiar.',
    startDate: '2026-06-10T12:00:00.000Z',
    endDate: '2026-06-16T12:00:00.000Z',
    daysRequested: 5,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: '2026-05-14T12:00:00.000Z',
  },
  {
    id: 'constancia',
    type: 'CONSTANCIA_TRABAJO',
    status: 'APROBADA',
    title: 'Constancia de trabajo',
    description: 'Para trámite bancario.',
    startDate: null,
    endDate: null,
    daysRequested: null,
    reviewedAt: '2026-05-16T12:00:00.000Z',
    reviewNotes: 'Documento aprobado por RRHH.',
    createdAt: '2026-05-12T12:00:00.000Z',
  },
  {
    id: 'permiso',
    type: 'PERMISO',
    status: 'PENDIENTE',
    title: 'Permiso por cita médica',
    description: 'Cita médica programada por la mañana.',
    startDate: '2026-05-22T12:00:00.000Z',
    endDate: '2026-05-22T12:00:00.000Z',
    daysRequested: 1,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: '2026-05-17T12:00:00.000Z',
  },
]

const TYPE_LABEL: Record<string, string> = {
  VACACIONES: 'Vacaciones',
  PERMISO: 'Permiso',
  LICENCIA_MEDICA: 'Licencia médica',
  LICENCIA_MATERNIDAD: 'Licencia maternidad',
  LICENCIA_PATERNIDAD: 'Licencia paternidad',
  ADELANTO_SUELDO: 'Adelanto de sueldo',
  CTS_RETIRO_PARCIAL: 'Retiro parcial CTS',
  CONSTANCIA_TRABAJO: 'Constancia de trabajo',
  CERTIFICADO_5TA: 'Certificado de 5ta',
  ACTUALIZAR_DATOS: 'Actualizar datos',
  OTRO: 'Otro',
}

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const STATUS_INFO: Record<string, { label: string; variant: Variant; icon: LucideIcon; step: number }> = {
  PENDIENTE: { label: 'Pendiente', variant: 'warning', icon: Clock, step: 1 },
  EN_REVISION: { label: 'En revisión', variant: 'info', icon: Timer, step: 2 },
  APROBADA: { label: 'Aprobada', variant: 'success', icon: CheckCircle2, step: 3 },
  RECHAZADA: { label: 'Rechazada', variant: 'danger', icon: XCircle, step: 3 },
  CANCELADA: { label: 'Cancelada', variant: 'neutral', icon: XCircle, step: 0 },
}

const REQUEST_SHORTCUTS = [
  { href: '/mi-portal/solicitudes/nueva?type=VACACIONES', label: 'Vacaciones', icon: Plane },
  { href: '/mi-portal/solicitudes/nueva?type=PERMISO', label: 'Permiso', icon: Calendar },
  { href: '/mi-portal/solicitudes/nueva?type=CONSTANCIA_TRABAJO', label: 'Constancia', icon: FileCheck2 },
]

function withPreviewHref(href: string, enabled: boolean): string {
  if (!enabled || !href.startsWith('/mi-portal')) return href
  if (href.includes('__workerPreview=')) return href
  const [pathAndQuery, hash = ''] = href.split('#')
  const separator = pathAndQuery.includes('?') ? '&' : '?'
  return `${pathAndQuery}${separator}__workerPreview=1${hash ? `#${hash}` : ''}`
}

export default function SolicitudesPage() {
  const [items, setItems] = useState<RequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'

  const load = useCallback(async () => {
    if (isWorkerPreview) {
      setItems(MOCK_REQUESTS)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mi-portal/solicitudes', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setItems(data.requests || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de red')
    } finally {
      setLoading(false)
    }
  }, [isWorkerPreview])

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

  const stats = useMemo(() => {
    const inProgress = items.filter((i) => i.status === 'PENDIENTE' || i.status === 'EN_REVISION').length
    const approved = items.filter((i) => i.status === 'APROBADA').length
    const vacationDays = items
      .filter((i) => i.type === 'VACACIONES' && i.daysRequested)
      .reduce((acc, i) => acc + (i.daysRequested ?? 0), 0)
    return { inProgress, approved, vacationDays }
  }, [items])

  return (
    <div className="c360-worker-os c360-worker-requests space-y-6 pb-24">
      <section className="c360-os-hero c360-requests-hero">
        <div className="c360-os-hero-copy">
          <span className="c360-os-eyebrow">
            <ClipboardList className="h-3.5 w-3.5" />
            Workflow de trámites
          </span>
          <h1>Tus solicitudes con estado claro y próximos pasos.</h1>
          <p>
            Vacaciones, permisos, constancias y cambios de datos se muestran como un
            tracker para saber exactamente en qué punto van.
          </p>
          <div className="c360-os-hero-actions">
            <Link href={withPreviewHref('/mi-portal/solicitudes/nueva', isWorkerPreview)} className="c360-os-primary-action">
              Nueva solicitud
              <Plus className="h-4 w-4" />
            </Link>
            <span className="c360-os-audit-pill">
              <Sparkles className="h-4 w-4" />
              Respuesta de RRHH en el mismo canal
            </span>
          </div>
        </div>

        <aside className="c360-requests-command">
          <p className="text-xs font-black text-emerald-700">Accesos rápidos</p>
          <h2>Crear trámite</h2>
          <div className="c360-requests-shortcuts">
            {REQUEST_SHORTCUTS.map((item) => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={withPreviewHref(item.href, isWorkerPreview)}>
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </aside>
      </section>

      <section className="c360-os-metrics-grid">
        <MetricCard icon={Timer} label="En trámite" value={stats.inProgress} helper="Pendientes o en revisión" tone="amber" />
        <MetricCard icon={CheckCircle2} label="Aprobadas" value={stats.approved} helper="Resueltas por RRHH" tone="emerald" />
        <MetricCard icon={Plane} label="Días solicitados" value={stats.vacationDays} helper="Vacaciones registradas" tone="blue" />
      </section>

      {loading && <ListSkeleton rows={4} />}

      {error && !loading && (
        <ErrorState title="No se pudieron cargar las solicitudes" message={error} onRetry={load} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="w-6 h-6" />}
          title="Aún no tienes solicitudes"
          description="Pide vacaciones, permisos o certificados desde acá. La respuesta de RRHH llega por este mismo canal."
          action={
            <Link href={withPreviewHref('/mi-portal/solicitudes/nueva', isWorkerPreview)} className="c360-os-primary-action">
              Crear tu primera solicitud
              <Plus className="h-4 w-4" />
            </Link>
          }
        />
      )}

      {!loading && !error && items.length > 0 && (
        <section className="c360-os-panel">
          <div className="c360-os-section-head">
            <div>
              <span>Tracker</span>
              <h2>Trámites recientes</h2>
            </div>
            <small>{items.length} solicitudes</small>
          </div>
          <div className="c360-request-tracker-list">
            {items.map((req) => (
              <RequestTrackerCard key={req.id} req={req} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string | number
  helper: string
  tone: 'emerald' | 'blue' | 'amber'
}) {
  return (
    <article className={`c360-os-metric c360-os-tone-${tone}`}>
      <div className="c360-os-metric-icon">
        <Icon className="h-5 w-5" />
      </div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  )
}

function RequestTrackerCard({ req }: { req: RequestItem }) {
  const status = STATUS_INFO[req.status] ?? STATUS_INFO.PENDIENTE
  const StatusIcon = status.icon
  const typeLabel = TYPE_LABEL[req.type] ?? req.type

  return (
    <article id={`request-${req.id}`} className="c360-request-card scroll-mt-24">
      <div className="c360-request-card-head">
        <div className="c360-request-icon">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p>{typeLabel}</p>
          <h3>{req.title}</h3>
        </div>
        <Chip variant={status.variant} icon={<StatusIcon className="w-3 h-3" />}>
          {status.label}
        </Chip>
      </div>

      {req.description ? <p className="c360-request-description">{req.description}</p> : null}

      <div className="c360-request-steps" aria-label={`Estado: ${status.label}`}>
        {['Creada', 'En revisión', status.variant === 'danger' ? 'Rechazada' : 'Resuelta'].map((label, index) => (
          <span
            key={label}
            className={index + 1 <= status.step ? 'is-active' : ''}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="c360-request-meta">
        {req.startDate && req.endDate ? (
          <span>
            <Calendar className="h-3.5 w-3.5" />
            {formatShortDate(req.startDate)} - {formatShortDate(req.endDate)}
            {req.daysRequested ? ` (${req.daysRequested} días)` : ''}
          </span>
        ) : null}
        <span>Solicitado: {formatShortDate(req.createdAt)}</span>
      </div>

      {req.reviewNotes ? (
        <div className="c360-request-note">
          <strong>Nota de RRHH:</strong> {req.reviewNotes}
        </div>
      ) : null}
    </article>
  )
}
