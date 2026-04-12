'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Search, User, Building2, Calendar } from 'lucide-react'

interface AuditEvent {
  id: string
  action: string
  entityType: string | null
  entityId: string | null
  ipAddress: string | null
  createdAt: string
  organization: { name: string } | null
  user: { email: string; firstName: string | null; lastName: string | null } | null
}

export default function AuditoriaPage() {
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/admin/auditoria?limit=100')
      .then((r) => r.json())
      .then((d) => setEvents(d.events || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = events.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      e.action.toLowerCase().includes(q) ||
      e.organization?.name.toLowerCase().includes(q) ||
      e.user?.email.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-blue-600" />
          Auditoría global
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Registro inmutable de todas las acciones críticas en la plataforma
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por accion, empresa o usuario..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="h-96 bg-slate-100 animate-pulse rounded-xl" />
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Sin eventos de auditoría.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {filtered.map((e) => (
              <li key={e.id} className="p-4 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-sm font-semibold text-slate-900">{e.action}</p>
                    {e.entityType && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        {e.entityType}{e.entityId && ` · ${e.entityId.slice(0, 8)}…`}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 mt-2">
                      {e.organization && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {e.organization.name}
                        </span>
                      )}
                      {e.user && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {e.user.email}
                        </span>
                      )}
                      {e.ipAddress && <span>IP: {e.ipAddress}</span>}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(e.createdAt).toLocaleString('es-PE')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
