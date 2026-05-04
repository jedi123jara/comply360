import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { createComplianceRoleSchema } from '@/lib/orgchart/zod-schemas'
import { prisma } from '@/lib/prisma'
import { COMPLIANCE_ROLES } from '@/lib/orgchart/compliance-rules'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'

const SINGLE_HOLDER_ROLE_TYPES = new Set([
  'DPO_LEY_29733',
  'RT_PLANILLA',
  'RESPONSABLE_IGUALDAD_SALARIAL',
  'ENCARGADO_LIBRO_RECLAMACIONES',
  'MEDICO_OCUPACIONAL',
  'ASISTENTA_SOCIAL',
  'RESPONSABLE_LACTARIO',
  'ENCARGADO_NUTRICION',
])

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
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : new Date()
  let endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null
  if (!endsAt && def.defaultDurationMonths) {
    endsAt = new Date(startsAt)
    endsAt.setMonth(endsAt.getMonth() + def.defaultDurationMonths)
  }
  if (endsAt && endsAt <= startsAt) {
    return NextResponse.json({ error: 'La vigencia final debe ser posterior al inicio del rol.' }, { status: 400 })
  }

  const duplicateForWorker = await prisma.orgComplianceRole.findFirst({
    where: {
      orgId: ctx.orgId,
      workerId: parsed.data.workerId,
      roleType: parsed.data.roleType,
      unitId: parsed.data.unitId ?? null,
      OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
    },
    select: { id: true },
  })
  if (duplicateForWorker) {
    return NextResponse.json(
      { error: 'El trabajador ya tiene este rol legal vigente en el mismo alcance.' },
      { status: 409 },
    )
  }

  if (SINGLE_HOLDER_ROLE_TYPES.has(parsed.data.roleType)) {
    const duplicateRole = await prisma.orgComplianceRole.findFirst({
      where: {
        orgId: ctx.orgId,
        roleType: parsed.data.roleType,
        unitId: parsed.data.unitId ?? null,
        OR: [{ endsAt: null }, { endsAt: { gt: startsAt } }],
      },
      select: { id: true },
    })
    if (duplicateRole) {
      return NextResponse.json(
        { error: 'Ya existe una designación vigente para este rol legal en el mismo alcance.' },
        { status: 409 },
      )
    }
  }

  const role = await prisma.orgComplianceRole.create({
    data: {
      orgId: ctx.orgId,
      workerId: parsed.data.workerId,
      roleType: parsed.data.roleType,
      unitId: parsed.data.unitId ?? null,
      startsAt,
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
