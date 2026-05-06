/**
 * Mutations para escenarios What-If: crear, aplicar, descartar.
 *
 * Backend:
 *   POST   /api/orgchart/drafts          → crea borrador con impactReport
 *   PATCH  /api/orgchart/drafts/[id]     → action: APPLY | DISCARD
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { draftsKey, type DraftDTO } from '../queries/use-drafts'
import { snapshotsKey } from '../queries/use-snapshots'
import { doctorKey } from '../queries/use-doctor-report'
import { alertsKey } from '../queries/use-alerts'

export interface CreateDraftInput {
  name: string
  positionId: string
  newParentId: string
}

async function parseError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null)
  return new Error(data?.error ?? fallback)
}

export function useCreateDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['orgchart', 'create-draft'],
    mutationFn: async (input: CreateDraftInput): Promise<DraftDTO> => {
      const res = await fetch('/api/orgchart/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
      if (!res.ok) throw await parseError(res, 'Error al simular escenario')
      const data = (await res.json()) as { draft: DraftDTO }
      return data.draft
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: draftsKey })
      queryClient.invalidateQueries({ queryKey: snapshotsKey })
    },
  })
}

export function useApplyDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['orgchart', 'apply-draft'],
    mutationFn: async (draftId: string): Promise<DraftDTO> => {
      const res = await fetch(`/api/orgchart/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPLY' }),
      })
      if (!res.ok) throw await parseError(res, 'Error al aplicar escenario')
      const data = (await res.json()) as { draft: DraftDTO }
      return data.draft
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: draftsKey })
      queryClient.invalidateQueries({ queryKey: ['orgchart', 'tree'] })
      queryClient.invalidateQueries({ queryKey: snapshotsKey })
      queryClient.invalidateQueries({ queryKey: doctorKey })
      queryClient.invalidateQueries({ queryKey: alertsKey })
    },
  })
}

export function useDiscardDraftMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey: ['orgchart', 'discard-draft'],
    mutationFn: async (draftId: string): Promise<DraftDTO> => {
      const res = await fetch(`/api/orgchart/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'DISCARD' }),
      })
      if (!res.ok) throw await parseError(res, 'Error al descartar escenario')
      const data = (await res.json()) as { draft: DraftDTO }
      return data.draft
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: draftsKey })
    },
  })
}
