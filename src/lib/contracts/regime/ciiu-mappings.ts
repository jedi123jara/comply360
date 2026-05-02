// =============================================
// CIIU REV. 4 — MAPEOS PARA DETECCIÓN DE RÉGIMEN
//
// Tablas mínimas necesarias para el detector. No buscan ser un catálogo
// CIIU completo; son listas curadas con CIIUs que disparan regímenes
// especiales en Perú.
//
// Fuente normativa:
//   - Régimen agrario: Ley 31110 + DS 005-2021-MIDAGRI
//   - Construcción civil: D.Leg. 727 + Convención CAPECO–FTCCP
//   - Exportación no tradicional: D.L. 22342 (CIIUs tradicionales excluidos)
//   - MYPE: Ley 32353 (excluye bares, discotecas, casinos, juegos de azar)
//   - Pesquero: Ley 30003 (régimen previsional especial)
// =============================================

/**
 * Detecta si un CIIU pertenece al sector construcción.
 * División F (41-43): Construcción de edificios, ingeniería civil,
 * actividades especializadas.
 */
export function isConstructionCiiu(ciiu: string | null): boolean {
  if (!ciiu) return false
  return /^4[1-3]/.test(ciiu)
}

/**
 * División A (01-03): agricultura, ganadería, silvicultura y pesca.
 * Sólo agrícolas y pecuarios — la pesca extractiva es 03 y se trata
 * por separado con el régimen pesquero.
 */
export function isAgricultureCiiu(ciiu: string | null): boolean {
  if (!ciiu) return false
  return /^01/.test(ciiu) || /^02/.test(ciiu) // ganadería y silvicultura
}

/**
 * Pesca extractiva o industrial → laboral 728 + REP (Ley 30003).
 */
export function isFishingCiiu(ciiu: string | null): boolean {
  if (!ciiu) return false
  return ciiu.startsWith('0311') || ciiu.startsWith('0312') || ciiu === '1020'
}

/**
 * Agroindustria que opera con insumos agropecuarios. Consideramos cualquier
 * CIIU de las divisiones 10-12 (alimentos, bebidas, tabaco) excepto los
 * expresamente excluidos por la Ley 31110:
 *   - 1061-1062: molinería de cereales (incluye trigo)
 *   - 1071: panadería y derivados de trigo
 *   - 1075: cocoa, chocolate y confitería (excluido como "azúcar/cacao
 *     refinado" — interpretación conservadora)
 *   - 1101: bebidas alcohólicas destiladas
 *   - 1102: vinos, sidras y otras bebidas fermentadas
 *   - 1103: cerveza
 *   - 1200: tabaco
 */
const EXCLUDED_AGRO_INDUSTRY_CIIUS = new Set([
  '1061', '1062', '1071', '1075',
  '1101', '1102', '1103',
  '1200',
])

/**
 * Cualquier CIIU agroindustrial candidato (división 10, 11 o 12).
 * Si está en `EXCLUDED_AGRO_INDUSTRY_CIIUS`, NO califica al régimen pero sigue
 * siendo "candidato" para que el detector emita warning explicativo.
 */
export function isAgroIndustryCandidate(ciiu: string | null): boolean {
  if (!ciiu) return false
  return /^1[0-2]/.test(ciiu)
}

/** True solo si el CIIU es agroindustria QUE SÍ califica al régimen agrario. */
export function isAgroIndustryCiiu(ciiu: string | null): boolean {
  if (!isAgroIndustryCandidate(ciiu)) return false
  return !EXCLUDED_AGRO_INDUSTRY_CIIUS.has(ciiu as string)
}

export function isExcludedAgroIndustry(ciiu: string | null): boolean {
  if (!ciiu) return false
  return EXCLUDED_AGRO_INDUSTRY_CIIUS.has(ciiu)
}

/**
 * Lima Metropolitana o Callao: el régimen agrario Ley 31110 NO aplica.
 * Ubigeos INEI (6 dígitos):
 *   - Lima provincia: 1501xx
 *   - Callao provincia constitucional: 0701xx
 */
export function isInLimaCallao(ubigeo: string | null): boolean {
  if (!ubigeo || ubigeo.length < 4) return false
  const prov = ubigeo.slice(0, 4)
  return prov === '1501' || prov === '0701'
}

/**
 * Sectores excluidos del régimen MYPE (Ley 32353): bares, discotecas,
 * casinos y juegos de azar.
 *   - 5630: Actividades de servicio de bebidas
 *   - 9200: Actividades de juegos de azar y apuestas
 *   - 9329: Otras actividades de esparcimiento (incluye discotecas)
 */
const EXCLUDED_MYPE_CIIUS = new Set(['5630', '9200', '9329'])

export function isExcludedFromMype(ciiu: string | null): boolean {
  if (!ciiu) return false
  return EXCLUDED_MYPE_CIIUS.has(ciiu)
}

/**
 * Productos tradicionales de exportación (excluidos del beneficio D.L. 22342).
 * Son los listados en el D.S. 067-72-EF y normas anexas: minería, petróleo y
 * derivados, café crudo en grano, harina y aceite de pescado, caña, algodón
 * en bruto, lana sin procesar, cuero crudo. CIIUs gruesos:
 *   - 05xx: extracción de carbón
 *   - 06xx: extracción de petróleo y gas
 *   - 07xx: extracción de minerales metalíferos
 *   - 08xx, 09xx: minería no metálica + servicios mineros
 *   - 1010: procesamiento y conservación de carne (no aplica directamente, pero
 *           se mantiene fuera del set excluido)
 *   - 1020: pesca/acuicultura industrial — ya cubierta como pesquera
 */
export function isTraditionalExportCiiu(ciiu: string | null): boolean {
  if (!ciiu) return false
  return /^0[5-9]/.test(ciiu) || ciiu === '1020'
}
