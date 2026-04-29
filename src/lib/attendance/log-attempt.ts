/**
 * Log de intentos de fichado (Fase 4 — Asistencia anti-fraude).
 *
 * Persiste TODOS los intentos: exitosos y fallidos. Permite detectar patrones
 * sospechosos como brute-force de PIN, intentos repetidos fuera de zona, o
 * tokens reutilizados. La tabla `attendance_attempts` tiene índices por org y
 * worker para queries rápidas en dashboards futuros.
 *
 * Fire-and-forget: si la inserción falla, NO bloquea el flujo principal de
 * fichado — solo logueamos el error.
 */

import { prisma } from '@/lib/prisma'
import type { AttendanceAttemptResult, Prisma } from '@/generated/prisma/client'

export interface LogAttemptInput {
  orgId: string
  workerId?: string | null
  result: AttendanceAttemptResult
  reason?: string
  via?: 'qr' | 'pin' | 'code' | 'kiosko'
  geo?: { lat: number; lng: number; accuracy?: number }
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Registra un intento. No-bloquea: si Postgres tiene problema, ignoramos.
 *
 * Uso típico:
 *   logAttempt({ orgId, workerId, result: 'GEOFENCE_OUT', reason: '50m...', via: 'qr', geo, ipAddress, userAgent })
 */
export async function logAttempt(input: LogAttemptInput): Promise<void> {
  try {
    await prisma.attendanceAttempt.create({
      data: {
        orgId: input.orgId,
        workerId: input.workerId ?? null,
        result: input.result,
        reason: input.reason ?? null,
        via: input.via ?? null,
        geoLat: input.geo?.lat ?? null,
        geoLng: input.geo?.lng ?? null,
        geoAccuracy: input.geo?.accuracy ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        ...(input.metadata ? { metadataJson: input.metadata as Prisma.InputJsonValue } : {}),
      },
    })
  } catch (err) {
    console.error('[attendance/log-attempt] Failed to log attempt', { result: input.result, err })
  }
}

/**
 * Helper: extrae IP y user-agent de un Request. Útil para los endpoints.
 */
export function extractRequestMetadata(req: Request): { ipAddress: string | null; userAgent: string | null } {
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  const userAgent = req.headers.get('user-agent') ?? null
  return { ipAddress, userAgent }
}
