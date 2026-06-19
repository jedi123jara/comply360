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
type PendingAlert = {
  orgId: string
  workerId: string
  type: 'TARDANZAS_CRONICAS' | 'AUSENTISMO_CRONICO'
  severity: 'HIGH' | 'CRITICAL'
  title: string
  description: string
}

export async function scanAttendancePatterns(orgId: string): Promise<AttendancePatternsResult> {
  const workers = await prisma.worker.findMany({
    where: { orgId, status: 'ACTIVE' },
    select: { id: true, firstName: true, lastName: true },
  })

  if (workers.length === 0) {
    return { workersScanned: 0, alertsCreated: 0, details: [] }
  }

  const workerIds = workers.map((w) => w.id)
  const now = new Date()
  const fifteenDaysAgo = new Date(now)
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - DAYS_LOOKBACK_LATE)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // FIX N+1: antes se hacían 2-4 queries POR trabajador (tardanzas + ausencias +
  // findFirst/create de alerta). Ahora son 3 queries batch por org + un createMany.
  const [lates, absences, openAlerts] = await Promise.all([
    prisma.attendance.findMany({
      where: { orgId, workerId: { in: workerIds }, clockIn: { gte: fifteenDaysAgo, lte: now }, status: 'LATE' },
      select: { workerId: true, notes: true },
    }),
    prisma.attendance.findMany({
      where: { orgId, workerId: { in: workerIds }, clockIn: { gte: monthStart, lte: now }, status: 'ABSENT' },
      select: { workerId: true, notes: true },
    }),
    prisma.workerAlert.findMany({
      where: { orgId, workerId: { in: workerIds }, type: { in: ['TARDANZAS_CRONICAS', 'AUSENTISMO_CRONICO'] }, resolvedAt: null },
      select: { workerId: true, type: true },
    }),
  ])

  // Cuenta por trabajador los registros NO resueltos (sin aprobación).
  const countUnresolved = (rows: { workerId: string; notes: string | null }[]) => {
    const counts = new Map<string, number>()
    for (const a of rows) {
      const meta = parseAttendanceNotes(a.notes)
      if (!meta.approval || !meta.approval.approved) {
        counts.set(a.workerId, (counts.get(a.workerId) ?? 0) + 1)
      }
    }
    return counts
  }

  const lateByWorker = countUnresolved(lates)
  const absentByWorker = countUnresolved(absences)
  // Set de "workerId:type" con alerta abierta → idempotencia sin query por worker.
  const openByWorkerType = new Set(openAlerts.map((a) => `${a.workerId}:${a.type}`))

  const toCreate: PendingAlert[] = []
  const result: AttendancePatternsResult = {
    workersScanned: workers.length,
    alertsCreated: 0,
    details: [],
  }

  for (const w of workers) {
    // ── 1. TARDANZAS_CRONICAS: 5+ tardanzas en 15 días sin justificar/rechazadas
    const lateCount = lateByWorker.get(w.id) ?? 0
    if (lateCount >= MIN_LATES_FOR_ALERT && !openByWorkerType.has(`${w.id}:TARDANZAS_CRONICAS`)) {
      toCreate.push({
        orgId,
        workerId: w.id,
        type: 'TARDANZAS_CRONICAS',
        severity: 'HIGH',
        title: `${lateCount} tardanzas en los últimos ${DAYS_LOOKBACK_LATE} días`,
        description: `${w.firstName} ${w.lastName} acumula ${lateCount} tardanzas no resueltas. Considera abrir un proceso disciplinario o revisar la política de horario para este trabajador.`,
      })
      result.details.push({ workerId: w.id, type: 'TARDANZAS_CRONICAS', count: lateCount })
    }

    // ── 2. AUSENTISMO_CRONICO: 3+ ausencias sin justificar en el mes
    const absentCount = absentByWorker.get(w.id) ?? 0
    if (absentCount >= MIN_ABSENCES_FOR_ALERT && !openByWorkerType.has(`${w.id}:AUSENTISMO_CRONICO`)) {
      toCreate.push({
        orgId,
        workerId: w.id,
        type: 'AUSENTISMO_CRONICO',
        severity: 'CRITICAL',
        title: `${absentCount} ausencias sin justificar este mes`,
        description: `${w.firstName} ${w.lastName} acumula ${absentCount} ausencias sin justificación aprobada en el mes en curso. D.Leg. 728 art. 25.h permite despido por causa justa con 3+ inasistencias injustificadas en 30 días.`,
      })
      result.details.push({ workerId: w.id, type: 'AUSENTISMO_CRONICO', count: absentCount })
    }
  }

  if (toCreate.length > 0) {
    await prisma.workerAlert.createMany({ data: toCreate })
    result.alertsCreated = toCreate.length
  }

  return result
}
