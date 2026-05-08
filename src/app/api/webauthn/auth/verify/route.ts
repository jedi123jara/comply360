/**
 * POST /api/webauthn/auth/verify
 *
 * Verifica el AuthenticationResponseJSON del navegador contra el credential
 * registrado del usuario. Sólo se llama cuando el worker tiene passkeys
 * (caso fuerte). El endpoint de firma (boletas/contratos) puede llamar este
 * verify primero y luego marcar el documento como firmado, en lugar del
 * flow legacy de solo-challenge-JWT.
 *
 * Flujo end-to-end de una firma fuerte:
 *   1. Cliente: POST /api/webauthn/auth/options con {action, entityId}
 *      → recibe `options` + `challengeToken`
 *   2. Cliente: navigator.credentials.get(options) → AuthenticationResponseJSON
 *   3. Cliente: POST /api/webauthn/auth/verify con {response, challenge,
 *      challengeToken, action, entityId}
 *      → server valida assertion + incrementa counter
 *   4. Cliente: POST /api/mi-portal/(boletas|contratos)/[id]/firmar/aceptar
 *      con `signatureLevel: 'BIOMETRIC'` y refs al verify previo
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { verifyChallenge, type ChallengeAction } from '@/lib/webauthn-server'
import { verifyAndUpdateAuthentication } from '@/lib/webauthn-credentials'
import { logAudit } from '@/lib/audit'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

const VALID_ACTIONS: ChallengeAction[] = ['sign_contract', 'sign_payslip', 'vote_committee']

export const POST = withWorkerAuth(async (req, ctx) => {
  let body: {
    action?: string
    entityId?: string
    challengeToken?: string
    challenge?: string
    response?: AuthenticationResponseJSON
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const action = body.action as ChallengeAction | undefined
  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'action inválida' }, { status: 400 })
  }
  if (!body.entityId || !body.challengeToken || !body.challenge || !body.response) {
    return NextResponse.json(
      { error: 'entityId, challengeToken, challenge y response son requeridos' },
      { status: 400 },
    )
  }

  // 1. Validar JWT challenge
  const challengeOk = verifyChallenge({
    token: body.challengeToken,
    challenge: body.challenge,
    workerId: ctx.workerId,
    action,
    entityId: body.entityId,
  })
  if (!challengeOk.valid) {
    return NextResponse.json(
      { error: `Challenge inválido: ${challengeOk.reason}` },
      { status: 400 },
    )
  }

  // 2. Resolver userId del worker
  const worker = await prisma.worker.findUnique({
    where: { id: ctx.workerId },
    select: { userId: true },
  })
  if (!worker?.userId) {
    return NextResponse.json(
      { error: 'Worker sin user vinculado' },
      { status: 400 },
    )
  }

  // 3. Verificar assertion contra credential registrado
  const result = await verifyAndUpdateAuthentication({
    userId: worker.userId,
    expectedChallenge: body.challenge,
    response: body.response,
  })

  if (!result.verified) {
    await logAudit({
      orgId: ctx.orgId ?? 'system',
      userId: worker.userId,
      action: 'webauthn.assertion.failed',
      entityType: 'WebAuthnCredential',
      entityId: body.response.id,
      metadata: {
        reason: result.reason,
        targetAction: action,
        targetEntityId: body.entityId,
        ip: req.headers.get('x-forwarded-for') ?? '',
        userAgent: req.headers.get('user-agent') ?? '',
      },
    })
    return NextResponse.json({ error: result.reason }, { status: 400 })
  }

  await logAudit({
    orgId: ctx.orgId ?? 'system',
    userId: worker.userId,
    action: 'webauthn.assertion.verified',
    entityType: 'WebAuthnCredential',
    entityId: result.credentialId,
    metadata: {
      targetAction: action,
      targetEntityId: body.entityId,
      ip: req.headers.get('x-forwarded-for') ?? '',
      userAgent: req.headers.get('user-agent') ?? '',
    },
  })

  return NextResponse.json({
    verified: true,
    credentialId: result.credentialId,
  })
})
