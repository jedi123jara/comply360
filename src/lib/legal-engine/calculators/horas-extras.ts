import { HorasExtrasInput, HorasExtrasResult } from '../types'
import {
  PERU_LABOR,
} from '../peru-labor'
import { money, sumMoney } from '../money'

// =============================================
// HORAS EXTRAS (Sobretiempo)
// D.S. 007-2002-TR (TUO Jornada de Trabajo)
// =============================================

export function calcularHorasExtras(input: HorasExtrasInput): HorasExtrasResult {
  const config = PERU_LABOR.HORAS_EXTRAS

  // 1. Valor hora base — FIX #2.A aritmética decimal precisa.
  const sueldoM = money(input.sueldoBruto)
  const valorHoraM = sueldoM.div(config.HORAS_MENSUALES)
  const valorHora = valorHoraM.toNumber()

  // 2. Valores con sobretasa
  const valorHoraExtra25 = valorHoraM.mul(1 + config.SOBRETASA_PRIMERAS_2H).toNumber()
  const valorHoraExtra35 = valorHoraM.mul(1 + config.SOBRETASA_SIGUIENTES).toNumber()
  const valorHoraDomingo = valorHoraM.mul(1 + config.SOBRETASA_DOMINGO).toNumber()

  // 3. Calcular horas extras semanales (sobre la jornada máxima de 48h)
  const horasExtrasSemanales = Math.max(input.horasSemanales - config.JORNADA_MAXIMA_SEMANAL, 0)

  // 4. Estimar distribución semanal según D.S. 007-2002-TR Art. 10-11:
  //    - Las primeras 2h DIARIAS al 25%
  //    - El resto del día al 35%
  //
  // FIX #2.E.2: el cálculo asume distribución ÓPTIMA para el trabajador
  // (todas las horas extras spread entre días, hasta 2h/día al 25%). Para
  // un trabajador que hizo 4h extras un solo día, el cálculo correcto sería
  // 2h al 25% + 2h al 35% (no las 4h al 25%). Si el caller tiene la
  // distribución diaria exacta, debería pasar `horasDiarias` (input
  // opcional, si está se usa para cómputo exacto).
  const horasAlDia25 = 2
  const diasLaboralesSemana = 6
  const maxHoras25Semanales = horasAlDia25 * diasLaboralesSemana // 12h/sem como máximo

  let horas25Semanales: number
  let horas35Semanales: number

  if (Array.isArray(input.horasDiarias) && input.horasDiarias.length > 0) {
    // Cómputo exacto día por día (hasta 6 días).
    horas25Semanales = 0
    horas35Semanales = 0
    for (const horasDelDia of input.horasDiarias.slice(0, diasLaboralesSemana)) {
      const extras = Math.max(horasDelDia - 8, 0) // jornada normal 8h/día
      horas25Semanales += Math.min(extras, horasAlDia25)
      horas35Semanales += Math.max(extras - horasAlDia25, 0)
    }
  } else {
    // Fallback: asume distribución óptima (best-case para el empleador).
    horas25Semanales = Math.min(horasExtrasSemanales, maxHoras25Semanales)
    horas35Semanales = Math.max(horasExtrasSemanales - maxHoras25Semanales, 0)
  }

  // 5. Escalar al total de meses acumulados (aprox 4.33 semanas/mes)
  const semanasTotal = input.mesesAcumulados * 4.33

  // FIX #2.A aritmética decimal precisa.
  const cantidadHoras25 = money(horas25Semanales).mul(semanasTotal).toNumber()
  const cantidadHoras35 = money(horas35Semanales).mul(semanasTotal).toNumber()

  const montoHoras25 = money(cantidadHoras25).mul(valorHoraExtra25).toNumber()
  const montoHoras35 = money(cantidadHoras35).mul(valorHoraExtra35).toNumber()

  // 6. Horas en domingo (si aplica)
  let cantidadHorasDomingo = 0
  let montoHorasDomingo = 0
  if (input.incluyeDomingos && input.horasDomingo > 0) {
    cantidadHorasDomingo = money(input.horasDomingo).mul(semanasTotal).toNumber()
    montoHorasDomingo = money(cantidadHorasDomingo).mul(valorHoraDomingo).toNumber()
  }

  // 7. Totales
  const totalHoras = sumMoney([cantidadHoras25, cantidadHoras35, cantidadHorasDomingo]).toNumber()
  const montoTotal = sumMoney([montoHoras25, montoHoras35, montoHorasDomingo]).toNumber()

  // 8. Fórmula descriptiva
  const formula =
    `Valor hora base: ${fmt(input.sueldoBruto)} / ${config.HORAS_MENSUALES} = ${fmt(valorHora)}. ` +
    `Primeras 2h/día (25%): ${cantidadHoras25} hrs × ${fmt(valorHoraExtra25)} = ${fmt(montoHoras25)}. ` +
    `Horas adicionales (35%): ${cantidadHoras35} hrs × ${fmt(valorHoraExtra35)} = ${fmt(montoHoras35)}` +
    (cantidadHorasDomingo > 0
      ? `. Domingos (100%): ${cantidadHorasDomingo} hrs × ${fmt(valorHoraDomingo)} = ${fmt(montoHorasDomingo)}`
      : '') +
    `. Total: ${fmt(montoTotal)} por ${input.mesesAcumulados} mes(es) acumulado(s).`

  return {
    valorHora: Math.round(valorHora * 100) / 100,
    valorHoraExtra25,
    valorHoraExtra35,
    totalHoras,
    montoTotal,
    breakdown: {
      horas25: { cantidad: cantidadHoras25, monto: montoHoras25 },
      horas35: { cantidad: cantidadHoras35, monto: montoHoras35 },
      horasDomingo: { cantidad: cantidadHorasDomingo, monto: montoHorasDomingo },
    },
    formula,
    baseLegal: config.BASE_LEGAL,
  }
}

// Format helper
function fmt(n: number): string {
  return `S/ ${n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
