/**
 * Helper para registrar `WorkerHistoryEvent` desde mutaciones del Worker.
 *
 * Se llama desde:
 *   - POST /api/workers (alta → ALTA)
 *   - PUT/PATCH /api/workers/[id] (cambios de sueldo, cargo, régimen, etc.)
 *   - DELETE /api/workers/[id] (CESE)
 *   - cron de cese vencido
 *   - hook de firma de contrato (al firmar nuevo régimen)
 *
 * Hace una sola escritura — no es transaccional con la mutación principal
 * (best-effort, igual que `generateWorkerAlerts`). Si falla, loguea y sigue,
 * pero NO bloquea la mutación principal.
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

// Subset de campos del Worker que rastreamos. Cambios fuera de esta lista
// (foto, bio, etc.) no se loguean para no inflar la tabla.
const TRACKED_FIELDS = [
  'sueldoBruto',
  'position',
  'department',
  'regimenLaboral',
  'tipoContrato',
  'tipoAporte',
  'afpNombre',
  'jornadaSemanal',
  'tiempoCompleto',
  'expectedClockInHour',
  'expectedClockInMinute',
  'expectedClockOutHour',
  'expectedClockOutMinute',
  'lateToleranceMinutes',
  'status',
  'asignacionFamiliar',
  'discapacidad',
  'discapacidadCertificado',
  'condicionEspecial',
  'flagTRegistroPresentado',
] as const

type TrackedField = typeof TRACKED_FIELDS[number]

// Mapa cambio → tipo de evento (cuando un campo concreto cambia, qué evento crear).
// Si un cambio toca varios campos a la vez, prevalece el primero del orden.
const FIELD_TO_EVENT_TYPE: Record<TrackedField, string> = {
  sueldoBruto: 'CAMBIO_SUELDO',
  position: 'CAMBIO_CARGO',
  department: 'CAMBIO_DEPARTAMENTO',
  regimenLaboral: 'CAMBIO_REGIMEN',
  tipoContrato: 'CAMBIO_TIPO_CONTRATO',
  tipoAporte: 'CAMBIO_REGIMEN_PREVISIONAL',
  afpNombre: 'CAMBIO_REGIMEN_PREVISIONAL',
  jornadaSemanal: 'CAMBIO_HORARIO',
  tiempoCompleto: 'CAMBIO_HORARIO',
  expectedClockInHour: 'CAMBIO_HORARIO',
  expectedClockInMinute: 'CAMBIO_HORARIO',
  expectedClockOutHour: 'CAMBIO_HORARIO',
  expectedClockOutMinute: 'CAMBIO_HORARIO',
  lateToleranceMinutes: 'CAMBIO_HORARIO',
  status: 'SUSPENSION', // se sobrescribe a CESE/REINCORPORACION en logSpecificStatusChange
  asignacionFamiliar: 'ACTUALIZACION_LEGAJO',
  discapacidad: 'ACTUALIZACION_LEGAJO',
  discapacidadCertificado: 'ACTUALIZACION_LEGAJO',
  condicionEspecial: 'ACTUALIZACION_LEGAJO',
  flagTRegistroPresentado: 'T_REGISTRO_PRESENTADO',
}

interface LogChangeOptions {
  workerId: string
  orgId: string
  before: Record<string, unknown>
  after: Record<string, unknown>
  triggeredBy: string
  reason?: string
  evidenceUrl?: string
}

/**
 * Compara `before` y `after`. Por cada campo trackeado que cambió, crea un
 * `WorkerHistoryEvent`. Si no cambió ningún campo trackeado, no crea nada.
 */
