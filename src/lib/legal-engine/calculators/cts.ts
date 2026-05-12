import { CTSInput, CTSResult } from '../types'
import {
  PERU_LABOR,
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

  // 2. Determinar meses y días computables entre ingreso y corte.
  // CTS es una calculadora laboral peruana: tratamos YYYY-MM-DD como fecha
  // legal de Lima y no como un instante UTC dependiente del servidor.
  parseIsoDate(input.fechaIngreso)
  const fechaCorte = parseIsoDate(input.fechaCorte)

  // FIX #0.5: el motor solo soporta los DOS cortes legales del D.S. 001-97-TR:
  // 15 de mayo (semestre nov-abr) y 15 de noviembre (semestre may-oct).
  // Antes, cualquier mes distinto caía al `else` y devolvía un cálculo
  // silenciosamente incorrecto (semestre may-oct asumido). Para cese mid-año
  // se usa la calculadora de LIQUIDACIÓN (CTS trunca), no esta.
  const mesCorte = fechaCorte.month
  if (mesCorte !== 5 && mesCorte !== 11) {
    throw new Error(
      `CTS: fechaCorte debe ser 15 de mayo (5) o 15 de noviembre (11). ` +
      `Recibido: mes ${mesCorte}. Para cálculo de cese parcial use la calculadora de liquidación.`
    )
  }

  let inicioSemestre: string
  if (mesCorte === 5) {
    // Corte mayo 15 → semestre nov-abr (nov del año anterior)
    inicioSemestre = isoDate(fechaCorte.year - 1, 11, 1)
  } else {
    // Corte noviembre 15 → semestre may-oct
    inicioSemestre = isoDate(fechaCorte.year, 5, 1)
  }

  // Si el trabajador ingresó después del inicio del semestre, usar fecha de ingreso
  const fechaEfectivaInicio = input.fechaIngreso > inicioSemestre ? input.fechaIngreso : inicioSemestre
  const periodo = calcularPeriodoLaboralPeru(fechaEfectivaInicio, input.fechaCorte)

  // Máximo 6 meses por periodo
  const mesesComputables = Math.min(periodo.totalMeses, PERU_LABOR.CTS.MESES_POR_PERIODO)
  const diasComputables = periodo.dias

  // 3. Cálculo de CTS — FIX #2.A usa Money para precisión decimal exacta.
  // CTS = (remComp / 12) × meses + (remComp / 360) × días
  const remM = money(remuneracionComputable)
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

type DateParts = {
  year: number
  month: number
  day: number
}

function parseIsoDate(value: string): DateParts {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    throw new Error('CTS: fechaIngreso y fechaCorte deben ser fechas válidas (YYYY-MM-DD).')
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  const valid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day

  if (!valid) {
    throw new Error('CTS: fechaIngreso y fechaCorte deben ser fechas válidas (YYYY-MM-DD).')
  }

  return { year, month, day }
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function calcularPeriodoLaboralPeru(fechaIngreso: string, fechaCese: string) {
  const inicio = toPeruDateParts(fechaIngreso)
  const fin = toPeruDateParts(fechaCese)

  let anos = fin.year - inicio.year
  let meses = fin.month - inicio.month
  let dias = fin.day - inicio.day

  if (dias < 0) {
    meses--
    dias += daysInPreviousMonth(fin.year, fin.month)
  }

  if (meses < 0) {
    anos--
    meses += 12
  }

  const totalMeses = anos * 12 + meses
  const totalDias = Math.floor(
    (Date.UTC(fin.year, fin.month - 1, fin.day) - Date.UTC(inicio.year, inicio.month - 1, inicio.day)) /
      (1000 * 60 * 60 * 24)
  )

  return { anos, meses, dias, totalMeses, totalDias }
}

function toPeruDateParts(value: string): DateParts {
  const { year, month, day } = parseIsoDate(value)
  const limaMidnightOffsetMs = 5 * 60 * 60 * 1000
  const shifted = new Date(Date.UTC(year, month - 1, day) - limaMidnightOffsetMs)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

function daysInPreviousMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 0)).getUTCDate()
}
