'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Download,
  Loader2,
  X,
  Shield,
  User,
  CalendarX,
  Sparkles,
} from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { PremiumEmptyState } from '@/components/comply360/premium-empty-state'

interface ContractWorker {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
}

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
  worker: ContractWorker | null
}

interface ContractStats {
  byStatus: { DRAFT: number; IN_REVIEW: number; APPROVED: number; SIGNED: number; EXPIRED: number; ARCHIVED: number }
  byType: Record<string, number>
  expiringIn30Days: number
  withoutAiReview: number
  totalActive: number
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
  DRAFT: { label: 'Borrador', icon: PenTool, color: 'bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)]', dot: 'bg-gray-400' },
  IN_REVIEW: { label: 'En Revision', icon: Eye, color: 'bg-amber-900/30 text-amber-400', dot: 'bg-amber-400' },
  APPROVED: { label: 'Aprobado', icon: CheckCircle, color: 'bg-blue-900/30 text-emerald-600', dot: 'bg-blue-500' },
  SIGNED: { label: 'Firmado', icon: CheckCircle, color: 'bg-green-900/30 text-green-400', dot: 'bg-green-500' },
  EXPIRED: { label: 'Vencido', icon: AlertTriangle, color: 'bg-red-900/30 text-red-400', dot: 'bg-red-500' },
  ARCHIVED: { label: 'Archivado', icon: Archive, color: 'bg-[color:var(--neutral-100)] text-gray-400', dot: 'bg-slate-400' },
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
  const [stats, setStats] = useState<ContractStats | null>(null)

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchQuery(searchInput)
      setPagination(p => ({ ...p, page: 1 }))
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch pattern estándar; migrar a useApiQuery en refactor futuro.
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

