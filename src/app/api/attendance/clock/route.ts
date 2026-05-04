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
import { calculateOvertime } from '@/lib/attendance/overtime'
import { serializeAttendanceNotes, type AttendanceMetadata } from '@/lib/attendance/notes'
import { logAttempt, extractRequestMetadata } from '@/lib/attendance/log-attempt'
import { workDateFor } from '@/lib/attendance/local-date'
import { recordAttendanceEvidence } from '@/lib/attendance/structured-records'

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
    /**
     * Si el worker está fuera de la geocerca, puede mandar este motivo y
     * el server registra el Attendance con justificación pendiente de
     * aprobación admin (en lugar de bloquear con 403).
     */
    outOfBoundsReason?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // Metadata HTTP para audit trail (Fase 4)
  const reqMeta = extractRequestMetadata(req)
  const geoForLog = typeof body.lat === 'number' && typeof body.lng === 'number'
    ? { lat: body.lat, lng: body.lng, accuracy: body.accuracy }
    : undefined

  if (!body.token || typeof body.token !== 'string') {
    void logAttempt({
      orgId: ctx.orgId,
      workerId: ctx.workerId,
      result: 'TOKEN_INVALID',
      reason: 'Token ausente en el body',
      via: 'qr',
      ...reqMeta,
    })
    return NextResponse.json(
      { error: 'Token QR requerido. Pídele a tu supervisor el QR de hoy.' },
      { status: 400 },
    )
  }

  // ── Validar token ────────────────────────────────────────────────────────
  const payload = verifyAttendanceToken(body.token)
  if (!payload) {
    void logAttempt({
      orgId: ctx.orgId,
      workerId: ctx.workerId,
      result: 'TOKEN_EXPIRED',
      reason: 'Token JWT expirado o firma inválida',
      via: 'qr',
      geo: geoForLog,
      ...reqMeta,
    })
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
    void logAttempt({
      orgId: ctx.orgId,
      workerId: ctx.workerId,
      result: 'ORG_MISMATCH',
      reason: `Token de org ${payload.orgId} usado por worker de org ${ctx.orgId}`,
      via: 'qr',
      geo: geoForLog,
      ...reqMeta,
    })
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
  const fences = await listFences(ctx.orgId)
  let geofenceMatched: string | undefined
  if (fences.length > 0) {
    if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
      void logAttempt({
        orgId: ctx.orgId,
        workerId: ctx.workerId,
        result: 'GEOLOCATION_REQUIRED',
        reason: 'Org tiene geofences configuradas pero el cliente no envió coords',
        via: 'qr',
        ...reqMeta,
      })
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
      const reason = (body.outOfBoundsReason ?? '').trim()
      // Si el worker NO mandó motivo, devolvemos 403 con metadata para que
      // la UI muestre el modal de "fuera de zona" — esto es el flujo nuevo
      // de Fase 2.
      if (reason.length < 3) {
        void logAttempt({
          orgId: ctx.orgId,
          workerId: ctx.workerId,
          result: 'GEOFENCE_OUT',
          reason: `Fuera de zona, ~${Math.round(geoCheck.distanceToNearestFence)}m de ${geoCheck.nearestFence?.name ?? 'zona'}`,
          via: 'qr',
          geo: geoForLog,
          ...reqMeta,
        })
        return NextResponse.json(
          {
            error: 'Estás fuera de la zona permitida. Si tienes un motivo válido (cita médica, reunión cliente, home office), repórtalo y registramos tu marcación con justificación pendiente de aprobación.',
            code: 'GEOFENCE_OUT_NEEDS_REASON',
            distanceMeters: Math.round(geoCheck.distanceToNearestFence),
            nearestFence: geoCheck.nearestFence?.name,
            reasons: geoCheck.reasons,
          },
          { status: 403 },
        )
      }
      // Si SÍ mandó motivo, dejamos pasar y persistimos la justificación.
      // Marcamos el geofenceMatched como "out-of-bounds" para audit trail.
      geofenceMatched = `OUT_OF_BOUNDS:${geoCheck.nearestFence?.name ?? 'sin zona'}`
    } else {
      geofenceMatched = geoCheck.matchedFence?.name
    }
  }
  // Helper: si el worker está fuera de zona pero con motivo, se persiste
  // como justification (mismo formato que Fase 1.1) — pendiente de aprobación admin.
  const buildOutOfBoundsNotes = (): string | null => {
    if (!body.outOfBoundsReason || !geofenceMatched?.startsWith('OUT_OF_BOUNDS')) {
      return null
    }
    const meta: AttendanceMetadata = {
      justification: {
        reason: `Fuera de zona — ${body.outOfBoundsReason.trim().slice(0, 480)}`,
        requestedAt: new Date().toISOString(),
        requestedBy: ctx.userId,
      },
    }
    return serializeAttendanceNotes(meta)
  }

  // ── Determinar action (in / out) ─────────────────────────────────────────
  const now = new Date()
  const workDate = workDateFor(now)

  const existingToday = await prisma.attendance.findFirst({
    where: {
      workerId: ctx.workerId,
      orgId: ctx.orgId,
      workDate,
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

    // Cargar el horario pactado del worker (Fase 1.2). Defensivo contra
    // migration no aplicada: si las columnas no existen aún en la DB de
    // prod (despliegue intermedio), usamos defaults SIN crashear.
    let workerSchedule: { expectedClockInHour: number; expectedClockInMinute: number; lateToleranceMinutes: number } | null = null
    try {
      workerSchedule = await prisma.worker.findUnique({
        where: { id: ctx.workerId },
        select: {
          expectedClockInHour: true,
          expectedClockInMinute: true,
          lateToleranceMinutes: true,
        },
      })
    } catch (err) {
      // Migration de horarios no aplicada → usa defaults
      console.warn('[clock] schedule columns missing, using defaults', err instanceof Error ? err.message : err)
      workerSchedule = null
    }
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
    const oobNotes = buildOutOfBoundsNotes()
    let created
    try {
      created = await prisma.attendance.create({
        data: {
          orgId: ctx.orgId,
          workerId: ctx.workerId,
          workDate,
          clockIn: now,
          status,
          // Anti-fraude (PRO+): persistimos coords + selfie hash si vinieron
          geoLat: typeof body.lat === 'number' ? body.lat : null,
          geoLng: typeof body.lng === 'number' ? body.lng : null,
          geoAccuracy: typeof body.accuracy === 'number' ? body.accuracy : null,
          selfieHash: body.selfieHash ?? null,
          // Si fichó fuera de zona con motivo válido, queda con justification
          // pendiente de aprobación admin (Fase 2).
          notes: oobNotes,
        },
      })
    } catch (err) {
      console.error('[clock] attendance.create failed', err instanceof Error ? err.message : err)
      return NextResponse.json(
        {
          error: 'No se pudo registrar la marcación. Si el problema persiste, avisa a tu admin que aplique las migraciones de la base de datos.',
          code: 'DB_ERROR',
        },
        { status: 500 },
      )
    }

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

    void logAttempt({
      orgId: ctx.orgId,
      workerId: ctx.workerId,
      result: 'SUCCESS',
      reason: `clock-in ${status}`,
      via: 'qr',
      geo: geoForLog,
      ...reqMeta,
      metadata: { attendanceId: created.id, action: 'in' },
    })

    void recordAttendanceEvidence({
      attendanceId: created.id,
      orgId: ctx.orgId,
      workerId: ctx.workerId,
      type: 'clock_in',
      metadata: {
        via: 'qr',
        geofence: geofenceMatched ?? null,
        tokenIssuedAt: payload.issuedAt,
        geo: typeof body.lat === 'number' && typeof body.lng === 'number'
          ? { lat: body.lat, lng: body.lng, accuracy: body.accuracy ?? null }
          : null,
        selfieHash: body.selfieHash ?? null,
      },
    })

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

  // Detectar horas extras (Fase 1.3): si hoursWorked > jornadaSemanal/5
  // → marca isOvertime + persiste overtimeMinutes. La bonificación se calcula
  // al generar boleta usando estos campos.
  const workerJornada = await prisma.worker.findUnique({
    where: { id: ctx.workerId },
    select: { jornadaSemanal: true },
  })
  const overtime = calculateOvertime(hoursWorked, workerJornada?.jornadaSemanal ?? 48)

  // Defensivo: si las columnas isOvertime/overtimeMinutes no existen aún
  // en la DB (migration de Fase 1.3 no aplicada), reintentamos sin esos
  // campos en lugar de crashear.
  let updated
  try {
    updated = await prisma.attendance.update({
      where: { id: existingToday.id },
      data: {
        clockOut: now,
        hoursWorked,
        isOvertime: overtime.isOvertime,
        overtimeMinutes: overtime.isOvertime ? overtime.overtimeMinutes : null,
      },
    })
  } catch (err) {
    console.warn('[clock] overtime columns missing, retrying without', err instanceof Error ? err.message : err)
    try {
      updated = await prisma.attendance.update({
        where: { id: existingToday.id },
        data: { clockOut: now, hoursWorked },
      })
    } catch (err2) {
      console.error('[clock] attendance.update failed', err2 instanceof Error ? err2.message : err2)
      return NextResponse.json(
        {
          error: 'No se pudo registrar la salida. Si persiste, avisa a tu admin que aplique las migraciones.',
          code: 'DB_ERROR',
        },
        { status: 500 },
      )
    }
  }

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

  void logAttempt({
    orgId: ctx.orgId,
    workerId: ctx.workerId,
    result: 'SUCCESS',
    reason: `clock-out ${hoursWorked.toFixed(1)}h${overtime.isOvertime ? ` +${overtime.overtimeMinutes}min` : ''}`,
    via: 'qr',
    geo: geoForLog,
    ...reqMeta,
    metadata: { attendanceId: updated.id, action: 'out', hoursWorked, overtime: overtime.isOvertime },
  })

  void recordAttendanceEvidence({
    attendanceId: updated.id,
    orgId: ctx.orgId,
    workerId: ctx.workerId,
    type: 'clock_out',
    metadata: {
      via: 'qr',
      geofence: geofenceMatched ?? null,
      tokenIssuedAt: payload.issuedAt,
      hoursWorked: Number(hoursWorked.toFixed(2)),
      geo: typeof body.lat === 'number' && typeof body.lng === 'number'
        ? { lat: body.lat, lng: body.lng, accuracy: body.accuracy ?? null }
        : null,
    },
  })

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
