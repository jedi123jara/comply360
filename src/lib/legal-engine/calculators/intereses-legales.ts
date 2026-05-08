// =============================================
// INTERESES LEGALES LABORALES
// Art. 3 D.Ley 25920 - Intereses que se devengan
// por adeudos de carácter laboral
// =============================================

import { money } from '../money'

// =============================================
// Types
// =============================================

export interface InteresesLegalesInput {
  capital: number           // Monto adeudado (S/)
  fechaInicio: string       // ISO date - desde cuándo se adeuda
  fechaFin: string          // ISO date - hasta cuándo calcular
  tipoInteres: 'laboral' | 'efectivo'
}

export interface InteresesLegalesResult {
  capital: number
  tasaAnual: number
  tasaDiaria: number
  diasCalculados: number
  interesAcumulado: number
  total: number
  formula: string
  baseLegal: string
  detalle: string
}

// =============================================
// Tasas referenciales BCRP
// (tasas promedio aproximadas vigentes)
// =============================================

const TASAS_INTERES_LEGAL: Record<string, number> = {
  // Interés legal laboral (moneda nacional)
  laboral: 2.27,
  // Interés legal efectivo (moneda nacional)
  efectivo: 1.89,
}

// =============================================
// Cálculo principal
// =============================================

export function calcularInteresesLegales(
  input: InteresesLegalesInput
): InteresesLegalesResult {
  const { capital, fechaInicio, fechaFin, tipoInteres } = input

  // 1. Obtener tasa anual según tipo
  const tasaAnual = TASAS_INTERES_LEGAL[tipoInteres]

  // 2. Calcular días entre fechas
  const inicio = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  const diffMs = fin.getTime() - inicio.getTime()
  const diasCalculados = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0)

  // 3. Tasa diaria (interés simple — D. Ley 25920 no permite capitalización)
  // Factor diario = tasaAnual / 100 / 360
  const factorDiario = tasaAnual / 100 / 360
  const tasaDiaria = Math.round(factorDiario * 10000000) / 10000000

  // 4. Interés acumulado con interés simple — FIX #2.A.
  // Interés = capital × (tasaAnual/100) × (días/360)
  const capitalM = money(capital)
  const interesAcumulado = capitalM.mul(factorDiario).mul(diasCalculados).toNumber()
  const total = capitalM.add(interesAcumulado).toNumber()

  // 5. Construir fórmula descriptiva
  const tipoLabel = tipoInteres === 'laboral'
    ? 'Interés Legal Laboral'
    : 'Interés Legal Efectivo'

  const formula =
    `${tipoLabel}: Tasa anual ${tasaAnual}% → Factor diario = ${tasaAnual}% / 360 = ${(factorDiario * 100).toFixed(6)}%. ` +
    `Interés = ${fmt(capital)} × ${(factorDiario * 100).toFixed(6)}% × ${diasCalculados} días = ${fmt(interesAcumulado)}`

  const baseLegal =
    'D. Ley 25920 - Art. 3: El interés legal sobre los montos adeudados por el empleador ' +
    'se devenga a partir del día siguiente de aquél en que se produjo el incumplimiento y ' +
    'hasta el día de su pago efectivo. Se aplica interés simple; la tasa la fija el BCRP.'

  const detalle =
    `Capital adeudado: ${fmt(capital)}. ` +
    `Período: ${formatDate(inicio)} al ${formatDate(fin)} (${diasCalculados} días). ` +
    `Tasa anual BCRP (${tipoLabel}): ${tasaAnual}%. ` +
    `Interés simple (D. Ley 25920). ` +
    `Interés devengado: ${fmt(interesAcumulado)}. ` +
    `Total a pagar: ${fmt(total)}.`

  return {
    capital,
    tasaAnual,
    tasaDiaria,
    diasCalculados,
    interesAcumulado,
    total,
    formula,
    baseLegal,
    detalle,
  }
}

// =============================================
// Helpers
// =============================================

function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
