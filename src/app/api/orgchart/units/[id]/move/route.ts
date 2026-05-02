import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { moveUnitSchema } from '@/lib/orgchart/zod-schemas'
import { moveUnit } from '@/lib/orgchart/tree-service'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const POST = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  const body = await req.json().catch(() => ({}))
  const parsed = moveUnitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }
  try {
    const before = await prisma.orgUnit.findFirst({ where: { id: params.id, orgId: ctx.orgId } })
    const updated = await moveUnit(
      ctx.orgId,
      params.id,
      parsed.data.newParentId,
      parsed.data.ifMatchVersion,
    )
    await recordStructureChange({
      orgId: ctx.orgId,
      type: 'UNIT_MOVE',
      entityType: 'OrgUnit',
      entityId: params.id,
      beforeJson: before ?? undefined,
      afterJson: updated,
      performedById: ctx.userId,
      ipAddress: requestIp(req.headers),
    }).catch(() => {})
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.unit.moved',
        metadataJson: { unitId: params.id, newParentId: parsed.data.newParentId } as object,
      },
    }).catch(() => {})
    return NextResponse.json(updated)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 409 })
  }
})
