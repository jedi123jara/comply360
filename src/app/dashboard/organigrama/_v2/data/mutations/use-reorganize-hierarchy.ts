/**
 * Aplica en base de datos la jerarquía sugerida para cargos existentes.
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { treeKey } from '../queries/use-tree'
import { alertsKey } from '../queries/use-alerts'
import { doctorKey } from '../queries/use-doctor-report'

export interface ReorganizeHierarchyResult {
  ok: boolean
  changedCount: number
  unitsChanged: number
  positionsChanged: number
  totalUnits: number
  totalPositions: number
  unitChanges: Array<{
    unitId: string
    name: string
    previousParentId: string | null
    nextParentId: string | null
  }>
  changes: Array<{
    positionId: string
    title: string
    previousParentId: string | null
    nextParentId: string
  }>
}

type ApiMutationError = Error & { status?: number }

async function buildApiMutationError(res: Response, fallback: string): Promise<ApiMutationError> {
  const err = await res.json().catch(() => ({}))
  const message =
    typeof err.error === 'string' && err.error !== 'Error interno del servidor'
      ? err.error
      : fallback
  const apiError = new Error(message) as ApiMutationError
  apiError.status = res.status
  return apiError
}

function shouldRetryServerError(failureCount: number, error: unknown) {
  const status = (error as ApiMutationError | undefined)?.status
  return failureCount < 2 && typeof status === 'number' && status >= 500
}

export function useReorganizeHierarchyMutation(snapshotId: string | null = null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['orgchart', 'reorganize-hierarchy'],
    mutationFn: async (): Promise<ReorganizeHierarchyResult> => {
      const res = await fetch('/api/orgchart/reorganize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        throw await buildApiMutationError(
          res,
          'La base de datos está ocupada. Intentamos de nuevo, y si persiste prueba en unos segundos.',
        )
      }
      return res.json() as Promise<ReorganizeHierarchyResult>
    },
    retry: shouldRetryServerError,
    retryDelay: (attempt) => Math.min(800 * 2 ** attempt, 3000),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treeKey(snapshotId) })
      queryClient.invalidateQueries({ queryKey: alertsKey, refetchType: 'none' })
      queryClient.invalidateQueries({ queryKey: doctorKey, refetchType: 'none' })
    },
  })
}
