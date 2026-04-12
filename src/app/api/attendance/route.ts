import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

/**
 * GET /api/attendance?date=YYYY-MM-DD
 * Devuelve los registros de asistencia de todos los trabajadores de la org para una fecha.
 */
export const GET = withAuth(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') ?? new Date().toISOString().slice(0, 10)

  // Construir rango del día
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`)

  const records = await prisma.attendance.findMany({
    where: {
      orgId: ctx.orgId,
      clockIn: { gte: dayStart, lte: dayEnd },
    },
    include: {
      worker: {
        select: { firstName: true, lastName: true, department: true, position: true },
      },
    },
    orderBy: { clockIn: 'asc' },
  })

  // Calcular resumen
  const summary = {
    present: records.filter((r) => r.status === 'PRESENT').length,
    late: records.filter((r) => r.status === 'LATE').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    onLeave: records.filter((r) => r.status === 'ON_LEAVE').length,
    total: records.length,
  }

  return NextResponse.json({
    date: dateStr,
    records: records.map((r) => ({
      id: r.id,
      workerId: r.workerId,
      clockIn: r.clockIn.toISOString(),
      clockOut: r.clockOut?.toISOString() ?? null,
      hoursWorked: r.hoursWorked ? Number(r.hoursWorked) : null,
      status: r.status,
      notes: r.notes,
      worker: r.worker,
    })),
    summary,
  })
})

const clockSchema = z.object({
  workerId: z.string().min(1),
  action: z.enum(['clock_in', 'clock_out']),
  notes: z.string().max(200).optional(),
})

/**
 * POST /api/attendance
 * Registra entrada o salida. Si workerId = 'current', usa el worker vinculado al usuario autenticado.
 */
export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json().catch(() => ({}))
  const parsed = clockSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { workerId: rawWorkerId, action, notes } = parsed.data

  // Resolver workerId 'current' al worker vinculado al usuario autenticado
  let resolvedWorkerId = rawWorkerId
  if (rawWorkerId === 'current') {
    const workerLinked = await prisma.worker.findFirst({
      where: { orgId: ctx.orgId, userId: ctx.userId, status: { not: 'TERMINATED' } },
      select: { id: true },
    })
    if (!workerLinked) {
      return NextResponse.json(
        { error: 'No tienes un perfil de trabajador vinculado en esta organización.' },
        { status: 404 },
      )
    }
    resolvedWorkerId = workerLinked.id
  }

  // Verificar que el worker pertenece a la org (defense in depth)
  const worker = await prisma.worker.findFirst({
    where: { id: resolvedWorkerId, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
    select: { id: true, firstName: true, lastName: true },
  })

  if (!worker) {
    return NextResponse.json({ error: 'Trabajador no encontrado en esta organización.' }, { status: 404 })
  }

  const now = new Date()

  if (action === 'clock_in') {
    // Verificar que no hay ya una entrada activa hoy
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const existing = await prisma.attendance.findFirst({
      where: {
        workerId: resolvedWorkerId,
        orgId: ctx.orgId,
        clockIn: { gte: todayStart },
        clockOut: null, // entrada sin salida = activo
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'Ya existe una entrada activa para hoy sin salida registrada.' }, { status: 409 })
    }

    // Calcular estado: LATE si llega después de las 9:00
    const horaEntrada = now.getHours()
    const status = horaEntrada >= 9 ? 'LATE' : 'PRESENT'

    const record = await prisma.attendance.create({
      data: {
        orgId: ctx.orgId,
        workerId: resolvedWorkerId,
        clockIn: now,
        status,
        notes: notes ?? null,
      },
      include: {
        worker: { select: { firstName: true, lastName: true, department: true, position: true } },
      },
    })

    return NextResponse.json({
      id: record.id,
      workerId: record.workerId,
      clockIn: record.clockIn.toISOString(),
      clockOut: null,
      hoursWorked: null,
      status: record.status,
      notes: record.notes,
      worker: record.worker,
    }, { status: 201 })
  }

  // clock_out
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const openRecord = await prisma.attendance.findFirst({
    where: {
      workerId: resolvedWorkerId,
      orgId: ctx.orgId,
      clockIn: { gte: todayStart },
      clockOut: null,
    },
    orderBy: { clockIn: 'desc' },
  })

  if (!openRecord) {
    return NextResponse.json({ error: 'No hay entrada activa para registrar salida.' }, { status: 404 })
  }

  // Calcular horas trabajadas
  const msWorked = now.getTime() - openRecord.clockIn.getTime()
  const hoursWorked = Math.round((msWorked / (1000 * 60 * 60)) * 100) / 100

  const updated = await prisma.attendance.update({
    where: { id: openRecord.id },
    data: {
      clockOut: now,
      hoursWorked,
      notes: notes ?? openRecord.notes,
    },
    include: {
      worker: { select: { firstName: true, lastName: true, department: true, position: true } },
    },
  })

  return NextResponse.json({
    id: updated.id,
    workerId: updated.workerId,
    clockIn: updated.clockIn.toISOString(),
    clockOut: updated.clockOut?.toISOString() ?? null,
    hoursWorked: updated.hoursWorked ? Number(updated.hoursWorked) : null,
    status: updated.status,
    notes: updated.notes,
    worker: updated.worker,
  })
})
