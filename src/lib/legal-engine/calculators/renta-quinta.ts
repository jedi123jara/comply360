/**
 * RENTA DE QUINTA CATEGORÍA — Retención mensual
 *
 * Base legal:
 *   - TUO Ley del Impuesto a la Renta (D.S. 179-2004-EF)
 *   - Art. 40 Reglamento (D.S. 122-94-EF)
 *   - Resolución SUNAT que fija el procedimiento mensual
 *
 * Deducción anual: 7 UIT (S/ 38,500 en 2026)
 *
 * Escala progresiva acumulativa:
 *   0 – 5 UIT   → 8%
 *   5 – 20 UIT  → 14%
 *   20 – 35 UIT → 17%
 *   35 – 45 UIT → 20%
 *   > 45 UIT    → 30%
 *
 * Procedimiento mensual (Art. 40):
 *   1. Proyectar la renta bruta anual
 *   2. Restar 7 UIT
 *   3. Aplicar escala progresiva → impuesto anual proyectado
 *   4. Restar lo ya retenido en meses anteriores
 *   5. Dividir entre meses restantes del año
 */

import { PERU_LABOR } from '../peru-labor'
import { money } from '../money'

// ── Escala progresiva (tramos en UIT) ───────────────────────────────────────

const ESCALA = [
  { hastaUIT: 5,  tasa: 0.08 },
  { hastaUIT: 20, tasa: 0.14 },
  { hastaUIT: 35, tasa: 0.17 },
  { hastaUIT: 45, tasa: 0.20 },
  { hastaUIT: Infinity, tasa: 0.30 },
]

const DEDUCCION_UIT = 7          // 7 UIT anuales
const UIT = PERU_LABOR.UIT       // 5,500 en 2026

// ── Types ────────────────────────────────────────────────────────────────────

export interface RentaQuintaInput {
  /** Remuneración mensual computable (sueldo bruto + asig. familiar + horas extras) */
  remuneracionMensual: number
  /** Mes actual del ejercicio (1 = enero, 12 = diciembre) */
  mes: number
  /**
   * Gratificaciones recibidas o por recibir en el año.
   * Julio cuenta en meses 7-12, diciembre cuenta todo el año.
   * Pasa el total acumulado ya conocido.
   */
  gratificacionesAnuales?: number
  /**
   * Renta 5ta ya retenida en los meses anteriores del mismo ejercicio.
   * Necesaria para el cálculo incremental correcto (Art. 40 b).
   */
  retenidoAcumulado?: number
  /**
   * Otros ingresos de 5ta categoría del año (bonificaciones extraordinarias, etc.)
   */
  otrosIngresosAnuales?: number
}

export interface DetalleTramo {
  tramo: string
  baseGravada: number  // soles en este tramo
  tasa: number
  impuesto: number
}

export interface RentaQuintaResult {
  rentaBrutaAnualProyectada: number
  deduccion7UIT: number
  rentaNetaAnualImponible: number
  impuestoAnualProyectado: number
  retencionMesActual: number     // lo que se retiene este mes
  retenidoAcumulado: number      // lo ya retenido
  detalleEscala: DetalleTramo[]
  baseLegal: string
}

// ── Main calculator ───────────────────────────────────────────────────────────

export function calcularRentaQuinta(input: RentaQuintaInput): RentaQuintaResult {
  const {
    remuneracionMensual,
    mes,
    gratificacionesAnuales = 0,
    retenidoAcumulado = 0,
    otrosIngresosAnuales = 0,
  } = input

  // 1. Proyectar Renta Bruta Anual (RBA) — FIX #2.A.
  const rentaBrutaAnualProyectada = money(remuneracionMensual)
    .mul(12)
    .add(gratificacionesAnuales)
    .add(otrosIngresosAnuales)
    .toNumber()

  // 2. Deducción 7 UIT
  const deduccion7UIT = DEDUCCION_UIT * UIT  // S/ 38,500

  // 3. Renta Neta Imponible
  const rentaNetaAnualImponible = Math.max(0, rentaBrutaAnualProyectada - deduccion7UIT)

  // 4. Aplicar escala progresiva
  const { impuesto: impuestoAnualProyectado, detalleEscala } =
    aplicarEscalaProgresiva(rentaNetaAnualImponible)

  // 5. Retención del mes actual (Art. 40 literal b y c) — FIX #2.A.
  const mesesRestantes = 13 - mes  // ej: mes 4 → quedan 9 meses (abril a diciembre)
  const pendiente = Math.max(0, impuestoAnualProyectado - retenidoAcumulado)
  const retencionMesActual = money(pendiente).div(mesesRestantes).toNumber()

  return {
    rentaBrutaAnualProyectada,
    deduccion7UIT,
    rentaNetaAnualImponible,
    impuestoAnualProyectado: round(impuestoAnualProyectado),
    retencionMesActual,
    retenidoAcumulado,
    detalleEscala,
    baseLegal:
      'TUO Ley IR (D.S. 179-2004-EF) Arts. 75 y 86; Reglamento D.S. 122-94-EF Art. 40',
  }
}

// ── Progressive scale ────────────────────────────────────────────────────────

function aplicarEscalaProgresiva(baseImponible: number): {
  impuesto: number
  detalleEscala: DetalleTramo[]
} {
  let impuesto = 0
  let restante = baseImponible
  let tramoPrevioUIT = 0
  const detalleEscala: DetalleTramo[] = []

  for (const tramo of ESCALA) {
    if (restante <= 0) break

    const anchoTramoSoles = tramo.hastaUIT === Infinity
      ? restante
      : (tramo.hastaUIT - tramoPrevioUIT) * UIT

    const baseGravada = Math.min(restante, anchoTramoSoles)
    const impuestoTramo = baseGravada * tramo.tasa

    const label = tramo.hastaUIT === Infinity
      ? `Más de ${tramoPrevioUIT} UIT`
      : `${tramoPrevioUIT} – ${tramo.hastaUIT} UIT`

    detalleEscala.push({
      tramo: label,
      baseGravada: round(baseGravada),
      tasa: tramo.tasa,
      impuesto: round(impuestoTramo),
    })

    impuesto += impuestoTramo
    restante -= baseGravada
    tramoPrevioUIT = tramo.hastaUIT === Infinity ? tramoPrevioUIT : tramo.hastaUIT
  }

  return { impuesto, detalleEscala }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

// ── Convenience helper ────────────────────────────────────────────────────────

/**
 * Returns a quick estimate of the annual renta quinta (for display only).
 * Uses the same logic but without the incremental correction.
 */
export function estimarRentaQuintaAnual(remuneracionMensual: number): number {
  const rba = remuneracionMensual * 14  // ×14: 12 sueldos + 2 gratificaciones
  const neta = Math.max(0, rba - DEDUCCION_UIT * UIT)
  const { impuesto } = aplicarEscalaProgresiva(neta)
  return round(impuesto)
}
