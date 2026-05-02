import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  const current = await prisma.orgComplianceRole.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!current) return NextResponse.json({ error: 'Rol no existe' }, { status: 404 })

  // Marcar como vencido en lugar de borrar (audit trail intacto)
  const updated = await prisma.orgComplianceRole.update({
    where: { id: params.id },
    data: { endsAt: new Date() },
  })
  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'COMPLIANCE_ROLE_END',
    entityType: 'OrgComplianceRole',
    entityId: params.id,
    beforeJson: current,
    afterJson: updated,
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
  }).catch(() => {})
  return NextResponse.json(updated)
})
