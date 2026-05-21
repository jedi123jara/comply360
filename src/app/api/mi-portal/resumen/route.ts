import { NextResponse, type NextRequest } from 'next/server'
import { withWorkerAuth, type WorkerAuthContext } from '@/lib/api-auth'
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

function getWorkerPreviewSummary() {
  return {
    worker: {
      firstName: 'Ronald',
      lastName: 'Elvis Pérez Calderón',
      dni: '79012345',
      position: 'Repartidor / Chofer',
      department: 'Operaciones',
      fechaIngreso: '2023-04-17T05:00:00.000Z',
      regimenLaboral: 'GENERAL',
      organization: { name: 'Comply360', ruc: '20601234567' },
    },
    stats: {
      boletasPendientes: 3,
      solicitudesPendientes: 5,
      capacitacionesPendientes: 0,
      documentosFaltantes: 0,
      vacacionesPendientes: 30,
      vacacionesCriticas: false,
      asistenciaMes: {
        diasMarcados: 12,
        diasLaborales: 15,
        tardanzas: 0,
        horasTrabajadas: 92.5,
        ultimaMarcacion: {
          clockIn: '2026-05-17T13:14:00.000Z',
          clockOut: null,
          status: 'ON_TIME',
        },
      },
      ctsProjection: {
        nextCut: '2026-11-15T05:00:00.000Z',
        ctsTotal: 1320.5,
      },
    },
    pulse: {
      streakDays: 12,
      levelName: 'Nivel Pro Activo',
      score: 88,
      teamProgress: 82,
      percentileLabel: 'Top 20% en legajo completo',
      nextActionLabel: 'Firmar boletas pendientes',
      feedPreview: [
        'Tu equipo está a 18% de completar capacitaciones',
        'María recibió un kudo por apoyar al equipo',
      ],
    },
    ultimaBoleta: { periodo: '2026-04', netoPagar: '1850.00' },
    proximasCapacitaciones: [],
  }
}

async function handleWorkerSummary(_req: NextRequest, ctx: WorkerAuthContext) {
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
  const attendanceRatio = countBusinessDays(monthStart, tomorrow) > 0
    ? Math.round((attendanceDays / countBusinessDays(monthStart, tomorrow)) * 100)
    : 0
  const legajoPercent = documentosFaltantes === 0 ? 100 : Math.max(45, 100 - documentosFaltantes * 10)
  const pulseScore = Math.min(100, Math.round(
    legajoPercent * 0.4 +
    Math.max(0, 100 - boletasPendientes * 12) * 0.25 +
    Math.max(0, 100 - capacitaciones * 14) * 0.2 +
    Math.min(100, attendanceRatio) * 0.15,
  ))
  const pulseNextAction =
    boletasPendientes > 0
      ? 'Firmar boletas pendientes'
      : capacitaciones > 0
        ? 'Completar capacitaciones'
        : documentosFaltantes > 0
          ? 'Actualizar legajo personal'
          : 'Ver retos de mi equipo'

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
    pulse: {
      streakDays: attendanceThisMonth.filter((a) => a.status !== 'ABSENT' && a.status !== 'ON_LEAVE').length,
      levelName: pulseScore >= 90 ? 'Nivel Pro Activo' : pulseScore >= 75 ? 'Nivel Constante' : 'Nivel En Progreso',
      score: pulseScore,
      teamProgress: Math.max(65, Math.min(100, Math.round((legajoPercent + Math.max(0, 100 - capacitaciones * 14)) / 2))),
      percentileLabel: legajoPercent >= 96 ? 'Top 20% en legajo completo' : 'En camino al siguiente nivel',
      nextActionLabel: pulseNextAction,
      feedPreview: [
        worker.department
          ? `Equipo ${worker.department}: avance positivo visible`
          : 'Tu equipo ya tiene retos activos',
        boletasPendientes > 0
          ? 'Cerrar boletas suma a la meta colectiva'
          : 'Puedes enviar kudos a un compañero hoy',
      ],
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
}

const getAuthenticatedSummary = withWorkerAuth(handleWorkerSummary)

export async function GET(req: NextRequest, routeCtx?: unknown) {
  if (process.env.NODE_ENV === 'development' && req.nextUrl.searchParams.get('__workerPreview') === '1') {
    return NextResponse.json(getWorkerPreviewSummary())
  }

  return getAuthenticatedSummary(req, routeCtx)
}
