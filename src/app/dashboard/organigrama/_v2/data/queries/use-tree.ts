/**
 * Query del árbol del organigrama. Soporta vista actual o snapshot histórico.
 */
'use client'

import { useQuery } from '@tanstack/react-query'
import type { OrgChartTree } from '@/lib/orgchart/types'

export const treeKey = (snapshotId: string | null) => ['orgchart', 'tree', snapshotId] as const

export function useTreeQuery(snapshotId: string | null = null) {
  return useQuery({
    queryKey: treeKey(snapshotId),
    queryFn: async (): Promise<OrgChartTree> => {
      const url = snapshotId
        ? `/api/orgchart?snapshotId=${encodeURIComponent(snapshotId)}`
        : '/api/orgchart'
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Error ${res.status} al cargar el organigrama`)
      }
      return res.json() as Promise<OrgChartTree>
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}
