/**
 * Detección automática de horas extras (Fase 1.3).
 *
 * Marco legal:
 *   - D.Leg. 854 / D.S. 007-2002-TR: jornada máxima ordinaria 8h diarias / 48h
 *     semanales. Toda hora trabajada por encima es sobretiempo (overtime).
 *   - Bonificación: 25% sobre la hora ordinaria las primeras 2h, 35% desde la 3ra.
 *   - El cálculo del MONTO de overtime lo hace el legal-engine al generar boleta;
 *     este helper solo DETECTA si hubo overtime y cuántos minutos.
 *
 * Convención: jornada diaria pactada = jornadaSemanal / 5 (5 días laborables).
 * Si la org opera 6 días, ajustar el divisor desde la config futura.
 */

const DEFAULT_DAYS_PER_WEEK = 5

export interface OvertimeResult {
  /** True si hoursWorked excede la jornada diaria pactada */
  isOvertime: boolean
  /** Minutos extras trabajados (positivo si isOvertime, 0 si no). */
  overtimeMinutes: number
  /** Jornada diaria pactada (en horas) que se usó como referencia. */
  jornadaDiariaHoras: number
}

/**
 * Calcula si hubo horas extras y cuántos minutos.
 *
 * @param hoursWorked horas trabajadas en el día (Decimal.toNumber() del DB)
 * @param jornadaSemanal del worker (default 48)
 * @param diasSemana días laborables/semana (default 5)
 */
export function calculateOvertime(
  hoursWorked: number,
  jornadaSemanal: number = 48,
  diasSemana: number = DEFAULT_DAYS_PER_WEEK,
): OvertimeResult {
  if (!Number.isFinite(hoursWorked) || hoursWorked <= 0) {
    return { isOvertime: false, overtimeMinutes: 0, jornadaDiariaHoras: jornadaSemanal / diasSemana }
  }
  const jornadaDiariaHoras = jornadaSemanal / diasSemana
  if (hoursWorked <= jornadaDiariaHoras) {
    return { isOvertime: false, overtimeMinutes: 0, jornadaDiariaHoras }
  }
  const extraHoras = hoursWorked - jornadaDiariaHoras
  const overtimeMinutes = Math.round(extraHoras * 60)
  return { isOvertime: true, overtimeMinutes, jornadaDiariaHoras }
}

/**
 * Formatea minutos como "Xh Ymin" o "Ymin" para UI.
 * Ej: 90 → "1h 30min", 45 → "45min", 60 → "1h"
 */
export function formatOvertime(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}
