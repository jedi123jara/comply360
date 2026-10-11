/**
 * Cifras del simulacro SUNAFIL compartidas entre pantallas (simulacro y
 * resultado del diagnóstico), para no repetir números escritos a mano.
 */
import { getSolicitudesInspeccion, type InspeccionTipo } from '@/lib/compliance/simulacro-engine'

/**
 * El simulacro corre solo contra el legajo (segundos); el usuario solo lee los
 * hallazgos y el resumen. Unos 5 minutos en total.
 */
export const SIMULACRO_MINUTES = 5

export const SIMULACRO_ESTIMATE = `~${SIMULACRO_MINUTES} min`

/** Cuántos documentos pide el inspector virtual según el tipo de inspección. */
export function simulacroDocCount(tipo: InspeccionTipo): number {
  return getSolicitudesInspeccion(tipo).length
}