export async function logWorkerChanges(opts: LogChangeOptions): Promise<number> {
  const changedFields: TrackedField[] = []
  const beforeSnapshot: Record<string, unknown> = {}
  const afterSnapshot: Record<string, unknown> = {}

  for (const field of TRACKED_FIELDS) {
    const b = opts.before[field]
    const a = opts.after[field]
    // comparación tolerante (Decimal vs number, Date vs string)
    const bStr = b instanceof Date ? b.toISOString() : String(b ?? '')
    const aStr = a instanceof Date ? a.toISOString() : String(a ?? '')
    if (bStr !== aStr) {
      changedFields.push(field)
      beforeSnapshot[field] = b instanceof Date ? b.toISOString() : (b ?? null)
      afterSnapshot[field] = a instanceof Date ? a.toISOString() : (a ?? null)
    }
  }

  if (changedFields.length === 0) return 0

  // Si cambió `status`, ese evento se loguea aparte con tipo específico.
  // El resto se agrupa en un solo evento por tipo (deduplicar CAMBIO_HORARIO).
  const eventTypes = new Set<string>()
  for (const f of changedFields) {
    if (f === 'status') {
      const beforeStatus = String(opts.before.status ?? '')
      const afterStatus = String(opts.after.status ?? '')
      eventTypes.add(resolveStatusEventType(beforeStatus, afterStatus))
    } else {
      eventTypes.add(FIELD_TO_EVENT_TYPE[f])
    }
  }

  let created = 0
  for (const type of eventTypes) {
    try {
      await prisma.workerHistoryEvent.create({
        data: {
          workerId: opts.workerId,
          orgId: opts.orgId,
          type: type as 'CAMBIO_SUELDO',
          before: beforeSnapshot as Prisma.InputJsonValue,
          after: afterSnapshot as Prisma.InputJsonValue,
          reason: opts.reason ?? null,
          evidenceUrl: opts.evidenceUrl ?? null,
          triggeredBy: opts.triggeredBy,
        },
      })
      created++
    } catch (err) {
      // Best-effort: no romper la mutación principal por un fallo de log.
      console.error('[workers/history] failed to log event', { type, workerId: opts.workerId, err })
    }
  }
  return created
}

function resolveStatusEventType(before: string, after: string): string {
  if (after === 'TERMINATED') return 'CESE'
  if (after === 'ACTIVE' && (before === 'TERMINATED' || before === 'SUSPENDED' || before === 'ON_LEAVE')) {
    return 'REINCORPORACION'
  }
  if (after === 'SUSPENDED') return 'SUSPENSION'
  if (after === 'ON_LEAVE') return 'LICENCIA_MEDICA'
  return 'ACTUALIZACION_LEGAJO'
}

/**
 * Crea un evento ALTA al crear un worker nuevo.
 */
export async function logWorkerCreation(opts: {
  workerId: string
  orgId: string
  triggeredBy: string
  snapshot: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.workerHistoryEvent.create({
      data: {
        workerId: opts.workerId,
        orgId: opts.orgId,
        type: 'ALTA',
        before: Prisma.JsonNull,
        after: opts.snapshot as Prisma.InputJsonValue,
        triggeredBy: opts.triggeredBy,
      },
    })
  } catch (err) {
    console.error('[workers/history] failed to log ALTA', { workerId: opts.workerId, err })
  }
}

/**
 * Crea un evento CESE al hacer soft delete.
 */
export async function logWorkerCese(opts: {
  workerId: string
  orgId: string
  triggeredBy: string
  reason?: string
  evidenceUrl?: string
}): Promise<void> {
  try {
    await prisma.workerHistoryEvent.create({
      data: {
        workerId: opts.workerId,
        orgId: opts.orgId,
        type: 'CESE',
        before: Prisma.JsonNull,
        after: { fechaCese: new Date().toISOString() } as Prisma.InputJsonValue,
        reason: opts.reason ?? null,
        evidenceUrl: opts.evidenceUrl ?? null,
        triggeredBy: opts.triggeredBy,
      },
    })
  } catch (err) {
    console.error('[workers/history] failed to log CESE', { workerId: opts.workerId, err })
  }
}