  // Load org-wide stats once on mount
  const fetchStats = useCallback(() => {
    fetch('/api/contracts?stats=1')
      .then(res => res.json())
      .then(d => setStats(d))
      .catch(() => {})
  }, [])
  useEffect(() => { fetchStats() }, [fetchStats])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header editorial (Emerald Light) */}
      <PageHeader
        eyebrow="Contratos & Docs"
        title="Genera, revisa y vigila tus <em>contratos laborales</em>."
        subtitle="Desde indefinidos hasta MYPE y locación de servicios. Cada contrato queda enlazado al legajo del trabajador y al motor de alertas de vencimiento."
        actions={
          <>
            <a
              href="/api/export?type=contracts&format=xlsx"
              className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] hover:border-emerald-500/60 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar Excel
            </a>
            <Link
              href="/dashboard/trabajadores/importar-pdf"
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Importar legajo PDF
            </Link>
            <Link
              href="/dashboard/contratos/nuevo"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-semibold transition-colors"
              style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nuevo Contrato
            </Link>
          </>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar contratos..."
              className="w-full pl-10 pr-4 py-2.5 border border-white/[0.08] bg-[color:var(--neutral-100)] text-[color:var(--text-secondary)] placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors',
              showFilters
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-white/[0.08] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)]'
            )}
          >
            <Filter className="w-4 h-4" />
            Filtrar
          </button>
          {pagination.total > 0 && (
            <span className="text-sm text-gray-500 ml-1">
              {pagination.total} contrato{pagination.total !== 1 ? 's' : ''}
            </span>
          )}
          <div className="flex border border-white/[0.08] rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm ${viewMode === 'list' ? 'bg-primary text-white' : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)]'}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-2 text-sm ${viewMode === 'kanban' ? 'bg-primary text-white' : 'text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)]'}`}
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
              className="px-3 py-2 border border-white/[0.08] bg-white text-[color:var(--text-secondary)] rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={e => { setTypeFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })) }}
              className="px-3 py-2 border border-white/[0.08] bg-white text-[color:var(--text-secondary)] rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
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

      {/* Stats — org-wide, from API */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'ARCHIVED').map(([key, config]) => {
          const count = stats ? stats.byStatus[key as keyof typeof stats.byStatus] : null
          return (
            <div key={key} className="bg-white rounded-xl border border-white/[0.08] p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                <span className="text-xs font-medium text-gray-400">{config.label}</span>
              </div>
              <span className="text-2xl font-bold text-white">{count ?? '—'}</span>
            </div>
          )
        })}
        {/* Vencen pronto */}
        {stats && stats.expiringIn30Days > 0 && (
          <div className="bg-amber-900/20 rounded-xl border border-amber-500/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarX className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Vencen pronto</span>
            </div>
            <span className="text-2xl font-bold text-amber-700">{stats.expiringIn30Days}</span>
            <p className="text-[10px] text-amber-500 mt-0.5">en los próximos 30 días</p>
          </div>
        )}
        {/* Sin revisión IA */}
        {stats && stats.withoutAiReview > 0 && (
          <div className="bg-purple-900/20 rounded-xl border border-purple-500/20 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-medium text-purple-400">Sin análisis IA</span>
            </div>
            <span className="text-2xl font-bold text-purple-300">{stats.withoutAiReview}</span>
          </div>
        )}
      </div>

      {/* Empty state editorial — se muestra antes de la tabla si no hay contratos */}
      {viewMode === 'list' && contracts.length === 0 && (
        <PremiumEmptyState
          icon={FileText}
          variant="invite"
          eyebrow="Primer contrato"
          title="Genera tu primer contrato con <em>IA</em>."
          subtitle="Plazo fijo, indefinido, locación de servicios o MYPE. 19 cláusulas obligatorias según normativa peruana incluidas. Cada contrato queda enlazado al legajo del trabajador."
          hints={[
            { icon: Sparkles, text: 'Generación IA o desde plantilla' },
            { icon: Shield, text: '19 cláusulas obligatorias auditadas' },
            { icon: CheckCircle, text: 'Export PDF/DOCX listos para firmar' },
          ]}
          cta={{
            label: 'Crear contrato',
            href: '/dashboard/contratos/nuevo',
          }}
          secondaryCta={{
            label: 'Importar legajo desde PDF',
            href: '/dashboard/trabajadores/importar-pdf',
          }}
          helpLink={{ label: 'Ver 3 templates disponibles', href: '/dashboard/contratos/nuevo' }}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && contracts.length > 0 && (
        <div className="bg-white rounded-2xl border border-[color:var(--border-default)] shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)]">
                <th className="text-left px-6 py-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Contrato</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Trabajador</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Tipo</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Estado</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Score IA</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[color:var(--text-tertiary)] uppercase tracking-wider">Vencimiento</th>
                <th className="text-right px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--border-subtle)]">

              {contracts.map(contract => {
                const status = STATUS_CONFIG[contract.status as keyof typeof STATUS_CONFIG]
                const StatusIcon = status.icon

                // Expiry helpers
                const expiresAt = contract.expiresAt ? new Date(contract.expiresAt) : null
                const now = new Date()
                const daysUntilExpiry = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : null
                const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 30
                const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0

                return (
                  <tr key={contract.id} className="hover:bg-[color:var(--neutral-100)] transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/contratos/${contract.id}`} className="flex items-center gap-3 group">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-semibold text-white group-hover:text-primary transition-colors">{contract.title}</span>
                      </Link>
                    </td>
                    {/* Trabajador vinculado */}
                    <td className="px-6 py-4">
                      {contract.worker ? (
                        <Link href={`/dashboard/trabajadores/${contract.worker.id}`} className="flex items-center gap-2 group">
                          <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[color:var(--text-secondary)] group-hover:text-primary transition-colors">
                              {displayWorkerName(contract.worker.firstName, contract.worker.lastName)}
                            </div>
                            <div className="text-[10px] text-gray-500">{contract.worker.dni}</div>
                          </div>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-600 italic">Sin asignar</span>
                      )}
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
                          <div className="w-16 h-2 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
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
                        <span className="text-xs text-gray-500 italic">Sin revisar</span>
                      )}
                    </td>
                    {/* Vencimiento con badge de urgencia */}
                    <td className="px-6 py-4">
                      {expiresAt ? (
                        <div>
                          <div className={cn('text-xs font-medium', isExpired ? 'text-red-400' : isExpiringSoon ? 'text-amber-400' : 'text-gray-400')}>
                            {expiresAt.toLocaleDateString('es-PE')}
                          </div>
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                              <AlertTriangle className="w-2.5 h-2.5" /> Vencido
                            </span>
                          )}
                          {isExpiringSoon && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
                              <Clock className="w-2.5 h-2.5" /> Vence en {daysUntilExpiry}d
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
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
                          className="p-2 hover:bg-[color:var(--neutral-100)] rounded-lg transition-colors"
                          title="Ver detalle"
                        >
                          <Eye className="w-4 h-4 text-slate-500" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
              <p className="text-sm text-gray-400">
                {((pagination.page - 1) * 50) + 1}–{Math.min(pagination.page * 50, pagination.total)} de {pagination.total} contratos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-white/[0.08] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-400 px-2">{pagination.page} / {pagination.totalPages}</span>
                <button
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-white/[0.08] text-[color:var(--text-secondary)] hover:bg-[color:var(--neutral-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'ARCHIVED').map(([statusKey, config]) => {
            const colContracts = contracts.filter(c => c.status === statusKey)
            return (
              <div key={statusKey} className="min-w-0">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                  <span className="text-sm font-semibold text-[color:var(--text-secondary)]">{config.label}</span>
                  <span className="text-xs bg-[color:var(--neutral-100)] text-gray-400 px-1.5 py-0.5 rounded-full">{colContracts.length}</span>
                </div>
                <div className="space-y-2">
                  {colContracts.map(contract => (
                    <Link
                      key={contract.id}
                      href={`/dashboard/contratos/${contract.id}`}
                      className="block bg-white rounded-xl border border-white/[0.08] p-4 hover:shadow-md hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-sm font-semibold text-white line-clamp-2">{contract.title}</span>
                      </div>
                      <span className="text-xs text-gray-400">{TYPE_LABELS[contract.type] || contract.type.replace(/_/g, ' ')}</span>
                      {contract.aiRiskScore !== null && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[color:var(--neutral-100)] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                contract.aiRiskScore >= 80 ? 'bg-green-500' :
                                contract.aiRiskScore >= 60 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${contract.aiRiskScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-400">{contract.aiRiskScore}%</span>
                        </div>
                      )}
                    </Link>
                  ))}
                  {colContracts.length === 0 && (
                    <div className="bg-[color:var(--neutral-50)] rounded-xl border border-dashed border-white/[0.08] p-4 text-center">
                      <span className="text-xs text-gray-500">Sin contratos</span>
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
