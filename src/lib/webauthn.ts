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
    | 'error'
  /** ID del credential usado (para audit trail). */
  credentialId?: string
  /** authenticatorAttachment reportado por el navegador. */
  authenticatorAttachment?: AuthenticatorAttachment
  /** userAgent del dispositivo, útil para audit. */
  userAgent?: string
}

// ═══════════════════════════════════════════════════════════════════════════
// Main function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Intenta correr una ceremony WebAuthn para autenticación biométrica.
 *
 * - Detecta si el navegador soporta WebAuthn
 * - Detecta si el dispositivo tiene un platform authenticator (Touch ID /
 *   huella Android / Windows Hello)
 * - Si ambos OK: lanza el prompt nativo del dispositivo
 * - Retorna el resultado sin lanzar excepciones
 */
export async function tryBiometricCeremony(): Promise<BiometricCeremonyResult> {
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

    // Challenge aleatorio — client-side por ahora. El audit trail
    // server-side (IP, userAgent, timestamp) es la prueba real.
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)

    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer,
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
