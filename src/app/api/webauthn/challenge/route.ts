/**
 * POST /api/webauthn/challenge
 *
 * Emite un challenge server-side (JWT firmado) para una ceremonia WebAuthn
 * de firma biométrica. El cliente debe:
 *   1. Pedir el challenge con `{ action, entityId }`.
 *   2. Correr la ceremonia WebAuthn con los bytes de `challenge`
 *      (`base64url` → `Uint8Array`).
 *   3. Enviar el `token` recibido junto con el payload de firma al endpoint
 *      de firma (`/api/mi-portal/contratos/[id]/firmar` o
 *      `/api/mi-portal/boletas/[id]/aceptar`).
 *
 * Solo accesible por workers autenticados (rol WORKER). El challenge valida
 * que el worker tenga permisos sobre la entidad antes de emitirlo.
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { issueChallenge, type ChallengeAction } from '@/lib/webauthn-server'

const VALID_ACTIONS: ChallengeAction[] = ['sign_contract', 'sign_payslip', 'sign_doc_acknowledgment']

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

  // ── Verificación de permisos sobre la entidad ───────────────────────────
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
  } else if (action === 'sign_doc_acknowledgment') {
    // Verificar que el doc requiera ack y que el worker esté en scope.
    // El scopeFilter ya se verifica en el endpoint de acknowledgment al firmar,
    // aquí solo confirmamos que el doc existe + requiere ack.
    const doc = await prisma.orgDocument.findFirst({
      where: { id: entityId, orgId: ctx.orgId, acknowledgmentRequired: true },
      select: { id: true },
    })
    if (!doc) {
      return NextResponse.json({ error: 'Documento no encontrado o no requiere firma' }, { status: 404 })
    }
  }

  const issued = issueChallenge({
    workerId: ctx.workerId,
    action,
    entityId,
  })

  if (!issued) {
    return NextResponse.json(
      { error: 'WebAuthn server-side no configurado (falta WEBAUTHN_CHALLENGE_SECRET)' },
      { status: 503 },
    )
  }

  return NextResponse.json(issued)
})
