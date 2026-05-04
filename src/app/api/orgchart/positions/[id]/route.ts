import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { updatePositionSchema } from '@/lib/orgchart/zod-schemas'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'

export const PATCH = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  const body = await req.json().catch(() => ({}))
  const parsed = updatePositionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }
  const current = await prisma.orgPosition.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!current) return NextResponse.json({ error: 'Cargo no existe' }, { status: 404 })

  if (parsed.data.orgUnitId) {
    const unit = await prisma.orgUnit.findFirst({
      where: { id: parsed.data.orgUnitId, orgId: ctx.orgId, isActive: true },
      select: { id: true },
    })
    if (!unit) return NextResponse.json({ error: 'Unidad inválida' }, { status: 400 })
  }

  if (parsed.data.reportsToPositionId !== undefined && parsed.data.reportsToPositionId !== null) {
    if (parsed.data.reportsToPositionId === params.id) {
      return NextResponse.json({ error: 'Un cargo no puede reportarse a sí mismo' }, { status: 400 })
    }
    const parent = await prisma.orgPosition.findFirst({
      where: { id: parsed.data.reportsToPositionId, orgId: ctx.orgId, validTo: null },
      select: { id: true },
    })
    if (!parent) return NextResponse.json({ error: 'Jefe inmediato inválido' }, { status: 400 })
    if (await wouldCreatePositionCycle(ctx.orgId, params.id, parsed.data.reportsToPositionId)) {
      return NextResponse.json({ error: 'No se puede mover: crearía un ciclo jerárquico' }, { status: 409 })
    }
  }

  if (parsed.data.backupPositionId !== undefined && parsed.data.backupPositionId !== null) {
    if (parsed.data.backupPositionId === params.id) {
      return NextResponse.json({ error: 'Un cargo no puede ser backup de sí mismo' }, { status: 400 })
    }
    const backup = await prisma.orgPosition.findFirst({
      where: { id: parsed.data.backupPositionId, orgId: ctx.orgId, validTo: null },
      select: { id: true },
    })
    if (!backup) return NextResponse.json({ error: 'Backup inválido' }, { status: 400 })
  }

  const nextValidFrom = parsed.data.validFrom ? new Date(parsed.data.validFrom) : current.validFrom
  const nextValidTo = parsed.data.validTo === undefined
    ? current.validTo
    : parsed.data.validTo === null
      ? null
      : new Date(parsed.data.validTo)
  if (nextValidTo && nextValidTo <= nextValidFrom) {
    return NextResponse.json({ error: 'La vigencia final debe ser posterior al inicio del cargo.' }, { status: 400 })
  }

  const nextOrgUnitId = parsed.data.orgUnitId ?? current.orgUnitId
  const nextTitle = parsed.data.title ?? current.title
  if (nextOrgUnitId !== current.orgUnitId || nextTitle.toLowerCase() !== current.title.toLowerCase()) {
    const duplicate = await prisma.orgPosition.findFirst({
      where: {
        orgId: ctx.orgId,
        orgUnitId: nextOrgUnitId,
        title: { equals: nextTitle, mode: 'insensitive' },
        validTo: null,
        id: { not: params.id },
      },
      select: { id: true },
    })
    if (duplicate) {
      return NextResponse.json({ error: 'Ya existe un cargo vigente con ese nombre en la unidad.' }, { status: 409 })
    }
  }

  if (parsed.data.seats !== undefined || (parsed.data.validTo !== undefined && parsed.data.validTo !== null)) {
    const activeAssignments = await prisma.orgAssignment.count({
      where: { orgId: ctx.orgId, positionId: params.id, endedAt: null },
    })
    if (parsed.data.seats !== undefined && parsed.data.seats < activeAssignments) {
      return NextResponse.json(
        { error: `El cargo tiene ${activeAssignments} ocupante(s) vigente(s). No puedes dejar menos cupos.` },
        { status: 409 },
      )
    }
    if (parsed.data.validTo !== undefined && parsed.data.validTo !== null && activeAssignments > 0) {
      return NextResponse.json(
        { error: 'El cargo tiene ocupantes vigentes. Cesa primero las asignaciones.' },
        { status: 409 },
      )
    }
  }

  const { validFrom, validTo, functions, responsibilities, requirements, ...positionPatch } = parsed.data
  const data: Prisma.OrgPositionUncheckedUpdateInput = {
    ...positionPatch,
    validFrom: validFrom ? new Date(validFrom) : undefined,
    validTo: validTo === undefined ? undefined : validTo === null ? null : new Date(validTo),
  }
  if (functions !== undefined) data.functions = functions === null ? Prisma.JsonNull : functions
  if (responsibilities !== undefined) {
    data.responsibilities = responsibilities === null ? Prisma.JsonNull : responsibilities
  }
  if (requirements !== undefined) data.requirements = requirements === null ? Prisma.JsonNull : requirements

  const updated = await prisma.orgPosition.update({
    where: { id: params.id },
    data,
  })
  await recordStructureChange({
    orgId: ctx.orgId,
    type: current.reportsToPositionId !== updated.reportsToPositionId ? 'POSITION_REPARENT' : 'POSITION_UPDATE',
    entityType: 'OrgPosition',
    entityId: updated.id,
    beforeJson: current,
    afterJson: updated,
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
  }).catch(() => {})
  return NextResponse.json(updated)
})

export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  const current = await prisma.orgPosition.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
    include: {
      assignments: { where: { endedAt: null } },
      reportees: { where: { validTo: null }, select: { id: true } },
    },
  })
  if (!current) return NextResponse.json({ error: 'Cargo no existe' }, { status: 404 })
  if (current.assignments.length > 0) {
    return NextResponse.json({ error: 'El cargo tiene ocupantes vigentes. Cesa primero las asignaciones.' }, { status: 409 })
  }
  if (current.reportees.length > 0) {
    return NextResponse.json({ error: 'El cargo tiene reportes directos vigentes. Reasigna la línea de mando antes de eliminarlo.' }, { status: 409 })
  }
  const updated = await prisma.orgPosition.update({
    where: { id: params.id },
    data: { validTo: new Date() },
  })
  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'POSITION_DELETE',
    entityType: 'OrgPosition',
    entityId: params.id,
    beforeJson: current,
    afterJson: updated,
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
  }).catch(() => {})
  return NextResponse.json({ ok: true })
})

async function wouldCreatePositionCycle(orgId: string, positionId: string, newParentId: string) {
  let cursor: string | null = newParentId
  const seen = new Set<string>()

  while (cursor) {
    if (cursor === positionId) return true
    if (seen.has(cursor)) return true
    seen.add(cursor)

    const parent: { reportsToPositionId: string | null } | null = await prisma.orgPosition.findFirst({
      where: { id: cursor, orgId },
      select: { reportsToPositionId: true },
    })
    cursor = parent?.reportsToPositionId ?? null
  }

  return false
}
