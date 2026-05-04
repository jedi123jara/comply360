/**
 * PATCH /api/attendance/[id]
 *
 * Operaciones sobre un registro individual de asistencia. Body:
 *   { op: 'justify', reason: string, files?: string[] }
 *     → permitido a WORKER (solo si es su propio registro) o ADMIN+
 *     → setea justification.{reason, files, requestedAt, requestedBy}
 *
 *   { op: 'approve', approved: boolean, comment?: string }
 *     → solo ADMIN+
 *     → setea approval.{approved, at, by, byName, comment}
 *     → NO cambia Attendance.status — la aprobación es un overlay
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import {
  parseAttendanceNotes,
  serializeAttendanceNotes,
  type AttendanceMetadata,
} from '@/lib/attendance/notes'
import {
  recordAttendanceApproval,
  recordAttendanceJustification,
} from '@/lib/attendance/structured-records'

export const PATCH = withAuthParams<{ id: string }>(async (
  req: NextRequest,
  ctx: AuthContext,
  params,
) => {
  const recordId = params.id
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const op = body.op

  // Cargar el registro y verificar org
  const record = await prisma.attendance.findUnique({
    where: { id: recordId },
    select: { id: true, orgId: true, workerId: true, status: true, notes: true },
  })
  if (!record || record.orgId !== ctx.orgId) {
    return NextResponse.json({ error: 'Registro de asistencia no encontrado' }, { status: 404 })
  }

  const meta = parseAttendanceNotes(record.notes)

  if (op === 'justify') {
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    if (reason.length < 3) {
      return NextResponse.json(
        { error: 'El motivo de la justificación requiere al menos 3 caracteres' },
        { status: 400 },
      )
    }
    if (reason.length > 500) {
      return NextResponse.json(
        { error: 'El motivo no debe superar los 500 caracteres' },
        { status: 400 },
      )
    }

    // Solo el dueño del registro o ADMIN+ pueden justificar
    const isAdmin = hasMinRole(ctx.role, 'ADMIN')
    if (!isAdmin) {
      // Verificar que el usuario es el worker dueño
      const worker = await prisma.worker.findFirst({
        where: { id: record.workerId, orgId: ctx.orgId, userId: ctx.userId },
        select: { id: true },
      })
      if (!worker) {
        return NextResponse.json(
          { error: 'No puedes justificar registros de otros trabajadores' },
          { status: 403 },
        )
      }
    }

    const files = Array.isArray(body.files)
      ? (body.files as unknown[]).filter((f): f is string => typeof f === 'string').slice(0, 5)
      : undefined

    const justification = {
      reason,
      ...(files && files.length > 0 ? { files } : {}),
      requestedAt: new Date().toISOString(),
      requestedBy: ctx.userId,
    }

    const newMeta: AttendanceMetadata = {
      ...meta,
      justification,
      // Si había aprobación previa, la limpiamos — al re-justificar vuelve a quedar
      // pendiente de aprobación.
      approval: undefined,
    }

    await prisma.attendance.update({
      where: { id: recordId },
      data: { notes: serializeAttendanceNotes(newMeta) },
    })

    await recordAttendanceJustification({
      attendanceId: recordId,
      orgId: record.orgId,
      workerId: record.workerId,
      reason,
      files,
      requestedBy: ctx.userId,
      requestedAt: new Date(justification.requestedAt),
    })

    return NextResponse.json({ ok: true, op, justification })
  }

  if (op === 'approve') {
    if (!hasMinRole(ctx.role, 'ADMIN')) {
      return NextResponse.json(
        { error: 'Se requiere rol ADMIN o superior para aprobar' },
        { status: 403 },
      )
    }
    if (record.status !== 'LATE' && record.status !== 'ABSENT') {
      return NextResponse.json(
        { error: 'Solo se pueden aprobar tardanzas o ausencias' },
        { status: 400 },
      )
    }
    if (!meta.justification) {
      return NextResponse.json(
        { error: 'Este registro aún no tiene justificación reportada' },
        { status: 400 },
      )
    }

    const approved = body.approved === true
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 500) : undefined

    // Buscar nombre del admin para guardar en byName (evita lookup en UI)
    const adminUser = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { firstName: true, lastName: true },
    })
    const byName = adminUser
      ? `${adminUser.firstName ?? ''} ${adminUser.lastName ?? ''}`.trim() || undefined
      : undefined

    const approval = {
      approved,
      at: new Date().toISOString(),
      by: ctx.userId,
      ...(byName ? { byName } : {}),
      ...(comment ? { comment } : {}),
    }

    const newMeta: AttendanceMetadata = {
      ...meta,
      approval,
    }

    await prisma.attendance.update({
      where: { id: recordId },
      data: { notes: serializeAttendanceNotes(newMeta) },
    })

    const latestJustification = await prisma.attendanceJustification.findFirst({
      where: { attendanceId: recordId, orgId: ctx.orgId },
      orderBy: { requestedAt: 'desc' },
      select: { id: true },
    }).catch(() => null)

    await recordAttendanceApproval({
      attendanceId: recordId,
      orgId: ctx.orgId,
      approved,
      comment,
      justificationId: latestJustification?.id,
      approvedBy: ctx.userId,
      approvedByName: byName,
      approvedAt: new Date(approval.at),
    })

    // AuditLog para trazabilidad SUNAFIL
    await prisma.auditLog.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: approved ? 'attendance.approved' : 'attendance.rejected',
        entityType: 'attendance',
        entityId: recordId,
        metadataJson: {
          status: record.status,
          workerId: record.workerId,
          comment: comment ?? null,
          justificationReason: meta.justification.reason,
        },
      },
    })

    return NextResponse.json({ ok: true, op, approval })
  }

  return NextResponse.json({ error: `Operación no reconocida: ${String(op)}` }, { status: 400 })
})
