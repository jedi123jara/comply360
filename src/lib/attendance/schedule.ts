/**
 * Helpers para el horario laboral pactado por worker (Fase 1.2).
 *
 * Reemplaza el hardcodeo de 8:00 AM + 15 min tolerancia que existía antes en
 * los endpoints de fichado. Ahora cada worker tiene su propio horario y
 * tolerancia, configurables desde el detalle del worker o vía bulk action.
 */

export interface WorkerSchedule {
  expectedClockInHour: number
  expectedClockInMinute: number
  expectedClockOutHour: number
  expectedClockOutMinute: number
  lateToleranceMinutes: number
}

export const DEFAULT_SCHEDULE: WorkerSchedule = {
  expectedClockInHour: 8,
  expectedClockInMinute: 0,
  expectedClockOutHour: 17,
  expectedClockOutMinute: 0,
  lateToleranceMinutes: 15,
}

/**
 * Determina si un clock-in es PRESENT o LATE según el horario pactado del worker.
 *
 * `lateToleranceMinutes` es un margen de gracia: dentro de ese margen sigue
 * siendo PRESENT, después es LATE.
 *
 * Si el worker no tiene horario configurado (campos en null por migration
 * pendiente), se usa el DEFAULT_SCHEDULE.
 */
export function deriveAttendanceStatusFromSchedule(
  clockInDate: Date,
  schedule: Partial<WorkerSchedule> | null | undefined,
): 'PRESENT' | 'LATE' {
  const s = mergeSchedule(schedule)
  const expected = new Date(clockInDate)
  expected.setHours(s.expectedClockInHour, s.expectedClockInMinute, 0, 0)
  const diffMinutes = (clockInDate.getTime() - expected.getTime()) / 60_000
  return diffMinutes > s.lateToleranceMinutes ? 'LATE' : 'PRESENT'
}

/**
 * Aplica defaults sobre un schedule potencialmente parcial.
 * Útil cuando el worker no tiene los campos seteados o solo se quieren
 * editar algunos.
 */
export function mergeSchedule(schedule: Partial<WorkerSchedule> | null | undefined): WorkerSchedule {
  if (!schedule) return DEFAULT_SCHEDULE
  return {
    expectedClockInHour: schedule.expectedClockInHour ?? DEFAULT_SCHEDULE.expectedClockInHour,
    expectedClockInMinute: schedule.expectedClockInMinute ?? DEFAULT_SCHEDULE.expectedClockInMinute,
    expectedClockOutHour: schedule.expectedClockOutHour ?? DEFAULT_SCHEDULE.expectedClockOutHour,
    expectedClockOutMinute: schedule.expectedClockOutMinute ?? DEFAULT_SCHEDULE.expectedClockOutMinute,
    lateToleranceMinutes: schedule.lateToleranceMinutes ?? DEFAULT_SCHEDULE.lateToleranceMinutes,
  }
}

/**
 * Formatea HH:MM legible (ej: 8:00 AM, 5:30 PM) para UI.
 */
export function formatScheduleTime(hour: number, minute: number): string {
  const h = hour % 12 || 12
  const m = minute.toString().padStart(2, '0')
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `${h}:${m} ${ampm}`
}

/**
 * Validación de input para los 5 campos. Devuelve { ok: true, value } o
 * { ok: false, error }. No usa Zod para mantener el helper sin deps.
 */
export function validateScheduleInput(input: Partial<WorkerSchedule>): {
  ok: true
  value: WorkerSchedule
} | { ok: false; error: string } {
  const s = mergeSchedule(input)
  if (s.expectedClockInHour < 0 || s.expectedClockInHour > 23) {
    return { ok: false, error: 'Hora de entrada debe estar entre 0 y 23' }
  }
  if (s.expectedClockInMinute < 0 || s.expectedClockInMinute > 59) {
    return { ok: false, error: 'Minuto de entrada debe estar entre 0 y 59' }
  }
  if (s.expectedClockOutHour < 0 || s.expectedClockOutHour > 23) {
    return { ok: false, error: 'Hora de salida debe estar entre 0 y 23' }
  }
  if (s.expectedClockOutMinute < 0 || s.expectedClockOutMinute > 59) {
    return { ok: false, error: 'Minuto de salida debe estar entre 0 y 59' }
  }
  if (s.lateToleranceMinutes < 0 || s.lateToleranceMinutes > 120) {
    return { ok: false, error: 'Tolerancia debe estar entre 0 y 120 minutos' }
  }
  // El horario de salida debe ser posterior al de entrada (mismo día — turnos
  // nocturnos requerirían un campo extra "cruzaMedianoche" que dejamos para futuro)
  const inMin = s.expectedClockInHour * 60 + s.expectedClockInMinute
  const outMin = s.expectedClockOutHour * 60 + s.expectedClockOutMinute
  if (outMin <= inMin) {
    return { ok: false, error: 'La hora de salida debe ser posterior a la de entrada' }
  }
  return { ok: true, value: s }
}
