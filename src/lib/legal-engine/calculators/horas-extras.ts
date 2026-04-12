import { HorasExtrasInput, HorasExtrasResult } from '../types'
import {
  PERU_LABOR,
} from '../peru-labor'

// =============================================
// HORAS EXTRAS (Sobretiempo)
// D.S. 007-2002-TR (TUO Jornada de Trabajo)
// =============================================

export function calcularHorasExtras(input: HorasExtrasInput): HorasExtrasResult {
  const config = PERU_LABOR.HORAS_EXTRAS

  // 1. Valor hora base
  const valorHora = input.sueldoBruto / config.HORAS_MENSUALES

  // 2. Valores con sobretasa
  const valorHoraExtra25 = Math.round(valorHora * (1 + config.SOBRETASA_PRIMERAS_2H) * 100) / 100
  const valorHoraExtra35 = Math.round(valorHora * (1 + config.SOBRETASA_SIGUIENTES) * 100) / 100
  const valorHoraDomingo = Math.round(valorHora * (1 + config.SOBRETASA_DOMINGO) * 100) / 100

  // 3. Calcular horas extras semanales (sobre la jornada máxima de 48h)
  const horasExtrasSemanales = Math.max(input.horasSemanales - config.JORNADA_MAXIMA_SEMANAL, 0)

  // 4. Estimar distribución semanal:
  //    - Primeras 2 horas por día laboral (máx 2h/día × 6 días = 12h semanales al 25%)
  //    - Resto al 35%
  const horasAlDia25 = 2 // Primeras 2 horas diarias al 25%
  const diasLaboralesSemana = 6
  const maxHoras25Semanales = horasAlDia25 * diasLaboralesSemana // 12 horas semanales como máximo al 25%

  const horas25Semanales = Math.min(horasExtrasSemanales, maxHoras25Semanales)
  const horas35Semanales = Math.max(horasExtrasSemanales - maxHoras25Semanales, 0)

  // 5. Escalar al total de meses acumulados (aprox 4.33 semanas/mes)
  const semanasTotal = input.mesesAcumulados * 4.33

  const cantidadHoras25 = Math.round(horas25Semanales * semanasTotal * 100) / 100
  const cantidadHoras35 = Math.round(horas35Semanales * semanasTotal * 100) / 100

  const montoHoras25 = Math.round(cantidadHoras25 * valorHoraExtra25 * 100) / 100
  const montoHoras35 = Math.round(cantidadHoras35 * valorHoraExtra35 * 100) / 100

  // 6. Horas en domingo (si aplica)
  let cantidadHorasDomingo = 0
  let montoHorasDomingo = 0
  if (input.incluyeDomingos && input.horasDomingo > 0) {
    // horasDomingo = horas trabajadas en domingo por semana
    cantidadHorasDomingo = Math.round(input.horasDomingo * semanasTotal * 100) / 100
    montoHorasDomingo = Math.round(cantidadHorasDomingo * valorHoraDomingo * 100) / 100
  }

  // 7. Totales
  const totalHoras = Math.round((cantidadHoras25 + cantidadHoras35 + cantidadHorasDomingo) * 100) / 100
  const montoTotal = Math.round((montoHoras25 + montoHoras35 + montoHorasDomingo) * 100) / 100

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
