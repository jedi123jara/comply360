'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Plus,
  FileText,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Archive,
  PenTool,
  Eye,
  MoreVertical,
  Download,
  Loader2,
  X,
  Shield,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ContractItem {
  id: string
  title: string
  type: string
  status: string
  aiRiskScore: number | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: { firstName: string; lastName: string } | null
}

const TYPE_LABELS: Record<string, string> = {
  LABORAL_INDEFINIDO: 'Plazo Indeterminado',
  LABORAL_PLAZO_FIJO: 'Plazo Fijo',
  LOCACION_SERVICIOS: 'Locacion de Servicios',
  TIEMPO_PARCIAL: 'Tiempo Parcial',
  MYPE_MICRO: 'MYPE Microempresa',
  MYPE_PEQUENA: 'MYPE Pequena Empresa',
  CONVENIO_PRACTICAS: 'Convenio de Practicas',
  NDA: 'Confidencialidad',
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Borrador', icon: PenTool, color: 'bg-white/[0.04] text-gray-300 bg-white/[0.04] text-slate-300', dot: 'bg-gray-400' },
  IN_REVIEW: { label: 'En Revision', icon: Eye, color: 'bg-amber-100 text-amber-700 bg-amber-900/30 text-amber-400', dot: 'bg-amber-400' },
  APPROVED: { label: 'Aprobado', icon: CheckCircle, color: 'bg-blue-100 text-blue-700 bg-blue-900/30 text-blue-400', dot: 'bg-blue-500' },
  SIGNED: { label: 'Firmado', icon: CheckCircle, color: 'bg-green-100 text-green-700 bg-green-900/30 text-green-400', dot: 'bg-green-500' },
  EXPIRED: { label: 'Vencido', icon: AlertTriangle, color: 'bg-red-100 text-red-700 bg-red-900/30 text-red-400', dot: 'bg-red-500' },
  ARCHIVED: { label: 'Archivado', icon: Archive, color: 'bg-slate-100 text-slate-600 bg-white/[0.04] text-gray-400', dot: 'bg-slate-400' },
}

type ViewMode = 'list' | 'kanban'

