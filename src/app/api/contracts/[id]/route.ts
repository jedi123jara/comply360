import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import type { AuthContext } from '@/lib/auth'
import type { ContractStatus } from '@/generated/prisma/client'
import { emit } from '@/lib/events'

const VALID_STATUSES: ContractStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED', 'EXPIRED', 'ARCHIVED']

// =============================================
// GET /api/contracts/[id]
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    include: {
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      template: { select: { id: true, name: true, type: true, legalBasis: true } },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ data: contract })
})

// =============================================
// PATCH /api/contracts/[id] — update status, formData, AI review
// =============================================
export const PATCH = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const body = await req.json() as {
    status?: string
    formData?: Record<string, unknown>
    contentHtml?: string
    aiRiskScore?: number
    aiRisksJson?: unknown
    aiReviewedAt?: string
  }

  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  if (body.status && !VALID_STATUSES.includes(body.status as ContractStatus)) {
    return NextResponse.json({ error: `Estado invalido: ${body.status}` }, { status: 400 })
  }

  const updated = await prisma.contract.update({
    where: { id: params.id, orgId: ctx.orgId },
    data: {
      ...(body.status ? { status: body.status as ContractStatus } : {}),
      ...(body.formData !== undefined ? { formData: body.formData as Record<string, string | number | boolean | null> } : {}),
      ...(body.contentHtml !== undefined ? { contentHtml: body.contentHtml } : {}),
      ...(body.aiRiskScore !== undefined ? { aiRiskScore: body.aiRiskScore } : {}),
      ...(body.aiRisksJson !== undefined ? { aiRisksJson: body.aiRisksJson as object } : {}),
      ...(body.aiReviewedAt ? { aiReviewedAt: new Date(body.aiReviewedAt) } : {}),
      // Auto-set signedAt when transitioning to SIGNED
      ...(body.status === 'SIGNED' && contract.status !== 'SIGNED'
        ? { signedAt: new Date() }
        : {}),
    },
  })

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'contract.updated',
    entityType: 'Contract',
    entityId: params.id,
    metadata: {
      previousStatus: contract.status,
      newStatus: updated.status,
      fields: Object.keys(body).join(', '),
    },
  })

  // Re-validar fire-and-forget si cambiaron datos relevantes (formData / contenido).
  if (body.formData !== undefined || body.contentHtml !== undefined) {
    import('@/lib/contracts/validation/engine').then(({ runValidationPipelineFireAndForget }) => {
      runValidationPipelineFireAndForget(params.id, ctx.orgId, {
        triggeredBy: ctx.userId,
        trigger: 'update',
      })
    }).catch((err) => console.warn('[validation] re-validation failed:', err))

    // Versionado (Chunk 3) — appendar nueva versión al hash-chain.
    import('@/lib/contracts/versioning/service').then(({ createContractVersionFireAndForget }) => {
      createContractVersionFireAndForget({
        contractId: params.id,
        orgId: ctx.orgId,
        changedBy: ctx.userId,
        changeReason: body.formData !== undefined && body.contentHtml !== undefined
          ? 'Edición de datos y contenido'
          : body.contentHtml !== undefined
            ? 'Edición del contenido del contrato'
            : 'Edición de datos del contrato',
        contentHtml: body.contentHtml ?? updated.contentHtml,
        contentJson: updated.contentJson,
        formData: (body.formData ?? updated.formData) as Record<string, unknown> | null,
      })
    }).catch((err) => console.warn('[versioning] update version failed:', err))
  }

  // ── Onboarding cascade: si el contrato pasa a SIGNED, disparar para cada
  //    worker vinculado. Fire-and-forget: no bloqueamos la respuesta al admin.
  if (body.status === 'SIGNED' && contract.status !== 'SIGNED') {
    void triggerOnboardingCascadeForContract(params.id, ctx.orgId, ctx.userId)
    emit('contract.signed', {
      orgId: ctx.orgId,
      userId: ctx.userId,
      contractId: updated.id,
      signedAt: (updated.signedAt ?? new Date()).toISOString(),
      contractType: updated.type ?? undefined,
    })
  }

  return NextResponse.json({ data: updated })
})

/**
 * Dispara la cascada de onboarding para todos los workers vinculados a este
 * contrato. No bloquea la respuesta al cliente.
 */
async function triggerOnboardingCascadeForContract(
  contractId: string,
  orgId: string,
  userId: string,
): Promise<void> {
  try {
    const links = await prisma.workerContract.findMany({
      where: { contractId },
      select: { workerId: true },
    })
    if (links.length === 0) return

    // Lazy import para que no pese en el bundle si nunca se llama
    const { runOnboardingCascadeBatch } = await import('@/lib/onboarding/cascade')
    const workerIds = links.map((l) => l.workerId)
    const result = await runOnboardingCascadeBatch(workerIds, {
      triggeredBy: userId,
      contractId,
    })
    console.log('[contract.signed] cascade', {
      contractId,
      orgId,
      workers: workerIds.length,
      ...result.totals,
    })
  } catch (err) {
    console.error('[contract.signed] cascade failed', err)
  }
}

// =============================================
// DELETE /api/contracts/[id] — archive (soft delete)
// =============================================
export const DELETE = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  await prisma.contract.update({
    where: { id: params.id, orgId: ctx.orgId },
    data: { status: 'ARCHIVED' },
  })

  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'contract.archived',
    entityType: 'Contract',
    entityId: params.id,
    metadata: { previousStatus: contract.status },
  })

  return NextResponse.json({ success: true })
})
