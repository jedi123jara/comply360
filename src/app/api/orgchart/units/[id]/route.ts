import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { updateUnitSchema } from '@/lib/orgchart/zod-schemas'
import { updateUnit, deleteUnit } from '@/lib/orgchart/tree-service'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const PATCH = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  const body = await req.json().catch(() => ({}))
  const parsed = updateUnitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }
  const { ifMatchVersion, ...patch } = parsed.data
  try {
    const before = await prisma.orgUnit.findFirst({ where: { id: params.id, orgId: ctx.orgId } })
    const updated = await updateUnit(ctx.orgId, params.id, patch, ifMatchVersion)
    await recordStructureChange({
      orgId: ctx.orgId,
      type: 'UNIT_UPDATE',
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
        action: 'orgchart.unit.updated',
        metadataJson: { unitId: params.id, patch } as object,
      },
    }).catch(() => {})
    return NextResponse.json(updated)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})

export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  try {
    const before = await prisma.orgUnit.findFirst({ where: { id: params.id, orgId: ctx.orgId } })
    await deleteUnit(ctx.orgId, params.id)
    const after = await prisma.orgUnit.findFirst({ where: { id: params.id, orgId: ctx.orgId } })
    await recordStructureChange({
      orgId: ctx.orgId,
      type: 'UNIT_DELETE',
      entityType: 'OrgUnit',
      entityId: params.id,
      beforeJson: before ?? undefined,
      afterJson: after ?? undefined,
      performedById: ctx.userId,
      ipAddress: requestIp(req.headers),
    }).catch(() => {})
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.unit.deleted',
        metadataJson: { unitId: params.id } as object,
      },
    }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
