import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { createPositionSchema } from '@/lib/orgchart/zod-schemas'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = createPositionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }

  // Validar que la unit pertenece a la org
  const unit = await prisma.orgUnit.findFirst({
    where: { id: parsed.data.orgUnitId, orgId: ctx.orgId, isActive: true },
    select: { id: true },
  })
  if (!unit) {
    return NextResponse.json({ error: 'Unidad inválida' }, { status: 400 })
  }

  if (parsed.data.reportsToPositionId) {
    const parent = await prisma.orgPosition.findFirst({
      where: { id: parsed.data.reportsToPositionId, orgId: ctx.orgId, validTo: null },
      select: { id: true },
    })
    if (!parent) {
      return NextResponse.json({ error: 'Jefe inmediato inválido' }, { status: 400 })
    }
  }

  if (parsed.data.backupPositionId) {
    const backup = await prisma.orgPosition.findFirst({
      where: { id: parsed.data.backupPositionId, orgId: ctx.orgId, validTo: null },
      select: { id: true },
    })
    if (!backup) {
      return NextResponse.json({ error: 'Backup inválido' }, { status: 400 })
    }
  }

  const validFrom = parsed.data.validFrom ? new Date(parsed.data.validFrom) : new Date()
  const validTo = parsed.data.validTo ? new Date(parsed.data.validTo) : null
  if (validTo && validTo <= validFrom) {
    return NextResponse.json({ error: 'La vigencia final debe ser posterior al inicio del cargo.' }, { status: 400 })
  }

  const duplicate = await prisma.orgPosition.findFirst({
    where: {
      orgId: ctx.orgId,
      orgUnitId: parsed.data.orgUnitId,
      title: { equals: parsed.data.title, mode: 'insensitive' },
      validTo: null,
    },
    select: { id: true },
  })
  if (duplicate) {
    return NextResponse.json({ error: 'Ya existe un cargo vigente con ese nombre en la unidad.' }, { status: 409 })
  }

  const position = await prisma.orgPosition.create({
    data: {
      orgId: ctx.orgId,
      orgUnitId: parsed.data.orgUnitId,
      title: parsed.data.title,
      code: parsed.data.code ?? null,
      description: parsed.data.description ?? null,
      level: parsed.data.level ?? null,
      purpose: parsed.data.purpose ?? null,
      functions: parsed.data.functions ?? undefined,
      responsibilities: parsed.data.responsibilities ?? undefined,
      requirements: parsed.data.requirements ?? undefined,
      salaryBandMin: parsed.data.salaryBandMin ?? null,
      salaryBandMax: parsed.data.salaryBandMax ?? null,
      category: parsed.data.category ?? null,
      riskCategory: parsed.data.riskCategory ?? null,
      requiresSctr: parsed.data.requiresSctr,
      requiresMedicalExam: parsed.data.requiresMedicalExam,
      isCritical: parsed.data.isCritical,
      isManagerial: parsed.data.isManagerial,
      reportsToPositionId: parsed.data.reportsToPositionId ?? null,
      backupPositionId: parsed.data.backupPositionId ?? null,
      seats: parsed.data.seats,
      validFrom,
      validTo,
    },
  })
  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'POSITION_CREATE',
    entityType: 'OrgPosition',
    entityId: position.id,
    afterJson: position,
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
  }).catch(() => {})
  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.position.created',
      metadataJson: { positionId: position.id, title: position.title } as object,
    },
  }).catch(() => {})
  return NextResponse.json(position, { status: 201 })
})
