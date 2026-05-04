/**
 * POST /api/attendance/clock-by-code
 *
 * Backup del flujo QR para trabajadores sin smartphone.
 * Body: { dni, pin (4 dígitos), shortCode (6 chars del QR visible), action? }
 *
 * Flujo:
 *   1. Resolver org por shortCode persistido y vigente
 *   2. Buscar Worker por DNI en esa org
 *   3. Verificar PIN
 *   4. Validar modo del shortCode (entrada/salida/ambos)
 *   5. Registrar Attendance con `via='code'` en metadata
 *
 * Auth: PÚBLICO (no Clerk session). Rate-limit 3/min por DNI para anti brute-force.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isValidPinFormat, verifyPin } from '@/lib/attendance/pin'
import { findActiveQrSessionByShortCode } from '@/lib/attendance/qr-session'
import { deriveAttendanceStatusFromSchedule } from '@/lib/attendance/schedule'
import { attendanceLockKey, workDateFor } from '@/lib/attendance/local-date'
import { calculateOvertime } from '@/lib/attendance/overtime'
import { logAttempt, extractRequestMetadata } from '@/lib/attendance/log-attempt'
import { recordAttendanceEvidence } from '@/lib/attendance/structured-records'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

const pinLimiter = rateLimit({ interval: 60_000, limit: 3 })

export async function POST(req: NextRequest) {
  let body: { dni?: string; pin?: string; shortCode?: string; action?: 'in' | 'out' }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const dni = (body.dni ?? '').trim()
  const pin = (body.pin ?? '').trim()
  const shortCode = (body.shortCode ?? '').trim().toUpperCase()
  const reqMeta = extractRequestMetadata(req)

  if (!/^\d{8}$/.test(dni)) {
    return NextResponse.json({ error: 'DNI debe tener 8 dígitos', code: 'INVALID_DNI' }, { status: 400 })
  }
  if (!isValidPinFormat(pin)) {
    return NextResponse.json({ error: 'PIN debe tener 4 dígitos', code: 'INVALID_PIN' }, { status: 400 })
  }
  if (!/^[A-Z0-9]{6}$/.test(shortCode)) {
    return NextResponse.json(
      { error: 'Código de 6 caracteres requerido (visible debajo del QR)', code: 'INVALID_CODE' },
      { status: 400 },
    )
  }

  // Rate limit por DNI: máximo 3 intentos por minuto
  const limit = await pinLimiter.check(req, `pin:${dni}`)
  if (!limit.success) {
    return NextResponse.json(
      {
        error: 'Demasiados intentos. Espera 1 minuto antes de reintentar.',
        code: 'RATE_LIMIT',
        resetIn: Math.ceil((limit.reset - Date.now()) / 1000),
      },
      { status: 429 },
    )
  }

  const session = await findActiveQrSessionByShortCode({ shortCode })
  if (!session) {
    return NextResponse.json(
      { error: 'Código expirado o inválido. Pide a tu supervisor un código nuevo.', code: 'CODE_EXPIRED' },
      { status: 401 },
    )
  }

  // Buscar Worker por DNI dentro de la org determinada por el código vigente.
  const worker = await prisma.worker.findFirst({
    where: { dni, orgId: session.orgId, status: 'ACTIVE' },
    select: {
      id: true,
      orgId: true,
      firstName: true,
      lastName: true,
      attendancePin: true,
      expectedClockInHour: true,
      expectedClockInMinute: true,
      lateToleranceMinutes: true,
      jornadaSemanal: true,
    },
  })

  if (!worker || !worker.attendancePin) {
    void logAttempt({
      orgId: session.orgId,
      result: 'WORKER_NOT_FOUND',
      reason: 'DNI no encontrado o sin PIN para shortCode vigente',
      via: 'code',
      ...reqMeta,
      metadata: { dni, shortCode, qrSessionId: session.id },
    })
    // Mensaje genérico para no filtrar si el DNI existe o no
    return NextResponse.json(
      { error: 'DNI o PIN incorrectos', code: 'INVALID_CREDENTIALS' },
      { status: 401 },
    )
  }

  const oneMinuteAgo = new Date(Date.now() - 60_000)
  const recentPinFailures = await prisma.attendanceAttempt.count({
    where: {
      orgId: worker.orgId,
      workerId: worker.id,
      result: 'PIN_WRONG',
      createdAt: { gte: oneMinuteAgo },
    },
  })
  if (recentPinFailures >= 3) {
    void logAttempt({
      orgId: worker.orgId,
      workerId: worker.id,
      result: 'RATE_LIMITED',
      reason: 'Demasiados PIN incorrectos en 60s',
      via: 'code',
      ...reqMeta,
      metadata: { dni, shortCode, qrSessionId: session.id },
    })
    return NextResponse.json(
      { error: 'Demasiados intentos. Espera 1 minuto antes de reintentar.', code: 'RATE_LIMIT' },
      { status: 429 },
    )
  }

  // Validar PIN
  const pinOk = verifyPin(pin, worker.attendancePin, worker.orgId)
  if (!pinOk) {
    void logAttempt({
      orgId: worker.orgId,
      workerId: worker.id,
      result: 'PIN_WRONG',
      reason: 'PIN incorrecto',
      via: 'code',
      ...reqMeta,
      metadata: { dni, shortCode, qrSessionId: session.id },
    })
    return NextResponse.json(
      { error: 'DNI o PIN incorrectos', code: 'INVALID_CREDENTIALS' },
      { status: 401 },
    )
  }

  const now = new Date()
  const workDate = workDateFor(now)
  const lockKey = attendanceLockKey(worker.orgId, worker.id, workDate)

  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`

    const existingToday = await tx.attendance.findFirst({
      where: {
        workerId: worker.id,
        orgId: worker.orgId,
        workDate,
      },
      orderBy: { clockIn: 'desc' },
    })

    let action: 'in' | 'out'
    if (body.action === 'in' || body.action === 'out') {
      action = body.action
    } else {
      action = existingToday && !existingToday.clockOut ? 'out' : 'in'
    }

    if (session.mode !== 'both' && session.mode !== action) {
      return NextResponse.json(
        {
          error: `Este código solo permite marcar ${session.mode === 'in' ? 'ENTRADA' : 'SALIDA'}.`,
          code: 'MODE_MISMATCH',
        },
        { status: 400 },
      )
    }

    if (action === 'in') {
      if (existingToday && !existingToday.clockOut) {
        return NextResponse.json(
          { error: 'Ya marcaste entrada hoy.', code: 'ALREADY_CLOCKED_IN' },
          { status: 409 },
        )
      }
      if (existingToday && existingToday.clockOut) {
        return NextResponse.json(
          { error: 'Ya completaste entrada y salida hoy.', code: 'DAY_COMPLETE' },
          { status: 409 },
        )
      }

      const status = deriveAttendanceStatusFromSchedule(now, {
        expectedClockInHour: worker.expectedClockInHour,
        expectedClockInMinute: worker.expectedClockInMinute,
        lateToleranceMinutes: session.graceMinutes ?? worker.lateToleranceMinutes,
      })
      const created = await tx.attendance.create({
        data: {
          orgId: worker.orgId,
          workerId: worker.id,
          workDate,
          clockIn: now,
          status,
        },
      })

      await tx.auditLog
        .create({
          data: {
            orgId: worker.orgId,
            action: 'attendance.clock_in',
            entityType: 'Attendance',
            entityId: created.id,
            metadataJson: {
              workerId: worker.id,
              dni,
              via: 'code',
              shortCode,
              qrSessionId: session.id,
            },
          },
        })
        .catch(() => null)

      void logAttempt({
        orgId: worker.orgId,
        workerId: worker.id,
        result: 'SUCCESS',
        reason: `clock-in ${status}`,
        via: 'code',
        ...reqMeta,
        metadata: { attendanceId: created.id, shortCode, qrSessionId: session.id, action: 'in' },
      })

      void recordAttendanceEvidence({
        attendanceId: created.id,
        orgId: worker.orgId,
        workerId: worker.id,
        type: 'clock_in',
        metadata: { via: 'code', shortCode, qrSessionId: session.id },
      })

      return NextResponse.json({
        success: true,
        action: 'in',
        status,
        worker: { firstName: worker.firstName, lastName: worker.lastName },
        message: status === 'LATE' ? 'Entrada registrada con tardanza.' : 'Entrada registrada a tiempo.',
      })
    }

    // CLOCK-OUT
    if (!existingToday) {
      return NextResponse.json(
        { error: 'No tienes entrada registrada hoy. Marca entrada primero.', code: 'NO_CLOCK_IN' },
        { status: 409 },
      )
    }
    if (existingToday.clockOut) {
      return NextResponse.json({ error: 'Ya marcaste salida hoy.', code: 'ALREADY_CLOCKED_OUT' }, { status: 409 })
    }

    const hoursWorked = (now.getTime() - existingToday.clockIn.getTime()) / (1000 * 60 * 60)
    const overtime = calculateOvertime(hoursWorked, worker.jornadaSemanal ?? 48)

    const updated = await tx.attendance.update({
      where: { id: existingToday.id },
      data: {
        clockOut: now,
        hoursWorked,
        isOvertime: overtime.isOvertime,
        overtimeMinutes: overtime.isOvertime ? overtime.overtimeMinutes : null,
      },
    })

    await tx.auditLog
      .create({
        data: {
          orgId: worker.orgId,
          action: 'attendance.clock_out',
          entityType: 'Attendance',
          entityId: updated.id,
          metadataJson: {
            workerId: worker.id,
            dni,
            via: 'code',
            shortCode,
            qrSessionId: session.id,
            hoursWorked: Number(hoursWorked.toFixed(2)),
          },
        },
      })
      .catch(() => null)

    void logAttempt({
      orgId: worker.orgId,
      workerId: worker.id,
      result: 'SUCCESS',
      reason: `clock-out ${hoursWorked.toFixed(1)}h`,
      via: 'code',
      ...reqMeta,
      metadata: { attendanceId: updated.id, shortCode, qrSessionId: session.id, action: 'out' },
    })

    void recordAttendanceEvidence({
      attendanceId: updated.id,
      orgId: worker.orgId,
      workerId: worker.id,
      type: 'clock_out',
      metadata: {
        via: 'code',
        shortCode,
        qrSessionId: session.id,
        hoursWorked: Number(hoursWorked.toFixed(2)),
      },
    })

    return NextResponse.json({
      success: true,
      action: 'out',
      worker: { firstName: worker.firstName, lastName: worker.lastName },
      hoursWorked: Number(hoursWorked.toFixed(2)),
      message: `Salida registrada. Trabajaste ${hoursWorked.toFixed(1)}h hoy.`,
    })
  })
}
