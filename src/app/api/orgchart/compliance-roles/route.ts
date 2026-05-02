import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { createComplianceRoleSchema } from '@/lib/orgchart/zod-schemas'
import { prisma } from '@/lib/prisma'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = createComplianceRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }

  const worker = await prisma.worker.findFirst({
    where: { id: parsed.data.workerId, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!worker) return NextResponse.json({ error: 'Trabajador no existe' }, { status: 400 })

  if (parsed.data.unitId) {
    const unit = await prisma.orgUnit.findFirst({
      where: { id: parsed.data.unitId, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!unit) return NextResponse.json({ error: 'Unidad no existe' }, { status: 400 })
  }

  const def = COMPLIANCE_ROLES[parsed.data.roleType]

  // si no se pasa endsAt y el rol tiene duración default, calcularla
  let endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
  if (!endsAt && def.defaultDurationMonths) {
    endsAt = new Date()
    endsAt.setMonth(endsAt.getMonth() + def.defaultDurationMonths)
  }

  const role = await prisma.orgComplianceRole.create({
    data: {
      orgId: ctx.orgId,
      workerId: parsed.data.workerId,
      roleType: parsed.data.roleType,
      unitId: parsed.data.unitId ?? null,
      startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date(),
      endsAt,
      electedAt: parsed.data.electedAt ? new Date(parsed.data.electedAt) : null,
      actaUrl: parsed.data.actaUrl ?? null,
      baseLegal: def.baseLegal,
    },
  })

  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'COMPLIANCE_ROLE_CREATE',
    entityType: 'OrgComplianceRole',
    entityId: role.id,
    afterJson: role,
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
  }).catch(() => {})

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.compliance_role.created',
      metadataJson: { workerId: parsed.data.workerId, roleType: parsed.data.roleType } as object,
    },
  }).catch(() => {})

  return NextResponse.json(role, { status: 201 })
})
