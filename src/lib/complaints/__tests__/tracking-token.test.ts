import { describe, expect, it } from 'vitest'
import {
  generateComplaintTrackingToken,
  hashComplaintTrackingToken,
  verifyComplaintTrackingToken,
} from '../tracking-token'

describe('complaint tracking token', () => {
  it('generates non-enumerable tokens and verifies only the matching token', () => {
    const token = generateComplaintTrackingToken()
    const hash = hashComplaintTrackingToken(token)

    expect(token.startsWith('ct_')).toBe(true)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(verifyComplaintTrackingToken(token, hash)).toBe(true)
    expect(verifyComplaintTrackingToken(`${token}x`, hash)).toBe(false)
    expect(verifyComplaintTrackingToken('', hash)).toBe(false)
  })
})
