/**
 * Cliente del Trombinoscopio Compliance.
 *
 * Estructura:
 *   - Toolbar con búsqueda y filtros chips
 *   - Métrica resumen (4 KPIs)
 *   - Grid de cards (fotos + score + flags)
 *   - Drawer derecho con detalle del seleccionado
 */
'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Users,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  X,
  Filter,
  Calendar,
  Briefcase,
  Mail,
} from 'lucide-react'

import type { PeopleViewItem, PeopleViewResult } from '@/lib/orgchart/people-view'

const TONE_CONFIG = {
  success: {
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    ring: 'ring-emerald-200',
    text: 'text-emerald-700',
    label: 'En regla',
    Icon: CheckCircle2,
  },
  warning: {
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    ring: 'ring-amber-200',
    text: 'text-amber-700',
    label: 'Atención',
    Icon: AlertTriangle,
  },
  danger: {
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    ring: 'ring-orange-200',
    text: 'text-orange-700',
    label: 'En riesgo',
    Icon: AlertCircle,
  },
  critical: {
    border: 'border-rose-400',
    bg: 'bg-rose-50',
    ring: 'ring-rose-300',
    text: 'text-rose-700',
    label: 'Crítico',
    Icon: AlertCircle,
  },
} as const

export function PeopleViewClient() {
  const [search, setSearch] = useState('')
  const [contractFilter, setContractFilter] = useState<string | null>(null)
  const [onlyAtRisk, setOnlyAtRisk] = useState(false)
  const [selected, setSelected] = useState<PeopleViewItem | null>(null)

  const query = useQuery({
    queryKey: ['orgchart', 'people', { search, contractFilter, onlyAtRisk }],
    queryFn: async (): Promise<PeopleViewResult> => {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (contractFilter) params.set('contract', contractFilter)
      if (onlyAtRisk) params.set('onlyAtRisk', '1')
      const res = await fetch(`/api/orgchart/people?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      return res.json()
    },
    staleTime: 30_000,
  })

  const totals = query.data?.totals ?? {
    workers: 0,
    inRegla: 0,
    enAtencion: 0,
    enRiesgo: 0,
    criticos: 0,
  }

  const items = useMemo(() => query.data?.items ?? [], [query.data?.items])

  // Contract types disponibles para filtro chips
  const contractTypes = useMemo(() => {
    const set = new Set(items.map((i) => i.contractType))
    return Array.from(set).sort()
  }, [items])

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <Users className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">
                Trombinoscopio Compliance
              </h1>
              <p className="text-[11px] text-slate-500">
                Vista del equipo con score de riesgo SUNAFIL individual
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar persona, cargo o área…"
                className="w-72 rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Toggle solo riesgo */}
            <button
              type="button"
              onClick={() => setOnlyAtRisk((v) => !v)}
              className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                onlyAtRisk
                  ? 'border-amber-400 bg-amber-50 text-amber-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Filter className="h-3 w-3" />
              Sólo riesgo
            </button>
          </div>
        </div>

        {/* Métricas */}
        <div className="mt-3 grid gap-2 md:grid-cols-5">
          <Stat label="Total" value={totals.workers} tone="slate" />
          <Stat label="En regla" value={totals.inRegla} tone="emerald" />
          <Stat label="Atención" value={totals.enAtencion} tone="amber" />
          <Stat label="En riesgo" value={totals.enRiesgo} tone="orange" />
          <Stat label="Crítico" value={totals.criticos} tone="rose" />
        </div>

        {/* Filtros chips contract */}
        {contractTypes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Contrato:
            </span>
            <button
              type="button"
              onClick={() => setContractFilter(null)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                contractFilter === null
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {contractTypes.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setContractFilter(c === contractFilter ? null : c)}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                  contractFilter === c
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {c.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Grid */}
      <main className="flex-1 overflow-y-auto p-6">
        {query.isLoading && (
          <div className="flex h-32 items-center justify-center text-sm text-slate-500">
            Cargando trabajadores…
          </div>
        )}
        {query.error && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            Error al cargar: {String(query.error)}
          </div>
        )}
        {!query.isLoading && items.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No hay trabajadores que coincidan con los filtros.
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {items.map((p) => (
            <PersonCard
              key={p.workerId}
              person={p}
              isSelected={selected?.workerId === p.workerId}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
      </main>

      {/* Drawer detalle */}
      <AnimatePresence>
        {selected && (
          <PersonDrawer person={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'slate' | 'emerald' | 'amber' | 'orange' | 'rose'
}) {
  const colors = {
    slate: 'border-slate-200 bg-white text-slate-900',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    orange: 'border-orange-200 bg-orange-50 text-orange-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 ${colors[tone]}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

function PersonCard({
  person,
  isSelected,
  onClick,
}: {
  person: PeopleViewItem
  isSelected: boolean
  onClick: () => void
}) {
  const cfg = TONE_CONFIG[person.tone]
  const Icon = cfg.Icon
  const initials = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase()

  return (
    <motion.button
      layout
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      className={`relative flex flex-col items-center rounded-xl border-2 ${cfg.border} ${cfg.bg} p-3 text-center shadow-sm transition hover:shadow-md ${
        isSelected ? `ring-4 ${cfg.ring}` : ''
      }`}
    >
      {/* Avatar */}
      <div className={`relative mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm`}>
        {person.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={person.photoUrl}
            alt={`${person.firstName} ${person.lastName}`}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <span className="text-lg font-bold text-slate-500">{initials}</span>
        )}
        <span
          className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full ${cfg.text}`}
          title={cfg.label}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      {/* Nombre */}
      <div className="line-clamp-1 w-full text-[12px] font-semibold text-slate-900">
        {person.firstName} {person.lastName}
      </div>
      <div className="line-clamp-1 w-full text-[10px] text-slate-500">
        {person.positionTitle ?? '—'}
      </div>
      {person.unitName && (
        <div className="line-clamp-1 w-full text-[10px] text-slate-400">
          {person.unitName}
        </div>
      )}

      {/* Score */}
      <div className="mt-2 flex w-full items-center gap-1">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/60">
          <div
            className={`h-1 rounded-full transition-all duration-300`}
            style={{
              width: `${person.complianceScore}%`,
              backgroundColor:
                person.tone === 'success'
                  ? '#2563eb'
                  : person.tone === 'warning'
                    ? '#f59e0b'
                    : person.tone === 'danger'
                      ? '#f97316'
                      : '#dc2626',
            }}
          />
        </div>
        <span className={`text-[10px] font-bold tabular-nums ${cfg.text}`}>
          {person.complianceScore}
        </span>
      </div>

      {/* Flags */}
      {(person.flags.hasCriticalAlert || person.flags.contractAtRisk || person.flags.legajoIncomplete) && (
        <div className="mt-1.5 flex flex-wrap justify-center gap-0.5">
          {person.flags.hasCriticalAlert && (
            <span
              className="rounded-full bg-rose-200 px-1.5 py-0.5 text-[8px] font-bold text-rose-800"
              title="Tiene alertas críticas"
            >
              !
            </span>
          )}
          {person.flags.contractAtRisk && (
            <span
              className="rounded-full bg-orange-200 px-1.5 py-0.5 text-[8px] font-bold text-orange-800"
              title="Contrato civil con riesgo de desnaturalización"
            >
              C
            </span>
          )}
          {person.flags.legajoIncomplete && (
            <span
              className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[8px] font-bold text-amber-800"
              title="Legajo digital incompleto"
            >
              L
            </span>
          )}
        </div>
      )}
    </motion.button>
  )
}

function PersonDrawer({
  person,
  onClose,
}: {
  person: PeopleViewItem
  onClose: () => void
}) {
  const cfg = TONE_CONFIG[person.tone]

  return (
    <motion.aside
      initial={{ x: 380 }}
      animate={{ x: 0 }}
      exit={{ x: 380 }}
      transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      className="fixed right-0 top-0 z-30 flex h-screen w-[380px] flex-col border-l border-slate-200 bg-white shadow-xl"
    >
      <header
        className={`flex items-start justify-between border-b border-slate-200 ${cfg.bg} px-4 py-4`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
            {person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.photoUrl}
                alt={`${person.firstName} ${person.lastName}`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <span className="text-base font-bold text-slate-500">
                {`${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900">
              {person.firstName} {person.lastName}
            </h2>
            <p className="truncate text-[11px] text-slate-600">
              {person.positionTitle ?? '—'}
            </p>
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.text}`}
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}
            >
              <ShieldCheck className="h-3 w-3" />
              {cfg.label} · {person.complianceScore}/100
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-500 transition hover:bg-white/50"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          <KvRow Icon={Briefcase} label="Área" value={person.unitName ?? '—'} />
          <KvRow
            Icon={Calendar}
            label="Antigüedad"
            value={`${person.yearsOfTenure} año${person.yearsOfTenure === 1 ? '' : 's'}`}
          />
          <KvRow Icon={Users} label="Contrato" value={person.contractType.replace(/_/g, ' ')} />
          {person.email && (
            <KvRow Icon={Mail} label="Email" value={person.email} />
          )}
        </div>

        {person.reasons.length > 0 && (
          <div className="mt-5">
            <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Razones del score
            </h3>
            <ul className="space-y-1.5">
              {person.reasons.map((r, i) => (
                <li
                  key={i}
                  className="flex items-start gap-1.5 rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-700"
                >
                  <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-500" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {person.complianceScore >= 85 && person.reasons.length === 0 && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            Sin observaciones. Este trabajador está al día con su legajo y no tiene
            alertas pendientes.
          </div>
        )}

        {/* Quick links */}
        <div className="mt-5 space-y-1.5">
          <a
            href={`/dashboard/trabajadores/${person.workerId}`}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ver legajo completo
            <span className="text-slate-400">→</span>
          </a>
          <a
            href={`/dashboard/trabajadores/${person.workerId}?tab=contratos`}
            className="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ver contratos
            <span className="text-slate-400">→</span>
          </a>
        </div>
      </div>
    </motion.aside>
  )
}

function KvRow({
  Icon,
  label,
  value,
}: {
  Icon: typeof Briefcase
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3 w-3 flex-shrink-0 text-slate-400" />
      <span className="text-slate-500">{label}:</span>
      <span className="ml-auto truncate text-right font-medium text-slate-900">
        {value}
      </span>
    </div>
  )
}
