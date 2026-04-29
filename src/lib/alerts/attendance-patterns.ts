/**
 * Detección de patrones de asistencia (Fase 3 — Asistencia).
 *
 * Recorre los registros de Attendance del último mes y emite WorkerAlert
 * cuando detecta patrones críticos:
 *   - TARDANZAS_CRONICAS: 5+ tardanzas en los últimos 15 días sin justificar
 *     o con justificación rechazada
 *   - AUSENTISMO_CRONICO: 3+ ausencias sin justificar en el mes en curso
 *
 * El admin las ve en /dashboard/alertas junto con las demás. Severidad:
 *   - TARDANZAS_CRONICAS → HIGH (precedente para sanción disciplinaria)
 *   - AUSENTISMO_CRONICO → CRITICAL (riesgo despido por causa justa)
 *
 * Idempotencia: si ya hay una alerta abierta del mismo tipo para el worker,
 * NO se crea una nueva (evita spam). Solo se "renueva" cuando se resuelve.
 */

import { prisma } from '@/lib/prisma'
import { parseAttendanceNotes } from '@/lib/attendance/notes'

const DAYS_LOOKBACK_LATE = 15
const MIN_LATES_FOR_ALERT = 5
const MIN_ABSENCES_FOR_ALERT = 3

export interface AttendancePatternsResult {
  workersScanned: number
  alertsCreated: number
  details: { workerId: string; type: string; count: number }[]
}

/**
 * Escanea todos los workers ACTIVE de una organización y crea alertas según
 * los patrones detectados. Retorna resumen para mostrar al admin.
 */
export async function scanAttendancePatterns(orgId: string): Promise<AttendancePatternsResult> {
  const workers = await prisma.worker.findMany({
    where: { orgId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  })

  const now = new Date()
  const fifteenDaysAgo = new Date(now)
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - DAYS_LOOKBACK_LATE)

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const result: AttendancePatternsResult = {
    workersScanned: workers.length,
    alertsCreated: 0,
    details: [],
  }

  for (const w of workers) {
    // ── 1. TARDANZAS_CRONICAS: 5+ tardanzas en 15 días sin justificar/rechazadas
    const tardanzas = await prisma.attendance.findMany({
      where: {
        workerId: w.id,
        orgId,
        clockIn: { gte: fifteenDaysAgo, lte: now },
        status: 'LATE',
      },
      select: { id: true, notes: true },
    })
    const tardanzasNoResueltas = tardanzas.filter(a => {
      const meta = parseAttendanceNotes(a.notes)
      // Cuenta si NO está aprobada (sin justificación, pendiente de revisión, o rechazada)
      return !meta.approval || !meta.approval.approved
    })

    if (tardanzasNoResueltas.length >= MIN_LATES_FOR_ALERT) {
      const created = await ensureAlert(orgId, w.id, 'TARDANZAS_CRONICAS', {
        title: `${tardanzasNoResueltas.length} tardanzas en los últimos ${DAYS_LOOKBACK_LATE} días`,
        description: `${w.firstName} ${w.lastName} acumula ${tardanzasNoResueltas.length} tardanzas no resueltas. Considera abrir un proceso disciplinario o revisar la política de horario para este trabajador.`,
        severity: 'HIGH',
      })
      if (created) {
        result.alertsCreated++
        result.details.push({ workerId: w.id, type: 'TARDANZAS_CRONICAS', count: tardanzasNoResueltas.length })
      }
    }

    // ── 2. AUSENTISMO_CRONICO: 3+ ausencias sin justificar en el mes
    const ausencias = await prisma.attendance.findMany({
      where: {
        workerId: w.id,
        orgId,
        clockIn: { gte: monthStart, lte: now },
        status: 'ABSENT',
      },
      select: { id: true, notes: true },
    })
    const ausenciasSinJustificar = ausencias.filter(a => {
      const meta = parseAttendanceNotes(a.notes)
      return !meta.approval || !meta.approval.approved
    })

    if (ausenciasSinJustificar.length >= MIN_ABSENCES_FOR_ALERT) {
      const created = await ensureAlert(orgId, w.id, 'AUSENTISMO_CRONICO', {
        title: `${ausenciasSinJustificar.length} ausencias sin justificar este mes`,
        description: `${w.firstName} ${w.lastName} acumula ${ausenciasSinJustificar.length} ausencias sin justificación aprobada en el mes en curso. D.Leg. 728 art. 25.h permite despido por causa justa con 3+ inasistencias injustificadas en 30 días.`,
        severity: 'CRITICAL',
      })
      if (created) {
        result.alertsCreated++
        result.details.push({ workerId: w.id, type: 'AUSENTISMO_CRONICO', count: ausenciasSinJustificar.length })
      }
    }
  }

  return result
}

/**
 * Crea una WorkerAlert solo si no existe ya una abierta del mismo tipo para
 * el worker. Evita spam: si ya hay una abierta, retorna false sin crear nada.
 */
async function ensureAlert(
  orgId: string,
  workerId: string,
  type: 'TARDANZAS_CRONICAS' | 'AUSENTISMO_CRONICO',
  data: { title: string; description: string; severity: 'HIGH' | 'CRITICAL' },
): Promise<boolean> {
  const existing = await prisma.workerAlert.findFirst({
    where: { workerId, orgId, type, resolvedAt: null },
    select: { id: true },
  })
  if (existing) return false

  await prisma.workerAlert.create({
    data: {
      orgId,
      workerId,
      type,
      severity: data.severity,
      title: data.title,
      description: data.description,
    },
  })
  return true
}
