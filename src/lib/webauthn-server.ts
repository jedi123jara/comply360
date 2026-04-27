/**
 * WebAuthn server-side challenge issuance + verification.
 *
 * Protocolo "soft" (sin @simplewebauthn/server):
 *   1. El cliente pide un challenge a `/api/webauthn/challenge` con un sub
 *      (workerId), una action ('sign_contract' | 'sign_payslip') y un
 *      entityId (contractId o payslipId).
 *   2. El server genera 32 bytes random, los encoda base64url, y firma un
 *      JWT con esas claims + el challenge como nonce + exp 5 min.
 *   3. El cliente usa los bytes del challenge en la ceremonia WebAuthn y
 *      envía el JWT + el challenge original al endpoint de firma.
 *   4. El endpoint de firma verifica el JWT (firma, exp, sub, action,
 *      entityId, challenge) antes de aceptar la firma.
 *
 * Esto elimina la clase de replay attacks: un challenge solo vale para un
 * worker + acción + entidad específica, durante 5 minutos. No previene
 * ataques MITM activos con TLS roto — eso lo cubre HTTPS.
 *
 * Para firma digital fuerte con certificado RENIEC, ver roadmap Fase 4.
 */

import jwt from 'jsonwebtoken'
import { randomBytes, createHash } from 'crypto'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type ChallengeAction =
  | 'sign_contract'
  | 'sign_payslip'
  | 'sign_doc_acknowledgment' // acuse de recibo de OrgDocument (Idea 1)
  | 'register_credential'     // enrolar nueva passkey
  | 'auth_credential'         // ceremonia de firma con passkey ya registrada

export interface ChallengePayload {
  /** Worker ID que solicitó el challenge. */
  sub: string
  /** Qué va a firmar. */
  action: ChallengeAction
  /** ID de la entidad (contractId o payslipId). */
  entityId: string
  /** Challenge original en base64url — debe coincidir al verificar. */
  nonce: string
  /** Issued-at (segundos epoch). */
  iat: number
  /** Expires-at (segundos epoch). */
  exp: number
  /** Identifier único del challenge — puede servir para audit. */
  jti: string
}

export interface IssuedChallenge {
  /** El challenge crudo como base64url (lo usa el cliente en la ceremonia). */
  challenge: string
  /** Token JWT firmado que el cliente reenvía al endpoint de firma. */
  token: string
  /** TTL en segundos. */
  expiresIn: number
}

export type VerificationOutcome =
  | { valid: true; payload: ChallengePayload }
  | {
      valid: false
      reason:
        | 'not_configured'
        | 'invalid_token'
        | 'expired'
        | 'subject_mismatch'
        | 'action_mismatch'
        | 'entity_mismatch'
        | 'challenge_mismatch'
    }

// ═══════════════════════════════════════════════════════════════════════════
// Secret loading
// ═══════════════════════════════════════════════════════════════════════════

/**
 * El secret sale de WEBAUTHN_CHALLENGE_SECRET. En desarrollo, si falta,
 * usamos un fallback derivado de NEXTAUTH_SECRET/CLERK_SECRET_KEY para no
 * romper el flujo. En prod, la ausencia del secret desactiva WebAuthn
 * server-side y el endpoint devuelve 503.
 */
export function getChallengeSecret(): string | null {
  const explicit = process.env.WEBAUTHN_CHALLENGE_SECRET
  if (explicit && explicit.length >= 32) return explicit

  if (process.env.NODE_ENV !== 'production') {
    // Derivar un secret dev-only a partir de algo que ya exista, para que
    // los devs no tengan que configurar otra variable.
    const seed = process.env.CLERK_SECRET_KEY ?? process.env.DATABASE_URL ?? 'comply360-dev'
    return createHash('sha256').update(`webauthn-dev:${seed}`).digest('hex')
  }

  return null
}

// ═══════════════════════════════════════════════════════════════════════════
// Issue
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_TTL_SEC = 300 // 5 minutos

export function issueChallenge(params: {
  workerId: string
  action: ChallengeAction
  entityId: string
  ttlSec?: number
}): IssuedChallenge | null {
  const secret = getChallengeSecret()
  if (!secret) return null

  const ttl = params.ttlSec ?? DEFAULT_TTL_SEC
  const nonceBytes = randomBytes(32)
  const nonce = nonceBytes.toString('base64url')
  const jti = randomBytes(12).toString('base64url')

  const token = jwt.sign(
    {
      sub: params.workerId,
      action: params.action,
      entityId: params.entityId,
      nonce,
      jti,
    },
    secret,
    {
      algorithm: 'HS256',
      expiresIn: ttl,
    },
  )

  return { challenge: nonce, token, expiresIn: ttl }
}

// ═══════════════════════════════════════════════════════════════════════════
// Verify
// ═══════════════════════════════════════════════════════════════════════════

export function verifyChallenge(params: {
  token: string
  challenge: string
  workerId: string
  action: ChallengeAction
  entityId: string
}): VerificationOutcome {
  const secret = getChallengeSecret()
  if (!secret) return { valid: false, reason: 'not_configured' }

  let decoded: jwt.JwtPayload
  try {
    const result = jwt.verify(params.token, secret, { algorithms: ['HS256'] })
    if (typeof result !== 'object' || result === null) {
      return { valid: false, reason: 'invalid_token' }
    }
    decoded = result as jwt.JwtPayload
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) return { valid: false, reason: 'expired' }
    return { valid: false, reason: 'invalid_token' }
  }

  const payload = decoded as ChallengePayload

  if (payload.sub !== params.workerId) {
    return { valid: false, reason: 'subject_mismatch' }
  }
  if (payload.action !== params.action) {
    return { valid: false, reason: 'action_mismatch' }
  }
  if (payload.entityId !== params.entityId) {
    return { valid: false, reason: 'entity_mismatch' }
  }
  if (payload.nonce !== params.challenge) {
    return { valid: false, reason: 'challenge_mismatch' }
  }

  return { valid: true, payload }
}
