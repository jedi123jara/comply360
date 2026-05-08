import { CTSInput, CTSResult } from '../types'
import {
  PERU_LABOR,
  calcularPeriodoLaboral,
  calcularRemuneracionComputable,
} from '../peru-labor'
import { money } from '../money'

// =============================================
// CTS - Compensación por Tiempo de Servicios
// D.S. 001-97-TR (TUO Ley de CTS)
// =============================================

export function calcularCTS(input: CTSInput): CTSResult {
  // 1. Remuneración computable: sueldo + asig familiar + 1/6 última gratificación
  const remBase = calcularRemuneracionComputable(
    input.sueldoBruto,
    input.asignacionFamiliar
  )
  const sextoGratificacion = input.ultimaGratificacion / 6
  const remuneracionComputable = remBase + sextoGratificacion

  // 2. Determinar meses y días computables entre ingreso y corte
  const fechaIngreso = new Date(input.fechaIngreso)
  const fechaCorte = new Date(input.fechaCorte)

  if (isNaN(fechaIngreso.getTime()) || isNaN(fechaCorte.getTime())) {
    throw new Error('CTS: fechaIngreso y fechaCorte deben ser fechas válidas (YYYY-MM-DD).')
  }

  // FIX #0.5: el motor solo soporta los DOS cortes legales del D.S. 001-97-TR:
  // 15 de mayo (semestre nov-abr) y 15 de noviembre (semestre may-oct).
  // Antes, cualquier mes distinto caía al `else` y devolvía un cálculo
  // silenciosamente incorrecto (semestre may-oct asumido). Para cese mid-año
  // se usa la calculadora de LIQUIDACIÓN (CTS trunca), no esta.
  const mesCorte = fechaCorte.getMonth() + 1 // 1-12
  if (mesCorte !== 5 && mesCorte !== 11) {
    throw new Error(
      `CTS: fechaCorte debe ser 15 de mayo (5) o 15 de noviembre (11). ` +
      `Recibido: mes ${mesCorte}. Para cálculo de cese parcial use la calculadora de liquidación.`
    )
  }

  let inicioSemestre: Date
  if (mesCorte === 5) {
    // Corte mayo 15 → semestre nov-abr (nov del año anterior)
    inicioSemestre = new Date(fechaCorte.getFullYear() - 1, 10, 1) // Nov 1
  } else {
    // Corte noviembre 15 → semestre may-oct
    inicioSemestre = new Date(fechaCorte.getFullYear(), 4, 1) // May 1
  }

  // Si el trabajador ingresó después del inicio del semestre, usar fecha de ingreso
  const fechaEfectivaInicio = fechaIngreso > inicioSemestre ? fechaIngreso : inicioSemestre

  const periodo = calcularPeriodoLaboral(
    fechaEfectivaInicio.toISOString().split('T')[0],
    input.fechaCorte
  )

  // Máximo 6 meses por periodo
  const mesesComputables = Math.min(periodo.totalMeses, PERU_LABOR.CTS.MESES_POR_PERIODO)
  const diasComputables = periodo.dias

  // 3. Cálculo de CTS — FIX #2.A usa Money para precisión decimal exacta.
  // CTS = (remComp / 12) × meses + (remComp / 360) × días
  const remM = money(remuneracionComputable)
  const ctsMensual = remM.div(12).toNumber()
  const ctsDiaria = remM.div(360).toNumber()
  const ctsTotal = remM.div(12).mul(mesesComputables)
    .add(remM.div(360).mul(diasComputables))
    .toNumber()

  // 4. Construir fórmula descriptiva
  const formula =
    `CTS = (${fmt(remuneracionComputable)} / 12 × ${mesesComputables} meses) + ` +
    `(${fmt(remuneracionComputable)} / 360 × ${diasComputables} días) = ${fmt(ctsTotal)}. ` +
    `Rem. computable: ${fmt(remBase)} (sueldo${input.asignacionFamiliar ? ' + asig. familiar' : ''}) + ` +
    `1/6 gratificación: ${fmt(sextoGratificacion)}`

  return {
    remuneracionComputable,
    mesesComputables,
    diasComputables,
    ctsTotal,
    formula,
    baseLegal: PERU_LABOR.CTS.BASE_LEGAL,
  }
}

// Format helper
function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
