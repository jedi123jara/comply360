import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { createUnitSchema } from '@/lib/orgchart/zod-schemas'
import { createUnit } from '@/lib/orgchart/tree-service'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = createUnitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }
  try {
    const unit = await createUnit(ctx.orgId, parsed.data)
    await recordStructureChange({
      orgId: ctx.orgId,
      type: 'UNIT_CREATE',
      entityType: 'OrgUnit',
      entityId: unit.id,
      afterJson: unit,
      performedById: ctx.userId,
      ipAddress: requestIp(req.headers),
    }).catch(() => {})
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'orgchart.unit.created',
        metadataJson: { unitId: unit.id, name: unit.name, kind: unit.kind } as object,
      },
    }).catch(() => {})
    return NextResponse.json(unit, { status: 201 })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
})
