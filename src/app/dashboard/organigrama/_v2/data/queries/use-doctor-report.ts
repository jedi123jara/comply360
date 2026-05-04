/**
 * Query del Org Doctor — reporte de findings de las 8 reglas IA.
 *
 * Es manual (`enabled: false` por defecto) porque dispara una llamada cara
 * al backend. Se activa con `useDoctorReport({ enabled: true })`.
 */
'use client'

import { useQuery } from '@tanstack/react-query'
import type { DoctorReport } from '@/lib/orgchart/types'

export const doctorKey = ['orgchart', 'doctor-report'] as const

export function useDoctorReportQuery(enabled = false) {
  return useQuery({
    queryKey: doctorKey,
    queryFn: async (): Promise<DoctorReport> => {
      const res = await fetch('/api/orgchart/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createTasks: false }),
      })
      if (!res.ok) throw new Error(`Error ${res.status} al diagnosticar`)
      return res.json() as Promise<DoctorReport>
    },
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  })
}
