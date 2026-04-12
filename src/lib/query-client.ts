/* -------------------------------------------------------------------------- */
/*  React Query — QueryClient configuration for COMPLY360                     */
/* -------------------------------------------------------------------------- */

import {
  QueryClient,
  type DefaultOptions,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'
import { ApiError, apiFetch } from '@/lib/api-client'

/* -------------------------------------------------------------------------- */
/*  Default configuration                                                     */
/* -------------------------------------------------------------------------- */

const FIVE_MINUTES = 1000 * 60 * 5
const ONE_MINUTE = 1000 * 60

const defaultOptions: DefaultOptions = {
  queries: {
    staleTime: FIVE_MINUTES,
    gcTime: FIVE_MINUTES * 2, // Keep in cache 10min after becoming unused
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
  },
  mutations: {
    retry: 0,
  },
}

/* -------------------------------------------------------------------------- */
/*  Singleton QueryClient                                                     */
/* -------------------------------------------------------------------------- */

let queryClient: QueryClient | null = null

export function getQueryClient(): QueryClient {
  if (!queryClient) {
    queryClient = new QueryClient({ defaultOptions })
  }
  return queryClient
}

/**
 * Create a fresh QueryClient (useful for SSR to avoid sharing state).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions })
}

/* -------------------------------------------------------------------------- */
/*  Query key factory — ensures consistent & type-safe cache keys             */
/* -------------------------------------------------------------------------- */

export const queryKeys = {
  // Workers
  workers: {
    all: ['workers'] as const,
    list: (params?: Record<string, unknown>) => ['workers', 'list', params] as const,
    detail: (id: string) => ['workers', 'detail', id] as const,
  },

  // Contracts
  contracts: {
    all: ['contracts'] as const,
    list: (params?: Record<string, unknown>) => ['contracts', 'list', params] as const,
    detail: (id: string) => ['contracts', 'detail', id] as const,
  },

  // Alerts
  alerts: {
    all: ['alerts'] as const,
    list: (params?: Record<string, unknown>) => ['alerts', 'list', params] as const,
    unread: () => ['alerts', 'unread'] as const,
  },

  // Dashboard
  dashboard: {
    stats: () => ['dashboard', 'stats'] as const,
    kpis: (period?: string) => ['dashboard', 'kpis', period] as const,
  },

  // SST (Seguridad y Salud en el Trabajo)
  sst: {
    all: ['sst'] as const,
    list: (params?: Record<string, unknown>) => ['sst', 'list', params] as const,
  },

  // Calculations
  calculations: {
    all: ['calculations'] as const,
    result: (type: string, params: Record<string, unknown>) =>
      ['calculations', type, params] as const,
  },
} as const

/* -------------------------------------------------------------------------- */
/*  Generic query/mutation option builders                                    */
/* -------------------------------------------------------------------------- */

/**
 * Build typed UseQueryOptions for a GET endpoint.
 *
 * @example
 * const options = buildQueryOptions<Worker[]>('/api/workers', queryKeys.workers.list())
 */
export function buildQueryOptions<TData>(
  url: string,
  queryKey: readonly unknown[],
  overrides?: Partial<UseQueryOptions<TData, ApiError>>
): UseQueryOptions<TData, ApiError> {
  return {
    queryKey,
    queryFn: ({ signal }) => apiFetch<TData>(url, { signal }),
    ...overrides,
  }
}

/**
 * Build typed UseMutationOptions for POST/PUT/PATCH/DELETE endpoints.
 *
 * @example
 * const options = buildMutationOptions<WorkerInput, Worker>('/api/workers', 'POST')
 */
export function buildMutationOptions<TInput, TOutput = unknown>(
  url: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST',
  overrides?: Partial<UseMutationOptions<TOutput, ApiError, TInput>>
): UseMutationOptions<TOutput, ApiError, TInput> {
  return {
    mutationFn: (body: TInput) =>
      apiFetch<TOutput>(url, { method, body }),
    ...overrides,
  }
}

/* -------------------------------------------------------------------------- */
/*  Cache invalidation helpers                                                */
/* -------------------------------------------------------------------------- */

/**
 * Invalidate all queries matching a key prefix.
 */
export function invalidateQueries(keyPrefix: readonly unknown[]): Promise<void> {
  return getQueryClient().invalidateQueries({ queryKey: keyPrefix })
}

/**
 * Prefetch data for a route transition.
 */
export async function prefetchQuery<TData>(
  url: string,
  queryKey: readonly unknown[],
  staleTime: number = ONE_MINUTE
): Promise<void> {
  await getQueryClient().prefetchQuery({
    queryKey,
    queryFn: () => apiFetch<TData>(url),
    staleTime,
  })
}
