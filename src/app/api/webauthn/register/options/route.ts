/**
 * POST /api/webauthn/register/options
 *
 * Genera opciones de registro WebAuthn para el usuario autenticado, junto con
 * un challenge JWT con TTL 5 min que debe reenviarse al endpoint /verify.
 *
 * Excluye automáticamente las credenciales que el usuario ya tiene
 * registradas para que el browser no permita re-enrollar el mismo device.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildRegistrationOptions } from '@/lib/webauthn-credentials'
import { issueChallenge } from '@/lib/webauthn-server'

export const POST = withAuth(async (_req, ctx) => {
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: { id: true, email: true, firstName: true, lastName: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  }

  const options = await buildRegistrationOptions({
    userId: user.id,
    userEmail: user.email,
    userDisplayName:
      [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email,
  })

  // Emitimos un challenge JWT con el mismo nonce que devuelven las opciones
  // de WebAuthn. Sirve para validar en /verify que el ceremony fue iniciado
  // por nosotros y no replayed.
  const issued = issueChallenge({
    workerId: user.id, // sub del JWT — para /verify usamos esto como key
    action: 'register_credential',
    entityId: user.id,
  })

  if (!issued) {
    return NextResponse.json(
      { error: 'WebAuthn no configurado (WEBAUTHN_CHALLENGE_SECRET ausente)' },
      { status: 503 },
    )
  }

  // Sobreescribimos el challenge generado por simplewebauthn con el del JWT
  // para que ambos sean el mismo nonce.
  options.challenge = issued.challenge

  return NextResponse.json({
    options,
    challengeToken: issued.token,
    expiresIn: issued.expiresIn,
  })
})
