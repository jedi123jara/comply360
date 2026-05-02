import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'

const AckSchema = z.object({
  reason: z.string().min(10, 'Justificación de al menos 10 caracteres requerida'),
})

// =============================================
// PATCH /api/contracts/[id]/validations/[vid]/ack
// Permite acknowledgear un WARNING (BLOCKER NO se puede ackear — requiere
// editar el contrato para que la regla pase).
// =============================================
export const PATCH = withAuthParams<{ id: string; vid: string }>(
  async (req: NextRequest, ctx: AuthContext, params) => {
    const body = await req.json().catch(() => null)
    const parsed = AckSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Justificación inválida', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const validation = await prisma.contractValidation.findFirst({
      where: { id: params.vid, contractId: params.id, orgId: ctx.orgId },
    })

    if (!validation) {
      return NextResponse.json({ error: 'Validación no encontrada' }, { status: 404 })
    }

    if (validation.severity === 'BLOCKER') {
      return NextResponse.json(
        {
          error:
            'Una validación BLOCKER no puede ser acknowledged. Edite el contrato para que la regla pase.',
        },
        { status: 409 },
      )
    }

    if (validation.passed) {
      return NextResponse.json(
        { error: 'Esta validación ya está pasando — no requiere acknowledgement.' },
        { status: 409 },
      )
    }

    const updated = await prisma.contractValidation.update({
      where: { id: params.vid },
      data: {
        acknowledged: true,
        acknowledgedBy: ctx.userId,
        acknowledgedAt: new Date(),
        acknowledgedReason: parsed.data.reason,
      },
    })

    await logAudit({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'contract.validation.acknowledged',
      entityType: 'ContractValidation',
      entityId: params.vid,
      metadata: {
        contractId: params.id,
        ruleCode: validation.ruleCode,
        severity: validation.severity,
      },
    })

    return NextResponse.json({ data: updated })
  },
)
