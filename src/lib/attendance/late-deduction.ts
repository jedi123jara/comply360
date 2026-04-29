/**
 * Cálculo de descuentos por tardanzas (Fase 4 — Asistencia × Nómina).
 *
 * D.Leg. 854 + D.S. 008-2002-TR: el empleador puede descontar de la
 * remuneración el tiempo no laborado por tardanzas o ausencias injustificadas,
 * proporcional a la jornada pactada. NO puede descontar ausencias justificadas
 * (médicas, permisos aprobados, etc.).
 *
 * Fórmula:
 *   minutosJornadaMensual = jornadaSemanal * 60 / 5 días * 30 días / 7 días
 *                         ≈ jornadaSemanal * 60 * 30/7
 *   descuento = (minutosTardanzaNoJustificada / minutosJornadaMensual) × sueldoBruto
 *
 * Ejemplo: jornadaSemanal 48h → ~205h/mes = 12,343 min.
 *   30 min tardanza no justificada / 12343 = 0.243%
 *   Sobre sueldo S/2000 → S/4.86 descuento
 *
 * Una "tardanza no justificada" es un Attendance.status='LATE' donde:
 *   - NO hay justification (notes JSON sin .j) — pendiente de reportar
 *   - O hay justification pero NO está aprobada (.a missing o .a.approved=false)
 *
 * Las tardanzas APROBADAS (con .a.approved=true) NO descuentan — el admin
 * decidió que el motivo era válido.
 */

import { prisma } from '@/lib/prisma'
import { parseAttendanceNotes } from '@/lib/attendance/notes'
import { deriveAttendanceStatusFromSchedule } from '@/lib/attendance/schedule'

export interface LateDeductionInput {
  workerId: string
  orgId: string
  /** Periodo a calcular: 'YYYY-MM' */
  periodo: string
  /** Jornada semanal del worker en horas (default 48) */
  jornadaSemanal?: number
  /** Sueldo bruto del worker (para calcular el monto del descuento) */
  sueldoBruto: number
  /** Hora pactada de entrada del worker (default 8:00) */
  expectedClockInHour?: number
  expectedClockInMinute?: number
  lateToleranceMinutes?: number
}

export interface LateDeductionResult {
  /** Total de minutos de tardanza NO justificada en el período */
  minutosTardanzaNoJustificada: number
  /** Cantidad de tardanzas no justificadas */
  cantidadTardanzas: number
  /** Cantidad de ausencias no justificadas */
  cantidadAusencias: number
  /** Monto a descontar (en soles, redondeado a 2 decimales) */
  descuentoMonto: number
  /** Detalles para mostrar en la boleta */
  detalle: {
    fecha: string
    minutos: number
    tipo: 'tardanza' | 'ausencia'
    motivoRechazo?: string
  }[]
}

const MINUTOS_DIA_PROMEDIO = 30 / 7 // factor para convertir jornada semanal a mensual

/**
 * Calcula el descuento por tardanzas/ausencias no justificadas del período.
 *
 * Si no hay attendance en el rango, devuelve descuentoMonto=0 sin error.
 */
export async function calculateLateDeduction(
  input: LateDeductionInput,
): Promise<LateDeductionResult> {
  const jornadaSemanal = input.jornadaSemanal ?? 48
  const expectedHour = input.expectedClockInHour ?? 8
  const expectedMinute = input.expectedClockInMinute ?? 0
  const tolerance = input.lateToleranceMinutes ?? 15

  // Rango del periodo YYYY-MM
  const [yearStr, monthStr] = input.periodo.split('-')
  const year = parseInt(yearStr ?? '0', 10)
  const month = parseInt(monthStr ?? '0', 10)
  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Periodo inválido: ${input.periodo}`)
  }
  const periodStart = new Date(year, month - 1, 1)
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const records = await prisma.attendance.findMany({
    where: {
      workerId: input.workerId,
      orgId: input.orgId,
      clockIn: { gte: periodStart, lte: periodEnd },
      status: { in: ['LATE', 'ABSENT'] },
    },
    select: {
      clockIn: true,
      status: true,
      notes: true,
    },
    orderBy: { clockIn: 'asc' },
  })

  // Minutos jornada mensual ≈ jornadaSemanal × 60 × 30/7
  const minutosJornadaMensual = jornadaSemanal * 60 * MINUTOS_DIA_PROMEDIO

  let totalMin = 0
  let cantidadTardanzas = 0
  let cantidadAusencias = 0
  const detalle: LateDeductionResult['detalle'] = []

  for (const r of records) {
    const meta = parseAttendanceNotes(r.notes)
    // Si está aprobada por admin, no descuenta
    if (meta.approval?.approved === true) continue

    if (r.status === 'LATE') {
      // Cuántos minutos tarde llegó vs su horario pactado
      // Reusa la lógica de schedule pero al revés: deriveAttendanceStatusFromSchedule
      // determina si es PRESENT/LATE; aquí calculamos los minutos exactos.
      const expected = new Date(r.clockIn)
      expected.setHours(expectedHour, expectedMinute, 0, 0)
      const diffMin = Math.max(0, (r.clockIn.getTime() - expected.getTime()) / 60_000)
      // Solo descontamos lo que pasa de la tolerancia (la gracia es gracia)
      const minutosDescontables = Math.max(0, Math.round(diffMin - tolerance))
      if (minutosDescontables > 0) {
        totalMin += minutosDescontables
        cantidadTardanzas++
        detalle.push({
          fecha: r.clockIn.toISOString().slice(0, 10),
          minutos: minutosDescontables,
          tipo: 'tardanza',
          ...(meta.approval?.approved === false ? { motivoRechazo: meta.approval.comment ?? 'Justificación rechazada' } : {}),
        })
      }
    } else if (r.status === 'ABSENT') {
      // Ausencia → descuento del día completo (jornada diaria)
      const minutosDia = Math.round(jornadaSemanal * 60 / 5)
      totalMin += minutosDia
      cantidadAusencias++
      detalle.push({
        fecha: r.clockIn.toISOString().slice(0, 10),
        minutos: minutosDia,
        tipo: 'ausencia',
        ...(meta.approval?.approved === false ? { motivoRechazo: meta.approval.comment ?? 'Justificación rechazada' } : {}),
      })
    }
  }

  // Monto: proporcional al sueldo bruto
  const proporcion = totalMin / minutosJornadaMensual
  const descuentoMonto = Math.round(input.sueldoBruto * proporcion * 100) / 100

  // Suprimimos warnings sobre helper sin uso — lo dejamos como utility export futuro
  void deriveAttendanceStatusFromSchedule

  return {
    minutosTardanzaNoJustificada: totalMin,
    cantidadTardanzas,
    cantidadAusencias,
    descuentoMonto,
    detalle,
  }
}
