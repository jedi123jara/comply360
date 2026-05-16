'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { PageHeader, EmptyState, ErrorState, ListSkeleton } from '@/components/mi-portal'
import { formatRelative } from '@/lib/format/peruvian'

interface Notification {
  id: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'CRITICAL'
  title: string
  body: string
  createdAt: string
  read: boolean
}

const TYPE_INFO: Record<Notification['type'], { icon: typeof Info; class: string }> = {
  INFO: { icon: Info, class: 'bg-blue-50 text-blue-700' },
  WARNING: { icon: AlertTriangle, class: 'bg-amber-50 text-amber-800' },
  SUCCESS: { icon: CheckCircle2, class: 'bg-emerald-50 text-emerald-700' },
  CRITICAL: { icon: AlertTriangle, class: 'bg-red-50 text-red-700' },
}

export default function NotificacionesPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
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
  }, [])

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
              <li
                key={n.id}
                className={`bg-white border rounded-xl p-4 flex items-start gap-3 transition-colors ${
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
                </div>
                {!n.read && (
                  <span
                    className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2"
                    aria-label="Sin leer"
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
