/**
 * WebAuthn fuerte — registro y verificación de credenciales por usuario.
 *
 * Complementa `src/lib/webauthn-server.ts` (challenge JWT, sigue activo).
 * Este módulo agrega la pieza criptográfica faltante: probar que la firma
 * biométrica viene del DEVICE registrado, no de cualquier authenticator.
 *
 * Stack:
 *   - @simplewebauthn/server@13 para verifyRegistrationResponse y
 *     verifyAuthenticationResponse.
 *   - Prisma model WebAuthnCredential para persistir credentialID + publicKey
 *     + counter por usuario.
 *
 * Flow registro:
 *   1. POST /api/webauthn/register/options con userId
 *   2. Server genera opciones (challenge, rp, user, excludeCredentials)
 *   3. Cliente corre navigator.credentials.create()
 *   4. POST /api/webauthn/register/verify con la response
 *   5. Server: verifyRegistrationResponse → persist WebAuthnCredential
 *
 * Flow auth (firma):
 *   1. POST /api/webauthn/auth/options con userId + action + entityId
 *   2. Server: genera opciones con allowCredentials filtrados a este user.
 *      Emite también el challenge JWT legacy para audit retro-compat.
 *   3. Cliente corre navigator.credentials.get()
 *   4. POST /api/webauthn/auth/verify con la assertion
 *   5. Server: verifyAuthenticationResponse → incrementa counter
 *
 * Feature flag: `WEBAUTHN_STRICT_VERIFY=true` exige credential registrado
 * para firmar. Default false (firma sigue funcionando solo con challenge JWT).
 */

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type GenerateRegistrationOptionsOpts,
  type GenerateAuthenticationOptionsOpts,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server'
import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════════════════
// Config
// ═══════════════════════════════════════════════════════════════════════════

export const WEBAUTHN_STRICT_VERIFY = process.env.WEBAUTHN_STRICT_VERIFY === 'true'

/**
 * Origen + RP ID derivados de NEXT_PUBLIC_APP_URL. RP ID = host (sin scheme,
 * sin port). En desarrollo localhost se permite.
 */
function getRpConfig(): { rpName: string; rpID: string; origin: string } {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.comply360.pe'
  const url = new URL(appUrl)
  return {
    rpName: 'COMPLY360',
    rpID: url.hostname,
    origin: appUrl.replace(/\/$/, ''),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Registration
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera opciones de registro para un usuario. Excluye credentials ya
 * registrados para evitar duplicados.
 */
export async function buildRegistrationOptions(params: {
  userId: string
  userEmail: string
  userDisplayName?: string
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { rpName, rpID } = getRpConfig()

  const existing = await prisma.webAuthnCredential.findMany({
    where: { userId: params.userId },
    select: { credentialID: true, transports: true },
  })

  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userName: params.userEmail,
    userDisplayName: params.userDisplayName ?? params.userEmail,
    // userID en uint8array; usamos el userId interno (cuid) como bytes UTF-8
    userID: new TextEncoder().encode(params.userId),
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({
      id: bytesToBase64url(c.credentialID),
      transports: (c.transports as AuthenticatorTransportFuture[]) ?? undefined,
    })),
    authenticatorSelection: {
      // Platform = Touch ID, Windows Hello, huella Android
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60_000,
  }

  return generateRegistrationOptions(opts)
}

/**
 * Verifica el response de registro y persiste el credential en DB.
 * Retorna el credential creado o lanza si la verificación falla.
 */
export async function verifyAndPersistRegistration(params: {
  userId: string
  expectedChallenge: string
  response: RegistrationResponseJSON
  nickname?: string
}): Promise<{ credentialId: string }> {
  const { rpID, origin } = getRpConfig()

  const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
    response: params.response,
    expectedChallenge: params.expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('Registro WebAuthn inválido')
  }

  const info = verification.registrationInfo
  const credential = info.credential

  const created = await prisma.webAuthnCredential.create({
    data: {
      userId: params.userId,
      credentialID: Buffer.from(credential.id, 'base64url'),
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: (credential.transports as string[]) ?? [],
      aaguid: info.aaguid ?? null,
      deviceType: info.credentialDeviceType,
      backedUp: info.credentialBackedUp,
      nickname: params.nickname ?? null,
    },
    select: { id: true },
  })

  return { credentialId: created.id }
}

// ═══════════════════════════════════════════════════════════════════════════
// Authentication (firma)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera opciones de autenticación. Si el usuario no tiene credentials
 * registrados, retorna null — el caller debe ofrecer registro primero o
 * caer al flow legacy si WEBAUTHN_STRICT_VERIFY=false.
 */
export async function buildAuthenticationOptions(params: {
  userId: string
}): Promise<PublicKeyCredentialRequestOptionsJSON | null> {
  const { rpID } = getRpConfig()

  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId: params.userId, legacy: false },
    select: { credentialID: true, transports: true },
  })

  if (credentials.length === 0) return null

  const opts: GenerateAuthenticationOptionsOpts = {
    rpID,
    userVerification: 'required',
    allowCredentials: credentials.map((c) => ({
      id: bytesToBase64url(c.credentialID),
      transports: (c.transports as AuthenticatorTransportFuture[]) ?? undefined,
    })),
    timeout: 60_000,
  }

  return generateAuthenticationOptions(opts)
}

