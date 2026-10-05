/**
 * Formatos del panel principal (cabecera + KPIs + prioridades).
 *
 * Todo es determinista (sin `toLocaleDateString` ni zona horaria del
 * navegador) para que el HTML del servidor y el del navegador coincidan al
 * hidratar. Las fechas se leen en hora de Lima (UTC-5, sin horario de verano).
 */

import { getLimaParts } from '@/lib/time/lima'

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const

/** Monto en soles sin decimales: 12340.4 → "S/ 12,340". */
export function formatSolesRedondeado(value: number | null | undefined): string {
  const num = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0
  return `S/ ${num.toLocaleString('en-US')}`
}

function parseIso(iso: string | Date | null | undefined): Date | null {
  if (!iso) return null
  const date = iso instanceof Date ? iso : new Date(iso)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Fecha corta en hora de Lima: "12 de octubre". Agrega el año solo si no es
 * el año en curso ("3 de diciembre de 2025").
 */
export function formatFechaLima(iso: string | Date | null | undefined, now: Date = new Date()): string | null {
  const date = parseIso(iso)
  if (!date) return null
  const parts = getLimaParts(date)
  const base = `${parts.day} de ${MESES[parts.month - 1]}`
  return parts.year === getLimaParts(now).year ? base : `${base} de ${parts.year}`
}

export type NivelCumplimiento = 'bien' | 'en-riesgo' | 'critico'

/** Mismos cortes que el color del puntaje en la barra superior (80 / 60). */
export function nivelCumplimiento(score: number): NivelCumplimiento {
  if (score >= 80) return 'bien'
  if (score >= 60) return 'en-riesgo'
  return 'critico'
}

/**
 * Mismas palabras que el resultado del diagnóstico y `complianceScoreLabel`
 * (src/lib/brand.ts): Bien (80+), A mejorar (60-79), En riesgo (menos de 60).
 * Las claves internas no cambian.
 */
export const NIVEL_LABEL: Record<NivelCumplimiento, string> = {
  bien: 'Bien',
  'en-riesgo': 'A mejorar',
  critico: 'En riesgo',
}
