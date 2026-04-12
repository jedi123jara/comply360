import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const { workerId, orgId } = ctx

  const [worker, boletasPendientes, solicitudesPendientes, capacitaciones, documentosFaltantes, ultimaBoleta, proximasCapacitaciones] = await Promise.all([
    prisma.worker.findUnique({
      where: { id: workerId },
      include: { organization: { select: { name: true, ruc: true } } },
    }),
    prisma.payslip.count({
      where: { workerId, orgId, acceptedAt: null, status: { in: ['EMITIDA', 'ENVIADA'] } },
    }),
    prisma.workerRequest.count({
      where: { workerId, orgId, status: { in: ['PENDIENTE', 'EN_REVISION'] } },
    }),
    prisma.enrollment.count({
      where: { workerId, orgId, status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING'] } },
    }),
    prisma.workerDocument.count({
      where: { workerId, status: { in: ['PENDING', 'MISSING'] }, isRequired: true },
    }),
    prisma.payslip.findFirst({
      where: { workerId, orgId, status: { not: 'ANULADA' } },
      orderBy: { periodo: 'desc' },
      select: { periodo: true, netoPagar: true },
    }),
    prisma.enrollment.findMany({
      where: { workerId, orgId, status: { in: ['NOT_STARTED', 'IN_PROGRESS', 'EXAM_PENDING'] } },
      include: { course: { select: { title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ])

  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    worker: {
      firstName: worker.firstName,
      lastName: worker.lastName,
      dni: worker.dni,
      position: worker.position,
      department: worker.department,
      fechaIngreso: worker.fechaIngreso.toISOString(),
      regimenLaboral: worker.regimenLaboral,
      organization: worker.organization,
    },
    stats: {
      boletasPendientes,
      solicitudesPendientes,
      capacitacionesPendientes: capacitaciones,
      documentosFaltantes,
    },
    ultimaBoleta: ultimaBoleta
      ? { periodo: ultimaBoleta.periodo, netoPagar: ultimaBoleta.netoPagar.toString() }
      : null,
    proximasCapacitaciones: proximasCapacitaciones.map((e) => ({
      id: e.id,
      title: e.course.title,
      deadline: null,
    })),
  })
})
