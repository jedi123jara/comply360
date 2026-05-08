import { NextRequest, NextResponse } from 'next/server'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

export const POST = withPlanGateParams<{ id: string }>('contratos', 
  async (_req: NextRequest, ctx: AuthContext, params) => {
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
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
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

    const contentJson = withContractQualityMetadata(contentJsonWithAnnexCoverage, quality)
    await prisma.contract.update({
      where: { id: contract.id, orgId: ctx.orgId },
      data: { contentJson: contentJson as object },
      select: { id: true },
    })

    return NextResponse.json({
      data: {
        contractId: contract.id,
        quality,
        annexCoverage,
        passing: isContractQualityPassing(quality),
      },
    })
  },
)

