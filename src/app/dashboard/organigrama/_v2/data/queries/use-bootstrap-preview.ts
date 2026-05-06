/**
 * Query del preview del auto-bootstrap del organigrama desde Worker.position/department.
 *
 * Llama a GET /api/orgchart/seed-from-legacy y devuelve qué unidades, cargos
 * y asignaciones se crearían si se aplicara el bootstrap. No escribe nada.
 */
'use client'

import { useQuery } from '@tanstack/react-query'

export interface BootstrapPreviewDTO {
  unitsToCreate: Array<{ slug: string; name: string }>
  positionsToCreate: Array<{ unitSlug: string; title: string }>
  positionsToResize: Array<{
    unitSlug: string
    title: string
    currentSeats: number
    requiredSeats: number
  }>
  assignmentsToCreate: number
  workersWithoutDepartment: number
  workersWithoutPosition: number
  totalWorkers: number
}

export const bootstrapPreviewKey = ['orgchart', 'bootstrap-preview'] as const

export function useBootstrapPreviewQuery(enabled = true) {
  return useQuery({
    queryKey: bootstrapPreviewKey,
    queryFn: async (): Promise<BootstrapPreviewDTO> => {
      const res = await fetch('/api/orgchart/seed-from-legacy', { cache: 'no-store' })
      if (!res.ok) {
        throw new Error(`Error ${res.status} al calcular el preview`)
      }
      return res.json() as Promise<BootstrapPreviewDTO>
    },
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Suma total de cambios pendientes — para mostrar en el banner.
 * Si es 0, el organigrama ya está sincronizado con la planilla.
 */
export function pendingBootstrapCount(preview: BootstrapPreviewDTO | undefined): number {
  if (!preview) return 0
  return (
    preview.unitsToCreate.length +
    preview.positionsToCreate.length +
    preview.positionsToResize.length +
    preview.assignmentsToCreate
  )
}
