import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { triageComplaint } from '@/lib/ai/complaint-triage'
import { emit } from '@/lib/events'

/**
 * POST /api/complaints/[id]/re-triage
 *
 * Vuelve a correr el triaje IA sobre una denuncia. Útil cuando:
 *   1. El AI falló en la creación (provider down, timeout, etc.)
 *   2. La denuncia se editó (denunciante agregó info) y queremos re-evaluar
 *   3. Probar manualmente que el flow funcione tras un cambio en el modelo
 *
 * Solo ADMIN+ — porque el triaje consume tokens y queremos evitar abuso.
 *
 * Incrementa `triageVersion` cada vez para que la UI pueda mostrar histórico.
 */
export const POST = withRoleParams<{ id: string }>(
  'ADMIN',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const complaint = await prisma.complaint.findFirst({
      where: { id, orgId: ctx.orgId },
      select: {
        id: true,
        type: true,
        description: true,
        accusedPosition: true,
        triageVersion: true,
      },
    })

    if (!complaint) {
      return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 })
    }

    const result = await triageComplaint({
      type: complaint.type,
      description: complaint.description,
      accusedPosition: complaint.accusedPosition ?? null,
    })

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        severityAi: result.ok ? result.severity : null,
        urgencyAi: result.ok ? result.urgency : null,
        triageJson: JSON.parse(JSON.stringify(result)),
        triagedAt: new Date(),
        triageVersion: { increment: 1 },
      },
      select: {
        id: true,
        severityAi: true,
        urgencyAi: true,
        triageJson: true,
        triagedAt: true,
        triageVersion: true,
      },
    })

    if (result.ok) {
      emit('complaint.triaged', {
        orgId: ctx.orgId,
        complaintId: id,
        severity: result.severity,
        urgency: result.urgency,
      })
    }

    // Audit log para defensa (queda evidencia de qué versión del triaje
    // produjo cada clasificación).
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'COMPLAINT_RE_TRIAGED',
        entityType: 'Complaint',
        entityId: id,
        metadataJson: {
          version: updated.triageVersion,
          ok: result.ok,
          severity: result.ok ? result.severity : null,
          urgency: result.ok ? result.urgency : null,
          reason: result.ok ? null : result.reason,
        },
      },
    })

    return NextResponse.json({
      ok: result.ok,
      complaint: updated,
      ...(result.ok ? {} : { error: result.error, reason: result.reason }),
    })
  },
)
