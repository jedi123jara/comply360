import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import { logAudit } from '@/lib/audit'
import type { AuthContext } from '@/lib/auth'
import type { ContractStatus } from '@/generated/prisma/client'

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

  return NextResponse.json({ data: updated })
})

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
