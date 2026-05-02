import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { createAssignmentSchema } from '@/lib/orgchart/zod-schemas'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

export const POST = withRole('ADMIN', async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = createAssignmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', issues: parsed.error.flatten() }, { status: 400 })
  }

  const [worker, position] = await Promise.all([
    prisma.worker.findFirst({ where: { id: parsed.data.workerId, orgId: ctx.orgId }, select: { id: true } }),
    prisma.orgPosition.findFirst({
      where: { id: parsed.data.positionId, orgId: ctx.orgId },
      select: { id: true, title: true, orgUnitId: true },
    }),
  ])
  if (!worker) return NextResponse.json({ error: 'Trabajador no existe' }, { status: 400 })
  if (!position) return NextResponse.json({ error: 'Cargo no existe' }, { status: 400 })

  // Si esta asignación es titular (isPrimary), cerrar la primaria previa del worker
  const result = await prisma.$transaction(async tx => {
    if (parsed.data.isPrimary) {
      await tx.orgAssignment.updateMany({
        where: { orgId: ctx.orgId, workerId: parsed.data.workerId, isPrimary: true, endedAt: null },
        data: { endedAt: new Date() },
      })
    }
    return tx.orgAssignment.create({
      data: {
        orgId: ctx.orgId,
        workerId: parsed.data.workerId,
        positionId: parsed.data.positionId,
        isPrimary: parsed.data.isPrimary,
        isInterim: parsed.data.isInterim,
        startedAt: parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date(),
        endedAt: parsed.data.endedAt ? new Date(parsed.data.endedAt) : null,
        capacityPct: parsed.data.capacityPct,
      },
    })
  })

  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'ASSIGNMENT_CREATE',
    entityType: 'OrgAssignment',
    entityId: result.id,
    afterJson: result,
    performedById: ctx.userId,
    ipAddress: requestIp(req.headers),
  }).catch(() => {})

  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'orgchart.assignment.created',
      metadataJson: { workerId: parsed.data.workerId, positionId: parsed.data.positionId, isPrimary: parsed.data.isPrimary } as object,
    },
  }).catch(() => {})

  return NextResponse.json(result, { status: 201 })
})
