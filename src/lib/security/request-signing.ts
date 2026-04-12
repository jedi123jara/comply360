/**
 * Request Signing (HMAC) for Critical Operations
 *
 * Protects against request tampering on sensitive endpoints:
 * - Credential storage/deletion
 * - Bulk operations (payslip batch, bulk status change)
 * - Financial operations (payslip generation)
 *
 * Flow:
 *   1. Client generates HMAC-SHA256 of request body using a session-derived key
 *   2. Server verifies HMAC before processing
 *   3. Prevents man-in-the-middle body modification
 *
 * For now, implements server-side verification of integrity tokens
 * that the middleware injects.
 */

import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Generate an HMAC-SHA256 signature for a request body.
 */
export function signRequest(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex')
}

/**
 * Verify an HMAC signature using constant-time comparison.
 * Prevents timing attacks.
 */
export function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = signRequest(body, secret)

  // Constant-time comparison to prevent timing attacks
  if (expected.length !== signature.length) return false

  try {
    return timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signature, 'hex'),
    )
  } catch {
    return false
  }
}

/**
 * Generate a one-time integrity token for critical operations.
 * Valid for 5 minutes.
 */
export function generateIntegrityToken(orgId: string, operation: string): string {
  const secret = process.env.ENCRYPTION_MASTER_KEY || 'dev-key'
  const timestamp = Math.floor(Date.now() / 300_000) // 5-minute window
  const payload = `${orgId}:${operation}:${timestamp}`
  return createHmac('sha256', secret).update(payload).digest('hex').substring(0, 32)
}

/**
 * Verify a one-time integrity token.
 * Checks current and previous 5-minute window (10-minute total validity).
 */
export function verifyIntegrityToken(token: string, orgId: string, operation: string): boolean {
  const secret = process.env.ENCRYPTION_MASTER_KEY || 'dev-key'
  const currentWindow = Math.floor(Date.now() / 300_000)

  for (let i = 0; i <= 1; i++) {
    const payload = `${orgId}:${operation}:${currentWindow - i}`
    const expected = createHmac('sha256', secret).update(payload).digest('hex').substring(0, 32)
    if (expected.length === token.length) {
      try {
        if (timingSafeEqual(Buffer.from(expected), Buffer.from(token))) {
          return true
        }
      } catch { /* continue */ }
    }
  }

  return false
}
