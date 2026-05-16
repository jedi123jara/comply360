import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { calcularCTS } from '@/lib/legal-engine/calculators/cts'
import { getNextCtsCutDate, toIsoDate } from '@/lib/legal-engine/cts-cutoffs'
import { getLimaParts } from '@/lib/time/lima'

function startOfCurrentMonth() {
  const now = getLimaParts(new Date())
  return new Date(Date.UTC(now.year, now.month - 1, 1))
}

function startOfTomorrow() {
  const now = getLimaParts(new Date())
  return new Date(Date.UTC(now.year, now.month - 1, now.day + 1))
}

function countBusinessDays(from: Date, toExclusive: Date) {
  let count = 0
  const cursor = new Date(from)
  while (cursor < toExclusive) {
    const day = cursor.getUTCDay()
    if (day !== 0 && day !== 6) count++
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}

export const GET = withWorkerAuth(async (_req, ctx) => {
  const { workerId, orgId } = ctx
  const monthStart = startOfCurrentMonth()
  const tomorrow = startOfTomorrow()

  const [
    worker,
    boletasPendientes,
    solicitudesPendientes,
    capacitaciones,
    documentosFaltantes,
    ultimaBoleta,
    proximasCapacitaciones,
    vacationRecords,
    attendanceThisMonth,
  ] = await Promise.all([
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
    prisma.vacationRecord.findMany({
      where: { workerId, diasPendientes: { gt: 0 } },
      select: { diasPendientes: true, esDoble: true, periodoFin: true },
      orderBy: { periodoFin: 'asc' },
    }),
    prisma.attendance.findMany({
      where: {
        workerId,
        orgId,
        workDate: {
          gte: monthStart,
          lt: tomorrow,
        },
      },
      orderBy: { workDate: 'desc' },
      select: {
        clockIn: true,
        clockOut: true,
        hoursWorked: true,
        status: true,
      },
    }),
  ])

  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  }

  const ctsCut = getNextCtsCutDate()
  const ctsProjection = worker.status === 'TERMINATED' || worker.regimenLaboral !== 'GENERAL'
    ? null
    : calcularCTS({
        sueldoBruto: Number(worker.sueldoBruto),
        asignacionFamiliar: worker.asignacionFamiliar,
        ultimaGratificacion: Number(worker.sueldoBruto),
        fechaIngreso: toIsoDate(worker.fechaIngreso),
        fechaCorte: toIsoDate(ctsCut),
      })

  const vacacionesPendientes = vacationRecords.reduce((sum, v) => sum + v.diasPendientes, 0)
  const vacacionesCriticas = vacationRecords.some((v) => v.esDoble)
  const attendanceDays = attendanceThisMonth.length
  const lateDays = attendanceThisMonth.filter((a) => a.status === 'LATE').length
  const hoursWorked = attendanceThisMonth.reduce((sum, a) => sum + (a.hoursWorked ? Number(a.hoursWorked) : 0), 0)

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
      vacacionesPendientes,
      vacacionesCriticas,
      asistenciaMes: {
        diasMarcados: attendanceDays,
        diasLaborales: countBusinessDays(monthStart, tomorrow),
        tardanzas: lateDays,
        horasTrabajadas: Number(hoursWorked.toFixed(2)),
        ultimaMarcacion: attendanceThisMonth[0]
          ? {
              clockIn: attendanceThisMonth[0].clockIn.toISOString(),
              clockOut: attendanceThisMonth[0].clockOut?.toISOString() ?? null,
              status: String(attendanceThisMonth[0].status),
            }
          : null,
      },
      ctsProjection: ctsProjection
        ? {
            nextCut: ctsCut.toISOString(),
            ctsTotal: ctsProjection.ctsTotal,
          }
        : null,
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
