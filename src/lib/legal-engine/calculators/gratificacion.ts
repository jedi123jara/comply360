import { GratificacionInput, GratificacionResult } from '../types'
import {
  PERU_LABOR,
  calcularRemuneracionComputable,
} from '../peru-labor'
import { money } from '../money'

// =============================================
// GRATIFICACIÓN - Fiestas Patrias / Navidad
// Ley 27735 y su Reglamento D.S. 005-2002-TR
// =============================================

export function calcularGratificacion(input: GratificacionInput): GratificacionResult {
  // 1. Remuneración computable
  const remComputable = calcularRemuneracionComputable(
    input.sueldoBruto,
    input.asignacionFamiliar
  )

  // 2. Meses trabajados en el semestre (máximo 6)
  const mesesTrabajados = Math.min(Math.max(input.mesesTrabajados, 0), 6)

  // 3. Gratificación bruta — FIX #2.A aritmética decimal precisa.
  const remM = money(remComputable)
  const gratificacionBruta = mesesTrabajados >= 6
    ? remM.toNumber()
    : remM.div(6).mul(mesesTrabajados).toNumber()

  // 4. Bonificación extraordinaria del 9% (aporte EsSalud - Ley 30334)
  const bonificacionExtraordinaria = money(gratificacionBruta)
    .mul(PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA)
    .toNumber()

  // 5. Total neto (exonerado de renta por Ley 30334)
  const totalNeto = money(gratificacionBruta).add(bonificacionExtraordinaria).toNumber()

  // 6. Fórmula descriptiva
  const esTrunca = mesesTrabajados < 6
  const periodoLabel = input.periodo === 'julio' ? 'Fiestas Patrias (julio)' : 'Navidad (diciembre)'
  const formula = esTrunca
    ? `Gratificación trunca ${periodoLabel}: (${fmt(remComputable)} / 6) × ${mesesTrabajados} meses = ${fmt(gratificacionBruta)}. ` +
      `Bonificación extraordinaria 9%: ${fmt(bonificacionExtraordinaria)}. ` +
      `Total neto (exonerado de renta): ${fmt(totalNeto)}`
    : `Gratificación completa ${periodoLabel}: ${fmt(remComputable)}. ` +
      `Bonificación extraordinaria 9%: ${fmt(bonificacionExtraordinaria)}. ` +
      `Total neto (exonerado de renta): ${fmt(totalNeto)}`

  return {
    gratificacionBruta,
    bonificacionExtraordinaria,
    totalNeto,
    formula,
    baseLegal: PERU_LABOR.GRATIFICACION.BASE_LEGAL,
  }
}

// Format helper
function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
