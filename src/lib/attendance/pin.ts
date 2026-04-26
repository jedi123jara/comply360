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

import { createHash, randomInt } from 'crypto'

/** Genera un PIN de 4 dígitos (1000-9999). */
export function generatePin(): string {
  return String(randomInt(1000, 10000))
}

/** Hash seguro del PIN con SHA-256 + salt fijo del orgId.
 * Para producción real, migrar a bcrypt o argon2 (mayor coste computacional).
 * Por ahora SHA-256 es suficiente porque el PIN es de 4 dígitos (10k combinaciones)
 * y el endpoint tiene rate-limit estricto (3/min por DNI).
 */
export function hashPin(pin: string, salt: string): string {
  return createHash('sha256')
    .update(`${salt}:${pin}`)
    .digest('hex')
}

/** Compara un PIN plain contra su hash. Constant-time NO necesario aquí porque
 * el rate-limit cubre el ataque de fuerza bruta. */
export function verifyPin(pin: string, hashedPin: string, salt: string): boolean {
  return hashPin(pin, salt) === hashedPin
}

/** Valida formato de PIN: 4 dígitos exactos. */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4}$/.test(pin)
}
