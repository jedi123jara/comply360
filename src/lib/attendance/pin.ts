/**
 * PIN de asistencia para flujo backup sin smartphone.
 *
 * Cada worker tiene un PIN de 4 dígitos numéricos generado al onboarding
 * (bcrypt hashed en `Worker.attendancePin`). Cuando un trabajador sin
 * smartphone llega a la oficina:
 *   1. Pide el shortCode del QR al supervisor (6 chars visibles en pantalla)
 *   2. Va a /portal-empleado/marcar
 *   3. Ingresa DNI + PIN + shortCode → asistencia registrada
 *
 * El PIN NO reemplaza al QR — lo complementa para casos edge. Si la org
 * exige geofence, el endpoint clock-by-code requiere que el admin confirme
 * presencia física del trabajador (entonces el admin lo marca por él).
 */

import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto'

/** Genera un PIN de 4 dígitos (1000-9999). */
export function generatePin(): string {
  return String(randomInt(1000, 10000))
}

/** Hash del PIN con scrypt y salt aleatorio.
 * Back-compat: verifyPin todavía acepta hashes SHA-256 legacy.
 */
export function hashPin(pin: string, salt: string): string {
  const perPinSalt = randomBytes(16).toString('hex')
  const derived = scryptSync(`${salt}:${pin}`, perPinSalt, 32, {
    N: 16_384,
    r: 8,
    p: 1,
  }).toString('hex')
  return `scrypt$${perPinSalt}$${derived}`
}

/** Compara un PIN plain contra su hash. Acepta hashes legacy SHA-256. */
export function verifyPin(pin: string, hashedPin: string, salt: string): boolean {
  if (hashedPin.startsWith('scrypt$')) {
    const [, perPinSalt, expectedHex] = hashedPin.split('$')
    if (!perPinSalt || !expectedHex) return false
    const actual = scryptSync(`${salt}:${pin}`, perPinSalt, 32, {
      N: 16_384,
      r: 8,
      p: 1,
    })
    const expected = Buffer.from(expectedHex, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }

  const legacy = createHash('sha256').update(`${salt}:${pin}`).digest('hex')
  const a = Buffer.from(legacy)
  const b = Buffer.from(hashedPin)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Valida formato de PIN: 4 dígitos exactos. */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}
