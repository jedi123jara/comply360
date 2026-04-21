/**
 * QR token para marcado de asistencia.
 *
 * Filosofía:
 *   - El admin ve un QR en `/dashboard/asistencia`.
 *   - El QR codifica un deep link a `/mi-portal/asistencia?t=TOKEN`.
 *   - El token es JWT firmado con `orgId`, expiración corta (5 min),
 *     y se rota automáticamente cada 4 minutos.
 *   - El worker abre el link (con su cámara nativa o dentro de la PWA),
 *     el backend valida token + checa que el worker pertenezca al orgId,
 *     registra `Attendance.clockIn` o `clockOut`.
 *
 * Seguridad:
 *   - Rotación 4 min → si un worker saca foto del QR a las 9am no le sirve a las 9:05
 *   - orgId embebido → tokens de empresa A no sirven para empresa B
 *   - Validación server-side del JWT antes de crear el row
 *   - Short code (6 caracteres) como fallback manual si no tiene cámara
 */

import jwt from 'jsonwebtoken'
import { createHash, randomBytes } from 'crypto'

const TOKEN_TTL_SECONDS = 5 * 60 // 5 minutos
export const TOKEN_ROTATION_SECONDS = 4 * 60 // admin regenera cada 4 min para solaparse

export interface AttendanceTokenPayload {
  orgId: string
  /** Tipo de marcación que el admin está permitiendo: in, out, o ambos */
  mode: 'in' | 'out' | 'both'
  /** Ventana válida en minutos desde que se emitió (tolerancia tardanza) */
  graceMinutes: number
  /** Epoch ms cuando se emitió — para debug */
  issuedAt: number
  /** Nonce corto para generar short code */
  nonce: string
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    // En dev usamos un secret derivado del DATABASE_URL para evitar setup manual
    // En prod JWT_SECRET es obligatorio.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET no configurado en producción')
    }
    return createHash('sha256').update(process.env.DATABASE_URL ?? 'dev-fallback').digest('hex')
  }
  return secret
}

/**
 * Genera un token JWT + un short-code legible de 6 caracteres (fallback manual).
 */
export function issueAttendanceToken(opts: {
  orgId: string
  mode?: 'in' | 'out' | 'both'
  graceMinutes?: number
}): { token: string; shortCode: string; expiresAt: number } {
  const payload: AttendanceTokenPayload = {
    orgId: opts.orgId,
    mode: opts.mode ?? 'both',
    graceMinutes: opts.graceMinutes ?? 15,
    issuedAt: Date.now(),
    nonce: randomBytes(4).toString('hex'),
  }

  const token = jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS })

  // Short code: 6 chars A-Z + 0-9 derivado del nonce. Si un worker no tiene QR reader
  // puede tipear este código manualmente.
  const shortCode = createHash('sha1')
    .update(`${payload.orgId}:${payload.nonce}:${payload.issuedAt}`)
    .digest('hex')
    .slice(0, 6)
    .toUpperCase()

  return {
    token,
    shortCode,
    expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
  }
}

/**
 * Valida un token de asistencia. Devuelve payload si válido, null si falla.
 * Nunca lanza.
 */
export function verifyAttendanceToken(token: string): AttendanceTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret()) as AttendanceTokenPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Genera la URL absoluta que se encodea en el QR.
 * El worker que tiene su PWA instalada ve esta URL y se abre dentro de la app.
 */
export function attendanceDeepLink(token: string, baseUrl?: string): string {
  const base =
    baseUrl ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://app.comply360.pe'
  return `${base.replace(/\/$/, '')}/mi-portal/asistencia?t=${encodeURIComponent(token)}`
}

/**
 * Determina el status (PRESENT | LATE) basado en hora de clock-in vs hora pactada.
 * graceMinutes es la tolerancia después de la cual es LATE.
 */
export function deriveAttendanceStatus(
  clockInDate: Date,
  expectedHour = 8,
  expectedMinute = 0,
  graceMinutes = 15,
): 'PRESENT' | 'LATE' {
  const expected = new Date(clockInDate)
  expected.setHours(expectedHour, expectedMinute, 0, 0)
  const diffMinutes = (clockInDate.getTime() - expected.getTime()) / 60_000
  return diffMinutes > graceMinutes ? 'LATE' : 'PRESENT'
}
