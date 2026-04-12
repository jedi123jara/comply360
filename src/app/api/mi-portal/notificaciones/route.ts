import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * Por ahora la "bandeja" del trabajador agrega:
 * - Boletas pendientes de aceptar
 * - Solicitudes con cambio de estado
 * - Capacitaciones por vencer
 *
 * En una iteracion posterior se puede tener una tabla Notification dedicada
 * con tracking de read/unread.
 */
export const GET = withWorkerAuth(async (_req, ctx) => {
  const [boletasPendientes, solicitudesActualizadas, capacitacionesPendientes] = await Promise.all([
    prisma.payslip.findMany({
      where: { workerId: ctx.workerId, orgId: ctx.orgId, acceptedAt: null, status: { in: ['EMITIDA', 'ENVIADA'] } },
      orderBy: { fechaEmision: 'desc' },
      take: 10,
    }),
    prisma.workerRequest.findMany({
      where: { workerId: ctx.workerId, orgId: ctx.orgId, reviewedAt: { not: null } },
      orderBy: { reviewedAt: 'desc' },
      take: 10,
    }),
    prisma.enrollment.findMany({
      where: { workerId: ctx.workerId, orgId: ctx.orgId, status: { in: ['NOT_STARTED', 'IN_PROGRESS'] } },
      include: { course: { select: { title: true, isObligatory: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ])

  type Notif = {
    id: string
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'CRITICAL'
    title: string
    body: string
    createdAt: string
    read: boolean
  }

  const notifications: Notif[] = []

  boletasPendientes.forEach((b) => {
    notifications.push({
      id: `payslip-${b.id}`,
      type: 'INFO',
      title: `Nueva boleta — ${b.periodo}`,
      body: `Tu boleta del periodo ${b.periodo} esta lista. Confirma su recepcion.`,
      createdAt: b.fechaEmision.toISOString(),
      read: false,
    })
  })

  solicitudesActualizadas.forEach((r) => {
    const isApproved = r.status === 'APROBADA'
    notifications.push({
      id: `request-${r.id}`,
      type: isApproved ? 'SUCCESS' : r.status === 'RECHAZADA' ? 'WARNING' : 'INFO',
      title: `Solicitud ${r.status.toLowerCase()}`,
      body: `Tu solicitud "${r.title}" fue ${r.status.toLowerCase()}.${r.reviewNotes ? ' Nota: ' + r.reviewNotes : ''}`,
      createdAt: r.reviewedAt?.toISOString() || r.createdAt.toISOString(),
      read: false,
    })
  })

  capacitacionesPendientes.forEach((e) => {
    if (e.course.isObligatory) {
      notifications.push({
        id: `enrollment-${e.id}`,
        type: 'WARNING',
        title: `Capacitacion obligatoria pendiente`,
        body: `Tienes pendiente completar el curso "${e.course.title}".`,
        createdAt: e.createdAt.toISOString(),
        read: false,
      })
    }
  })

  // Ordenar por fecha
  notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return NextResponse.json({ notifications: notifications.slice(0, 30) })
})
