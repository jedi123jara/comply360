/**
 * Filtros del listado de contratos leídos desde (y escritos hacia) la URL.
 *
 * La URL es la única fuente de verdad: así un enlace como
 * `/dashboard/contratos?status=DRAFT` o `/dashboard/contratos?vence=pronto`
 * abre el listado ya filtrado, y el filtro se puede compartir o recargar.
 *
 * Parámetros soportados en la página:
 *   status  → estado del contrato (DRAFT, IN_REVIEW, APPROVED, SIGNED, EXPIRED, ARCHIVED)
 *   type    → tipo de contrato (valores del enum ContractType de Prisma)
 *   q       → texto de búsqueda (también se acepta `search`)
 *   vence   → `pronto` = vencen en los próximos 30 días (también se acepta `expiringSoonDays`)
 *   page    → página del listado (desde 1)
 */

export const CONTRACT_STATUS_KEYS = [
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'SIGNED',
  'EXPIRED',
  'ARCHIVED',
] as const

export type ContractStatusKey = (typeof CONTRACT_STATUS_KEYS)[number]

/** Etiquetas en lenguaje simple para cada tipo del enum ContractType. */
export const CONTRACT_TYPE_LABELS: Record<string, string> = {
  LABORAL_INDEFINIDO: 'Plazo indeterminado',
  LABORAL_PLAZO_FIJO: 'Plazo fijo',
  LABORAL_TIEMPO_PARCIAL: 'Tiempo parcial',
  LOCACION_SERVICIOS: 'Locación de servicios',
  CONVENIO_PRACTICAS: 'Convenio de prácticas',
  CONFIDENCIALIDAD: 'Confidencialidad',
  NO_COMPETENCIA: 'No competencia',
  ADDENDUM: 'Adenda',
  POLITICA_HOSTIGAMIENTO: 'Política contra el hostigamiento',
  POLITICA_SST: 'Política de seguridad y salud',
  REGLAMENTO_INTERNO: 'Reglamento interno',
  CUSTOM: 'Personalizado',
}

/** Ventana usada por la tarjeta "Vencen pronto". */
export const EXPIRING_SOON_DAYS = 30

export interface ContractListFilters {
  status: ContractStatusKey | null
  type: string | null
  search: string
  expiringSoon: boolean
  page: number
}

export const EMPTY_CONTRACT_FILTERS: ContractListFilters = {
  status: null,
  type: null,
  search: '',
  expiringSoon: false,
  page: 1,
}

/** Lo mínimo que necesitamos de URLSearchParams / ReadonlyURLSearchParams. */
interface ParamReader {
  get(name: string): string | null
}

function normalizeStatus(raw: string | null): ContractStatusKey | null {
  if (!raw) return null
  const upper = raw.trim().toUpperCase()
  return (CONTRACT_STATUS_KEYS as readonly string[]).includes(upper)
    ? (upper as ContractStatusKey)
    : null
}

function normalizeType(raw: string | null): string | null {
  if (!raw) return null
  const upper = raw.trim().toUpperCase()
  return Object.prototype.hasOwnProperty.call(CONTRACT_TYPE_LABELS, upper) ? upper : null
}

function normalizeExpiring(params: ParamReader): boolean {
  const vence = params.get('vence')?.trim().toLowerCase()
  if (vence === 'pronto' || vence === String(EXPIRING_SOON_DAYS)) return true
  const legacy = params.get('expiringSoonDays')
  return legacy !== null && legacy.trim() !== '' && Number(legacy) > 0
}

function normalizePage(raw: string | null): number {
  const n = Number(raw)
  return Number.isInteger(n) && n > 0 ? n : 1
}

/** Lee los filtros desde la URL ignorando valores desconocidos (nunca rompen la API). */
export function parseContractListFilters(params: ParamReader): ContractListFilters {
  return {
    status: normalizeStatus(params.get('status')),
    type: normalizeType(params.get('type')),
    search: (params.get('q') ?? params.get('search') ?? '').trim(),
    expiringSoon: normalizeExpiring(params),
    page: normalizePage(params.get('page')),
  }
}

/** Query string para la URL de la página (solo incluye lo que está activo). */
export function serializeContractListFilters(filters: ContractListFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('q', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.type) params.set('type', filters.type)
  if (filters.expiringSoon) params.set('vence', 'pronto')
  if (filters.page > 1) params.set('page', String(filters.page))
  return params.toString()
}

/** Query string para `GET /api/contracts`. */
export function buildContractsApiQuery(filters: ContractListFilters, limit: number): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status) params.set('status', filters.status)
  if (filters.type) params.set('type', filters.type)
  if (filters.expiringSoon) params.set('expiringSoonDays', String(EXPIRING_SOON_DAYS))
  params.set('page', String(filters.page))
  params.set('limit', String(limit))
  return params.toString()
}

/** Aplica un cambio de filtros. Cualquier cambio que no sea de página vuelve a la página 1. */
export function applyFilterPatch(
  current: ContractListFilters,
  patch: Partial<ContractListFilters>,
): ContractListFilters {
  const next = { ...current, ...patch }
  if (patch.page === undefined) next.page = 1
  return next
}

export function hasActiveFilters(filters: ContractListFilters): boolean {
  return Boolean(filters.status || filters.type || filters.search || filters.expiringSoon)
}
