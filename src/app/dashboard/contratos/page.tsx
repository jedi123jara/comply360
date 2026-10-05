'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
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
  Activity,
  ChevronDown,
  Files,
  FileUp,
  RefreshCw,
} from 'lucide-react'
import { cn, displayWorkerName } from '@/lib/utils'
import { PageHeader } from '@/components/comply360/editorial-title'
import { PremiumEmptyState } from '@/components/comply360/premium-empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown'
import {
  CONTRACT_STATUS_KEYS,
  CONTRACT_TYPE_LABELS,
  EXPIRING_SOON_DAYS,
  applyFilterPatch,
  buildContractsApiQuery,
  hasActiveFilters,
  parseContractListFilters,
  serializeContractListFilters,
  type ContractListFilters,
  type ContractStatusKey,
} from './_lib/list-filters'

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
  byStatus: Record<ContractStatusKey, number>
  byType: Record<string, number>
  expiringIn30Days: number
  withoutAiReview: number
  totalActive: number
}

interface PaginationInfo {
  page: number
  total: number
  totalPages: number
}

interface ListResult {
  /** Query con la que se pidió este resultado (permite saber si está desactualizado). */
  key: string
  contracts: ContractItem[]
  pagination: PaginationInfo
  failed: boolean
  /** Momento de la consulta: base para calcular los días que faltan para vencer. */
  fetchedAt: number
}

const PAGE_SIZE = 50

const STATUS_CONFIG: Record<
  ContractStatusKey,
  { label: string; hint: string; icon: typeof PenTool; badge: string; dot: string }
> = {
  DRAFT: {
    label: 'Borrador',
    hint: 'Aún en preparación',
    icon: PenTool,
    badge: 'bg-slate-100 text-slate-700',
    dot: 'bg-slate-400',
  },
  IN_REVIEW: {
    label: 'En revisión',
    hint: 'Esperando revisión',
    icon: Eye,
    badge: 'bg-amber-50 text-amber-800',
    dot: 'bg-amber-500',
  },
  APPROVED: {
    label: 'Aprobado',
    hint: 'Listo para firmar',
    icon: CheckCircle,
    badge: 'bg-blue-50 text-blue-800',
    dot: 'bg-blue-500',
  },
  SIGNED: {
    label: 'Firmado',
    hint: 'Firmado por las partes',
    icon: CheckCircle,
    badge: 'bg-emerald-50 text-emerald-800',
    dot: 'bg-emerald-500',
  },
  EXPIRED: {
    label: 'Vencido',
    hint: 'Su plazo ya terminó',
    icon: AlertTriangle,
    badge: 'bg-red-50 text-red-700',
    dot: 'bg-red-500',
  },
  ARCHIVED: {
    label: 'Archivado',
    hint: 'Guardado como histórico',
    icon: Archive,
    badge: 'bg-slate-100 text-slate-500',
    dot: 'bg-slate-300',
  },
}

