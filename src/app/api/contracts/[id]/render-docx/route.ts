import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { ContractRenderError, renderContractDocxBuffer } from '@/lib/contracts/rendering'
import {
  resolveContractAnnexCoverage,
  withContractAnnexCoverageMetadata,
} from '@/lib/contracts/annex-coverage'
import {
  isContractQualityPassing,
  readContractRenderQualityMetadata,
  runContractQualityGate,
  withContractQualityMetadata,
} from '@/lib/contracts/quality-gate'
import { runValidationPipeline } from '@/lib/contracts/validation/engine'

// =============================================
// GET /api/contracts/[id]/render-docx
// Genera y devuelve un .docx REAL (OOXML) del contrato actual.
// Usa el `contentHtml` como fuente de verdad — html-to-docx convierte
// h1/h2/h3, p, ul/ol, table y formato inline a OOXML auténtico.
//
// Para flujos con plantilla .docx personalizada (Fase 2.5 zero-liability),
// la app debería usar /api/org-templates/:id/generate (existing) — este
// endpoint es el "default" cuando el contrato no tiene plantilla asociada.
// =============================================
export const GET = withPlanGateParams<{ id: string }>('contratos', async (req: NextRequest, ctx: AuthContext, params) => {
  const contract = await prisma.contract.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    select: {
      id: true,
      title: true,
      type: true,
      contentHtml: true,
      contentJson: true,
      formData: true,
      aiReviewedAt: true,
      organization: { select: { name: true, razonSocial: true } },
      createdBy: { select: { firstName: true, lastName: true } },
    },
  })

  if (!contract) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  if (!contract.contentHtml || contract.contentHtml.trim().length === 0) {
    return NextResponse.json(
      { error: 'El contrato no tiene contenido para renderizar.' },
      { status: 422 },
    )
  }

  await runValidationPipeline(contract.id, ctx.orgId, {
    triggeredBy: ctx.userId,
    trigger: 'manual',
  })
  const blockers = await prisma.contractValidation.findMany({
    where: {
      contractId: contract.id,
      orgId: ctx.orgId,
      severity: 'BLOCKER',
      passed: false,
      acknowledged: false,
    },
    select: {
      ruleCode: true,
      message: true,
      rule: { select: { title: true, legalBasis: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  const renderMetadata = readContractRenderQualityMetadata(contract.contentJson, contract.formData)
  const annexCoverage = await resolveContractAnnexCoverage({
    contractId: contract.id,
    orgId: ctx.orgId,
    contentJson: contract.contentJson,
  })
  const contentJsonWithAnnexCoverage = withContractAnnexCoverageMetadata(contract.contentJson, annexCoverage)
  const quality = runContractQualityGate({
    id: contract.id,
    type: contract.type,
    title: contract.title,
    contentHtml: contract.contentHtml,
    contentJson: contentJsonWithAnnexCoverage,
    formData: contract.formData as Record<string, unknown> | null,
    provenance: renderMetadata.provenance,
    renderVersion: renderMetadata.renderVersion,
    isFallback: renderMetadata.isFallback,
    aiReviewedAt: contract.aiReviewedAt,
    annexCoverage,
    validationBlockers: blockers.map((blocker) => ({
      ruleCode: blocker.ruleCode,
      title: blocker.rule.title,
      legalBasis: blocker.rule.legalBasis,
      message: blocker.message,
    })),
  })
  await prisma.contract.update({
    where: { id: contract.id, orgId: ctx.orgId },
    data: {
      contentJson: withContractQualityMetadata(contentJsonWithAnnexCoverage, quality) as object,
    },
    select: { id: true },
  })
  if (!isContractQualityPassing(quality)) {
    return NextResponse.json(
      {
        error: 'El contrato no pasa el control de calidad legal premium.',
        code: 'DOCUMENT_QUALITY_BLOCKED',
        quality,
      },
      { status: 422 },
    )
  }

  try {
    const buffer = await renderContractDocxBuffer({
      title: contract.title,
      contractType: contract.type,
      sourceKind: 'html-based',
      contentHtml: contract.contentHtml,
      formData: (contract.formData ?? {}) as Record<string, unknown>,
      contentJson: contentJsonWithAnnexCoverage,
      orgContext: {
        name: contract.organization.name,
        razonSocial: contract.organization.razonSocial,
      },
    })

    await logAudit({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'contract.docx.rendered',
      entityType: 'Contract',
      entityId: params.id,
      metadata: { byteLength: buffer.byteLength },
    })

    const fileName = sanitizeFileName(`${contract.title}.docx`)
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    if (err instanceof ContractRenderError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          details: err.details,
        },
        { status: 422 },
      )
    }
    console.error('[GET /api/contracts/:id/render-docx]', err)
    return NextResponse.json({ error: 'No se pudo generar el .docx' }, { status: 500 })
  }
})

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9 ._-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

