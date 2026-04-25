/**
 * Tests para el módulo server-side de challenges WebAuthn.
 *
 * Cubre:
 *  - Issue: genera challenge + JWT válido con TTL
 *  - Verify: acepta token correcto
 *  - Verify: rechaza token con workerId/action/entityId/challenge mismatch
 *  - Verify: rechaza token expirado
 *  - Verify: rechaza token manipulado
 *  - Secret: fallback dev cuando no hay WEBAUTHN_CHALLENGE_SECRET
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { issueChallenge, verifyChallenge, getChallengeSecret } from '../webauthn-server'

const ORIG_SECRET = process.env.WEBAUTHN_CHALLENGE_SECRET

function setSecret(secret: string | undefined) {
  if (secret) process.env.WEBAUTHN_CHALLENGE_SECRET = secret
  else delete process.env.WEBAUTHN_CHALLENGE_SECRET
}

function restoreEnv() {
  setSecret(ORIG_SECRET)
  vi.unstubAllEnvs()
}

describe('webauthn-server', () => {
  afterEach(restoreEnv)

  describe('getChallengeSecret', () => {
    it('usa WEBAUTHN_CHALLENGE_SECRET cuando está definido con ≥32 chars', () => {
      setSecret('a'.repeat(64))
      expect(getChallengeSecret()).toBe('a'.repeat(64))
    })

    it('ignora secret muy corto (< 32 chars)', () => {
      setSecret('too-short')
      // En dev va a caer al fallback derivado; no debería devolver "too-short"
      const result = getChallengeSecret()
      expect(result).not.toBe('too-short')
    })

    it('devuelve null en producción sin secret configurado', () => {
      setSecret(undefined)
      vi.stubEnv('NODE_ENV', 'production')
      expect(getChallengeSecret()).toBe(null)
    })

    it('derivar secret dev cuando no está configurado (fuera de prod)', () => {
      setSecret(undefined)
      vi.stubEnv('NODE_ENV', 'development')
      const result = getChallengeSecret()
      expect(result).not.toBe(null)
      expect(result!.length).toBeGreaterThanOrEqual(32)
    })
  })

  describe('issueChallenge + verifyChallenge — happy path', () => {
    beforeEach(() => setSecret('x'.repeat(64)))

    it('genera un challenge + token que se verifica con los mismos params', () => {
      const issued = issueChallenge({
        workerId: 'worker-123',
        action: 'sign_contract',
        entityId: 'contract-abc',
      })!

      expect(issued.challenge).toBeTruthy()
      expect(issued.token).toBeTruthy()
      expect(issued.expiresIn).toBe(300)

      const outcome = verifyChallenge({
        token: issued.token,
        challenge: issued.challenge,
        workerId: 'worker-123',
        action: 'sign_contract',
        entityId: 'contract-abc',
      })

      expect(outcome.valid).toBe(true)
      if (outcome.valid) {
        expect(outcome.payload.sub).toBe('worker-123')
        expect(outcome.payload.action).toBe('sign_contract')
        expect(outcome.payload.entityId).toBe('contract-abc')
      }
    })

    it('genera challenges únicos (no determinístico)', () => {
      const a = issueChallenge({ workerId: 'w', action: 'sign_contract', entityId: 'e' })!
      const b = issueChallenge({ workerId: 'w', action: 'sign_contract', entityId: 'e' })!
      expect(a.challenge).not.toBe(b.challenge)
      expect(a.token).not.toBe(b.token)
    })
  })

  describe('verifyChallenge — rechazos', () => {
    beforeEach(() => setSecret('x'.repeat(64)))

    function newIssued() {
      return issueChallenge({
        workerId: 'worker-1',
        action: 'sign_contract',
        entityId: 'contract-1',
      })!
    }

    it('rechaza cuando el workerId no coincide', () => {
      const i = newIssued()
      const outcome = verifyChallenge({
        token: i.token,
        challenge: i.challenge,
        workerId: 'otro-worker',
        action: 'sign_contract',
        entityId: 'contract-1',
      })
      expect(outcome.valid).toBe(false)
      if (!outcome.valid) expect(outcome.reason).toBe('subject_mismatch')
    })

    it('rechaza cuando la action no coincide', () => {
      const i = newIssued()
      const outcome = verifyChallenge({
        token: i.token,
        challenge: i.challenge,
        workerId: 'worker-1',
        action: 'sign_payslip',
        entityId: 'contract-1',
      })
      expect(outcome.valid).toBe(false)
      if (!outcome.valid) expect(outcome.reason).toBe('action_mismatch')
    })

    it('rechaza cuando el entityId no coincide', () => {
      const i = newIssued()
      const outcome = verifyChallenge({
        token: i.token,
        challenge: i.challenge,
        workerId: 'worker-1',
        action: 'sign_contract',
        entityId: 'contract-otro',
      })
      expect(outcome.valid).toBe(false)
      if (!outcome.valid) expect(outcome.reason).toBe('entity_mismatch')
    })

    it('rechaza cuando el challenge no coincide (anti-replay)', () => {
      const i = newIssued()
      const outcome = verifyChallenge({
        token: i.token,
        challenge: 'challenge-falso',
        workerId: 'worker-1',
        action: 'sign_contract',
        entityId: 'contract-1',
      })
      expect(outcome.valid).toBe(false)
      if (!outcome.valid) expect(outcome.reason).toBe('challenge_mismatch')
    })

    it('rechaza un token firmado con otro secret', () => {
      setSecret('a'.repeat(64))
      const i = issueChallenge({ workerId: 'w', action: 'sign_contract', entityId: 'e' })!
      setSecret('b'.repeat(64))
      const outcome = verifyChallenge({
        token: i.token,
        challenge: i.challenge,
        workerId: 'w',
        action: 'sign_contract',
        entityId: 'e',
      })
      expect(outcome.valid).toBe(false)
      if (!outcome.valid) expect(outcome.reason).toBe('invalid_token')
    })

    it('rechaza un token expirado', () => {
      const i = issueChallenge({
        workerId: 'w',
        action: 'sign_contract',
        entityId: 'e',
        ttlSec: -1, // ya vencido
      })!
      const outcome = verifyChallenge({
        token: i.token,
        challenge: i.challenge,
        workerId: 'w',
        action: 'sign_contract',
        entityId: 'e',
      })
      expect(outcome.valid).toBe(false)
      if (!outcome.valid) expect(outcome.reason).toBe('expired')
    })

    it('rechaza un token completamente garbage', () => {
      const outcome = verifyChallenge({
        token: 'not-a-jwt-at-all',
        challenge: 'x',
        workerId: 'w',
        action: 'sign_contract',
        entityId: 'e',
      })
      expect(outcome.valid).toBe(false)
      if (!outcome.valid) expect(outcome.reason).toBe('invalid_token')
    })
  })

  describe('issueChallenge sin secret', () => {
    it('devuelve null en producción sin WEBAUTHN_CHALLENGE_SECRET', () => {
      setSecret(undefined)
      vi.stubEnv('NODE_ENV', 'production')
      const result = issueChallenge({
        workerId: 'w',
        action: 'sign_contract',
        entityId: 'e',
      })
      expect(result).toBe(null)
    })
  })
})
