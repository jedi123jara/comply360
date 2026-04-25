/**
 * WebAuthn helpers — biometric ceremonies client-side.
 *
 * Uso básico:
 * ```ts
 * const result = await tryBiometricCeremony()
 * if (result.verified) {
 *   // Enviar al backend con signatureLevel: 'BIOMETRIC'
 * } else {
 *   // Fallback a firma simple o avisar al user
 * }
 * ```
 *
 * Contexto legal (Perú):
 *   - Ley 27269 (Firmas y Certificados Digitales) + D.S. 052-2008-PCM
 *   - WebAuthn con `userVerification: 'required'` + `authenticatorAttachment:
 *     'platform'` constituye firma electrónica fuerte. El sensor del
 *     dispositivo valida biométricamente al firmante, y nosotros recibimos
 *     solo la prueba criptográfica (zero-knowledge desde nuestro backend).
 *   - NO equivale a firma digital con certificado RENIEC — pero tiene valor
 *     probatorio alto entre las partes mientras haya audit trail con IP +
 *     userAgent + credentialId.
 *
 * Para Sprint futuro: emitir el challenge desde el backend y validarlo con
 * @simplewebauthn/server para evitar replay attacks. Por ahora el challenge
 * es client-side (suficiente para el caso de uso — el audit trail + IP
 * registrados por el servidor son la prueba, no el challenge en sí).
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface BiometricCeremonyResult {
  /** true si el usuario completó la verificación biométrica. */
  verified: boolean
  /** Por qué no se completó (solo si verified=false). */
  reason?:
    | 'not-supported'      // Navegador sin WebAuthn
    | 'no-platform-auth'   // Sin Touch ID / huella / Windows Hello
    | 'user-cancelled'     // Usuario canceló el prompt
    | 'timeout'
    | 'challenge-unavailable' // No se pudo obtener challenge del server
    | 'error'
  /** ID del credential usado (para audit trail). */
  credentialId?: string
  /** authenticatorAttachment reportado por el navegador. */
  authenticatorAttachment?: AuthenticatorAttachment
  /** userAgent del dispositivo, útil para audit. */
  userAgent?: string
  /** Challenge base64url devuelto por el server (debe reenviarse al endpoint de firma). */
  challenge?: string
  /** JWT del challenge server-side (debe reenviarse al endpoint de firma). */
  challengeToken?: string
}

export interface ServerChallengeRequest {
  action: 'sign_contract' | 'sign_payslip'
  entityId: string
}

interface ServerChallengeResponse {
  challenge: string   // base64url
  token: string       // JWT
  expiresIn: number
}

/**
 * Pide un challenge al server. Devuelve null si el server lo rechaza o si
 * el endpoint no está disponible. Safe de llamar en cualquier contexto.
 */
async function fetchServerChallenge(
  req: ServerChallengeRequest,
): Promise<ServerChallengeResponse | null> {
  try {
    const res = await fetch('/api/webauthn/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) return null
    return (await res.json()) as ServerChallengeResponse
  } catch {
    return null
  }
}

/** base64url → Uint8Array */
function base64urlToBytes(b64: string): Uint8Array {
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const b64std = padded.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(b64std)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

// ═══════════════════════════════════════════════════════════════════════════
// Main function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intenta correr una ceremony WebAuthn para autenticación biométrica.
 *
 * Si se pasa `serverChallenge` (action + entityId), pide el challenge al
 * backend antes de la ceremonia — eso permite al server verificar después
 * que la firma corresponde a ese challenge específico y no a uno viejo
 * (protección anti-replay).
 *
 * Si no se pasa, genera un challenge local (modo legacy). El resultado
 * incluye `challenge` + `challengeToken` cuando se usó el server, que deben
 * reenviarse junto con el payload de firma al endpoint correspondiente.
 */
export async function tryBiometricCeremony(
  serverChallenge?: ServerChallengeRequest,
): Promise<BiometricCeremonyResult> {
  if (typeof window === 'undefined') {
    return { verified: false, reason: 'not-supported' }
  }
  if (!window.PublicKeyCredential) {
    return { verified: false, reason: 'not-supported' }
  }

  const userAgent = window.navigator.userAgent

  try {
    const platformAvailable =
      await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    if (!platformAvailable) {
      return { verified: false, reason: 'no-platform-auth', userAgent }
    }

    // Preferimos el challenge del server — previene replay. Si no se pide
    // o el server no responde, caemos al challenge local (compat legacy).
    let challengeBytes: Uint8Array
    let challengeB64: string | undefined
    let challengeToken: string | undefined

    if (serverChallenge) {
      const resp = await fetchServerChallenge(serverChallenge)
      if (!resp) {
        return { verified: false, reason: 'challenge-unavailable', userAgent }
      }
      challengeBytes = base64urlToBytes(resp.challenge)
      challengeB64 = resp.challenge
      challengeToken = resp.token
    } else {
      challengeBytes = new Uint8Array(32)
      crypto.getRandomValues(challengeBytes)
    }

    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes.buffer as ArrayBuffer,
        timeout: 60_000,
        userVerification: 'required',
      },
      mediation: 'optional',
    } as CredentialRequestOptions)) as PublicKeyCredential | null

    if (!cred) {
      return { verified: false, reason: 'user-cancelled', userAgent }
    }

    const attachment = cred.authenticatorAttachment
    return {
      verified: true,
      credentialId: cred.id,
      authenticatorAttachment:
        attachment === 'platform' || attachment === 'cross-platform'
          ? attachment
          : undefined,
      userAgent,
      challenge: challengeB64,
      challengeToken,
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : ''
    if (name === 'NotAllowedError') {
      return { verified: false, reason: 'user-cancelled', userAgent }
    }
    if (name === 'TimeoutError') {
      return { verified: false, reason: 'timeout', userAgent }
    }
    console.warn('[webauthn] ceremony error', err)
    return { verified: false, reason: 'error', userAgent }
  }
}

/**
 * Chequeo sincrónico: ¿vale la pena intentar biometric? (para deshabilitar UI
 * si el browser ni siquiera soporta WebAuthn). Cuando retorna true, aún puede
 * fallar al disparar la ceremony si no hay platform authenticator.
 */
export function isBiometricLikelyAvailable(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(window.PublicKeyCredential)
}

/**
 * Chequeo async: ¿hay un platform authenticator (Touch ID, huella, etc.)?
 * Llamar al mount de la página para decidir la etiqueta del botón
 * ("Firmar con huella" vs "Firmar").
 */
export async function hasBiometricHardware(): Promise<boolean> {
  if (!isBiometricLikelyAvailable()) return false
  try {
    return await window.PublicKeyCredential!.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}
