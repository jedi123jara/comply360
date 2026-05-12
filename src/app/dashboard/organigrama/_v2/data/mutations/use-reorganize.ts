/**
 * Mutation + preview query para reorganizar la jerarquía del organigrama.
 *
 * Detecta la unidad raíz (Gerencia) y mueve las áreas huérfanas para que
 * cuelguen de ella. Una sola acción que reemplaza tener que mover áreas
 * una por una manualmente.
 */
'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { treeKey } from '../queries/use-tree'
import { alertsKey } from '../queries/use-alerts'
import { doctorKey } from '../queries/use-doctor-report'

export interface ReorganizePreviewUnit {
  id: string
  name: string
  kind: string
}

export interface ReorganizePreview {
  rootCandidate: ReorganizePreviewUnit | null
  willPromote: boolean
  unitsToReparent: ReorganizePreviewUnit[]
  reason: 'no-units' | 'no-candidate' | 'already-hierarchical' | null
}

export interface ReorganizeResult {
  rootUnitId: string | null
  rootUnitName: string | null
  reparented: number
  promoted: boolean
  reason?: 'no-units' | 'no-candidate' | 'already-hierarchical'
}

export const reorganizePreviewKey = ['orgchart', 'reorganize-preview'] as const

export function useReorganizePreviewQuery(enabled = true) {
  return useQuery({
    queryKey: reorganizePreviewKey,
    queryFn: async (): Promise<ReorganizePreview> => {
      const res = await fetch('/api/orgchart/reorganize', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status} al calcular preview`)
      return data as ReorganizePreview
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useReorganizeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['orgchart', 'reorganize'],
    mutationFn: async (): Promise<ReorganizeResult> => {
      const res = await fetch('/api/orgchart/reorganize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? `Error ${res.status} al reorganizar`)
      return data as ReorganizeResult
    },
    onSuccess: () => {
      // Invalidamos todo lo que depende de la estructura jerárquica.
      queryClient.invalidateQueries({ queryKey: ['orgchart', 'tree'] })
      queryClient.invalidateQueries({ queryKey: treeKey(null) })
      queryClient.invalidateQueries({ queryKey: alertsKey })
      queryClient.invalidateQueries({ queryKey: doctorKey })
      queryClient.invalidateQueries({ queryKey: reorganizePreviewKey })
    },
  })
}