export default function ContratosPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [contracts, setContracts] = useState<ContractItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 })
  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput)
      setPagination(p => ({ ...p, page: 1 })) // Reset to page 1 on new search
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter) params.set('status', statusFilter)
    if (typeFilter) params.set('type', typeFilter)
    params.set('page', String(pagination.page))
    params.set('limit', '50')

    fetch(`/api/contracts?${params}`)
      .then(res => res.json())
      .then(d => {
        setContracts(d.data ?? [])
        if (d.pagination) setPagination(prev => ({ ...prev, ...d.pagination }))
      })
      .catch(err => console.error('Contracts load error:', err))
      .finally(() => setLoading(false))
  }, [searchQuery, statusFilter, typeFilter, pagination.page])

  const filtered = contracts

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contratos</h1>
          <p className="text-gray-500 text-gray-400 mt-1">
            Gestiona, genera y revisa todos los contratos de tu organizacion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/trabajadores/importar-pdf"
            className="flex items-center gap-2 px-4 py-2.5 border border-amber-300 bg-amber-50 text-amber-800 rounded-xl text-sm font-semibold hover:bg-amber-100 transition-colors"
          >
            <Download className="w-4 h-4" />
            Importar legajo PDF
          </Link>
          <Link
            href="/dashboard/contratos/nuevo"
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1e3a6e] hover:bg-[#162d57] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4" />
            Nuevo Contrato
          </Link>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar contratos..."
              className="w-full pl-10 pr-4 py-2.5 border border-white/10 border-slate-600 bg-white/[0.04] text-gray-200 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors',
              showFilters
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-white/10 border-white/[0.08] text-gray-300 text-gray-200 hover:bg-white/[0.02] hover:bg-white/[0.04]'
            )}
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          <div className="flex border border-white/10 border-white/[0.08] rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04]'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm ${viewMode === 'kanban' ? 'bg-primary text-white' : 'text-slate-300 hover:bg-white/[0.02] hover:bg-white/[0.04]'}`}
            >
              Kanban
            </button>
          </div>
        </div>

        {/* Filters row */}
        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
              className="px-3 py-2 border border-white/10 border-slate-600 bg-white/[0.04] text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
              className="px-3 py-2 border border-white/10 border-slate-600 bg-white/[0.04] text-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            {(statusFilter || typeFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setTypeFilter('') }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <X className="w-3 h-3" /> Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'ARCHIVED').map(([key, config]) => {
          const count = contracts.filter(c => c.status === key).length
          return (
            <div key={key} className="bg-[#141824] rounded-xl border border-white/[0.08] p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                <span className="text-xs font-medium text-gray-500 text-gray-400">{config.label}</span>
              </div>
              <span className="text-2xl font-bold text-white">{count}</span>
            </div>
          )
        })}
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-[#141824] rounded-2xl border border-white/[0.08] shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] border-white/[0.08] bg-white/[0.02]/50 bg-white/[0.04]/50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Contrato</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Score IA</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 text-gray-400 uppercase tracking-wider">Actualizado</th>
                <th className="text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 divide-slate-700">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <FileText className="w-8 h-8 text-gray-300 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 text-gray-400">No hay contratos todavia</p>
                    <p className="text-xs text-gray-400 text-slate-500 mt-1">Crea tu primer contrato para empezar</p>
                  </td>
                </tr>
              )}
              {filtered.map(contract => {
                const status = STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG]
                const StatusIcon = status.icon
                return (
                  <tr key={contract.id} className="hover:bg-white/[0.02]/50 hover:bg-white/[0.04]/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/contratos/${contract.id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-white text-slate-100 group-hover:text-primary transition-colors">{contract.title}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-300">{TYPE_LABELS[contract.type] || contract.type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {contract.aiRiskScore !== null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                contract.aiRiskScore >= 80 ? 'bg-green-500' :
                                contract.aiRiskScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${contract.aiRiskScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-300">{contract.aiRiskScore}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 text-slate-500">Sin revisar</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 text-gray-400">
                        <Clock className="w-3 h-3" />
                        {new Date(contract.updatedAt).toLocaleDateString('es-PE')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Link
                          href={`/dashboard/contratos/${contract.id}/analisis`}
                          className="p-2 hover:bg-primary/10 text-gray-400 hover:text-primary rounded-lg transition-colors"
                          title="Análisis Normativo"
                        >
                          <Shield className="w-4 h-4" />
                        </Link>
                        <Link
                          href={`/dashboard/contratos/${contract.id}`}
                          className="p-2 hover:bg-white/[0.04] rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4 text-gray-400 text-slate-500" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'ARCHIVED').map(([statusKey, config]) => {
            const contracts = filtered.filter(c => c.status === statusKey)
            return (
              <div key={statusKey} className="min-w-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className="text-sm font-semibold text-gray-300 text-gray-200">{config.label}</span>
                  <span className="text-xs bg-white/[0.04] text-gray-500 text-gray-400 px-1.5 py-0.5 rounded-full">{contracts.length}</span>
                </div>
                <div className="space-y-2">
                  {contracts.map(contract => (
                    <Link
                      key={contract.id}
                      href={`/dashboard/contratos/${contract.id}`}
                      className="block bg-[#141824] rounded-xl border border-white/[0.08] p-4 hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-semibold text-white text-slate-100 line-clamp-2">{contract.title}</span>
                      </div>
                      <span className="text-xs text-gray-500 text-gray-400">{TYPE_LABELS[contract.type] || contract.type.replace(/_/g, ' ')}</span>
                      {contract.aiRiskScore !== null && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                contract.aiRiskScore >= 80 ? 'bg-green-500' :
                                contract.aiRiskScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${contract.aiRiskScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-500 text-gray-400">{contract.aiRiskScore}%</span>
                        </div>
                      )}
                    </Link>
                  ))}
                  {contracts.length === 0 && (
                    <div className="bg-white/[0.02] bg-white/50 rounded-xl border border-dashed border-white/10 border-slate-600 p-4 text-center">
                      <span className="text-xs text-gray-400 text-slate-500">Sin contratos</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
