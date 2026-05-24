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
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'No se pudo reorganizar el organigrama')
      }
      return res.json() as Promise<ReorganizeHierarchyResult>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: treeKey(snapshotId) })
      queryClient.invalidateQueries({ queryKey: alertsKey })
      queryClient.invalidateQueries({ queryKey: doctorKey })
    },
  })
}
