'use client'

import { useEffect, useState } from 'react'
import { LifeBuoy, Loader2, Mail, Calendar, Building2, AlertCircle } from 'lucide-react'

type Ticket = {
  id: string
  code: string
  subject: string
  description: string
  category: string
  priority: string
  createdAt: string
  reporter: { email: string; name: string | null } | null
  org: { id: string; name: string; plan: string } | null
}

const PRIORITY_COLORS: Record<string, string> = {
  critica: 'bg-red-100 text-red-800 ring-red-200',
  alta: 'bg-orange-100 text-orange-800 ring-orange-200',
  media: 'bg-blue-100 text-blue-800 ring-blue-200',
  baja: 'bg-slate-100 text-slate-700 ring-slate-200',
}

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing',
  tecnico: 'Técnico',
  legal: 'Legal',
  onboarding: 'Onboarding',
  feature_request: 'Feature',
  bug: 'Bug',
  otro: 'Otro',
}

export default function SoportePage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [stats, setStats] = useState<{
    totalOpen: number
    byPriority: Record<string, number>
  } | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('/api/admin/support', { cache: 'no-store' })
        const d = await r.json()
        if (r.ok) {
          setTickets(d.tickets ?? [])
          setStats(d.stats ?? null)
        }
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <LifeBuoy className="w-6 h-6 text-blue-600" />
          Tickets de soporte
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Solicitudes de ayuda de usuarios de todas las empresas, ordenadas por más reciente.
        </p>
      </header>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white ring-1 ring-slate-200 rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
              Total
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalOpen}</div>
          </div>
          {(['critica', 'alta', 'media'] as const).map((p) => (
            <div key={p} className="bg-white ring-1 ring-slate-200 rounded-xl p-4">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-1">
                {stats.byPriority[p] ?? 0}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Cargando tickets…
        </div>
      )}

      {/* Empty state */}
      {!loading && tickets.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <LifeBuoy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold">Sin tickets todavía</p>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Cuando un usuario envíe un ticket desde su dashboard, aparecerá acá. Los tickets con
            prioridad alta o crítica también te llegan por email.
          </p>
        </div>
      )}

      {/* List */}
      {!loading && tickets.length > 0 && (
        <div className="bg-white ring-1 ring-slate-200 rounded-xl overflow-hidden">
          <ul className="divide-y divide-slate-100">
            {tickets.map((t) => {
              const isOpen = expanded === t.id
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setExpanded(isOpen ? null : t.id)}
                    className="w-full px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1 ${
                          PRIORITY_COLORS[t.priority] ?? PRIORITY_COLORS.media
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 ring-1 ring-slate-200 rounded-full px-2 py-0.5">
                        {CATEGORY_LABELS[t.category] ?? t.category}
                      </span>
                      <span className="text-xs font-mono text-slate-400">{t.code}</span>
                      <div className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(t.createdAt).toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                    </div>
                    <div className="font-semibold text-slate-900 mt-1.5 line-clamp-1">
                      {t.subject}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      {t.reporter && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {t.reporter.email}
                        </span>
                      )}
                      {t.org && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {t.org.name}{' '}
                          <span className="text-slate-300">·</span>{' '}
                          <span className="font-medium">{t.org.plan}</span>
                        </span>
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 bg-slate-50/50 border-t border-slate-100">
                      <div className="pt-4 text-sm text-slate-700 whitespace-pre-wrap">
                        {t.description}
                      </div>
                      {t.reporter?.email && (
                        <a
                          href={`mailto:${t.reporter.email}?subject=Re:%20${encodeURIComponent(t.subject)}%20(${t.code})`}
                          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-xs font-semibold transition-colors"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Responder por email
                        </a>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-blue-50/50 ring-1 ring-blue-200/60 p-4 flex items-start gap-2.5 text-xs text-blue-900">
        <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          Los tickets se crean desde el formulario en{' '}
          <code className="text-blue-700 bg-white/60 rounded px-1">
            /dashboard/configuracion/soporte
          </code>{' '}
          dentro del app de cada usuario. Esta vista lista todos en tiempo real.
        </div>
      </div>
    </div>
  )
}
