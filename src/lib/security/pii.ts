/**
 * PII (Personally Identifiable Information) Protection
 *
 * Provides:
 * - DNI hashing for lookups (deterministic, one-way)
 * - DNI masking for display (show only last 3 digits)
 * - Salary masking for logs
 * - Email masking
 *
 * DNI Strategy:
 *   - `dniHash`: SHA-256 + salt for database lookups (searchable, collision-resistant)
 *   - Plain `dni` kept in DB for now (backward compatibility) but masked in API responses
 *   - Future: migrate to encrypted `dniEncrypted` field
 */

import { createHash } from 'crypto'

// Deterministic salt — stored in env, never changes (changing it invalidates all hashes)
function getDniSalt(): string {
  return process.env.ENCRYPTION_MASTER_KEY?.substring(0, 16) || 'default-salt-dev'
}

/**
 * Create a deterministic hash of a DNI for database lookups.
 * Same DNI always produces the same hash (enables WHERE dniHash = ?).
 */
export function hashDni(dni: string): string {
  const salt = getDniSalt()
  return createHash('sha256').update(`${salt}:${dni}`).digest('hex')
}

/**
 * Mask a DNI for safe display: "12345678" → "*****678"
 */
export function maskDni(dni: string): string {
  if (!dni || dni.length < 3) return '***'
  return '*'.repeat(dni.length - 3) + dni.slice(-3)
}

/**
 * Mask an email for safe display: "juan@empresa.com" → "j***@empresa.com"
 */
export function maskEmail(email: string): string {
  if (!email) return '***'
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  if (local.length <= 1) return `${local}***@${domain}`
  return `${local[0]}${'*'.repeat(Math.min(local.length - 1, 5))}@${domain}`
}

/**
 * Mask a salary for log output: 5000 → "S/ ****"
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function maskSalary(amount: number | string): string {
  return 'S/ ****'
}

/**
 * Mask a phone number: "+51999888777" → "+51***888777"
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '***'
  const visible = 6
  return phone.substring(0, 3) + '*'.repeat(phone.length - visible) + phone.slice(-3)
}

/**
 * Sanitize an object for logging — removes/masks sensitive fields.
 * Use before console.log() or audit log storage.
 */
export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'clave', 'secret', 'token', 'key', 'solPassword', 'solUser', 'creditCard']

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()

    if (sensitiveKeys.some(s => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]'
    } else if (lowerKey === 'dni' && typeof value === 'string') {
      sanitized[key] = maskDni(value)
    } else if (lowerKey === 'email' && typeof value === 'string') {
      sanitized[key] = maskEmail(value)
    } else if ((lowerKey === 'phone' || lowerKey === 'telefono') && typeof value === 'string') {
      sanitized[key] = maskPhone(value)
    } else if ((lowerKey.includes('sueldo') || lowerKey.includes('salary')) && typeof value === 'number') {
      sanitized[key] = '[SALARY_REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}
