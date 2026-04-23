'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Briefcase,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
  Receipt,
} from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'

interface ProviderItem {
  id: string
  documentType: string
  documentNumber: string
  ruc: string | null
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  profession: string | null
  servicioDescripcion: string
  area: string | null
  startDate: string
  endDate: string | null
  monthlyAmount: number
  hasSuspensionRetencion: boolean
  desnaturalizacionRisk: number
  status: string
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: 'Activo', color: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400' },
  INACTIVE: { label: 'Inactivo', color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] bg-gray-900/30 text-gray-400' },
  TERMINATED: { label: 'Finalizado', color: 'bg-slate-100 text-slate-700 bg-white/30 text-gray-400' },
  AT_RISK: { label: 'Riesgo alto', color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' },
}

function riskBadge(risk: number) {
  if (risk >= 60) return { label: 'ALTO', color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400' }
  if (risk >= 30) return { label: 'MEDIO', color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400' }
  return { label: 'BAJO', color: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400' }
}

export default function PrestadoresPage() {
  const [providers, setProviders] = useState<ProviderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0, limit: 20 })

  const fetchProviders = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (statusFilter) params.set('status', statusFilter)
    params.set('page', String(pagination.page))
    params.set('limit', '20')

    fetch(`/api/prestadores?${params}`)
      .then(res => res.json())
      .then(d => {
        setProviders(d.data ?? [])
        if (d.pagination) setPagination(prev => ({ ...prev, ...d.pagination }))
      })
      .catch(err => console.error('Prestadores load error:', err))
       
      .finally(() => setLoading(false))
  }, [search, statusFilter, pagination.page])

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetchProviders setLoading(true) antes del fetch async; pattern a migrar a useApiQuery
  useEffect(() => { fetchProviders() }, [fetchProviders])

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPagination(p => ({ ...p, page: 1 }))
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Stats en vivo
  const stats = {
    total: providers.length,
    activos: providers.filter(p => p.status === 'ACTIVE').length,
    riesgo: providers.filter(p => p.desnaturalizacionRisk >= 60).length,
    conSuspension: providers.filter(p => p.hasSuspensionRetencion).length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white text-gray-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-primary" />
            Prestadores de Servicios
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Independientes que emiten recibos por honorarios (4ta categoría) — regidos por el Código Civil, no por el D.Leg. 728.
          </p>
        </div>
        <Link
          href="/dashboard/prestadores/nuevo"
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nuevo prestador
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Total</span>
            <Briefcase className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-white text-gray-100 mt-2">{pagination.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Activos</span>
            <ShieldCheck className="w-4 h-4 text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-400 mt-2">{stats.activos}</p>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">En riesgo</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-400 mt-2">{stats.riesgo}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Desnaturalización ≥ 60%</p>
        </div>
        <div className="bg-white rounded-xl border border-white/[0.08] p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase">Sin retención</span>
            <Receipt className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">{stats.conSuspension}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Constancia SUNAT vigente</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-white/[0.08] p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre, DNI, RUC o servicio..."
              className="w-full pl-10 pr-4 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setPagination(p => ({ ...p, page: 1 }))
            }}
            className="px-3 py-2 border border-white/[0.08] border-[color:var(--border-default)] rounded-lg text-sm bg-white bg-[color:var(--neutral-100)] text-white text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVE">Activos</option>
            <option value="AT_RISK">En riesgo</option>
            <option value="INACTIVE">Inactivos</option>
            <option value="TERMINATED">Finalizados</option>
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-white/[0.08] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : providers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[color:var(--text-secondary)]">No hay prestadores registrados</p>
            <p className="text-xs text-gray-400 mt-1">Agrega tu primer prestador de servicios para empezar.</p>
            <Link
              href="/dashboard/prestadores/nuevo"
              className="mt-4 inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90"
            >
              <Plus className="w-4 h-4" />
              Nuevo prestador
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--neutral-50)] bg-[color:var(--neutral-100)]/50 text-xs uppercase text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Prestador</th>
                  <th className="text-left px-4 py-3 font-semibold">Servicio</th>
                  <th className="text-left px-4 py-3 font-semibold">Monto mensual</th>
                  <th className="text-left px-4 py-3 font-semibold">Retención 8%</th>
                  <th className="text-left px-4 py-3 font-semibold">Riesgo</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 divide-slate-700">
                {providers.map(p => {
                  const risk = riskBadge(p.desnaturalizacionRisk)
                  const status = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.ACTIVE
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]/40 transition-colors cursor-pointer"
                      onClick={() => window.location.href = `/dashboard/prestadores/${p.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white text-gray-100">
                          {displayWorkerName(p.firstName, p.lastName)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {p.documentType} {p.documentNumber}
                          {p.ruc && <span className="ml-2">· RUC {p.ruc}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white text-gray-100 line-clamp-1 max-w-xs">
                          {p.servicioDescripcion}
                        </div>
                        {p.area && (
                          <div className="text-xs text-gray-400">{p.area}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-white text-gray-100">
                        S/ {p.monthlyAmount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3">
                        {p.hasSuspensionRetencion ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Suspendida
                          </span>
                        ) : p.monthlyAmount > 1500 ? (
                          <span className="text-xs text-amber-400 font-semibold">
                            Aplica (S/ {(p.monthlyAmount * 0.08).toFixed(2)})
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">No aplica</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', risk.color)}>
                          {risk.label} · {p.desnaturalizacionRisk}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', status.color)}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginacion */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06] border-white/[0.08]">
            <p className="text-xs text-gray-400">
              Página {pagination.page} de {pagination.totalPages} · {pagination.total} prestadores
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page === 1}
                className="p-1.5 rounded-md border border-white/[0.08] border-[color:var(--border-default)] text-gray-500 disabled:opacity-40 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPagination(p => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-1.5 rounded-md border border-white/[0.08] border-[color:var(--border-default)] text-gray-500 disabled:opacity-40 hover:bg-[color:var(--neutral-50)] hover:bg-[color:var(--neutral-100)]"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
