/**
 * Handler que convierte eventos del dominio en `GamificationEvent` persistidos
 * y actualiza el streak del usuario.
 *
 * Responsabilidades:
 *  1. Mapea `DomainEvent.name` → `GamificationEventType` (no todos los
 *     eventos generan gamificación; se filtran en MEANINGFUL_MAP)
 *  2. Inserta `GamificationEvent` con metadata sanitizada (solo IDs y enums,
 *     nunca PII como nombres, emails, DNIs)
 *  3. Actualiza `User.streakCurrent/streakLongest/streakLastAt`:
 *     - mismo día Lima → no cambia streak pero actualiza streakLastAt
 *     - gap de 1 día Lima → streakCurrent += 1
 *     - gap > 1 día o sin historial → streakCurrent = 1
 *  4. Update atómico dentro de transacción (no hacemos SELECT FOR UPDATE
 *     porque Postgres+Prisma en modo default son read-committed y los race
 *     conditions entre dos eventos del mismo user son extremadamente raros;
 *     si se vuelven un problema, mover a `$executeRaw` con advisory lock)
 */

import { prisma } from '@/lib/prisma'
import type { Prisma, GamificationEventType } from '@/generated/prisma/client'
import { startOfDayLima, daysBetween } from '@/lib/time/lima'
import type { DomainEvent, EventName, EventPayloads } from '../catalog'

// ═══════════════════════════════════════════════════════════════════════════
// Mapeo evento → GamificationEventType
// Solo los eventos "meaningful" (user-initiated, sustantivos) cuentan.
// Omitimos worker.updated (ruido), contract.expiring (cron-generated),
// complaint.triaged (derivado de IA, no usuario), etc.
// ═══════════════════════════════════════════════════════════════════════════

const MEANINGFUL_MAP: Partial<Record<EventName, GamificationEventType>> = {
  'worker.created': 'WORKER_CREATED',
  'document.uploaded': 'DOCUMENT_UPLOADED',
  'alert.resolved': 'ALERT_RESOLVED',
  'diagnostic.completed': 'DIAGNOSTIC_COMPLETED',
  'sst.simulacro_completed': 'SIMULACRO_COMPLETED',
  'contract.signed': 'CONTRACT_SIGNED',
  'training.completed': 'DIAGNOSTIC_COMPLETED', // reaprovechamos — no hay TRAINING en el enum existente
}

// Puntos por tipo. Rangos bajos para evitar inflation.
const POINTS_BY_TYPE: Record<GamificationEventType, number> = {
  WORKER_CREATED: 5,
  DOCUMENT_UPLOADED: 2,
  ALERT_RESOLVED: 3,
  DIAGNOSTIC_COMPLETED: 10,
  SIMULACRO_COMPLETED: 15,
  CONTRACT_SIGNED: 5,
  DAILY_STREAK: 0, // se otorga solo via streak logic, sin event emit
  BADGE_UNLOCKED: 0,
  SCORE_MILESTONE: 20,
}

// ═══════════════════════════════════════════════════════════════════════════
// PII whitelist: qué campos son seguros para persistir en metadata
// ═══════════════════════════════════════════════════════════════════════════

const SAFE_PAYLOAD_KEYS = new Set([
  'workerId', 'contractId', 'documentId', 'alertId', 'diagnosticId',
  'complaintId', 'enrollmentId', 'recordId', 'courseId', 'inspectionId',
  'orgId', 'category', 'severity', 'urgency', 'type', 'regimenLaboral',
  'contractType', 'signatureLevel', 'score', 'daysToExpiry',
])

/**
 * Extrae solo los campos whitelist del payload. NUNCA devuelve nombres,
 * emails, descripciones, DNIs ni userAgent.
 */
function sanitizePayload<K extends EventName>(payload: EventPayloads[K]): Record<string, unknown> {
  const safe: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (!SAFE_PAYLOAD_KEYS.has(k)) continue
    if (v === null || v === undefined) continue
    if (typeof v === 'object') continue // no JSON anidado
    safe[k] = v
  }
  return safe
}

// ═══════════════════════════════════════════════════════════════════════════
// Handler principal
// ═══════════════════════════════════════════════════════════════════════════

export async function gamificationHandler<K extends EventName>(event: DomainEvent<K>): Promise<void> {
  const gamiType = MEANINGFUL_MAP[event.name]
  if (!gamiType) return // evento no cuenta para gamificación

  const { orgId, userId } = event.payload
  if (!userId) return // solo contamos acciones de usuarios identificados

  const safeMetadata = sanitizePayload(event.payload)
  const points = POINTS_BY_TYPE[gamiType] ?? 0
  const now = new Date()

  // Persistencia del evento de gamificación
  try {
    await prisma.gamificationEvent.create({
      data: {
        userId,
        orgId,
        type: gamiType,
        points,
        metadata: safeMetadata as Prisma.InputJsonValue,
      },
    })
  } catch (err) {
    console.error('[gamification-handler] insert GamificationEvent failed', {
      eventName: event.name,
      err: err instanceof Error ? err.message : String(err),
    })
    return
  }

  // Actualización de streak (tx chica, solo toca el User)
  await updateStreak(userId, now).catch((err) => {
    console.error('[gamification-handler] streak update failed', {
      userId,
      err: err instanceof Error ? err.message : String(err),
    })
  })
}

// ═══════════════════════════════════════════════════════════════════════════
// Streak logic
// ═══════════════════════════════════════════════════════════════════════════

export interface StreakUpdate {
  streakCurrent: number
  streakLongest: number
  streakLastAt: Date
}

/**
 * Aplica la regla de streak contra una fecha previa. Función pura — la
 * exponemos separada para testearla sin tocar DB.
 */
export function computeNextStreak(
  prev: { streakCurrent: number; streakLongest: number; streakLastAt: Date | null },
  now: Date,
): StreakUpdate {
  const todayStart = startOfDayLima(now)
  const lastStart = prev.streakLastAt ? startOfDayLima(prev.streakLastAt) : null

  let streakCurrent: number
  if (lastStart === null) {
    streakCurrent = 1
  } else {
    const gap = daysBetween(todayStart, lastStart)
    if (gap === 0) streakCurrent = prev.streakCurrent // mismo día
    else if (gap === 1) streakCurrent = prev.streakCurrent + 1
    else streakCurrent = 1 // gap >= 2 → reset
  }

  return {
    streakCurrent,
    streakLongest: Math.max(prev.streakLongest, streakCurrent),
    streakLastAt: now,
  }
}

async function updateStreak(userId: string, now: Date): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { streakCurrent: true, streakLongest: true, streakLastAt: true },
    })
    if (!user) return

    const next = computeNextStreak(user, now)
    await tx.user.update({
      where: { id: userId },
      data: next,
    })
  })
}
