/**
 * POST /api/webauthn/register/verify
 *
 * Recibe el RegistrationResponseJSON del navegador + el challengeToken JWT
 * emitido por /options. Valida el JWT, verifica la registration response con
 * @simplewebauthn/server, y persiste el credential en `webauthn_credentials`.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { verifyChallenge } from '@/lib/webauthn-server'
import { verifyAndPersistRegistration } from '@/lib/webauthn-credentials'
import { logAudit } from '@/lib/audit'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

export const POST = withAuth(async (req, ctx) => {
  if (!ctx.userId) {
    return NextResponse.json({ error: 'Autenticación requerida' }, { status: 401 })
  }

  let body: {
    challengeToken?: string
    challenge?: string
    response?: RegistrationResponseJSON
    nickname?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (!body.challengeToken || !body.challenge || !body.response) {
    return NextResponse.json(
      { error: 'challengeToken, challenge y response son requeridos' },
      { status: 400 },
    )
  }

  // 1. Validar challenge JWT — antireplay
  const challengeOk = verifyChallenge({
    token: body.challengeToken,
    challenge: body.challenge,
    workerId: ctx.userId,
    action: 'register_credential',
    entityId: ctx.userId,
  })
  if (!challengeOk.valid) {
    return NextResponse.json(
      { error: `Challenge inválido: ${challengeOk.reason}` },
      { status: 400 },
    )
  }

  // 2. Verificar registration response + persistir credential
  let result: { credentialId: string }
  try {
    result = await verifyAndPersistRegistration({
      userId: ctx.userId,
      expectedChallenge: body.challenge,
      response: body.response,
      nickname: body.nickname,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verificación falló' },
      { status: 400 },
    )
  }

  // 3. Audit
  await logAudit({
    orgId: ctx.orgId ?? 'system',
    userId: ctx.userId,
    action: 'webauthn.credential.registered',
    entityType: 'WebAuthnCredential',
    entityId: result.credentialId,
    metadata: {
      nickname: body.nickname ?? '',
      ip: req.headers.get('x-forwarded-for') ?? '',
      userAgent: req.headers.get('user-agent') ?? '',
    },
  })

  return NextResponse.json({ ok: true, credentialId: result.credentialId })
})
