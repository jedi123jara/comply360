import { VacacionesInput, VacacionesResult } from '../types'
import {
  PERU_LABOR,
  calcularPeriodoLaboral,
  calcularRemuneracionComputable,
  getDiasVacacionesPorRegimen,
} from '../peru-labor'

// =============================================
// VACACIONES - Truncas, No Gozadas e Indemnización
// D.Leg. 713 y D.S. 012-92-TR
// MYPE: Ley 32353 (15 días)
// Doméstico: Ley 27986 (15 días)
// =============================================

export function calcularVacaciones(input: VacacionesInput): VacacionesResult {
  const remComputable = calcularRemuneracionComputable(
    input.sueldoBruto,
    input.asignacionFamiliar
  )

  const periodo = calcularPeriodoLaboral(input.fechaIngreso, input.fechaCese)
  const anosCompletos = periodo.anos
  const mesesFraccion = periodo.meses
  const diasFraccion = periodo.dias

  // FIX #0.10: días por año según régimen del trabajador (no más hardcoded 30).
  // GENERAL=30, MYPE_MICRO/PEQUENA=15, DOMESTICO=15, MODALIDAD_FORMATIVA=0.
  const diasPorAnoRegimen = getDiasVacacionesPorRegimen(input.regimenLaboral)

  // =============================================
  // 1. Vacaciones Truncas
  // Para el año incompleto (fracción): (rem / 12) × meses + (rem / 360) × días
  // Requiere mínimo 1 mes de servicio (RECORD_MINIMO_MESES)
  // =============================================
  let vacacionesTruncas = 0
  let diasTruncosComputables = 0

  if (
    diasPorAnoRegimen > 0 &&
    (mesesFraccion >= PERU_LABOR.VACACIONES.RECORD_MINIMO_MESES ||
      (mesesFraccion === 0 && anosCompletos === 0 && diasFraccion > 0))
  ) {
    // Días truncos equivalentes proporcionales al régimen.
    diasTruncosComputables = Math.round(
      (mesesFraccion * diasPorAnoRegimen) / 12 + (diasFraccion * diasPorAnoRegimen) / 360
    )

    vacacionesTruncas = (remComputable / 12) * mesesFraccion +
                        (remComputable / 360) * diasFraccion
    vacacionesTruncas = Math.round(vacacionesTruncas * 100) / 100
  }

  // =============================================
  // 2. Vacaciones No Gozadas y Indemnización
  // Por cada año completo el trabajador tiene derecho a `diasPorAnoRegimen`.
  // Días que debió gozar = anosCompletos × diasPorAnoRegimen
  // Días no gozados = diasDebidos - diasGozados
  // =============================================
  const diasDebidos = anosCompletos * diasPorAnoRegimen
  const diasNoGozados = Math.max(diasDebidos - input.diasGozados, 0)

  // Periodos completos no gozados (cada `diasPorAnoRegimen` = 1 periodo anual)
  const periodosNoGozados = diasPorAnoRegimen > 0
    ? Math.floor(diasNoGozados / diasPorAnoRegimen)
    : 0

  // Pago por vacaciones no gozadas: (rem / diasPorAno) × días no gozados.
  // Si el régimen no tiene vacaciones (formativa), el monto es 0.
  const vacacionesNoGozadas = diasPorAnoRegimen > 0
    ? Math.round((remComputable / diasPorAnoRegimen) * diasNoGozados * 100) / 100
    : 0

  // =============================================
  // 3. Indemnización vacacional (triple pago)
  // Por cada periodo anual completo no gozado:
  // 1 remuneración adicional (Art. 23 D.Leg. 713)
  // =============================================
  const indemnizacionVacacional = Math.round(
    remComputable * PERU_LABOR.VACACIONES.INDEMNIZACION_NO_GOZADAS * periodosNoGozados * 100
  ) / 100

  // =============================================
  // 4. Total
  // =============================================
  const total = Math.round(
    (vacacionesTruncas + vacacionesNoGozadas + indemnizacionVacacional) * 100
  ) / 100

  // 5. Fórmula descriptiva
  const partes: string[] = []

  if (vacacionesTruncas > 0) {
    partes.push(
      `Vacaciones truncas: (${fmt(remComputable)} / 12 × ${mesesFraccion} meses) + ` +
      `(${fmt(remComputable)} / 360 × ${diasFraccion} días) = ${fmt(vacacionesTruncas)}`
    )
  }

  if (vacacionesNoGozadas > 0) {
    partes.push(
      `Vacaciones no gozadas: (${fmt(remComputable)} / 30 × ${diasNoGozados} días) = ${fmt(vacacionesNoGozadas)}`
    )
  }

  if (indemnizacionVacacional > 0) {
    partes.push(
      `Indemnización vacacional: ${fmt(remComputable)} × ${periodosNoGozados} periodo(s) no gozado(s) = ${fmt(indemnizacionVacacional)}`
    )
  }

  const formula = partes.length > 0
    ? partes.join('. ') + `. Total vacaciones: ${fmt(total)}.` +
      ` Tiempo de servicio: ${anosCompletos} año(s), ${mesesFraccion} mes(es) y ${diasFraccion} día(s).`
    : `No se generaron montos por vacaciones. Tiempo de servicio: ${anosCompletos} año(s), ${mesesFraccion} mes(es) y ${diasFraccion} día(s).`

  return {
    vacacionesTruncas,
    vacacionesNoGozadas,
    indemnizacionVacacional,
    total,
    diasTruncosComputables,
    periodosNoGozados,
    formula,
    baseLegal: PERU_LABOR.VACACIONES.BASE_LEGAL,
  }
}

// Format helper
function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
