import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  const current = await prisma.orgAssignment.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!current) return NextResponse.json({ error: 'Asignación no existe' }, { status: 404 })

  // Cesar (no borrar) — preservamos historial
  const updated = await prisma.orgAssignment.update({
    where: { id: params.id },
    data: { endedAt: new Date() },
  })
  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'ASSIGNMENT_END',
    entityType: 'OrgAssignment',
    entityId: params.id,
    beforeJson: current,
    afterJson: updated,
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
  }).catch(() => {})
  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.assignment.ended',
      metadataJson: { assignmentId: params.id } as object,
    },
  }).catch(() => {})
  return NextResponse.json(updated)
})
