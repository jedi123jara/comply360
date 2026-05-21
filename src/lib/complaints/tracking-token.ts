import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export function generateComplaintTrackingToken(): string {
  return `ct_${randomBytes(32).toString('base64url')}`
}

export function hashComplaintTrackingToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function verifyComplaintTrackingToken(token: string | null | undefined, expectedHash: string | null | undefined): boolean {
  if (!token || !expectedHash) return false

  const actual = Buffer.from(hashComplaintTrackingToken(token), 'hex')
  const expected = Buffer.from(expectedHash, 'hex')

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
