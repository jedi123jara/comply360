/**
 * POST /api/mi-portal/boletas/[id]/aceptar
 *
 * El trabajador acepta una boleta de pago desde su portal.
 *
 * Body (opcional, todo default-seguro):
 *   {
 *     signatureLevel?: 'SIMPLE' | 'BIOMETRIC',    // default SIMPLE
 *     credentialId?: string,                       // ID del credential WebAuthn
 *     userAgent?: string,
 *     challengeToken?: string,                     // JWT emitido por /api/webauthn/challenge
 *     challenge?: string,                          // base64url original del challenge
 *   }
 *
 * Si `signatureLevel === 'BIOMETRIC'`, se exige challengeToken + challenge
 * válidos. El server verifica que el token coincida con (workerId, action,
 * entityId, challenge) y que no haya expirado (5 min).
 */

import { NextRequest, NextResponse } from 'next/server'
import { withWorkerAuthParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { verifyChallenge } from '@/lib/webauthn-server'
import { emit } from '@/lib/events'

type SignatureLevel = 'SIMPLE' | 'BIOMETRIC'

export const POST = withWorkerAuthParams<{ id: string }>(async (req: NextRequest, ctx, params) => {
  let body: {
    signatureLevel?: SignatureLevel
    credentialId?: string
    userAgent?: string
    challengeToken?: string
    challenge?: string
  } = {}
  try {
    const text = await req.text()
    if (text) body = JSON.parse(text)
  } catch {
    // Body vacío es aceptable — aceptación legacy sin payload.
  }

  const signatureLevel: SignatureLevel = body.signatureLevel ?? 'SIMPLE'

  // ── Verify payslip exists and is pending ───────────────────────────────────
  const payslip = await prisma.payslip.findFirst({
    where: { id: params.id, workerId: ctx.workerId, orgId: ctx.orgId },
  })

  if (!payslip) {
    return NextResponse.json({ error: 'Boleta no encontrada' }, { status: 404 })
  }

  if (payslip.status === 'ANULADA') {
    return NextResponse.json({ error: 'No se puede aceptar una boleta anulada' }, { status: 400 })
  }

  if (payslip.acceptedAt) {
    return NextResponse.json({ error: 'Esta boleta ya fue aceptada' }, { status: 400 })
  }

  // ── WebAuthn challenge verification (BIOMETRIC only) ───────────────────────
  if (signatureLevel === 'BIOMETRIC') {
    if (!body.challengeToken || !body.challenge) {
      return NextResponse.json(
        { error: 'challengeToken y challenge son requeridos para firma biométrica' },
        { status: 400 },
      )
    }
    const outcome = verifyChallenge({
      token: body.challengeToken,
      challenge: body.challenge,
      workerId: ctx.workerId,
      action: 'sign_payslip',
      entityId: params.id,
    })
    if (!outcome.valid) {
      return NextResponse.json(
        { error: `Challenge inválido: ${outcome.reason}` },
        { status: 400 },
      )
    }
  }

  // ── Commit ─────────────────────────────────────────────────────────────────
  const now = new Date()
  const userAgent = body.userAgent ?? req.headers.get('user-agent') ?? null
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null

  const updated = await prisma.payslip.update({
    where: { id: payslip.id },
    data: {
      status: 'ACEPTADA',
      acceptedAt: now,
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'payslip.accepted',
        entityType: 'Payslip',
        entityId: updated.id,
        ipAddress,
        metadataJson: {
          periodo: updated.periodo,
          signatureLevel,
          credentialId: body.credentialId ?? null,
          userAgent,
          challengeVerified: signatureLevel === 'BIOMETRIC',
        },
      },
    })
    .catch(() => null)

  // Event bus: notifica al admin + workflows enganchados
  emit('payslip.accepted', {
    orgId: ctx.orgId,
    userId: ctx.userId,
    payslipId: updated.id,
    workerId: ctx.workerId,
    periodo: updated.periodo,
    signatureLevel,
  })

  return NextResponse.json({
    id: updated.id,
    periodo: updated.periodo,
    fechaEmision: updated.fechaEmision.toISOString(),
    totalIngresos: updated.totalIngresos.toString(),
    totalDescuentos: updated.totalDescuentos.toString(),
    netoPagar: updated.netoPagar.toString(),
    status: updated.status,
    pdfUrl: updated.pdfUrl,
    acceptedAt: updated.acceptedAt?.toISOString() ?? null,
    signatureLevel,
  })
})