/**
 * Verifica un assertion firmada por el authenticator del usuario.
 * Si la firma es válida, incrementa el counter (anti-cloning) y actualiza
 * `lastUsedAt`. Devuelve el credentialId interno usado.
 */
export async function verifyAndUpdateAuthentication(params: {
  userId: string
  expectedChallenge: string
  response: AuthenticationResponseJSON
}): Promise<{ verified: true; credentialId: string } | { verified: false; reason: string }> {
  const { rpID, origin } = getRpConfig()

  // Buscar el credential por su raw id devuelto en la response
  const rawId = params.response.id
  const credentialIdBytes = Buffer.from(rawId, 'base64url')

  const credential = await prisma.webAuthnCredential.findFirst({
    where: { userId: params.userId, credentialID: credentialIdBytes },
  })

  if (!credential) {
    return { verified: false, reason: 'credential_not_found' }
  }

  let verification: VerifiedAuthenticationResponse
  try {
    verification = await verifyAuthenticationResponse({
      response: params.response,
      expectedChallenge: params.expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: bytesToBase64url(credential.credentialID),
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
        transports: (credential.transports as AuthenticatorTransportFuture[]) ?? undefined,
      },
      requireUserVerification: true,
    })
  } catch (err) {
    return {
      verified: false,
      reason: err instanceof Error ? `verify_failed:${err.message}` : 'verify_failed',
    }
  }

  if (!verification.verified) {
    return { verified: false, reason: 'assertion_invalid' }
  }

  // Anti-cloning: el counter NUNCA debe bajar.
  const newCounter = BigInt(verification.authenticationInfo.newCounter)
  if (newCounter <= credential.counter && credential.counter > BigInt(0)) {
    return { verified: false, reason: 'counter_replay' }
  }

  await prisma.webAuthnCredential.update({
    where: { id: credential.id },
    data: { counter: newCounter, lastUsedAt: new Date() },
  })

  return { verified: true, credentialId: credential.id }
}

/**
 * ¿El usuario tiene al menos un credential no-legacy registrado?
 * Util para decidir UI ("Registrar huella" vs "Firmar con huella") y para
 * gating cuando WEBAUTHN_STRICT_VERIFY=true.
 */
export async function userHasStrongCredential(userId: string): Promise<boolean> {
  const count = await prisma.webAuthnCredential.count({
    where: { userId, legacy: false },
  })
  return count > 0
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function bytesToBase64url(b: Uint8Array | Buffer): string {
  return Buffer.from(b).toString('base64url')
}