/** Estados que se muestran como tarjetas de resumen (los archivados no). */
const SUMMARY_STATUSES: ContractStatusKey[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED', 'EXPIRED']

function statusConfigFor(status: string) {
  return STATUS_CONFIG[status as ContractStatusKey] ?? STATUS_CONFIG.DRAFT
}

function typeLabel(type: string) {
  return CONTRACT_TYPE_LABELS[type] ?? type.replace(/_/g, ' ').toLowerCase()
}

function ContratosPageInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // La URL es la fuente de verdad de los filtros (?status=, ?type=, ?q=, ?vence=, ?page=)
  const filters = useMemo(() => parseContractListFilters(searchParams), [searchParams])
  const apiQuery = useMemo(() => buildContractsApiQuery(filters, PAGE_SIZE), [filters])

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')
  const [searchInput, setSearchInput] = useState(filters.search)
  const [showFilters, setShowFilters] = useState(Boolean(filters.type))
  const [result, setResult] = useState<ListResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [stats, setStats] = useState<ContractStats | null>(null)

  // history.replaceState se integra con el router de Next: actualiza useSearchParams
  // al instante y sin pedir la página al servidor en cada clic de filtro.
  const updateFilters = useCallback(
    (patch: Partial<ContractListFilters>) => {
      const next = applyFilterPatch(filters, patch)
      const query = serializeContractListFilters(next)
      window.history.replaceState(null, '', query ? `${pathname}?${query}` : pathname)
    },
    [filters, pathname],
  )

  const clearAllFilters = () => {
    setSearchInput('')
    window.history.replaceState(null, '', pathname)
  }

  // Si la búsqueda de la URL cambia desde fuera (menú lateral, botón atrás),
  // el cuadro de búsqueda se actualiza. Si el cambio lo hicimos nosotros, no
  // se toca para no borrar lo que la persona sigue escribiendo.
  const [syncedSearch, setSyncedSearch] = useState(filters.search)
  const [pushedSearch, setPushedSearch] = useState<string | null>(null)
  if (filters.search !== syncedSearch) {
    setSyncedSearch(filters.search)
    if (filters.search === pushedSearch) setPushedSearch(null)
    else setSearchInput(filters.search)
  }

  // Búsqueda con espera de 400 ms para no consultar en cada tecla
  useEffect(() => {
    const trimmed = searchInput.trim()
    if (trimmed === filters.search) return
    const t = setTimeout(() => {
      setPushedSearch(trimmed)
      updateFilters({ search: trimmed })
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput, filters.search, updateFilters])

  // Listado
  useEffect(() => {
    let cancelled = false
    fetch(`/api/contracts?${apiQuery}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((d: { data?: ContractItem[]; pagination?: Partial<PaginationInfo> }) => {
        if (cancelled) return
        setResult({
          key: apiQuery,
          contracts: d.data ?? [],
          pagination: {
            page: d.pagination?.page ?? filters.page,
            total: d.pagination?.total ?? 0,
            totalPages: d.pagination?.totalPages ?? 0,
          },
          failed: false,
          fetchedAt: Date.now(),
        })
      })
      .catch(err => {
        console.error('Contracts load error:', err)
        if (cancelled) return
        setResult({
          key: apiQuery,
          contracts: [],
          pagination: { page: filters.page, total: 0, totalPages: 0 },
          failed: true,
          fetchedAt: Date.now(),
        })
      })
    return () => {
      cancelled = true
    }
  }, [apiQuery, filters.page, reloadToken])

  // Resumen de toda la organización (no depende de los filtros)
  useEffect(() => {
    let cancelled = false
    fetch('/api/contracts?stats=1')
      .then(res => (res.ok ? res.json() : null))
      .then((d: ContractStats | null) => {
        if (!cancelled && d?.byStatus) setStats(d)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const isFirstLoad = result === null
  const isRefreshing = result !== null && result.key !== apiQuery
  const contracts = result?.contracts ?? []
  const referenceNow = result?.fetchedAt ?? 0
  const pagination = result?.pagination ?? { page: filters.page, total: 0, totalPages: 0 }
  const filtersActive = hasActiveFilters(filters)
  const loadFailed = result?.failed === true && !isRefreshing

  const toggleStatusCard = (status: ContractStatusKey) => {
    if (filters.status === status && !filters.expiringSoon) {
      updateFilters({ status: null })
    } else {
      updateFilters({ status, expiringSoon: false })
    }
  }

  const toggleExpiringCard = () => {
    if (filters.expiringSoon && !filters.status) {
      updateFilters({ expiringSoon: false })
    } else {
      updateFilters({ expiringSoon: true, status: null })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Contratos y documentos"
        title="Genera, revisa y vigila tus <em>contratos laborales</em>."
        subtitle="Desde indeterminados hasta locación de servicios. Cada contrato queda enlazado a la ficha del trabajador y te avisamos antes de que venza."
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-xs font-semibold text-[color:var(--text-primary)] transition-colors hover:border-emerald-500/60 data-[state=open]:border-emerald-500/60"
                >
                  Más opciones
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[290px]">
                <DropdownMenuLabel>Crear o subir</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/contratos/bulk" className="cursor-pointer items-start">
                    <Files className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-[color:var(--text-primary)]">
                        Crear varios contratos a la vez
                      </span>
                      <span className="text-xs text-[color:var(--text-tertiary)]">
                        Sube un Excel y genera un contrato por cada trabajador
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/trabajadores/importar-pdf" className="cursor-pointer items-start">
                    <FileUp className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-[color:var(--text-primary)]">
                        Subir contratos que ya tienes en PDF
                      </span>
                      <span className="text-xs text-[color:var(--text-tertiary)]">
                        Leemos tus contratos y registramos a cada trabajador
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Revisar y descargar</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/contratos/operaciones" className="cursor-pointer items-start">
                    <Activity className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-[color:var(--text-primary)]">
                        Ver pendientes de todos los contratos
                      </span>
                      <span className="text-xs text-[color:var(--text-tertiary)]">
                        Anexos faltantes, avisos de calidad y firmas por confirmar
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/api/export?type=contracts&format=xlsx" className="cursor-pointer items-start">
                    <Download className="mt-0.5 h-4 w-4 text-emerald-600" aria-hidden="true" />
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-[color:var(--text-primary)]">
                        Descargar la lista en Excel
                      </span>
                      <span className="text-xs text-[color:var(--text-tertiary)]">
                        Todos tus contratos en una hoja de cálculo
                      </span>
                    </span>
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Link
              href="/dashboard/contratos/nuevo"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              style={{ boxShadow: '0 1px 2px rgba(4,120,87,0.18), inset 0 1px 0 rgba(255,255,255,0.12)' }}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Nuevo contrato
            </Link>
          </>
        }
      />

      {/* Resumen: cada tarjeta filtra el listado */}
      <section aria-label="Resumen de contratos" className="space-y-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SUMMARY_STATUSES.map(key => {
            const config = STATUS_CONFIG[key]
            const count = stats ? stats.byStatus[key] : null
            const active = filters.status === key && !filters.expiringSoon
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStatusCard(key)}
                aria-pressed={active}
                title={active ? 'Quitar este filtro' : `Ver solo contratos: ${config.label.toLowerCase()}`}
                className={cn(
                  'rounded-xl border bg-white p-4 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  active
                    ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                    : 'border-[color:var(--border-default)] hover:border-emerald-400',
                )}
              >
                <span className="mb-1 flex items-center gap-2">
                  <span className={cn('h-2 w-2 rounded-full', config.dot)} aria-hidden="true" />
                  <span className="text-xs font-semibold text-slate-600">{config.label}</span>
                </span>
                <span className="block text-2xl font-bold text-slate-900">{count ?? '—'}</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">{config.hint}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={toggleExpiringCard}
            aria-pressed={filters.expiringSoon && !filters.status}
            title={
              filters.expiringSoon
                ? 'Quitar este filtro'
                : `Ver solo los contratos que vencen en los próximos ${EXPIRING_SOON_DAYS} días`
            }
            className={cn(
              'rounded-xl border bg-amber-50 p-4 text-left transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
              filters.expiringSoon && !filters.status
                ? 'border-amber-500 ring-2 ring-amber-500/40'
                : 'border-amber-200 hover:border-amber-400',
            )}
          >
            <span className="mb-1 flex items-center gap-2">
              <CalendarX className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
              <span className="text-xs font-semibold text-amber-800">Vencen pronto</span>
            </span>
            <span className="block text-2xl font-bold text-amber-900">{stats ? stats.expiringIn30Days : '—'}</span>
            <span className="mt-0.5 block text-[11px] text-amber-700">
              en los próximos {EXPIRING_SOON_DAYS} días
            </span>
          </button>
        </div>
        <p className="text-xs text-slate-500">Haz clic en una tarjeta para ver solo esos contratos.</p>
        {stats && stats.withoutAiReview > 0 && (
          <p className="flex items-start gap-1.5 text-xs text-slate-600">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-500" aria-hidden="true" />
            <span>
              {stats.withoutAiReview === 1
                ? '1 contrato aún no tiene análisis con IA.'
                : `${stats.withoutAiReview} contratos aún no tienen análisis con IA.`}{' '}
              Usa el ícono de escudo de cada contrato para revisarlo.
            </span>
          </p>
        )}
      </section>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Buscar por nombre del contrato…"
              aria-label="Buscar contratos"
              className="w-full rounded-xl border border-[color:var(--border-default)] bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters(prev => !prev)}
            aria-expanded={showFilters}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              showFilters
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-[color:var(--border-default)] bg-white text-slate-700 hover:bg-slate-50',
            )}
          >
            <Filter className="h-4 w-4" aria-hidden="true" />
            Filtrar
          </button>
          {!isFirstLoad && (
            <span className="ml-1 text-sm text-slate-500" aria-live="polite">
              {isRefreshing ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Actualizando…
                </span>
              ) : (
                `${pagination.total} contrato${pagination.total !== 1 ? 's' : ''}`
              )}
            </span>
          )}
          <div className="ml-auto flex overflow-hidden rounded-xl border border-[color:var(--border-default)]" role="group" aria-label="Forma de ver los contratos">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-pressed={viewMode === 'list'}
              className={cn(
                'px-3 py-2 text-sm',
                viewMode === 'list' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              Lista
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              aria-pressed={viewMode === 'kanban'}
              className={cn(
                'px-3 py-2 text-sm',
                viewMode === 'kanban' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-50',
              )}
            >
              Tablero
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[color:var(--border-default)] bg-slate-50 p-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Estado
              <select
                value={filters.status ?? ''}
                onChange={e => updateFilters({ status: (e.target.value || null) as ContractStatusKey | null })}
                className="rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Todos los estados</option>
                {CONTRACT_STATUS_KEYS.map(key => (
                  <option key={key} value={key}>{STATUS_CONFIG[key].label}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
              Tipo de contrato
              <select
                value={filters.type ?? ''}
                onChange={e => updateFilters({ type: e.target.value || null })}
                className="rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-2 text-sm font-normal text-slate-800 focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">Todos los tipos</option>
                {Object.entries(CONTRACT_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filters.expiringSoon}
                onChange={e => updateFilters({ expiringSoon: e.target.checked })}
                className="h-4 w-4 accent-emerald-600"
              />
              Solo los que vencen en {EXPIRING_SOON_DAYS} días
            </label>
          </div>
        )}

        {/* Filtros activos */}
        {filtersActive && (
          <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
            <span className="text-xs font-semibold text-slate-500">Mostrando:</span>
            {filters.status && (
              <FilterChip
                label={`Estado: ${STATUS_CONFIG[filters.status].label}`}
                onRemove={() => updateFilters({ status: null })}
              />
            )}
            {filters.expiringSoon && (
              <FilterChip
                label={`Vencen en los próximos ${EXPIRING_SOON_DAYS} días`}
                onRemove={() => updateFilters({ expiringSoon: false })}
              />
            )}
            {filters.type && (
              <FilterChip
                label={`Tipo: ${typeLabel(filters.type)}`}
                onRemove={() => updateFilters({ type: null })}
              />
            )}
            {filters.search && (
              <FilterChip
                label={`Búsqueda: «${filters.search}»`}
                onRemove={() => {
                  setSearchInput('')
                  updateFilters({ search: '' })
                }}
              />
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs font-semibold text-emerald-700 hover:underline"
            >
              Ver todos los contratos
            </button>
          </div>
        )}
      </div>

      {/* Contenido */}
      {isFirstLoad ? (
        <div className="flex min-h-[260px] items-center justify-center" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-hidden="true" />
          <span className="sr-only">Cargando contratos…</span>
        </div>
      ) : loadFailed ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-red-600" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-red-900">No pudimos cargar tus contratos.</p>
          <p className="text-xs text-red-800">Revisa tu conexión e inténtalo otra vez.</p>
          <button
            type="button"
            onClick={() => setReloadToken(t => t + 1)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Reintentar
          </button>
        </div>
      ) : contracts.length === 0 && !filtersActive ? (
        <PremiumEmptyState
          icon={FileText}
          variant="invite"
          eyebrow="Primer contrato"
          title="Crea tu primer <em>contrato</em>."
          subtitle="Plazo indeterminado, plazo fijo, tiempo parcial o locación de servicios. Si no sabes cuál usar, te ayudamos a elegir con unas preguntas simples."
          hints={[
            { icon: Sparkles, text: 'Desde un modelo o con ayuda de la IA' },
            { icon: Shield, text: 'Revisión de calidad antes de descargar' },
            { icon: CheckCircle, text: 'Descarga en Word lista para firmar' },
          ]}
          cta={{
            label: 'Crear contrato',
            href: '/dashboard/contratos/nuevo',
          }}
          secondaryCta={{
            label: 'Subir contratos que ya tienes',
            href: '/dashboard/trabajadores/importar-pdf',
          }}
        />
      ) : contracts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--border-default)] bg-white p-8 text-center">
          <Search className="mx-auto h-6 w-6 text-slate-400" aria-hidden="true" />
          <p className="mt-2 text-sm font-semibold text-slate-900">No hay contratos con estos filtros.</p>
          <p className="text-xs text-slate-500">Prueba con otro filtro o vuelve a ver la lista completa.</p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[color:var(--border-default)] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Quitar filtros
          </button>
        </div>
      ) : viewMode === 'list' ? (
        <div
          className={cn(
            'overflow-hidden rounded-2xl border border-[color:var(--border-default)] bg-white shadow-sm transition-opacity',
            isRefreshing && 'opacity-60',
          )}
          aria-busy={isRefreshing}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[color:var(--border-default)] bg-[color:var(--neutral-50)]">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Contrato</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Trabajador</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Análisis IA</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--text-tertiary)]">Vencimiento</th>
                  <th className="px-6 py-3 text-right"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--border-subtle)]">
                {contracts.map(contract => {
                  const status = statusConfigFor(contract.status)
                  const StatusIcon = status.icon

                  const expiresAt = contract.expiresAt ? new Date(contract.expiresAt) : null
                  const daysUntilExpiry = expiresAt
                    ? Math.ceil((expiresAt.getTime() - referenceNow) / 86400000)
                    : null
                  const isExpiringSoon =
                    daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= EXPIRING_SOON_DAYS
                  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0

                  return (
                    <tr key={contract.id} className="transition-colors hover:bg-[color:var(--neutral-50)]">
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/contratos/${contract.id}`} className="group flex items-center gap-3">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                            <FileText className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                          </span>
                          <span className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-emerald-700">
                            {contract.title}
                          </span>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {contract.worker ? (
                          <Link href={`/dashboard/trabajadores/${contract.worker.id}`} className="group flex items-center gap-2">
                            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50">
                              <User className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                            </span>
                            <span>
                              <span className="block text-xs font-semibold text-slate-700 transition-colors group-hover:text-emerald-700">
                                {displayWorkerName(contract.worker.firstName, contract.worker.lastName)}
                              </span>
                              <span className="block text-[10px] text-slate-500">DNI {contract.worker.dni}</span>
                            </span>
                          </Link>
                        ) : (
                          <span className="text-xs italic text-slate-500">Sin trabajador asignado</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-700">{typeLabel(contract.type)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold', status.badge)}>
                          <StatusIcon className="h-3 w-3" aria-hidden="true" />
                          {status.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {contract.aiRiskScore !== null ? (
                          <div className="flex items-center gap-2" title="Puntaje del análisis con IA (100 = sin riesgos detectados)">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  contract.aiRiskScore >= 80
                                    ? 'bg-emerald-500'
                                    : contract.aiRiskScore >= 60
                                      ? 'bg-amber-500'
                                      : 'bg-red-500',
                                )}
                                style={{ width: `${contract.aiRiskScore}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-slate-700">{contract.aiRiskScore}</span>
                          </div>
                        ) : (
                          <span className="text-xs italic text-slate-500">Sin revisar</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {expiresAt ? (
                          <div>
                            <div
                              className={cn(
                                'text-xs font-medium',
                                isExpired ? 'text-red-700' : isExpiringSoon ? 'text-amber-700' : 'text-slate-600',
                              )}
                            >
                              {expiresAt.toLocaleDateString('es-PE')}
                            </div>
                            {isExpired && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-700">
                                <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" /> Vencido
                              </span>
                            )}
                            {isExpiringSoon && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                                <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                                Vence en {daysUntilExpiry} {daysUntilExpiry === 1 ? 'día' : 'días'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500" title="Sin fecha de fin">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/contratos/${contract.id}/analisis`}
                            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                            title="Análisis normativo"
                            aria-label={`Análisis normativo de ${contract.title}`}
                          >
                            <Shield className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          <Link
                            href={`/dashboard/contratos/${contract.id}`}
                            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100"
                            title="Ver detalle"
                            aria-label={`Ver detalle de ${contract.title}`}
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--border-subtle)] px-6 py-4">
              <p className="text-sm text-slate-500">
                {(pagination.page - 1) * PAGE_SIZE + 1}–{Math.min(pagination.page * PAGE_SIZE, pagination.total)} de {pagination.total} contratos
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateFilters({ page: pagination.page - 1 })}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-[color:var(--border-default)] px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="px-2 text-sm text-slate-500">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => updateFilters({ page: pagination.page + 1 })}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-[color:var(--border-default)] px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-1 gap-4 transition-opacity md:grid-cols-3 lg:grid-cols-5',
            isRefreshing && 'opacity-60',
          )}
          aria-busy={isRefreshing}
        >
          {SUMMARY_STATUSES.map(statusKey => {
            const config = STATUS_CONFIG[statusKey]
            const colContracts = contracts.filter(c => c.status === statusKey)
            return (
              <div key={statusKey} className="min-w-0">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={cn('h-2 w-2 rounded-full', config.dot)} aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-700">{config.label}</span>
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">{colContracts.length}</span>
                </div>
                <div className="space-y-2">
                  {colContracts.map(contract => (
                    <Link
                      key={contract.id}
                      href={`/dashboard/contratos/${contract.id}`}
                      className="block rounded-xl border border-[color:var(--border-default)] bg-white p-4 transition-all hover:border-emerald-400 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-start gap-2">
                        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-700" aria-hidden="true" />
                        <span className="line-clamp-2 text-sm font-semibold text-slate-900">{contract.title}</span>
                      </div>
                      <span className="text-xs text-slate-500">{typeLabel(contract.type)}</span>
                      {contract.aiRiskScore !== null && (
                        <div className="mt-3 flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={cn(
                                'h-full rounded-full',
                                contract.aiRiskScore >= 80
                                  ? 'bg-emerald-500'
                                  : contract.aiRiskScore >= 60
                                    ? 'bg-amber-500'
                                    : 'bg-red-500',
                              )}
                              style={{ width: `${contract.aiRiskScore}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-500">{contract.aiRiskScore}%</span>
                        </div>
                      )}
                    </Link>
                  ))}
                  {colContracts.length === 0 && (
                    <div className="rounded-xl border border-dashed border-[color:var(--border-default)] bg-[color:var(--neutral-50)] p-4 text-center">
                      <span className="text-xs text-slate-500">Sin contratos</span>
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

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-3 pr-1 text-xs font-medium text-emerald-900">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Quitar filtro: ${label}`}
        className="rounded-full p-0.5 text-emerald-700 hover:bg-emerald-100"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  )
}

export default function ContratosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" aria-hidden="true" />
        </div>
      }
    >
      <ContratosPageInner />
    </Suspense>
  )
}
