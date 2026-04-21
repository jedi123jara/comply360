/**
 * Motor de infracciones SUNAFIL.
 *
 * Wrapper funcional sobre `src/data/legal/infracciones-sunafil.ts` (164 infracciones
 * tipificadas del D.S. 019-2006-TR). Provee:
 *  - búsqueda por ID / categoría / gravedad
 *  - cálculo de multa estimada integrando con `calcularMultaSunafil`
 *  - construcción de "findings" para el simulacro SUNAFIL
 *
 * Usado por:
 *  - `/dashboard/simulacro` para generar hallazgos con multa real
 *  - `/dashboard/diagnostico` para mapear brechas → infracciones tipificadas
 *  - `src/lib/alerts/alert-engine.ts` para asociar alertas a multa estimada
 */
import {
  INFRACCIONES,
  INFRAC_SECTIONS,
  INFRAC_COUNT_BY_GRAVITY,
  INFRAC_TOTAL,
  type InfraccionSunafil,
  type InfracGravity,
  type InfracSection,
} from '@/data/legal/infracciones-sunafil'
import {
  calcularMultaSunafilSoles,
  type TipoEmpresaSunafil,
} from './peru-labor'

export type { InfraccionSunafil, InfracGravity, InfracSection }

/**
 * Clave estable única por infracción.
 *
 * La fuente (xlsx parseado) produce IDs con colisiones (~33/164) cuando varios
 * sub-items comparten el mismo "padre". Para resolverlo usamos el índice en el
 * array plano como sufijo: `<id>#<index>`. La clave resultante es reproducible
 * entre builds mientras no se regenere `infracciones-sunafil.ts`.
 */
export function uniqKey(i: InfraccionSunafil, index: number): string {
  return `${i.id}#${index}`
}

/** Pares [clave única, infracción] indexados para lookup O(1). */
const INFRAC_BY_ID: Readonly<Record<string, InfraccionSunafil>> = Object.freeze(
  Object.fromEntries(INFRACCIONES.map((i, idx) => [uniqKey(i, idx), i] as const))
)

/** Busca una infracción por clave única (`<id>#<index>`). */
export function getInfraccion(key: string): InfraccionSunafil | null {
  return INFRAC_BY_ID[key] ?? null
}

/** Devuelve la clave única de la primera infracción que matchee el ID slug. */
export function firstKeyForId(id: string): string | null {
  const idx = INFRACCIONES.findIndex((i) => i.id === id)
  return idx >= 0 ? uniqKey(INFRACCIONES[idx], idx) : null
}

/** Filtra infracciones por categoría SUNAFIL. */
export function infraccionesByCategory(category: string): InfraccionSunafil[] {
  return INFRACCIONES.filter((i) => i.category === category)
}

/** Filtra infracciones por gravedad. */
export function infraccionesByGravity(gravity: InfracGravity): InfraccionSunafil[] {
  return INFRACCIONES.filter((i) => i.gravity === gravity)
}

/**
 * Búsqueda textual simple (case-insensitive, en descripción + parent).
 * No es fuzzy; suficiente para autocompletar en el simulacro.
 */
export function searchInfracciones(query: string, limit = 20): InfraccionSunafil[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const terms = q.split(/\s+/)
  const results: InfraccionSunafil[] = []
  for (const i of INFRACCIONES) {
    const haystack = `${i.description} ${i.parent ?? ''}`.toLowerCase()
    if (terms.every((t) => haystack.includes(t))) {
      results.push(i)
      if (results.length >= limit) break
    }
  }
  return results
}

/* ── Motor de hallazgos (simulacro) ────────────────────────────────────── */

export interface SimulacroFinding {
  infraccion: InfraccionSunafil
  /** Trabajadores afectados por el hallazgo. */
  afectados: number
  /** Multa estimada en soles, considerando escala granular + mitigaciones. */
  multaSoles: number
  /** Si se subsana voluntariamente, nuevo valor estimado. */
  multaConSubsanacion: number
}

export interface SimulacroSummary {
  findings: SimulacroFinding[]
  totalMultaSoles: number
  totalConSubsanacion: number
  porGravedad: Record<InfracGravity, number>
  ahorroPotencial: number
}

/**
 * Calcula la multa estimada para una infracción concreta.
 * - Integra la escala granular del D.S. 019-2006-TR (10 tramos por trabajadores afectados).
 * - Aplica reincidencia (+50%) y subsanación voluntaria (-90%) si se indica.
 */
export function multaInfraccionSoles(
  key: string,
  opts: {
    tipoEmpresa: TipoEmpresaSunafil
    afectados: number
    reincidencia?: boolean
    subsanacion?: 'VOLUNTARIA' | 'DURANTE_INSPECCION' | null
  }
): number {
  const infrac = INFRAC_BY_ID[key]
  if (!infrac) return 0
  return calcularMultaSunafilSoles(
    opts.tipoEmpresa,
    infrac.gravity,
    Math.max(1, opts.afectados),
    opts.reincidencia ?? false,
    opts.subsanacion ?? null
  )
}

/**
 * Construye un resumen de simulacro a partir de una lista de hallazgos.
 *
 * Para cada infracción identificada calcula:
 *  - multa base (sin mitigaciones)
 *  - multa con subsanación voluntaria (-90%)
 *
 * Luego agrega totales y conteos por gravedad.
 */
export function buildSimulacroSummary(
  hallazgos: Array<{ key: string; afectados: number; reincidencia?: boolean }>,
  tipoEmpresa: TipoEmpresaSunafil
): SimulacroSummary {
  const findings: SimulacroFinding[] = []
  const porGravedad: Record<InfracGravity, number> = { LEVE: 0, GRAVE: 0, MUY_GRAVE: 0 }

  for (const h of hallazgos) {
    const infrac = INFRAC_BY_ID[h.key]
    if (!infrac) continue
    const afectados = Math.max(1, h.afectados)
    const multaSoles = calcularMultaSunafilSoles(
      tipoEmpresa,
      infrac.gravity,
      afectados,
      h.reincidencia ?? false,
      null
    )
    const multaConSubsanacion = calcularMultaSunafilSoles(
      tipoEmpresa,
      infrac.gravity,
      afectados,
      h.reincidencia ?? false,
      'VOLUNTARIA'
    )
    findings.push({ infraccion: infrac, afectados, multaSoles, multaConSubsanacion })
    porGravedad[infrac.gravity] += 1
  }

  const totalMultaSoles = findings.reduce((s, f) => s + f.multaSoles, 0)
  const totalConSubsanacion = findings.reduce((s, f) => s + f.multaConSubsanacion, 0)
  return {
    findings,
    totalMultaSoles: Math.round(totalMultaSoles * 100) / 100,
    totalConSubsanacion: Math.round(totalConSubsanacion * 100) / 100,
    porGravedad,
    ahorroPotencial: Math.round((totalMultaSoles - totalConSubsanacion) * 100) / 100,
  }
}

/** Metadatos para UI (contadores + categorías disponibles). */
export const INFRAC_META = {
  total: INFRAC_TOTAL,
  countByGravity: INFRAC_COUNT_BY_GRAVITY,
  sections: INFRAC_SECTIONS.map((s) => ({
    key: s.key,
    label: s.label,
    category: s.category,
    count: s.count,
  })),
} as const
