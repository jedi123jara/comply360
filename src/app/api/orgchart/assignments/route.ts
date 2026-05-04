import { NextRequest, NextResponse } from 'next/server'
import { withRole } from '@/lib/api-auth'
import { createAssignmentSchema } from '@/lib/orgchart/zod-schemas'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { prisma } from '@/lib/prisma'

class AssignmentInvariantError extends Error {
  constructor(
    message: string,
    readonly status = 409,
  ) {
    super(message)
  }
}

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
      select: { id: true, title: true, orgUnitId: true, seats: true },
    }),
  ])
  if (!worker) return NextResponse.json({ error: 'Trabajador no existe' }, { status: 400 })
  if (!position) return NextResponse.json({ error: 'Cargo no existe' }, { status: 400 })

  const startedAt = parsed.data.startedAt ? new Date(parsed.data.startedAt) : new Date()
  const endedAt = parsed.data.endedAt ? new Date(parsed.data.endedAt) : null
  if (endedAt && endedAt <= startedAt) {
    return NextResponse.json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio.' }, { status: 400 })
  }

  // Si esta asignación es titular (isPrimary), cerrar la primaria previa del worker
  let result
  try {
    result = await prisma.$transaction(async tx => {
      const duplicate = await tx.orgAssignment.findFirst({
        where: {
          orgId: ctx.orgId,
          workerId: parsed.data.workerId,
          positionId: parsed.data.positionId,
          endedAt: null,
        },
        select: { id: true },
      })
      if (duplicate && !endedAt) {
        throw new AssignmentInvariantError('El trabajador ya tiene una asignación vigente en este cargo.')
      }

      const activeSeats = await tx.orgAssignment.count({
        where: { orgId: ctx.orgId, positionId: parsed.data.positionId, endedAt: null },
      })
      if (!endedAt && activeSeats >= position.seats) {
        throw new AssignmentInvariantError('El cargo ya alcanzó sus cupos aprobados.')
      }

      if (parsed.data.isPrimary) {
        await tx.orgAssignment.updateMany({
          where: { orgId: ctx.orgId, workerId: parsed.data.workerId, isPrimary: true, endedAt: null },
          data: { endedAt: startedAt },
        })
      }

      const activeCapacity = await tx.orgAssignment.aggregate({
        where: { orgId: ctx.orgId, workerId: parsed.data.workerId, endedAt: null },
        _sum: { capacityPct: true },
      })
      if (!endedAt && (activeCapacity._sum.capacityPct ?? 0) + parsed.data.capacityPct > 100) {
        throw new AssignmentInvariantError('La dedicación activa del trabajador no puede superar el 100%.')
      }

      return tx.orgAssignment.create({
        data: {
          orgId: ctx.orgId,
          workerId: parsed.data.workerId,
          positionId: parsed.data.positionId,
          isPrimary: parsed.data.isPrimary,
          isInterim: parsed.data.isInterim,
          startedAt,
          endedAt,
          capacityPct: parsed.data.capacityPct,
        },
      })
    })
  } catch (error) {
    if (error instanceof AssignmentInvariantError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    throw error
  }

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
