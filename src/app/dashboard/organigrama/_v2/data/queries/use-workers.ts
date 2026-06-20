'use client'

import { useQuery } from '@tanstack/react-query'

export interface RosterWorker {
  id: string
  firstName: string
  lastName: string
  dni: string
  position: string | null
  department: string | null
  status: string
  photoUrl: string | null
  legajoScore: number | null
}

export const workersRosterKey = ['orgchart', 'workers-roster'] as const

/**
 * Carga el roster de trabajadores (hasta 500) para el panel del organigrama.
 * Cacheado 60s y compartido — evita re-fetchear en cada apertura.
 */
export function useWorkersRosterQuery(enabled = true) {
  return useQuery<RosterWorker[]>({
    queryKey: workersRosterKey,
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch('/api/workers?limit=500')
      if (!res.ok) throw new Error('No se pudo cargar la lista de trabajadores')
      const json = await res.json()
      const list = json.data ?? json.workers ?? json.items ?? json
      return Array.isArray(list) ? list : []
    },
  })
}
