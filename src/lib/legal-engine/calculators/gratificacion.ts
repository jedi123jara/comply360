import { GratificacionInput, GratificacionResult } from '../types'
import {
  PERU_LABOR,
  calcularRemuneracionComputable,
} from '../peru-labor'

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

  // 3. Gratificación bruta
  // Si trabajó los 6 meses completos → 1 remuneración íntegra
  // Si es trunca → (remComp / 6) × mesesTrabajados
  let gratificacionBruta: number
  if (mesesTrabajados >= 6) {
    gratificacionBruta = remComputable
  } else {
    gratificacionBruta = (remComputable / 6) * mesesTrabajados
  }
  gratificacionBruta = Math.round(gratificacionBruta * 100) / 100

  // 4. Bonificación extraordinaria del 9% (aporte EsSalud - Ley 30334)
  const bonificacionExtraordinaria = Math.round(
    gratificacionBruta * PERU_LABOR.GRATIFICACION.BONIFICACION_EXTRAORDINARIA * 100
  ) / 100

  // 5. Total neto (exonerado de renta por Ley 30334)
  const totalNeto = Math.round(
    (gratificacionBruta + bonificacionExtraordinaria) * 100
  ) / 100

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
