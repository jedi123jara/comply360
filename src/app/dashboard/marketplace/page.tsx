'use client'

import { useEffect, useState } from 'react'
import {
  Plug,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Lock,
  Search,
} from 'lucide-react'

interface Integration {
  slug: string
  name: string
  category: string
  description: string
  logoEmoji: string
  envVarsRequired: string[]
  capabilities: string[]
  website?: string
  enabledByDefault: boolean
  minTier: 'STARTER' | 'EMPRESA' | 'PRO'
}

interface Status {
  slug: string
  name: string
  configured: boolean
  missingEnvVars: string[]
  ready: boolean
}

const CATEGORIES = [
  { key: 'ALL', label: 'Todas' },
  { key: 'PAGOS', label: 'Pagos' },
  { key: 'BANCOS', label: 'Bancos' },
  { key: 'SUNAT', label: 'SUNAT' },
  { key: 'SUNAFIL', label: 'SUNAFIL' },
  { key: 'PREVISIONAL', label: 'Previsional' },
  { key: 'NOTARIAL', label: 'Firma/Notarial' },
  { key: 'COMUNICACION', label: 'Comunicación' },
  { key: 'AUDITORIA', label: 'Auditoría' },
]

const TIER_COLORS: Record<string, string> = {
  STARTER: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  EMPRESA: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  PRO: 'bg-gold-500/15 text-gold-300 border-gold-500/30',
}

export default function MarketplacePage() {
  const [loading, setLoading] = useState(true)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [statuses, setStatuses] = useState<Record<string, Status>>({})
  const [category, setCategory] = useState('ALL')
  const [query, setQuery] = useState('')

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/catalog')
      if (res.ok) {
        const data = await res.json()
        setIntegrations(data.integrations || [])
        const statusMap: Record<string, Status> = {}
        for (const s of data.statuses || []) {
          statusMap[s.slug] = s
        }
        setStatuses(statusMap)
      }
    } finally {
      setLoading(false)
    }
  }

  const filtered = integrations.filter(i => {
    if (category !== 'ALL' && i.category !== category) return false
    if (query && !i.name.toLowerCase().includes(query.toLowerCase()) && !i.description.toLowerCase().includes(query.toLowerCase())) {
      return false
    }
    return true
  })

  const configuredCount = Object.values(statuses).filter(s => s.configured).length
  const totalCount = integrations.length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-gold-500/10 p-3">
          <Plug className="h-7 w-7 text-gold-500" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Marketplace de integraciones</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Conecta COMPLY360 con los servicios peruanos que ya usas: pasarelas de pago, bancos,
            SUNAT, AFPnet, firma digital, WhatsApp y más.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-right">
          <p className="text-xs text-slate-500">Activas</p>
          <p className="text-lg font-bold text-gold-400">
            {configuredCount}/{totalCount}
          </p>
        </div>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar integración..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-gold-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                category === c.key
                  ? 'bg-gold-500 text-slate-950'
                  : 'border border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
          <Plug className="mx-auto h-14 w-14 text-slate-600" />
          <p className="mt-4 text-sm text-slate-400">No hay integraciones que coincidan</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(i => {
            const status = statuses[i.slug]
            return (
              <div
                key={i.slug}
                className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-gold-500/40"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{i.logoEmoji}</div>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{i.name}</h3>
                      <p className="text-[10px] uppercase text-slate-500">{i.category}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      TIER_COLORS[i.minTier]
                    }`}
                  >
                    {i.minTier}
                  </span>
                </div>

                <p className="mb-3 flex-1 text-xs text-slate-400 line-clamp-3">{i.description}</p>

                <div className="mb-3 flex flex-wrap gap-1">
                  {i.capabilities.slice(0, 3).map(c => (
                    <span
                      key={c}
                      className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
                    >
                      {c}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {status?.configured ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-400" />
                        <span className="text-[11px] font-semibold text-green-400">Activa</span>
                      </>
                    ) : i.envVarsRequired.length > 0 ? (
                      <>
                        <Lock className="h-4 w-4 text-slate-500" />
                        <span className="text-[11px] text-slate-500">
                          Requiere {status?.missingEnvVars.length || i.envVarsRequired.length} credencial
                          {(status?.missingEnvVars.length || i.envVarsRequired.length) !== 1 ? 'es' : ''}
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-400" />
                        <span className="text-[11px] text-yellow-400">Opcional</span>
                      </>
                    )}
                  </div>
                  {i.website && (
                    <a
                      href={i.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-gold-400 hover:underline"
                    >
                      Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-2xl border border-gold-500/30 bg-gold-500/5 p-5 text-xs text-slate-300">
        <p>
          <b className="text-gold-400">¿Falta una integración?</b> Estamos abiertos a añadir
          integraciones con cualquier servicio peruano que uses. Escríbenos y evaluamos el
          esfuerzo. Las integraciones se configuran por organización y las credenciales nunca se
          comparten entre tenants.
        </p>
      </div>
    </div>
  )
}
