/**
 * Mutación de reparenting con optimistic update.
 *
 * Mueve un cargo (`positionId`) para que reporte a un nuevo jefe
 * (`newParentId`). Aplica el cambio en el cache antes de la respuesta del
 * servidor; revierte en caso de error.
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OrgChartTree } from '@/lib/orgchart/types'

import { treeKey } from '../queries/use-tree'
import { alertsKey } from '../queries/use-alerts'

export interface ReparentInput {
  positionId: string
  newParentId: string
  snapshotId?: string | null
}

export function useReparentPositionMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['orgchart', 'reparent-position'],
    mutationFn: async ({ positionId, newParentId }: ReparentInput) => {
      const res = await fetch(`/api/orgchart/positions/${positionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsToPositionId: newParentId }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `No se pudo mover el cargo`)
      }
      return res.json()
    },
    onMutate: async ({ positionId, newParentId, snapshotId = null }) => {
      const key = treeKey(snapshotId)
      await queryClient.cancelQueries({ queryKey: key })
      const previousTree = queryClient.getQueryData<OrgChartTree>(key)
      if (previousTree) {
        const next: OrgChartTree = {
          ...previousTree,
          positions: previousTree.positions.map((p) =>
            p.id === positionId ? { ...p, reportsToPositionId: newParentId } : p,
          ),
        }
        queryClient.setQueryData(key, next)
      }
      return { previousTree, key }
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTree) {
        queryClient.setQueryData(context.key, context.previousTree)
      }
    },
    onSettled: (_data, _err, vars) => {
      queryClient.invalidateQueries({ queryKey: treeKey(vars.snapshotId ?? null) })
      queryClient.invalidateQueries({ queryKey: alertsKey })
    },
  })
}
