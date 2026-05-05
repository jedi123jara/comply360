import { NextRequest, NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { updateComplianceRoleSchema } from '@/lib/orgchart/zod-schemas'
import { prisma } from '@/lib/prisma'

export const PATCH = withRoleParams<{ id: string }>('ADMIN', async (req: NextRequest, ctx, params) => {
  const body = await req.json().catch(() => ({}))
  const parsed = updateComplianceRoleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }

  const current = await prisma.orgComplianceRole.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!current) return NextResponse.json({ error: 'Rol no existe' }, { status: 404 })

  const startsAt = current.startsAt
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : parsed.data.endsAt === null ? null : undefined
  if (endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: 'La vigencia final debe ser posterior al inicio del rol.' }, { status: 400 })
  }

  const updated = await prisma.orgComplianceRole.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.actaUrl !== undefined
        ? { actaUrl: parsed.data.actaUrl === '' ? null : parsed.data.actaUrl }
        : {}),
      ...(parsed.data.electedAt !== undefined
        ? { electedAt: parsed.data.electedAt ? new Date(parsed.data.electedAt) : null }
        : {}),
      ...(endsAt !== undefined ? { endsAt } : {}),
    },
  })

  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'COMPLIANCE_ROLE_CREATE',
    entityType: 'OrgComplianceRole',
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
      action: 'orgchart.compliance_role.updated',
      metadataJson: { roleId: params.id, fields: Object.keys(parsed.data) } as object,
    },
  }).catch(() => {})

  return NextResponse.json(updated)
})

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
