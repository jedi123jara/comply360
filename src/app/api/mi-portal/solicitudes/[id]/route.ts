/**
 * PATCH /api/mi-portal/solicitudes/[id]
 *
 * El trabajador puede cancelar su propia solicitud si aún está PENDIENTE
 * o EN_REVISION. No puede cambiar otros campos (el admin hace eso desde
 * su dashboard).
 *
 * Body: { action: 'cancel' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withWorkerAuthParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { emit } from '@/lib/events'

export const PATCH = withWorkerAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx,
  params,
) => {
  let body: { action?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  if (body.action !== 'cancel') {
    return NextResponse.json(
      { error: 'Acción no permitida. Solo "cancel" está disponible para el trabajador.' },
      { status: 400 },
    )
  }

  const request = await prisma.workerRequest.findFirst({
    where: { id: params.id, workerId: ctx.workerId, orgId: ctx.orgId },
    select: { id: true, status: true },
  })

  if (!request) {
    return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  }

  if (request.status !== 'PENDIENTE' && request.status !== 'EN_REVISION') {
    return NextResponse.json(
      { error: `No puedes cancelar una solicitud en estado ${request.status}` },
      { status: 409 },
    )
  }

  const updated = await prisma.workerRequest.update({
    where: { id: params.id },
    data: {
      status: 'CANCELADA',
      reviewedAt: new Date(),
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'worker.request.cancelled_by_worker',
        entityType: 'WorkerRequest',
        entityId: updated.id,
      },
    })
    .catch(() => null)

  emit('worker_request.cancelled', {
    orgId: ctx.orgId,
    userId: ctx.userId,
    requestId: updated.id,
    workerId: ctx.workerId,
  })

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
    reviewedAt: updated.reviewedAt?.toISOString() ?? null,
  })
})
