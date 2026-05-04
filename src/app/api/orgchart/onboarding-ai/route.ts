/**
 * POST /api/orgchart/onboarding-ai
 *
 * Endpoints del wizard "Tu organigrama en 60 segundos".
 *
 *   POST { intent: 'preview', input: OnboardingInput }
 *     → Genera propuesta IA + valida + devuelve preview (no aplica nada)
 *
 *   POST { intent: 'apply', input: OnboardingInput, proposal: OnboardingProposal }
 *     → Aplica una propuesta ya generada (idempotente: reutiliza unidades existentes)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { withRole } from '@/lib/api-auth'
import { generateOrgProposal } from '@/lib/orgchart/onboarding-ai/generate-proposal'
import { applyOnboardingProposal } from '@/lib/orgchart/onboarding-ai/apply-proposal'
import { validateProposal } from '@/lib/orgchart/onboarding-ai/validate-proposal'
import {
  onboardingInputSchema,
  onboardingProposalSchema,
} from '@/lib/orgchart/onboarding-ai/schema'
import { silentLog } from '@/lib/orgchart/_v2-utils/silent-log'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 30

const previewSchema = z.object({
  intent: z.literal('preview'),
  input: onboardingInputSchema,
})

const applySchema = z.object({
  intent: z.literal('apply'),
  input: onboardingInputSchema,
  proposal: onboardingProposalSchema,
})

const requestSchema = z.discriminatedUnion('intent', [previewSchema, applySchema])

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const json = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Body inválido', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  if (parsed.data.intent === 'preview') {
    try {
      const result = await generateOrgProposal(parsed.data.input)
      return NextResponse.json({
        proposal: result.proposal,
        source: result.source,
        warnings: result.warnings,
        fallbackReason: result.fallbackReason ?? null,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error generando propuesta'
      return NextResponse.json({ error: message }, { status: 500 })
    }
  }

  // intent === 'apply'
  const validation = validateProposal(parsed.data.proposal)
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Propuesta inválida', details: validation.errors },
      { status: 400 },
    )
  }

  try {
    const result = await applyOnboardingProposal(ctx.orgId, parsed.data.proposal, ctx.userId)

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'orgchart.onboarding_ai_applied',
          metadataJson: {
            input: parsed.data.input,
            unitsCreated: result.unitsCreated,
            unitsReused: result.unitsReused,
            positionsCreated: result.positionsCreated,
            positionsReused: result.positionsReused,
          } as object,
        },
      })
      .catch(silentLog('orgchart.onboarding.audit_log_failed', {
        orgId: ctx.orgId,
        userId: ctx.userId,
      }))

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error aplicando propuesta'
    return NextResponse.json({ error: message }, { status: 500 })
  }
})
