import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import type { AuthContext } from '@/lib/auth'
import type { ContractStatus } from '@/generated/prisma/client'
import { emit } from '@/lib/events'
import { runValidationPipeline } from '@/lib/contracts/validation/engine'
import {
  resolveContractAnnexCoverage,
  withContractAnnexCoverageMetadata,
} from '@/lib/contracts/annex-coverage'
import {
  isContractQualityPassing,
  readContractRenderQualityMetadata,
  runContractQualityGate,
  withContractQualityMetadata,
  type ContractQualityResult,
} from '@/lib/contracts/quality-gate'

const VALID_STATUSES: ContractStatus[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'SIGNED', 'EXPIRED', 'ARCHIVED']

// =============================================
// GET /api/contracts/[id]
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: {
      id: true,
      orgId: true,
      createdById: true,
      templateId: true,
      type: true,
      status: true,
      title: true,
      formData: true,
      contentJson: true,
      contentHtml: true,
      docxUrl: true,
      pdfUrl: true,
      expiresAt: true,
      signedAt: true,
      aiRiskScore: true,
      aiRisksJson: true,
      aiReviewedAt: true,
      createdAt: true,
      updatedAt: true,
      createdBy: { select: { firstName: true, lastName: true, email: true } },
      template: { select: { id: true, name: true, type: true, legalBasis: true } },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ data: withDerivedRenderMetadata(contract) })
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
    select: {
      id: true,
      orgId: true,
      status: true,
      title: true,
      type: true,
      formData: true,
      contentJson: true,
      contentHtml: true,
      aiReviewedAt: true,
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  if (body.status && !VALID_STATUSES.includes(body.status as ContractStatus)) {
    return NextResponse.json({ error: `Estado invalido: ${body.status}` }, { status: 400 })
  }

  let transitionQuality: ContractQualityResult | null = null
  let transitionContentJson: Record<string, unknown> | null = null
  const isLegalEmissionTransition = body.status === 'APPROVED' || body.status === 'SIGNED'
  if (isLegalEmissionTransition && body.status !== contract.status) {
    await runValidationPipeline(params.id, ctx.orgId, {
      triggeredBy: ctx.userId,
      trigger: body.status === 'SIGNED' ? 'sign' : 'manual',
    })
    const blockers = await prisma.contractValidation.findMany({
      where: {
        contractId: params.id,
        orgId: ctx.orgId,
        severity: 'BLOCKER',
        passed: false,
        acknowledged: false,
      },
      select: {
        id: true,
        ruleCode: true,
        message: true,
        rule: {
          select: {
            title: true,
            legalBasis: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    const nextContentHtml = body.contentHtml ?? contract.contentHtml
    const nextFormData = (body.formData ?? contract.formData) as Record<string, unknown> | null
    const renderMetadata = readContractRenderQualityMetadata(contract.contentJson, nextFormData)
    const annexCoverage = await resolveContractAnnexCoverage({
      contractId: contract.id,
      orgId: ctx.orgId,
      contentJson: contract.contentJson,
    })
    const contentJsonWithAnnexCoverage = withContractAnnexCoverageMetadata(contract.contentJson, annexCoverage)
    transitionContentJson = contentJsonWithAnnexCoverage
    transitionQuality = runContractQualityGate({
      id: contract.id,
      type: contract.type,
      status: body.status,
      title: contract.title,
      contentHtml: nextContentHtml,
      contentJson: contentJsonWithAnnexCoverage,
      formData: nextFormData,
      provenance: renderMetadata.provenance,
      renderVersion: renderMetadata.renderVersion,
      isFallback: renderMetadata.isFallback,
      aiReviewedAt: body.aiReviewedAt ? new Date(body.aiReviewedAt) : contract.aiReviewedAt,
      annexCoverage,
      validationBlockers: blockers.map((b) => ({
        ruleCode: b.ruleCode,
        title: b.rule.title,
        legalBasis: b.rule.legalBasis,
        message: b.message,
      })),
    })
    if (!isContractQualityPassing(transitionQuality)) {
      await prisma.contract.update({
        where: { id: params.id, orgId: ctx.orgId },
        data: {
          contentJson: withContractQualityMetadata(contentJsonWithAnnexCoverage, transitionQuality) as object,
        },
        select: { id: true },
      })
      return NextResponse.json(
        {
          error: body.status === 'SIGNED'
            ? 'No se puede firmar el contrato: no pasa el control de calidad legal premium.'
            : 'No se puede aprobar el contrato: no pasa el control de calidad legal premium.',
          code: 'DOCUMENT_QUALITY_BLOCKED',
          quality: transitionQuality,
        },
        { status: 422 },
      )
    }
  }

  const updated = await prisma.contract.update({
    where: { id: params.id, orgId: ctx.orgId },
    data: {
      ...(body.status ? { status: body.status as ContractStatus } : {}),
      ...(body.formData !== undefined ? { formData: body.formData as Record<string, string | number | boolean | null> } : {}),
      ...(body.contentHtml !== undefined ? { contentHtml: body.contentHtml } : {}),
      ...(transitionQuality
        ? { contentJson: withContractQualityMetadata(transitionContentJson ?? contract.contentJson, transitionQuality) as object }
        : {}),
      ...(body.aiRiskScore !== undefined ? { aiRiskScore: body.aiRiskScore } : {}),
      ...(body.aiRisksJson !== undefined ? { aiRisksJson: body.aiRisksJson as object } : {}),
      ...(body.aiReviewedAt ? { aiReviewedAt: new Date(body.aiReviewedAt) } : {}),
      // Auto-set signedAt when transitioning to SIGNED
      ...(body.status === 'SIGNED' && contract.status !== 'SIGNED'
        ? { signedAt: new Date() }
        : {}),
    },
    select: {
      id: true,
      orgId: true,
      createdById: true,
      templateId: true,
      type: true,
      status: true,
      title: true,
      formData: true,
      contentJson: true,
      contentHtml: true,
      docxUrl: true,
      pdfUrl: true,
      expiresAt: true,
      signedAt: true,
      aiRiskScore: true,
      aiRisksJson: true,
      aiReviewedAt: true,
      createdAt: true,
      updatedAt: true,
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

  return NextResponse.json({ data: withDerivedRenderMetadata(updated) })
})

function withDerivedRenderMetadata<T extends {
  contentJson: unknown
  formData: unknown
}>(contract: T): T & {
  provenance: string
  generationMode: string
  renderVersion: string | null
  isFallback: boolean
} {
  const contentJson = isRecord(contract.contentJson) ? contract.contentJson : {}
  const formData = isRecord(contract.formData) ? contract.formData : {}
  const renderMetadata = isRecord(contentJson.renderMetadata) ? contentJson.renderMetadata : {}
  const provenance = firstString(
    contentJson.provenance,
    formData._provenance,
    renderMetadata.provenance,
    'LEGACY',
  )
  const generationMode = firstString(
    contentJson.generationMode,
    formData._generationMode,
    renderMetadata.generationMode,
    provenance === 'LEGACY' ? 'legacy' : 'deterministic',
  )
  const renderVersion = firstStringOrNull(
    contentJson.renderVersion,
    formData._renderVersion,
    renderMetadata.renderVersion,
  )
  return {
    ...contract,
    provenance,
    generationMode,
    renderVersion,
    isFallback: firstBoolean(contentJson.isFallback, formData._isFallback, renderMetadata.isFallback),
  }
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value
  }
  return 'LEGACY'
}

function firstStringOrNull(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.length > 0) return value
  }
  return null
}

function firstBoolean(...values: unknown[]): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') return value
  }
  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

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
    select: { id: true, status: true },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  await prisma.contract.update({
    where: { id: params.id, orgId: ctx.orgId },
    data: { status: 'ARCHIVED' },
    select: { id: true },
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
