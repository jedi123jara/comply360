import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { ContractRenderError, renderContractPdfBuffer } from '@/lib/contracts/rendering'
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
// GET /api/contracts/[id]/pdf — Download contract as PDF
// =============================================
export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, params) => {
    const orgId = ctx.orgId

    const contract = await prisma.contract.findFirst({
      where: { id: params.id, orgId },
      select: {
        id: true,
        title: true,
        type: true,
        contentHtml: true,
        contentJson: true,
        formData: true,
        aiReviewedAt: true,
        organization: {
          select: { name: true, razonSocial: true, ruc: true, logoUrl: true },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
    }

    const org = contract.organization
    const formData = (contract.formData ?? {}) as Record<string, string | number | null>
    await runValidationPipeline(contract.id, orgId, {
      triggeredBy: ctx.userId,
      trigger: 'manual',
    })
    const blockers = await prisma.contractValidation.findMany({
      where: {
        contractId: contract.id,
        orgId,
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
      orgId,
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
      where: { id: contract.id, orgId },
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

    const trabajadorNombre =
      typeof formData.trabajador_nombre === 'string' ? formData.trabajador_nombre : ''
    const trabajadorDni =
      typeof formData.trabajador_dni === 'string' ? formData.trabajador_dni : ''
    const fechaInicio =
      typeof formData.fecha_inicio === 'string' ? formData.fecha_inicio : null

    let buffer: Buffer
    try {
      buffer = await renderContractPdfBuffer({
        title: contract.title || 'Contrato',
        contractType: contract.type,
        sourceKind: 'html-based',
        contentHtml: contract.contentHtml,
        contentJson: contentJsonWithAnnexCoverage,
        formData,
        orgContext: {
          name: org?.name,
          razonSocial: org?.razonSocial,
          ruc: org?.ruc,
          logoUrl: org?.logoUrl,
        },
        workerContext: {
          fullName: trabajadorNombre,
          dni: trabajadorDni,
          fechaIngreso: fechaInicio,
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
      console.error('[GET /api/contracts/:id/pdf]', err)
      return NextResponse.json({ error: 'No se pudo generar el PDF' }, { status: 500 })
    }

    const filename = `contrato-${contract.id.slice(-8)}.pdf`
    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Content-Length': String(buffer.byteLength),
        'Cache-Control': 'no-store',
      },
    })
  },
)
