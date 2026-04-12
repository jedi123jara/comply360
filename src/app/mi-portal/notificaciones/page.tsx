'use client'

import { useEffect, useState } from 'react'
import { Bell, AlertTriangle, CheckCircle2, Info, Calendar } from 'lucide-react'

interface Notification {
  id: string
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'CRITICAL'
  title: string
  body: string
  createdAt: string
  read: boolean
}

const TYPE_INFO = {
  INFO: { icon: Info, class: 'bg-blue-50 text-blue-700 border-blue-200' },
  WARNING: { icon: AlertTriangle, class: 'bg-amber-50 text-amber-700 border-amber-200' },
  SUCCESS: { icon: CheckCircle2, class: 'bg-green-50 text-green-700 border-green-200' },
  CRITICAL: { icon: AlertTriangle, class: 'bg-red-50 text-red-700 border-red-200' },
}

export default function NotificacionesPage() {
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mi-portal/notificaciones')
      .then((r) => r.json())
      .then((d) => setItems(d.notifications || []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Mis Notificaciones</h2>
        <p className="text-sm text-slate-500 mt-1">
          Avisos importantes sobre tus boletas, vacaciones, capacitaciones y mas.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="bg-[#141824] border border-slate-200 rounded-xl p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No tienes notificaciones por ahora.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const info = TYPE_INFO[n.type] || TYPE_INFO.INFO
            const Icon = info.icon
            return (
              <li
                key={n.id}
                className={`bg-[#141824] border rounded-xl p-4 flex items-start gap-3 ${
                  n.read ? 'border-slate-200' : 'border-blue-300 shadow-sm'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg border flex items-center justify-center flex-shrink-0 ${info.class}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm text-slate-900">{n.title}</h3>
                    <span className="text-xs text-slate-500 flex items-center gap-1 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      {new Date(n.createdAt).toLocaleDateString('es-PE')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.body}</p>
                </div>
                {!n.read && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
