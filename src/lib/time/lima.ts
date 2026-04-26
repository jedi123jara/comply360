/**
 * Helpers de timezone America/Lima.
 *
 * Perú NO observa DST — el offset es fijo UTC-5 todo el año. Eso simplifica
 * todo: no necesitamos @date-fns/tz ni bibliotecas de timezone, basta con
 * shifting por 5 horas.
 *
 * Uso típico:
 *  - `getLimaParts(date)` — descomponer un instante en sus campos calendario
 *    Lima (year, month, day, hour, minute, weekday). Reemplaza
 *    `date.getHours()` etc. cuando necesitas la hora LOCAL de Lima.
 *  - `startOfDayLima(date)` — instante UTC que corresponde a 00:00:00 del
 *    día calendario Lima que contiene `date`. Útil para diffs de días.
 *  - `daysBetween(a, b)` — diferencia en días de calendario Lima (no horas).
 *
 * Bug latente que esto corrige: `matchesCron()` en `src/lib/workflows/triggers.ts`
 * usa `date.getHours()` — en Vercel el server corre en UTC, así que un cron
 * "0 8 * * *" dispara a las 8 UTC (03:00 Lima), no a las 8 Lima. Los
 * consumidores de cron deben migrar a `getLimaParts`.
 */

const LIMA_OFFSET_HOURS = -5
const LIMA_OFFSET_MS = LIMA_OFFSET_HOURS * 60 * 60 * 1000

export interface LimaParts {
  /** Año, ej. 2026. */
  year: number
  /** Mes 1-12. */
  month: number
  /** Día del mes 1-31. */
  day: number
  /** Hora 0-23. */
  hour: number
  /** Minuto 0-59. */
  minute: number
  /** Segundo 0-59. */
  second: number
  /** Día de la semana 0 (Domingo) - 6 (Sábado). */
  weekday: number
}

/**
 * Descompone un instante (Date UTC) en los campos calendario que tendría
 * en zona America/Lima.
 */
export function getLimaParts(date: Date): LimaParts {
  const shifted = new Date(date.getTime() + LIMA_OFFSET_MS)
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
    weekday: shifted.getUTCDay(),
  }
}

/**
 * Devuelve el instante UTC que corresponde a las 00:00:00 del día calendario
 * Lima que contiene `date`. Útil para comparar "calendar days" con precisión.
 *
 * Ejemplo: si `date` es "2026-04-23 02:30 UTC" (= "2026-04-22 21:30 Lima"),
 * el resultado es "2026-04-22 05:00 UTC" (= "2026-04-22 00:00 Lima").
 */
export function startOfDayLima(date: Date): Date {
  const parts = getLimaParts(date)
  // 00:00 Lima = 05:00 UTC del mismo día calendario Lima
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, -LIMA_OFFSET_HOURS, 0, 0, 0),
  )
}

/**
 * Diferencia en días de calendario Lima entre dos instantes. Signo:
 *   daysBetween(ayer, hoy) === -1
 *   daysBetween(hoy, ayer) === +1
 *   daysBetween(X, X) === 0 (siempre que X sea el mismo día Lima)
 *
 * Para streaks usar `Math.abs(daysBetween(today, lastDay))`.
 */
export function daysBetween(a: Date, b: Date): number {
  const ms = startOfDayLima(a).getTime() - startOfDayLima(b).getTime()
  return Math.round(ms / 86_400_000)
}

/**
 * True si dos instantes caen en el mismo día calendario Lima.
 */
export function isSameDayLima(a: Date, b: Date): boolean {
  return daysBetween(a, b) === 0
}

/**
 * Formatea una Date como "YYYY-MM-DD" en zona Lima. Útil para keys y logs.
 */
export function formatDateLima(date: Date): string {
  const p = getLimaParts(date)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}
