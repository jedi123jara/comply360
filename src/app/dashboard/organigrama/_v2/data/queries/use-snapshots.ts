/**
 * Query de la lista de snapshots para Time Machine.
 */
'use client'

import { useQuery } from '@tanstack/react-query'
import type { OrgChartSnapshotDTO } from '@/lib/orgchart/types'

export const snapshotsKey = ['orgchart', 'snapshots'] as const

export function useSnapshotsQuery() {
  return useQuery({
    queryKey: snapshotsKey,
    queryFn: async (): Promise<OrgChartSnapshotDTO[]> => {
      const res = await fetch('/api/orgchart/snapshots', { cache: 'no-store' })
      if (!res.ok) throw new Error(`Error ${res.status} al cargar snapshots`)
      const data = (await res.json()) as { snapshots: OrgChartSnapshotDTO[] }
      return data.snapshots
    },
    staleTime: 60_000,
  })
}
