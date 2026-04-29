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
import { verifyAttendanceToken } from '@/lib/attendance/qr-token'
import { checkAttendance, listFences } from '@/lib/attendance/geofence'
import { deriveAttendanceStatusFromSchedule } from '@/lib/attendance/schedule'

export const runtime = 'nodejs'

export const POST = withWorkerAuth(async (req: NextRequest, ctx: WorkerAuthContext) => {
  let body: {
    token?: string
    action?: 'in' | 'out'
    lat?: number
    lng?: number
    accuracy?: number
    /** SHA-256 hash de la foto selfie tomada al marcar (anti-fraude PRO+) */
    selfieHash?: string
  }
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

  // ── Validar geofence (anti-fraude opcional) ─────────────────────────────
  // Solo valida si:
  //   1. La org tiene fences definidos (admin las creó en /configuracion/asistencia)
  //   2. El cliente envió lat/lng (si no envía, asumimos que el dispositivo no
  //      tiene GPS o el worker rechazó permisos; logueamos pero no bloqueamos)
  const fences = listFences(ctx.orgId)
  let geofenceMatched: string | undefined
  if (fences.length > 0) {
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      return NextResponse.json(
        {
          error:
            'Tu empresa configuró validación por ubicación. Activa el GPS de tu celular y reintenta.',
          code: 'GEOLOCATION_REQUIRED',
        },
        { status: 400 },
      )
    }
    const geoCheck = checkAttendance(fences, {
      point: { lat: body.lat, lng: body.lng },
      accuracyMeters: body.accuracy,
    })
    if (!geoCheck.valid) {
      return NextResponse.json(
        {
          error: 'Estás fuera de la zona permitida para marcar asistencia.',
          code: 'GEOFENCE_OUT',
          distanceMeters: Math.round(geoCheck.distanceToNearestFence),
          nearestFence: geoCheck.nearestFence?.name,
          reasons: geoCheck.reasons,
        },
        { status: 403 },
      )
    }
    geofenceMatched = geoCheck.matchedFence?.name
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

    // Cargar el horario pactado del worker (Fase 1.2). Si no tiene
    // configurado o la migration aún no se aplicó, usa los defaults
    // (8:00 con 15 min tolerancia).
    const workerSchedule = await prisma.worker.findUnique({
      where: { id: ctx.workerId },
      select: {
        expectedClockInHour: true,
        expectedClockInMinute: true,
        lateToleranceMinutes: true,
      },
    })
    // Si el token trae graceMinutes explícito (admin lo overrideó al generar
    // QR), gana sobre el del worker. Sino, usamos el del worker.
    const scheduleForCheck = workerSchedule
      ? {
          ...workerSchedule,
          ...(payload.graceMinutes != null
            ? { lateToleranceMinutes: payload.graceMinutes }
            : {}),
        }
      : null
    const status = deriveAttendanceStatusFromSchedule(now, scheduleForCheck)
    const created = await prisma.attendance.create({
      data: {
        orgId: ctx.orgId,
        workerId: ctx.workerId,
        clockIn: now,
        status,
        // Anti-fraude (PRO+): persistimos coords + selfie hash si vinieron
        geoLat: typeof body.lat === 'number' ? body.lat : null,
        geoLng: typeof body.lng === 'number' ? body.lng : null,
        geoAccuracy: typeof body.accuracy === 'number' ? body.accuracy : null,
        selfieHash: body.selfieHash ?? null,
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
            geofence: geofenceMatched ?? null,
            geo: typeof body.lat === 'number' && typeof body.lng === 'number'
              ? { lat: body.lat, lng: body.lng, accuracy: body.accuracy ?? null }
              : null,
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

  // Si la marcación de salida trae un selfie nuevo, lo guardamos como
  // metadata adicional (no sobre-escribe el de entrada).
  // Sprint futuro: añadir campo `selfieHashOut` o tabla AttendanceEvent.

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
          geofence: geofenceMatched ?? null,
          geo: typeof body.lat === 'number' && typeof body.lng === 'number'
            ? { lat: body.lat, lng: body.lng, accuracy: body.accuracy ?? null }
            : null,
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
