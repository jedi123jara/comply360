/**
 * Pestañas del perfil del trabajador y su lectura desde la URL (`?tab=`).
 *
 * Los enlaces de otras pantallas usan `?tab=legajo`, `?tab=contratos`, etc.
 * Los alias cubren nombres que no son una pestaña real (p. ej. `alertas`,
 * cuyas alertas activas se muestran arriba de la pestaña Información).
 */

export const PROFILE_TABS = [
  'info',
  'legajo',
  'contratos',
  'remuneraciones',
  'vacaciones',
  'sst',
  'capacitaciones',
  'beneficios',
  'historial',
] as const

export type ProfileTab = (typeof PROFILE_TABS)[number]

export const DEFAULT_PROFILE_TAB: ProfileTab = 'info'

export const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  info: 'Información',
  legajo: 'Legajo',
  contratos: 'Contratos',
  remuneraciones: 'Remuneraciones',
  vacaciones: 'Vacaciones',
  sst: 'SST',
  capacitaciones: 'Capacitaciones',
  beneficios: 'Beneficios',
  historial: 'Historial',
}

const TAB_ALIASES: Record<string, ProfileTab> = {
  alertas: 'info',
  informacion: 'info',
  documentos: 'legajo',
  contrato: 'contratos',
  boletas: 'remuneraciones',
}

export function isProfileTab(value: string): value is ProfileTab {
  return (PROFILE_TABS as readonly string[]).includes(value)
}

/** Convierte el valor crudo de `?tab=` en una pestaña existente. */
export function resolveProfileTab(raw: string | null | undefined): ProfileTab {
  if (!raw) return DEFAULT_PROFILE_TAB
  const value = raw.trim().toLowerCase()
  if (isProfileTab(value)) return value
  return TAB_ALIASES[value] ?? DEFAULT_PROFILE_TAB
}
