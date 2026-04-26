/**
 * POST /api/ai/contract-fix
 *
 * Genera una versión CORREGIDA de un contrato laboral peruano con base en el
 * análisis previo del review (`/api/ai-review`).
 *
 * Único en el mercado peruano: en lugar de solo señalar problemas, reescribe
 * el contrato con las correcciones aplicadas (cláusulas obligatorias agregadas,
 * cláusulas inválidas reformuladas, base legal anotada).
 *
 * Plan gate: PRO (feature `review_ia`).
 * Quota IA: chequeo de budget USD antes de la llamada al provider.
 *
 * Body: { contractHtml, contractType, reviewResult }
 */

import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { prisma } from '@/lib/prisma'
import { generateFixedContract } from '@/lib/ai/contract-fix'
import { checkAiBudget } from '@/lib/ai/usage'
import type { ContractReviewResult } from '@/lib/ai/contract-review'

export const POST = withPlanGate('review_ia', async (req, ctx) => {
  let body: {
    contractHtml?: string
    contractType?: string
    reviewResult?: ContractReviewResult
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.contractHtml || typeof body.contractHtml !== 'string') {
    return NextResponse.json(
      { error: 'contractHtml es requerido', code: 'MISSING_HTML' },
      { status: 400 },
    )
  }
  if (!body.reviewResult) {
    return NextResponse.json(
      {
        error: 'reviewResult es requerido. Corre primero /api/ai-review.',
        code: 'MISSING_REVIEW',
      },
      { status: 400 },
    )
  }

  const contractType = body.contractType ?? 'INDEFINIDO'

  // Quota IA por org
  const org = await prisma.organization.findUnique({
    where: { id: ctx.orgId },
    select: { plan: true },
  })
  const budget = await checkAiBudget({ orgId: ctx.orgId, plan: org?.plan ?? 'PRO' })
  if (!budget.allowed) {
    return NextResponse.json(
      {
        error: 'Cuota IA mensual agotada',
        code: 'AI_QUOTA_EXCEEDED',
        spentUsd: budget.spentUsd,
        budgetUsd: budget.budgetUsd,
        message: `Has usado tu cuota de IA del mes (USD ${budget.spentUsd.toFixed(2)} de ${budget.budgetUsd}). Mejora tu plan para más correcciones IA.`,
        upgradeUrl: '/dashboard/planes',
      },
      { status: 429 },
    )
  }

  try {
    const result = await generateFixedContract({
      contractHtml: body.contractHtml,
      contractType,
      reviewResult: body.reviewResult,
      orgId: ctx.orgId,
      userId: ctx.userId,
    })

    // Audit log fire-and-forget
    void prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'ai.contract_fix',
          entityType: 'Contract',
          entityId: 'draft', // No persistimos el contrato; el cliente decide qué hacer
          metadataJson: {
            contractType,
            changesCount: result.changes.length,
            remainingRisks: result.remainingRisks,
            originalScore: body.reviewResult.overallScore,
          },
        },
      })
      .catch(() => null)

    return NextResponse.json({ success: true, data: result })
  } catch (err) {
    console.error('[contract-fix] Error:', err)
    return NextResponse.json(
      {
        error: 'No pudimos generar la versión corregida',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    )
  }
})
