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
  action:
    | 'sign_contract'
    | 'sign_payslip'
    | 'sign_doc_acknowledgment'
    | 'vote_committee'
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

    const cred = (await navigator.credentials.create({
      publicKey: {
        rp: { name: 'Comply360', id: window.location.hostname },
        user: {
          id: challengeBytes.slice(0, 16).buffer as ArrayBuffer,
          name: 'firma@comply360.pe',
          displayName: 'Firma Biométrica Comply360',
        },
        challenge: challengeBytes.buffer as ArrayBuffer,
        pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
        timeout: 60_000,
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged', // Evita guardar el passkey en el gestor de contraseñas si el OS lo permite
        },
      },
    })) as PublicKeyCredential | null

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

// ═══════════════════════════════════════════════════════════════════════════
// Strong WebAuthn ceremony — FIX #1.A
// ═══════════════════════════════════════════════════════════════════════════
//
// Antes, `tryBiometricCeremony` usaba `navigator.credentials.create()`
// (registro nuevo cada firma). NO probaba que el authenticator
// perteneciera al worker — cualquier dispositivo con biométrico válido
// "firmaba". Riesgo legal Ley 27269 art. 7 (vínculo único firmante↔dispositivo).
//
// Esta función nueva usa `navigator.credentials.get()` con `allowCredentials`
// derivados de los passkeys del usuario en DB. Si la verificación pasa,
// el counter del credential se incrementa server-side (anti-cloning).
//
// La infraestructura completa ya existe en src/lib/webauthn-credentials.ts
// y los endpoints `/api/webauthn/auth/options` + `/verify`. Esta función
// solo cablea el cliente.

export interface StrongCeremonyRequest {
  action: 'sign_contract' | 'sign_payslip' | 'vote_committee'
  entityId: string
}

export interface StrongCeremonyResult {
  verified: boolean
  /** Si false, indica por qué para que la UI decida (registrar pasaporte vs error). */
  reason?:
    | 'not-supported'
    | 'no-platform-auth'
    | 'no-credentials' // El user no tiene passkey registrado — UI debe ofrecer enrolment
    | 'user-cancelled'
    | 'timeout'
    | 'options-failed'
    | 'verify-failed'
    | 'error'
  /** ID del credential interno (Prisma) que se usó. */
  credentialId?: string
  /** Token JWT del challenge — debe reenviarse al endpoint de firma. */
  challengeToken?: string
  /** Challenge base64url crudo — debe reenviarse al endpoint de firma. */
  challenge?: string
  userAgent?: string
}

/**
 * Convierte la AssertionResponse del navegador al JSON serializable que
 * `@simplewebauthn/server` espera (`AuthenticationResponseJSON`).
 */
function assertionToJson(cred: PublicKeyCredential): {
  id: string
  rawId: string
  type: 'public-key'
  clientExtensionResults: Record<string, unknown>
  authenticatorAttachment?: AuthenticatorAttachment | null
  response: {
    clientDataJSON: string
    authenticatorData: string
    signature: string
    userHandle: string | null
  }
} {
  const r = cred.response as AuthenticatorAssertionResponse
  const b64u = (buf: ArrayBuffer | null): string => {
    if (!buf) return ''
    return btoa(String.fromCharCode(...new Uint8Array(buf)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  }
  return {
    id: cred.id,
    rawId: b64u(cred.rawId),
    type: 'public-key',
    clientExtensionResults: cred.getClientExtensionResults() as Record<string, unknown>,
    authenticatorAttachment: (cred.authenticatorAttachment as AuthenticatorAttachment | null | undefined) ?? null,
    response: {
      clientDataJSON: b64u(r.clientDataJSON),
      authenticatorData: b64u(r.authenticatorData),
      signature: b64u(r.signature),
      userHandle: r.userHandle ? b64u(r.userHandle) : null,
    },
  }
}

/**
 * Corre una ceremonia WebAuthn FUERTE: pide opciones al server, dispara
 * `navigator.credentials.get()` con `allowCredentials`, y verifica la
 * assertion contra el credential registrado del usuario.
 *
 * Si el server responde 404 `no_credentials`, devuelve `reason: 'no-credentials'`
 * para que la UI ofrezca enrolment one-time. Caller decide si caer al flow
 * legacy `tryBiometricCeremony()` mientras `WEBAUTHN_STRICT_VERIFY=false`.
 */
export async function tryStrongBiometricCeremony(
  req: StrongCeremonyRequest,
): Promise<StrongCeremonyResult> {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) {
    return { verified: false, reason: 'not-supported' }
  }
  const userAgent = window.navigator.userAgent

  try {
    const platformAvailable =
      await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    if (!platformAvailable) {
      return { verified: false, reason: 'no-platform-auth', userAgent }
    }

    // 1. Options del server (con allowCredentials del usuario)
    const optsRes = await fetch('/api/webauthn/auth/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (optsRes.status === 404) {
      // El user no tiene passkeys aún
      return { verified: false, reason: 'no-credentials', userAgent }
    }
    if (!optsRes.ok) {
      return { verified: false, reason: 'options-failed', userAgent }
    }
    const { options, challengeToken } = (await optsRes.json()) as {
      options: PublicKeyCredentialRequestOptionsJSON
      challengeToken: string
    }

    // 2. Convertir options JSON → API nativa del navegador
    const challengeBytes = base64urlToBytes(options.challenge)
    const allowCredentials = (options.allowCredentials ?? []).map((c) => ({
      id: base64urlToBytes(c.id).buffer as ArrayBuffer,
      type: 'public-key' as const,
      transports: c.transports as AuthenticatorTransport[] | undefined,
    }))

    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes.buffer as ArrayBuffer,
        rpId: options.rpId,
        allowCredentials,
        userVerification: 'required',
        timeout: options.timeout ?? 60_000,
      },
    })) as PublicKeyCredential | null

    if (!cred) {
      return { verified: false, reason: 'user-cancelled', userAgent }
    }

    // 3. Verify server-side (incrementa counter, valida origin/RP/firma)
    const assertionJson = assertionToJson(cred)
    const verifyRes = await fetch('/api/webauthn/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: req.action,
        entityId: req.entityId,
        challenge: options.challenge,
        challengeToken,
        response: assertionJson,
      }),
    })

    if (!verifyRes.ok) {
      return { verified: false, reason: 'verify-failed', userAgent }
    }
    const verified = (await verifyRes.json()) as { verified: boolean; credentialId?: string }
    if (!verified.verified) {
      return { verified: false, reason: 'verify-failed', userAgent }
    }

    return {
      verified: true,
      credentialId: verified.credentialId,
      challengeToken,
      challenge: options.challenge,
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
    console.warn('[webauthn-strong] ceremony error', err)
    return { verified: false, reason: 'error', userAgent }
  }
}

// Helper local — duplica el de @simplewebauthn pero mantiene este módulo
// browser-only sin imports de server.
type PublicKeyCredentialRequestOptionsJSON = {
  challenge: string
  rpId?: string
  timeout?: number
  allowCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>
  userVerification?: 'discouraged' | 'preferred' | 'required'
}
