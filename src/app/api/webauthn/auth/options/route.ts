/**
 * POST /api/webauthn/auth/options
 *
 * Genera opciones de autenticación WebAuthn para el worker autenticado, con
 * `allowCredentials` filtrado a sus passkeys registradas. Reusa el JWT
 * challenge existente para que el endpoint de firma (boletas/contratos) lo
 * pueda validar como hasta ahora.
 *
 * Si el worker no tiene credentials registrados (legacy=false), retorna 404.
 * El cliente decide entonces si caer al flow legacy (challenge JWT only,
 * cuando WEBAUTHN_STRICT_VERIFY=false) o redirigir a /mi-portal/perfil para
 * enrolar.
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { buildAuthenticationOptions } from '@/lib/webauthn-credentials'
import { issueChallenge, type ChallengeAction } from '@/lib/webauthn-server'

const VALID_ACTIONS: ChallengeAction[] = ['sign_contract', 'sign_payslip', 'vote_committee']

export const POST = withWorkerAuth(async (req, ctx) => {
  let body: { action?: string; entityId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const action = body.action as ChallengeAction | undefined
  const entityId = body.entityId

  if (!action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json(
      { error: `action inválida. Valores: ${VALID_ACTIONS.join(', ')}` },
      { status: 400 },
    )
  }
  if (!entityId || typeof entityId !== 'string') {
    return NextResponse.json({ error: 'entityId requerido' }, { status: 400 })
  }

  // Verificación de permisos sobre la entidad (mismo patrón que /challenge)
  if (action === 'sign_contract') {
    const link = await prisma.workerContract.findFirst({
      where: { workerId: ctx.workerId, contractId: entityId },
      select: { id: true },
    })
    if (!link) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }
  } else if (action === 'sign_payslip') {
    const payslip = await prisma.payslip.findFirst({
      where: { id: entityId, workerId: ctx.workerId },
      select: { id: true },
    })
    if (!payslip) {
      return NextResponse.json({ error: 'Boleta no encontrada' }, { status: 404 })
    }
  }

  // Resolver userId del worker (cualquier credential está atado a User)
  const worker = await prisma.worker.findUnique({
    where: { id: ctx.workerId },
    select: { userId: true },
  })
  if (!worker?.userId) {
    return NextResponse.json(
      { error: 'Worker sin user vinculado — no se puede firmar' },
      { status: 400 },
    )
  }

  const options = await buildAuthenticationOptions({ userId: worker.userId })
  if (!options) {
    return NextResponse.json(
      { error: 'no_credentials', message: 'Sin passkeys registradas' },
      { status: 404 },
    )
  }

  // Reusamos el JWT challenge — el sub queda como workerId para que el
  // endpoint de firma valide igual que con el flow legacy.
  const issued = issueChallenge({
    workerId: ctx.workerId,
    action,
    entityId,
  })
  if (!issued) {
    return NextResponse.json(
      { error: 'WebAuthn no configurado' },
      { status: 503 },
    )
  }

  options.challenge = issued.challenge

  return NextResponse.json({
    options,
    challengeToken: issued.token,
    expiresIn: issued.expiresIn,
  })
})
