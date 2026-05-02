import { describe, it, expect, beforeAll } from 'vitest'
import { signAuditorToken, verifyAuditorToken } from '../public-link/token'

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-please-change-in-prod-32-chars'
})

describe('Auditor Link tokens', () => {
  it('firma y verifica un token válido', () => {
    const token = signAuditorToken({
      orgId: 'org-abc',
      snapshotId: 'snap-xyz',
      hash: 'a'.repeat(64),
      includeWorkers: true,
      includeComplianceRoles: true,
      expiresInHours: 48,
    })
    expect(token).toBeTruthy()
    const decoded = verifyAuditorToken(token)
    expect(decoded).toBeTruthy()
    expect(decoded?.aud).toBe('org-abc')
    expect(decoded?.sub).toBe('snap-xyz')
    expect(decoded?.includeWorkers).toBe(true)
  })

  it('rechaza token con secreto distinto', () => {
    const token = signAuditorToken({
      orgId: 'org-abc',
      snapshotId: 'snap-xyz',
      hash: 'a'.repeat(64),
      includeWorkers: true,
      includeComplianceRoles: false,
      expiresInHours: 24,
    })
    process.env.JWT_SECRET = 'otro-secreto-distinto'
    expect(verifyAuditorToken(token)).toBeNull()
    process.env.JWT_SECRET = 'test-secret-please-change-in-prod-32-chars'
  })

  it('rechaza string que no es JWT', () => {
    expect(verifyAuditorToken('not-a-jwt')).toBeNull()
    expect(verifyAuditorToken('')).toBeNull()
  })
})
