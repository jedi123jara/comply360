/**
 * POST /api/attendance/clock
 *
 * Registra clock-in o clock-out del worker autenticado, validando:
 *   - Token QR válido + no expirado
 *   - orgId del token coincide con orgId del worker
 *   - Modo (in/out/both) compatible con lo que pide el worker
 *   - No hay doble clock-in del mismo día (idempotencia)
 *
 * Body:
 *   { token: string, action?: 'in' | 'out', shortCode?: string }
 *
 *   Si no se pasa `token` pero sí `shortCode`, devolvemos 400 (el shortCode
 *   por sí solo no tiene firma — hay que recrear el token del lado admin).
 *   Para el flujo con shortCode, el admin debería poder re-emitir un token
 *   nuevo que el worker ingrese. Primera versión: solo QR.
 */

import { NextRequest, NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import type { WorkerAuthContext } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { verifyAttendanceToken, deriveAttendanceStatus } from '@/lib/attendance/qr-token'

export const runtime = 'nodejs'

export const POST = withWorkerAuth(async (req: NextRequest, ctx: WorkerAuthContext) => {
  let body: { token?: string; action?: 'in' | 'out' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.token || typeof body.token !== 'string') {
    return NextResponse.json(
      { error: 'Token QR requerido. Pídele a tu supervisor el QR de hoy.' },
      { status: 400 },
    )
  }

  // ── Validar token ────────────────────────────────────────────────────────
  const payload = verifyAttendanceToken(body.token)
  if (!payload) {
    return NextResponse.json(
      {
        error: 'Token QR expirado o inválido. Pídele a tu supervisor que genere uno nuevo.',
        code: 'TOKEN_EXPIRED',
      },
      { status: 401 },
    )
  }

  // Validar que el orgId del token coincida con el orgId del worker
  // (defensa en profundidad contra QRs de otra empresa)
  if (payload.orgId !== ctx.orgId) {
    return NextResponse.json(
      { error: 'Este QR pertenece a otra empresa', code: 'ORG_MISMATCH' },
      { status: 403 },
    )
  }

  // ── Determinar action (in / out) ─────────────────────────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const existingToday = await prisma.attendance.findFirst({
    where: {
      workerId: ctx.workerId,
      clockIn: { gte: today, lt: tomorrow },
    },
    orderBy: { clockIn: 'desc' },
  })

  let action: 'in' | 'out'
  if (body.action === 'in' || body.action === 'out') {
    action = body.action
  } else {
    // Auto-derive: si no hay marca hoy → in. Si hay marca sin clockOut → out.
    action = existingToday && !existingToday.clockOut ? 'out' : 'in'
  }

  // Validar contra mode del token
  if (payload.mode !== 'both' && payload.mode !== action) {
    return NextResponse.json(
      {
        error: `Este QR solo permite marcar ${payload.mode === 'in' ? 'ENTRADA' : 'SALIDA'}.`,
        code: 'MODE_MISMATCH',
      },
      { status: 400 },
    )
  }

  const now = new Date()

  // ── CLOCK-IN ─────────────────────────────────────────────────────────────
  if (action === 'in') {
    if (existingToday && !existingToday.clockOut) {
      return NextResponse.json(
        {
          error: 'Ya marcaste entrada hoy. Si quieres marcar salida, usa el botón correspondiente.',
          code: 'ALREADY_CLOCKED_IN',
          attendance: toJson(existingToday),
        },
        { status: 409 },
      )
    }
    if (existingToday && existingToday.clockOut) {
      return NextResponse.json(
        {
          error: 'Ya completaste entrada y salida hoy.',
          code: 'DAY_COMPLETE',
          attendance: toJson(existingToday),
        },
        { status: 409 },
      )
    }

    const status = deriveAttendanceStatus(now, 8, 0, payload.graceMinutes)
    const created = await prisma.attendance.create({
      data: {
        orgId: ctx.orgId,
        workerId: ctx.workerId,
        clockIn: now,
        status,
      },
    })

    // Audit log de la marcación
    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'attendance.clock_in',
          entityType: 'Attendance',
          entityId: created.id,
          metadataJson: {
            workerId: ctx.workerId,
            status,
            tokenIssuedAt: payload.issuedAt,
            via: 'qr',
          },
        },
      })
      .catch(() => null)

    return NextResponse.json({
      success: true,
      action: 'in',
      status,
      attendance: toJson(created),
      message: status === 'LATE' ? '¡Entrada registrada con tardanza!' : '¡Entrada registrada a tiempo!',
    })
  }

  // ── CLOCK-OUT ────────────────────────────────────────────────────────────
  if (!existingToday) {
    return NextResponse.json(
      {
        error: 'No tienes entrada registrada hoy. Marca entrada primero.',
        code: 'NO_CLOCK_IN',
      },
      { status: 409 },
    )
  }
  if (existingToday.clockOut) {
    return NextResponse.json(
      {
        error: 'Ya marcaste salida hoy.',
        code: 'ALREADY_CLOCKED_OUT',
        attendance: toJson(existingToday),
      },
      { status: 409 },
    )
  }

  const hoursWorked =
    (now.getTime() - existingToday.clockIn.getTime()) / (1000 * 60 * 60)

  const updated = await prisma.attendance.update({
    where: { id: existingToday.id },
    data: {
      clockOut: now,
      hoursWorked,
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'attendance.clock_out',
        entityType: 'Attendance',
        entityId: updated.id,
        metadataJson: {
          workerId: ctx.workerId,
          hoursWorked: Number(hoursWorked.toFixed(2)),
          tokenIssuedAt: payload.issuedAt,
          via: 'qr',
        },
      },
    })
    .catch(() => null)

  return NextResponse.json({
    success: true,
    action: 'out',
    attendance: toJson(updated),
    hoursWorked: Number(hoursWorked.toFixed(2)),
    message: `Salida registrada. Trabajaste ${hoursWorked.toFixed(1)}h hoy.`,
  })
})

type AttendanceRow = {
  id: string
  clockIn: Date
  clockOut: Date | null
  status: string
  hoursWorked: { toString(): string } | number | null
}

function toJson(a: AttendanceRow) {
  return {
    id: a.id,
    clockIn: a.clockIn.toISOString(),
    clockOut: a.clockOut?.toISOString() ?? null,
    status: a.status,
    hoursWorked: a.hoursWorked ? Number(a.hoursWorked.toString()) : null,
  }
}
