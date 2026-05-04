/**
 * Tipos compartidos del builder de la Memoria Anual del Organigrama.
 */

import type { OrgChartTree, DoctorReport } from '../types'
import type { CoverageReport } from '../coverage-aggregator'

export interface MemoriaAnualOrg {
  name: string
  razonSocial: string | null
  ruc: string | null
  sector: string | null
  plan: string | null
  regimenPrincipal: string | null
}

export interface MemoriaAnualEvolution {
  /** Snapshot del 01-ene del año (si existe). */
  startSnapshot: {
    id: string
    label: string
    hash: string
    createdAt: string
    workerCount: number
    unitCount: number
    depthMax: number
  } | null
  /** Snapshot del 31-dic o el más reciente. */
  endSnapshot: {
    id: string
    label: string
    hash: string
    createdAt: string
    workerCount: number
    unitCount: number
    depthMax: number
  }
  /** Cuántos snapshots se tomaron a lo largo del año. */
  totalSnapshots: number
  /** Resumen plain de los principales cambios entre start y end. */
  highlights: Array<{
    kind: 'unit-added' | 'unit-removed' | 'position-added' | 'role-changed' | 'worker-added'
    description: string
  }>
  /** Headcount mensual (12 puntos). */
  headcountByMonth: Array<{
    month: string // "Ene", "Feb", ...
    workers: number
  }>
}

/**
 * Datos consolidados que el PDF necesita para renderizar.
 * Se construyen en `build-memoria-data.ts` y se pasan al componente PDF.
 */
export interface MemoriaAnualData {
  org: MemoriaAnualOrg
  year: number
  generatedAt: Date
  /** Tree al cierre del año (o el más reciente). */
  tree: OrgChartTree
  /** Doctor report sobre el tree de cierre. */
  doctorReport: DoctorReport
  /** Coverage report agregado del organigrama. */
  coverage: CoverageReport
  /** Evolución a lo largo del año. */
  evolution: MemoriaAnualEvolution
  /** Stats agregados para la portada. */
  stats: {
    workerCount: number
    unitCount: number
    positionCount: number
    vacantCount: number
    activeContracts: number
    legalRolesAssigned: number
    legalRolesRequired: number
  }
}
