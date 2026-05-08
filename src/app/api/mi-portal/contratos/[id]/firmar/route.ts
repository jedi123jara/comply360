/**
 * POST /api/mi-portal/contratos/[id]/firmar
 *
 * El trabajador firma un contrato desde su portal.
 *
 * Body:
 *   {
 *     signatureLevel: 'SIMPLE' | 'BIOMETRIC',
 *     userAgent?: string,
 *     credentialId?: string  // ID del credential WebAuthn (opcional, para audit)
 *   }
 *
 * Efectos:
 *   - Valida que el contrato esté vinculado al worker
 *   - Valida estado firmable (DRAFT / IN_REVIEW / APPROVED)
 *   - Persiste `signatureLevel` en `Contract.formData._signature`
 *   - Setea `signedAt` y `status=SIGNED`
 *   - Registra firma en `AuditLog` con userAgent + IP
 *   - **Dispara la cascada de onboarding** (fire-and-forget):
 *     publica docs de la empresa, pide legajo, envía email
 *
 * Notas de validez legal:
 *   - SIMPLE (checkbox "acepto"): firma electrónica básica. Válida entre partes
 *     pero con menor valor probatorio.
 *   - BIOMETRIC (Touch ID / huella / Windows Hello): firma electrónica
 *     **fuerte**. El sensor del dispositivo validó al firmante localmente
 *     — ni nosotros ni el navegador vemos la biometría cruda.
 *   - CERTIFIED (RENIEC) queda para un sprint futuro cuando integremos el SDK.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withWorkerAuthParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { verifyChallenge } from '@/lib/webauthn-server'
import { emit } from '@/lib/events'

export const runtime = 'nodejs'

type SignatureLevel = 'SIMPLE' | 'BIOMETRIC'
const VALID_LEVELS: SignatureLevel[] = ['SIMPLE', 'BIOMETRIC']

export const POST = withWorkerAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx,
  params,
) => {
  // ── Parse body ────────────────────────────────────────────────────────────
  let body: {
    signatureLevel?: SignatureLevel
    userAgent?: string
    credentialId?: string
    challengeToken?: string
    challenge?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const signatureLevel: SignatureLevel = body.signatureLevel ?? 'SIMPLE'
  if (!VALID_LEVELS.includes(signatureLevel)) {
    return NextResponse.json(
      { error: `signatureLevel inválido. Válidos: ${VALID_LEVELS.join(', ')}` },
      { status: 400 },
    )
  }

  // ── WebAuthn challenge verification (BIOMETRIC only) ──────────────────────
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
      action: 'sign_contract',
      entityId: params.id,
    })
    if (!outcome.valid) {
      return NextResponse.json(
        { error: `Challenge inválido: ${outcome.reason}` },
        { status: 400 },
      )
    }
  }

  // ── Verificar vínculo + estado ────────────────────────────────────────────
  const link = await prisma.workerContract.findFirst({
    where: { workerId: ctx.workerId, contractId: params.id },
    include: {
      contract: {
        select: {
          id: true,
          orgId: true,
          title: true,
          status: true,
          signedAt: true,
          formData: true,
        },
      },
    },
  })

  if (!link) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const contract = link.contract

  // Defensa: orgId del contract debe coincidir con orgId del worker (ya validado
  // por withWorkerAuthParams, pero doble check)
  if (contract.orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
  }

  if (contract.status === 'SIGNED') {
    return NextResponse.json(
      { error: 'Este contrato ya fue firmado', signedAt: contract.signedAt?.toISOString() ?? null },
      { status: 409 },
    )
  }

  if (!['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(contract.status)) {
    return NextResponse.json(
      { error: `Contrato en estado ${contract.status} no puede ser firmado` },
      { status: 400 },
    )
  }

  // ── Construir metadata de firma ───────────────────────────────────────────
  // FIX #4.I: userAgent siempre del header, NO del body (que el cliente
  // puede manipular para falsificar el audit trail).
  const now = new Date()
  const userAgent = req.headers.get('user-agent') ?? null
  const ipAddress =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null

  const signatureRecord = {
    level: signatureLevel,
    signedAt: now.toISOString(),
    signedBy: ctx.workerId,
    signedByUserId: ctx.userId,
    userAgent,
    ipAddress,
    credentialId: body.credentialId ?? null,
    challengeVerified: signatureLevel === 'BIOMETRIC',
  }

  // Fusionar en formData sin pisar el resto
  const currentFormData =
    (contract.formData ?? {}) as Record<string, unknown>
  const nextFormData = {
    ...currentFormData,
    _signature: signatureRecord,
  } as Record<string, string | number | boolean | null | object>

  // ── Update + cascade trigger ──────────────────────────────────────────────
  const updated = await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: 'SIGNED',
      signedAt: now,
      formData: nextFormData,
    },
    select: {
      id: true,
      title: true,
      status: true,
      signedAt: true,
    },
  })

  // Audit log
  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'contract.signed_by_worker',
        entityType: 'Contract',
        entityId: contract.id,
        ipAddress,
        metadataJson: {
          workerId: ctx.workerId,
          signatureLevel,
          userAgent,
          credentialId: body.credentialId ?? null,
        },
      },
    })
    .catch((err) => {
      console.error('[contract.firmar] audit log failed', err)
    })

  // ── Trigger cascade (fire-and-forget) ─────────────────────────────────────
  void triggerCascade(ctx.workerId, contract.id, ctx.userId)

  // Event bus: workflows y gamificación se enganchan acá
  emit('contract.signed', {
    orgId: ctx.orgId,
    userId: ctx.userId,
    contractId: contract.id,
    workerId: ctx.workerId,
    signedAt: now.toISOString(),
    signatureLevel,
  })

  return NextResponse.json({
    data: {
      id: updated.id,
      title: updated.title,
      status: updated.status,
      signedAt: updated.signedAt?.toISOString(),
      signatureLevel,
    },
    message:
      signatureLevel === 'BIOMETRIC'
        ? 'Contrato firmado con biometría. Recibirás un email con tus próximos pasos.'
        : 'Contrato aceptado. Recibirás un email con tus próximos pasos.',
  })
})

/**
 * Dispara la cascada de onboarding. Lazy import para no pesar en el bundle
 * si el worker solo está listando contratos.
 */
async function triggerCascade(
  workerId: string,
  contractId: string,
  userId: string,
): Promise<void> {
  try {
    const { runOnboardingCascade } = await import('@/lib/onboarding/cascade')
    const result = await runOnboardingCascade(workerId, {
      triggeredBy: userId,
      contractId,
    })
    console.log('[contract.firmar] cascade result', {
      workerId,
      contractId,
      success: result.success,
      skipped: result.skipped,
      requestsCreated: result.requestsCreated,
      emailSent: result.emailSent,
    })
  } catch (err) {
    console.error('[contract.firmar] cascade failed', err)
  }
}
