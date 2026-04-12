'use client'

/* -------------------------------------------------------------------------- */
/*  React Query hooks for COMPLY360 API                                       */
/* -------------------------------------------------------------------------- */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
  type UseQueryResult,
  type UseMutationResult,
} from '@tanstack/react-query'
import { apiFetch, ApiError } from '@/lib/api-client'
import { queryKeys, invalidateQueries } from '@/lib/query-client'

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

/** Paginated API response envelope */
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** Common pagination/filter params */
export interface PaginationParams {
  page?: number
  pageSize?: number
  search?: string
  sort?: string
  order?: 'asc' | 'desc'
}

/** Worker entity */
export interface Worker {
  id: string
  nombre: string
  apellidos: string
  dni: string
  email: string
  cargo: string
  departamento: string
  fechaIngreso: string
  estado: 'activo' | 'inactivo' | 'vacaciones' | 'licencia'
  salario: number
  createdAt: string
  updatedAt: string
}

/** Contract entity */
export interface Contract {
  id: string
  workerId: string
  tipo: string
  fechaInicio: string
  fechaFin: string | null
  estado: 'vigente' | 'vencido' | 'por_vencer' | 'terminado'
  salario: number
  cargo: string
  createdAt: string
  updatedAt: string
}

/** Alert entity */
export interface Alert {
  id: string
  tipo: 'vencimiento' | 'normativa' | 'cumplimiento' | 'sistema'
  titulo: string
  mensaje: string
  prioridad: 'alta' | 'media' | 'baja'
  leida: boolean
  fecha: string
  recursoId?: string
  recursoTipo?: string
}

/** Dashboard statistics */
export interface DashboardStats {
  totalTrabajadores: number
  contratosVigentes: number
  contratosPorVencer: number
  alertasPendientes: number
  cumplimientoGeneral: number
  indicadores: {
    nombre: string
    valor: number
    cambio: number
    tendencia: 'up' | 'down' | 'stable'
  }[]
}

/* -------------------------------------------------------------------------- */
/*  URL builder helper                                                        */
/* -------------------------------------------------------------------------- */

function buildUrl(base: string, params?: Record<string, unknown>): string {
  if (!params) return base
  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value))
    }
  }
  const qs = searchParams.toString()
  return qs ? `${base}?${qs}` : base
}

/* -------------------------------------------------------------------------- */
/*  Generic hooks                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Generic query hook — wraps useQuery with typed apiFetch.
 *
 * @example
 * const { data, isLoading } = useApiQuery<Worker[]>(
 *   ['workers', 'list'],
 *   '/api/workers'
 * )
 */
export function useApiQuery<TData>(
  queryKey: readonly unknown[],
  url: string,
  options?: Omit<UseQueryOptions<TData, ApiError>, 'queryKey' | 'queryFn'>
): UseQueryResult<TData, ApiError> {
  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: ({ signal }) => apiFetch<TData>(url, { signal }),
    ...options,
  })
}

/**
 * Generic mutation hook — wraps useMutation with typed apiFetch.
 *
 * @example
 * const { mutate, isPending } = useApiMutation<WorkerInput, Worker>(
 *   '/api/workers',
 *   'POST',
 *   { onSuccess: () => invalidateQueries(queryKeys.workers.all) }
 * )
 */
export function useApiMutation<TInput, TOutput = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  options?: Omit<UseMutationOptions<TOutput, ApiError, TInput>, 'mutationFn'>
): UseMutationResult<TOutput, ApiError, TInput> {
  return useMutation<TOutput, ApiError, TInput>({
    mutationFn: (body: TInput) =>
      apiFetch<TOutput>(url, { method, body }),
    ...options,
  })
}

/* -------------------------------------------------------------------------- */
/*  Domain-specific hooks                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Obtener lista de trabajadores con paginacion y filtros.
 */
export function useWorkers(params?: PaginationParams) {
  const url = buildUrl('/api/workers', params as Record<string, unknown>)
  return useApiQuery<PaginatedResponse<Worker>>(
    queryKeys.workers.list(params as Record<string, unknown>),
    url,
    {
      placeholderData: (prev) => prev, // Keep previous data while refetching
    }
  )
}

/**
 * Obtener un trabajador por ID.
 */
export function useWorker(id: string | undefined) {
  return useApiQuery<Worker>(
    queryKeys.workers.detail(id ?? ''),
    `/api/workers/${id}`,
    {
      enabled: !!id,
    }
  )
}

/**
 * Obtener lista de contratos con paginacion y filtros.
 */
export function useContracts(params?: PaginationParams & { workerId?: string; estado?: string }) {
  const url = buildUrl('/api/contracts', params as Record<string, unknown>)
  return useApiQuery<PaginatedResponse<Contract>>(
    queryKeys.contracts.list(params as Record<string, unknown>),
    url,
    {
      placeholderData: (prev) => prev,
    }
  )
}

/**
 * Obtener alertas del sistema.
 */
export function useAlerts(params?: PaginationParams & { tipo?: string; leida?: boolean }) {
  const url = buildUrl('/api/alerts', params as Record<string, unknown>)
  return useApiQuery<PaginatedResponse<Alert>>(
    queryKeys.alerts.list(params as Record<string, unknown>),
    url,
    {
      // Alertas se refrescan mas frecuentemente
      staleTime: 1000 * 60, // 1 minuto
      refetchInterval: 1000 * 60 * 2, // Refetch cada 2 minutos
    }
  )
}

/**
 * Obtener KPIs y estadisticas del dashboard.
 */
export function useDashboardStats() {
  return useApiQuery<DashboardStats>(
    queryKeys.dashboard.stats(),
    '/api/dashboard',
    {
      staleTime: 1000 * 60 * 2, // 2 minutos — datos que cambian moderadamente
    }
  )
}

/* -------------------------------------------------------------------------- */
/*  Mutation hooks                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Crear un nuevo trabajador.
 */
export function useCreateWorker() {
  const queryClient = useQueryClient()
  return useApiMutation<Partial<Worker>, Worker>('/api/workers', 'POST', {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats() })
    },
  })
}

/**
 * Actualizar un trabajador existente.
 */
export function useUpdateWorker(id: string) {
  const queryClient = useQueryClient()
  return useApiMutation<Partial<Worker>, Worker>(`/api/workers/${id}`, 'PUT', {
    onSuccess: (updatedWorker) => {
      // Update cache directly for instant UI feedback
      queryClient.setQueryData(queryKeys.workers.detail(id), updatedWorker)
      queryClient.invalidateQueries({ queryKey: queryKeys.workers.all })
    },
  })
}

/**
 * Marcar alerta como leida.
 */
export function useMarkAlertRead() {
  const queryClient = useQueryClient()
  return useApiMutation<{ id: string }, Alert>(
    '/api/alerts',
    'PATCH',
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all })
      },
    }
  )
}

/* -------------------------------------------------------------------------- */
/*  Re-export for convenience                                                 */
/* -------------------------------------------------------------------------- */

export { invalidateQueries, queryKeys }
