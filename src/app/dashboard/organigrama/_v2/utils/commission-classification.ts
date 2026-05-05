import type { OrgUnitDTO } from '@/lib/orgchart/types'

import type { CommissionFilter } from '../state/slices/canvas-slice'

export interface CommissionTypeMeta {
  id: CommissionFilter
  label: string
  description: string
}

export const COMMISSION_FILTERS: CommissionTypeMeta[] = [
  { id: 'all', label: 'Todas', description: 'Comités, brigadas y equipos activos' },
  { id: 'sst', label: 'SST', description: 'Comité o supervisión de seguridad y salud' },
  { id: 'legal', label: 'Legales', description: 'Órganos legales no SST' },
  { id: 'brigade', label: 'Brigadas', description: 'Equipos de emergencia y respuesta' },
  { id: 'temporary', label: 'Temporales', description: 'Equipos de trabajo por encargo' },
]

export function isCommissionUnit(unit: OrgUnitDTO) {
  return unit.kind === 'COMITE_LEGAL' || unit.kind === 'BRIGADA' || unit.kind === 'PROYECTO'
}

export function classifyCommissionUnit(unit: OrgUnitDTO): Exclude<CommissionFilter, 'all'> {
  if (unit.kind === 'BRIGADA') return 'brigade'
  if (unit.kind === 'PROYECTO') return 'temporary'

  const bag = `${unit.name} ${unit.description ?? ''}`.toLowerCase()
  if (
    bag.includes('sst') ||
    bag.includes('seguridad') ||
    bag.includes('salud') ||
    bag.includes('brigada')
  ) {
    return 'sst'
  }
  return 'legal'
}

export function commissionTypeLabel(filter: CommissionFilter) {
  return COMMISSION_FILTERS.find((item) => item.id === filter)?.label ?? 'Comisión'
}

export function matchesCommissionFilter(unit: OrgUnitDTO, filter: CommissionFilter) {
  if (!isCommissionUnit(unit)) return false
  if (filter === 'all') return true
  return classifyCommissionUnit(unit) === filter
}
