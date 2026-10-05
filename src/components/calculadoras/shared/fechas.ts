/**
 * Fechas de pago de beneficios para las calculadoras.
 *
 * Todo se calcula con el calendario de Lima y a partir de "hoy", para que el
 * valor por defecto sea siempre el PRÓXIMO depósito o pago y nunca un periodo
 * que ya pasó.
 *
 *  - CTS: se deposita hasta el 15 de mayo (semestre noviembre–abril) y hasta
 *    el 15 de noviembre (semestre mayo–octubre). D.S. 001-97-TR.
 *  - Gratificación: se paga hasta el 15 de julio (semestre enero–junio) y
 *    hasta el 15 de diciembre (semestre julio–diciembre). Ley 27735.
 */

import { getNextCtsCutDate, toIsoDate } from '@/lib/legal-engine/cts-cutoffs'
import { getLimaParts } from '@/lib/time/lima'

const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

export type EstadoPago = 'proximo' | 'siguiente' | 'anterior'

export interface OpcionFecha<T extends string = string> {
  value: T
  label: string
  estado: EstadoPago
}

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function sufijoEstado(estado: EstadoPago): string {
  if (estado === 'proximo') return ' · próximo depósito'
  if (estado === 'anterior') return ' · ya pasó (para revisar)'
  return ''
}

/** Fecha de hoy en Lima como 'YYYY-MM-DD'. */
export function hoyLimaIso(now: Date = new Date()): string {
  const p = getLimaParts(now)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/* ── CTS ─────────────────────────────────────────────────────────────── */

/** Próximo corte de CTS ('YYYY-05-15' o 'YYYY-11-15') según la fecha de Lima. */
export function proximoCorteCTS(now: Date = new Date()): string {
  return toIsoDate(getNextCtsCutDate(now))
}

function corteAnteriorCTS(corte: string): string {
  const [y, m] = corte.split('-').map(Number)
  return m === 5 ? `${y - 1}-11-15` : `${y}-05-15`
}

function corteSiguienteCTS(corte: string): string {
  const [y, m] = corte.split('-').map(Number)
  return m === 5 ? `${y}-11-15` : `${y + 1}-05-15`
}

/** "15 de mayo de 2027" */
export function etiquetaCorteCTS(corte: string): string {
  const [y, m] = corte.split('-').map(Number)
  return `15 de ${MESES[m - 1]} de ${y}`
}

/** Meses que cubre el depósito: "noviembre 2026 a abril 2027". */
export function periodoCTS(corte: string): string {
  const [y, m] = corte.split('-').map(Number)
  return m === 5 ? `noviembre ${y - 1} a abril ${y}` : `mayo a octubre ${y}`
}

/**
 * Opciones del selector de CTS: el próximo depósito (por defecto), el que
 * sigue y el último que ya pasó (solo para revisar lo depositado).
 */
export function opcionesCorteCTS(now: Date = new Date()): OpcionFecha[] {
  const proximo = proximoCorteCTS(now)
  const filas: Array<[string, EstadoPago]> = [
    [proximo, 'proximo'],
    [corteSiguienteCTS(proximo), 'siguiente'],
    [corteAnteriorCTS(proximo), 'anterior'],
  ]
  return filas.map(([value, estado]) => ({
    value,
    estado,
    label: `${capitalizar(etiquetaCorteCTS(value))}${sufijoEstado(estado)}`,
  }))
}

/* ── Gratificación ───────────────────────────────────────────────────── */

export type PeriodoGrati = 'julio' | 'diciembre'

export interface PagoGrati {
  periodo: PeriodoGrati
  anio: number
}

/** Valor serializado para un <select>: "2026-julio". */
export function pagoGratiValue(p: PagoGrati): string {
  return `${p.anio}-${p.periodo}`
}

export function parsePagoGrati(value: string): PagoGrati | null {
  const match = value.match(/^(\d{4})-(julio|diciembre)$/)
  if (!match) return null
  return { anio: Number(match[1]), periodo: match[2] as PeriodoGrati }
}

/** Próximo pago de gratificación según la fecha de Lima (incluye el día 15). */
export function proximaGratificacion(now: Date = new Date()): PagoGrati {
  const lima = getLimaParts(now)
  const hoy = lima.year * 10_000 + lima.month * 100 + lima.day
  if (hoy <= lima.year * 10_000 + 715) return { periodo: 'julio', anio: lima.year }
  if (hoy <= lima.year * 10_000 + 1215) return { periodo: 'diciembre', anio: lima.year }
  return { periodo: 'julio', anio: lima.year + 1 }
}

function gratiSiguiente(p: PagoGrati): PagoGrati {
  return p.periodo === 'julio' ? { periodo: 'diciembre', anio: p.anio } : { periodo: 'julio', anio: p.anio + 1 }
}

function gratiAnterior(p: PagoGrati): PagoGrati {
  return p.periodo === 'julio' ? { periodo: 'diciembre', anio: p.anio - 1 } : { periodo: 'julio', anio: p.anio }
}

/** "Julio 2026 (Fiestas Patrias)" */
export function etiquetaGratificacion(p: PagoGrati): string {
  return p.periodo === 'julio'
    ? `Julio ${p.anio} (Fiestas Patrias)`
    : `Diciembre ${p.anio} (Navidad)`
}

/** Meses que cubre el pago: "enero a junio 2026". */
export function semestreGratificacion(p: PagoGrati): string {
  return p.periodo === 'julio' ? `enero a junio ${p.anio}` : `julio a diciembre ${p.anio}`
}

export function opcionesGratificacion(now: Date = new Date()): OpcionFecha[] {
  const proximo = proximaGratificacion(now)
  const filas: Array<[PagoGrati, EstadoPago]> = [
    [proximo, 'proximo'],
    [gratiSiguiente(proximo), 'siguiente'],
    [gratiAnterior(proximo), 'anterior'],
  ]
  return filas.map(([p, estado]) => ({
    value: pagoGratiValue(p),
    estado,
    label: `${etiquetaGratificacion(p)}${estado === 'proximo' ? ' · próximo pago' : estado === 'anterior' ? ' · ya pasó (para revisar)' : ''}`,
  }))
}

/**
 * Meses calendario COMPLETOS que el trabajador habrá laborado en el semestre
 * de la gratificación, según su fecha de ingreso (Ley 27735: solo cuentan los
 * meses completos). Supone que sigue trabajando hasta el fin del semestre.
 *
 * Devuelve null si la fecha no es válida.
 */
export function mesesCompletosSemestreGrati(fechaIngreso: string, pago: PagoGrati): number | null {
  const match = fechaIngreso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  const mesInicio = pago.periodo === 'julio' ? 1 : 7
  const ingreso = y * 10_000 + m * 100 + d
  const inicio = pago.anio * 10_000 + mesInicio * 100 + 1
  const fin = pago.anio * 10_000 + (mesInicio + 5) * 100 + 31

  if (ingreso <= inicio) return 6
  if (ingreso > fin) return 0
  const desfase = m - mesInicio
  return Math.max(0, 6 - desfase - (d > 1 ? 1 : 0))
}
