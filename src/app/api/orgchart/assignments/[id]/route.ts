import { NextResponse } from 'next/server'
import { withRoleParams } from '@/lib/api-auth'
import { recordStructureChange, requestIp } from '@/lib/orgchart/change-log'
import { resyncWorkerPrimaryFromOrgChart } from '@/lib/orgchart/worker-sync'
import { prisma } from '@/lib/prisma'

export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (req, ctx, params) => {
  const current = await prisma.orgAssignment.findFirst({
    where: { id: params.id, orgId: ctx.orgId },
  })
  if (!current) return NextResponse.json({ error: 'Asignación no existe' }, { status: 404 })
  if (current.endedAt) {
    return NextResponse.json({ error: 'La asignación ya fue cesada.' }, { status: 409 })
  }

  const endedAt = new Date()
  if (endedAt < current.startedAt) {
    endedAt.setTime(current.startedAt.getTime())
  }

  // Cesar (no borrar) — preservamos historial
  const updated = await prisma.orgAssignment.update({
    where: { id: params.id },
    data: { endedAt },
  })
  await recordStructureChange({
    orgId: ctx.orgId,
    type: 'ASSIGNMENT_END',
    entityType: 'OrgAssignment',
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
      action: 'orgchart.assignment.ended',
      metadataJson: { assignmentId: params.id } as object,
    },
  }).catch(() => {})

  // Si era la asignación titular vigente, re-sincronizar el perfil del trabajador
  // (espejar el siguiente titular si le queda alguno). Best-effort.
  if (current.isPrimary) {
    await resyncWorkerPrimaryFromOrgChart(current.workerId).catch((err) =>
      console.error('[assignment/DELETE] no se pudo re-sincronizar el trabajador:', err),
    )
  }

  return NextResponse.json(updated)
})
