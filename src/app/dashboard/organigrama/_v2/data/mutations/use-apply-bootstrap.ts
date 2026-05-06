/**
 * Mutation que aplica el auto-bootstrap del organigrama desde Worker.position/department.
 *
 * Llama a POST /api/orgchart/seed-from-legacy. El backend crea OrgUnits,
 * OrgPositions y OrgAssignments idempotentemente, toma snapshot inicial y
 * loggea audit. Al terminar, invalidamos las queries que ven el organigrama.
 */
'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'

import { treeKey } from '../queries/use-tree'
import { snapshotsKey } from '../queries/use-snapshots'
import { doctorKey } from '../queries/use-doctor-report'
import { alertsKey } from '../queries/use-alerts'
import { bootstrapPreviewKey } from '../queries/use-bootstrap-preview'

export interface ApplyBootstrapResult {
  units: number
  positions: number
  assignments: number
  seatsAdjusted: number
  totalWorkers: number
  takenById: string | null
}

export function useApplyBootstrapMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['orgchart', 'apply-bootstrap'],
    mutationFn: async (): Promise<ApplyBootstrapResult> => {
      const res = await fetch('/api/orgchart/seed-from-legacy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Error al aplicar el bootstrap')
      }
      return res.json() as Promise<ApplyBootstrapResult>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orgchart', 'tree'] })
      queryClient.invalidateQueries({ queryKey: snapshotsKey })
      queryClient.invalidateQueries({ queryKey: doctorKey })
      queryClient.invalidateQueries({ queryKey: alertsKey })
      queryClient.invalidateQueries({ queryKey: bootstrapPreviewKey })
    },
  })
}
