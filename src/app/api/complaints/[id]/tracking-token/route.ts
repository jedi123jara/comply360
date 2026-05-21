import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  generateComplaintTrackingToken,
  hashComplaintTrackingToken,
} from '@/lib/complaints/tracking-token'

export const POST = withRoleParams<{ id: string }>(
  'ADMIN',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const complaint = await prisma.complaint.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, code: true },
    })

    if (!complaint) {
      return NextResponse.json({ error: 'Denuncia no encontrada' }, { status: 404 })
    }

    const trackingToken = generateComplaintTrackingToken()
    const trackingUrl = `/denuncias/${encodeURIComponent(ctx.orgId)}?seguimiento=${encodeURIComponent(complaint.code)}&token=${encodeURIComponent(trackingToken)}`

    await prisma.$transaction(async (tx) => {
      await tx.complaint.update({
        where: { id },
        data: {
          trackingTokenHash: hashComplaintTrackingToken(trackingToken),
          trackingTokenRotatedAt: new Date(),
        },
      })

      await tx.complaintTimeline.create({
        data: {
          complaintId: id,
          action: 'TRACKING_TOKEN_ROTATED',
          description: 'Se genero un nuevo token privado de seguimiento para el denunciante.',
          performedBy: ctx.email ?? 'Admin',
        },
      })

      await tx.auditLog.create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'COMPLAINT_TRACKING_TOKEN_ROTATED',
          entityType: 'Complaint',
          entityId: id,
          metadataJson: {
            complaintCode: complaint.code,
          },
        },
      })
    })

    return NextResponse.json({
      code: complaint.code,
      trackingToken,
      trackingUrl,
    })
  },
)
