'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Bell, AlertTriangle, CheckCircle2, Info, ArrowRight } from 'lucide-react'
import { PageHeader, EmptyState, ErrorState, ListSkeleton } from '@/components/mi-portal'
import { formatRelative } from '@/lib/format/peruvian'

interface Notification {
  id: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'CRITICAL'
  title: string
  body: string
  href: string
  actionLabel: string
  createdAt: string
  read: boolean
}

const TYPE_INFO: Record<Notification['type'], { icon: typeof Info; class: string }> = {
  INFO: { icon: Info, class: 'bg-blue-50 text-blue-700' },
  WARNING: { icon: AlertTriangle, class: 'bg-amber-50 text-amber-800' },
  SUCCESS: { icon: CheckCircle2, class: 'bg-emerald-50 text-emerald-700' },
  CRITICAL: { icon: AlertTriangle, class: 'bg-red-50 text-red-700' },
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'preview-payslip',
    type: 'INFO',
    title: 'Nueva boleta — 2026-05',
    body: 'Tu boleta del periodo 2026-05 está lista. Confirma su recepción.',
    href: '/mi-portal/boletas/preview-may-2026',
    actionLabel: 'Firmar boleta',
    createdAt: '2026-05-18T09:00:00.000Z',
    read: false,
  },
  {
    id: 'preview-request',
    type: 'SUCCESS',
    title: 'Solicitud aprobada',
    body: 'Tu solicitud "Constancia de trabajo" fue aprobada.',
    href: '/mi-portal/solicitudes#request-constancia',
    actionLabel: 'Ver solicitud',
    createdAt: '2026-05-17T14:20:00.000Z',
    read: false,
  },
  {
    id: 'preview-course',
    type: 'WARNING',
    title: 'Capacitación obligatoria pendiente',
    body: 'Tienes pendiente completar el curso "Inducción SST".',
    href: '/mi-portal/capacitaciones#enrollment-preview',
    actionLabel: 'Ir al curso',
    createdAt: '2026-05-16T12:00:00.000Z',
    read: true,
  },
]

function withPreviewHref(href: string, enabled: boolean): string {
  if (!enabled || !href.startsWith('/mi-portal')) return href
  const [pathAndQuery, hash = ''] = href.split('#')
  const separator = pathAndQuery.includes('?') ? '&' : '?'
  return `${pathAndQuery}${separator}__workerPreview=1${hash ? `#${hash}` : ''}`
}

export default function NotificacionesPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const isWorkerPreview =
    process.env.NODE_ENV === 'development' && searchParams.get('__workerPreview') === '1'

  const load = useCallback(async () => {
    if (isWorkerPreview) {
      setItems(MOCK_NOTIFICATIONS)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/mi-portal/notificaciones', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setItems(d.notifications || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
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

  const unreadCount = items.filter((i) => !i.read).length

  return (
    <div className="space-y-5">
      <PageHeader
        title="Notificaciones"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} sin leer · avisos sobre tus boletas, solicitudes y capacitaciones`
            : 'Avisos sobre tus boletas, solicitudes y capacitaciones'
        }
        icon={<Bell className="w-5 h-5" />}
      />

      {loading && <ListSkeleton rows={5} />}

      {error && !loading && (
        <ErrorState title="No se pudieron cargar las notificaciones" message={error} onRetry={load} />
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title="Sin notificaciones por ahora"
          description="Cuando haya novedades sobre tus boletas, solicitudes o capacitaciones las verás acá."
        />
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((n) => {
            const info = TYPE_INFO[n.type] ?? TYPE_INFO.INFO
            const Icon = info.icon
            return (
              <li key={n.id}>
                <Link
                  href={withPreviewHref(n.href, isWorkerPreview)}
                  className={`group bg-white border rounded-xl p-4 flex items-start gap-3 transition-all hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    n.read ? 'border-slate-200' : 'border-emerald-300 shadow-sm'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${info.class}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-sm text-slate-900">{n.title}</h3>
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {formatRelative(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{n.body}</p>
                    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition-colors group-hover:bg-emerald-50 group-hover:text-emerald-800 group-hover:ring-emerald-200">
                      {n.actionLabel}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  {!n.read && (
                    <span
                      className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2"
                      aria-label="Sin leer"
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
