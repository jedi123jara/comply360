/**
 * POST /api/orgchart/copilot
 *
 * Copiloto IA del Organigrama. Toma un prompt en lenguaje natural y devuelve
 * un plan estructurado de operaciones que el cliente puede previsualizar
 * antes de aplicar.
 *
 *   POST { intent: 'plan', prompt: string }
 *     → Genera plan con LLM + valida + devuelve para preview
 *
 *   POST { intent: 'apply', plan: CopilotPlan }
 *     → Aplica plan dentro de transacción Prisma
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { withRole } from '@/lib/api-auth'
import { generateCopilotPlan } from '@/lib/orgchart/copilot/generate-plan'
import { applyCopilotPlan } from '@/lib/orgchart/copilot/apply-plan'
import { validateCopilotPlan } from '@/lib/orgchart/copilot/validate-plan'
import { copilotPlanSchema } from '@/lib/orgchart/copilot/operations'
import { silentLog } from '@/lib/orgchart/_v2-utils/silent-log'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 30

const planSchema = z.object({
  intent: z.literal('plan'),
  prompt: z.string().min(3).max(2000),
})

const applySchema = z.object({
  intent: z.literal('apply'),
  plan: copilotPlanSchema,
})

const requestSchema = z.discriminatedUnion('intent', [planSchema, applySchema])

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const json = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (parsed.data.intent === 'plan') {
    // Cargar contexto en paralelo
    const [units, positions, workers] = await Promise.all([
      prisma.orgUnit.findMany({
        where: { orgId: ctx.orgId, isActive: true, validTo: null },
        select: { id: true, name: true, kind: true, parentId: true },
        take: 200,
      }),
      prisma.orgPosition.findMany({
        where: { orgId: ctx.orgId, validTo: null },
        select: {
          id: true,
          title: true,
          orgUnitId: true,
          reportsToPositionId: true,
        },
        take: 300,
      }),
      prisma.worker.findMany({
        where: { orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true, firstName: true, lastName: true },
        take: 200,
      }),
    ])

    const result = await generateCopilotPlan(parsed.data.prompt, {
      units: units.map((u) => ({
        id: u.id,
        name: u.name,
        kind: u.kind as string,
        parentId: u.parentId,
      })),
      positions: positions.map((p) => ({
        id: p.id,
        title: p.title,
        unitId: p.orgUnitId,
        reportsToPositionId: p.reportsToPositionId,
      })),
      workers: workers.map((w) => ({
        id: w.id,
        firstName: w.firstName,
        lastName: w.lastName,
      })),
      workerCount: workers.length,
    })

    if (result.error) {
      return NextResponse.json(
        { error: result.error, warnings: result.warnings },
        { status: 422 },
      )
    }

    return NextResponse.json({
      plan: result.plan,
      warnings: result.warnings,
    })
  }

  // intent === 'apply'
  // Re-validar el plan contra IDs reales para defender de tampering
  const [unitIds, positionIds, workerIds] = await Promise.all([
    prisma.orgUnit
      .findMany({ where: { orgId: ctx.orgId }, select: { id: true } })
      .then((rs) => new Set(rs.map((r) => r.id))),
    prisma.orgPosition
      .findMany({ where: { orgId: ctx.orgId }, select: { id: true } })
      .then((rs) => new Set(rs.map((r) => r.id))),
    prisma.worker
      .findMany({ where: { orgId: ctx.orgId }, select: { id: true } })
      .then((rs) => new Set(rs.map((r) => r.id))),
  ])
  const validation = validateCopilotPlan(parsed.data.plan, {
    unitIds,
    positionIds,
    workerIds,
  })
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Plan inválido', details: validation.errors },
      { status: 400 },
    )
  }

  try {
    const result = await applyCopilotPlan(ctx.orgId, parsed.data.plan)

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'orgchart.copilot_applied',
          metadataJson: {
            rationale: parsed.data.plan.rationale,
            ops: parsed.data.plan.operations.length,
            unitsCreated: result.unitsCreated,
            positionsCreated: result.positionsCreated,
            workersAssigned: result.workersAssigned,
          } as object,
        },
      })
      .catch(silentLog('orgchart.copilot.audit_log_failed', {
        orgId: ctx.orgId,
        userId: ctx.userId,
      }))

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error aplicando plan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
