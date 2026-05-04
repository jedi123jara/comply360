/**
 * Crea un snapshot manual del organigrama, firmado con SHA-256.
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { snapshotsKey } from '../queries/use-snapshots'

export interface CreateSnapshotInput {
  label: string
  reason?: string | null
}

export function useCreateSnapshotMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['orgchart', 'create-snapshot'],
    mutationFn: async (input: CreateSnapshotInput) => {
      const res = await fetch('/api/orgchart/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al tomar snapshot')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: snapshotsKey })
    },
  })
}
