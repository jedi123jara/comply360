import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams, withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'
import { logWorkerChanges, logWorkerCese } from '@/lib/workers/history'

// =============================================
// GET /api/workers/[id] - Get worker detail
//
// Defensivo (2026-04-29): si la migration de campos nuevos (expectedClockInHour,
// isOvertime en includes, etc) no se aplicó en la DB, el `include` con SELECT
// implícito de todas las columnas truena con 500. Este handler intenta primero
// el query completo; si falla por columnas faltantes, cae a un select explícito
// con SOLO los campos legacy que sabemos que existen.
// =============================================
export const GET = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId
  // Soft delete bypass: solo OWNER/SUPER_ADMIN pueden abrir el perfil de un
  // trabajador con `deletedAt != null`. Lo demás reciben 404.
  const url = new URL(req.url)
  const requestedIncluirCesados = url.searchParams.get('incluirCesados') === 'true'
  const canSeeDeleted = ctx.role === 'OWNER' || ctx.role === 'SUPER_ADMIN'
  const includeDeleted = requestedIncluirCesados && canSeeDeleted

  // Fields legacy que existían antes de las migrations de Fase 1.2/1.3.
  // Si las nuevas columnas no están en la DB, este select sigue funcionando.
  const SAFE_WORKER_SELECT = {
    id: true,
    orgId: true,
    userId: true,
    dni: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    birthDate: true,
    gender: true,
    nationality: true,
    address: true,
    position: true,
    department: true,
    regimenLaboral: true,
    tipoContrato: true,
    fechaIngreso: true,
    fechaCese: true,
    motivoCese: true,
    sueldoBruto: true,
    asignacionFamiliar: true,
    jornadaSemanal: true,
    tiempoCompleto: true,
    tipoAporte: true,
    afpNombre: true,
    cuspp: true,
    essaludVida: true,
    sctr: true,
    status: true,
    legajoScore: true,
    photoUrl: true,
    bio: true,
    createdAt: true,
    updatedAt: true,
    documents: {
      orderBy: { createdAt: 'desc' as const },
    },
    workerContracts: {
      include: {
        contract: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    },
    vacations: {
      orderBy: { periodoInicio: 'desc' as const },
    },
    alerts: {
      where: { resolvedAt: null },
      orderBy: { createdAt: 'desc' as const },
    },
  }

  let worker
  try {
    // Intento 1: query con include completo (incluye campos nuevos via SELECT *)
    worker = await prisma.worker.findUnique({
      where: { id },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        workerContracts: {
          include: {
            contract: {
              select: {
                id: true,
                title: true,
                type: true,
                status: true,
                expiresAt: true,
                createdAt: true,
              },
            },
          },
        },
        vacations: {
          orderBy: { periodoInicio: 'desc' },
        },
        alerts: {
          where: { resolvedAt: null },
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  } catch (err) {
    console.warn('[workers/GET] include query failed, fallback to safe select', err instanceof Error ? err.message : err)
    try {
      worker = await prisma.worker.findUnique({
        where: { id },
        select: SAFE_WORKER_SELECT,
      })
    } catch (err2) {
      console.error('[workers/GET] fallback select also failed', err2 instanceof Error ? err2.message : err2)
      return NextResponse.json(
        {
          error: 'No se pudo cargar el trabajador. La base de datos necesita actualizarse — pídele a tu admin que abra /admin/db-sync y aplique los cambios pendientes.',
          code: 'DB_SCHEMA_MISMATCH',
        },
        { status: 500 },
      )
    }
  }

  if (!worker || worker.orgId !== orgId) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }
  // Soft delete: ocultar si está borrado y el caller no tiene permiso ni opt-in.
  // `worker as any` porque `SAFE_WORKER_SELECT` no incluye deletedAt para DBs
  // pre-migration; la columna nueva siempre vendrá vía include.
  const deletedAt = (worker as { deletedAt?: Date | null }).deletedAt ?? null
  if (deletedAt && !includeDeleted) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  return NextResponse.json({
    data: {
      ...worker,
      sueldoBruto: Number(worker.sueldoBruto),
      fechaIngreso: worker.fechaIngreso.toISOString(),
      fechaCese: worker.fechaCese?.toISOString() ?? null,
      birthDate: worker.birthDate?.toISOString() ?? null,
      createdAt: worker.createdAt.toISOString(),
      updatedAt: worker.updatedAt.toISOString(),
      deletedAt: deletedAt?.toISOString() ?? null,
    },
  })
})

// =============================================
// PUT /api/workers/[id] - Update worker
// =============================================
export const PUT = withAuthParams<{ id: string }>(async (req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId
  const body = await req.json()

  // Defensivo: select explícito SIN las columnas nuevas (Fase 1.2 schedule)
  // para que el findUnique no truene si la migration no se aplicó.
  let existing: {
    id: string
    orgId: string
    status: string
    expectedClockInHour?: number
    expectedClockInMinute?: number
    expectedClockOutHour?: number
    expectedClockOutMinute?: number
    lateToleranceMinutes?: number
  } | null = null
  try {
    existing = await prisma.worker.findUnique({
      where: { id },
      select: {
        id: true,
        orgId: true,
        status: true,
        expectedClockInHour: true,
        expectedClockInMinute: true,
        expectedClockOutHour: true,
        expectedClockOutMinute: true,
        lateToleranceMinutes: true,
      },
    })
  } catch {
    // Columnas de schedule no existen → fallback a select básico
    try {
      const fallback = await prisma.worker.findUnique({
        where: { id },
        select: { id: true, orgId: true, status: true },
      })
      existing = fallback
    } catch (err2) {
      console.error('[workers/PUT] findUnique failed', err2 instanceof Error ? err2.message : err2)
      return NextResponse.json(
        {
          error: 'No se pudo cargar el trabajador. La base de datos necesita actualizarse desde /admin/db-sync',
          code: 'DB_SCHEMA_MISMATCH',
        },
        { status: 500 },
      )
    }
  }
  if (!existing || existing.orgId !== orgId) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  // Build update data — only include fields that were sent
  const updateData: Record<string, unknown> = {}
  const stringFields = [
    'firstName', 'lastName', 'email', 'phone', 'gender',
    'nationality', 'address', 'position', 'department',
    'motivoCese', 'afpNombre', 'cuspp',
  ]
  for (const field of stringFields) {
    if (field in body) updateData[field] = body[field] || null
  }
  const enumFields = ['regimenLaboral', 'tipoContrato', 'tipoAporte', 'status']
  for (const field of enumFields) {
    if (field in body) updateData[field] = body[field]
  }
  // SECURITY: Validate numeric fields to prevent negative/absurd values
  if ('sueldoBruto' in body) {
    const sueldo = Number(body.sueldoBruto)
    if (isNaN(sueldo) || sueldo <= 0 || sueldo >= 1_000_000) {
      return NextResponse.json({ error: 'sueldoBruto debe ser mayor a 0 y menor a 1,000,000' }, { status: 400 })
    }
    updateData.sueldoBruto = sueldo
  }
  if ('asignacionFamiliar' in body) updateData.asignacionFamiliar = body.asignacionFamiliar
  if ('jornadaSemanal' in body) {
    const jornada = Number(body.jornadaSemanal)
    if (isNaN(jornada) || jornada < 1 || jornada > 48) {
      return NextResponse.json({ error: 'jornadaSemanal debe ser entre 1 y 48' }, { status: 400 })
    }
    updateData.jornadaSemanal = jornada
  }
  if ('tiempoCompleto' in body) updateData.tiempoCompleto = body.tiempoCompleto
  if ('essaludVida' in body) updateData.essaludVida = body.essaludVida
  if ('sctr' in body) updateData.sctr = body.sctr
  if ('birthDate' in body) updateData.birthDate = body.birthDate ? new Date(body.birthDate) : null
  if ('fechaIngreso' in body) updateData.fechaIngreso = new Date(body.fechaIngreso)
  if ('fechaCese' in body) updateData.fechaCese = body.fechaCese ? new Date(body.fechaCese) : null

  // Horario laboral pactado (Fase 1.2). Cada campo se valida individualmente
  // y solo se actualiza si fue enviado.
  const scheduleIntFields: { field: string; min: number; max: number; label: string }[] = [
    { field: 'expectedClockInHour', min: 0, max: 23, label: 'Hora de entrada' },
    { field: 'expectedClockInMinute', min: 0, max: 59, label: 'Minuto de entrada' },
    { field: 'expectedClockOutHour', min: 0, max: 23, label: 'Hora de salida' },
    { field: 'expectedClockOutMinute', min: 0, max: 59, label: 'Minuto de salida' },
    { field: 'lateToleranceMinutes', min: 0, max: 120, label: 'Tolerancia' },
  ]
  for (const { field, min, max, label } of scheduleIntFields) {
    if (field in body) {
      const v = Number(body[field])
      if (!Number.isInteger(v) || v < min || v > max) {
        return NextResponse.json(
          { error: `${label} debe ser un entero entre ${min} y ${max}` },
          { status: 400 },
        )
      }
      updateData[field] = v
    }
  }
  // Validación cruzada: entrada < salida si se tocó alguno.
  // Si `existing` no trae los campos de schedule (DB pre-migration), usamos
  // defaults conservadores (8:00 - 17:00).
  const tocaSchedule = scheduleIntFields.some(({ field }) => field in body)
  if (tocaSchedule) {
    const newInHour = (updateData.expectedClockInHour as number | undefined) ?? existing.expectedClockInHour ?? 8
    const newInMinute = (updateData.expectedClockInMinute as number | undefined) ?? existing.expectedClockInMinute ?? 0
    const newOutHour = (updateData.expectedClockOutHour as number | undefined) ?? existing.expectedClockOutHour ?? 17
    const newOutMinute = (updateData.expectedClockOutMinute as number | undefined) ?? existing.expectedClockOutMinute ?? 0
    const inMin = newInHour * 60 + newInMinute
    const outMin = newOutHour * 60 + newOutMinute
    if (outMin <= inMin) {
      return NextResponse.json(
        { error: 'La hora de salida debe ser posterior a la de entrada' },
        { status: 400 },
      )
    }
  }

  // Capturar snapshot ANTES del update para el hook de history.
  // Best-effort: si falla, seguimos con el update sin loguear historia.
  let beforeSnapshot: Record<string, unknown> | null = null
  try {
    beforeSnapshot = await prisma.worker.findUnique({
      where: { id },
      select: {
        sueldoBruto: true,
        position: true,
        department: true,
        regimenLaboral: true,
        tipoContrato: true,
        tipoAporte: true,
        afpNombre: true,
        jornadaSemanal: true,
        tiempoCompleto: true,
        expectedClockInHour: true,
        expectedClockInMinute: true,
        expectedClockOutHour: true,
        expectedClockOutMinute: true,
        lateToleranceMinutes: true,
        status: true,
        asignacionFamiliar: true,
        discapacidad: true,
        discapacidadCertificado: true,
        condicionEspecial: true,
        flagTRegistroPresentado: true,
      },
    }) as Record<string, unknown> | null
  } catch {
    // pre-migration DB → no logueamos historia esta vez, sin bloquear PUT
    beforeSnapshot = null
  }

  let worker
  try {
    worker = await prisma.worker.update({
      where: { id },
      data: updateData,
    })
  } catch (err) {
    console.error('[workers/PUT] update failed', { id, fields: Object.keys(updateData), err })

    // Si está fallando por columnas de schedule no aplicadas:
    //   - Si SOLO mandó campos de schedule → mensaje claro inmediato (no hay
    //     más que guardar, así que no tiene sentido reintentar).
    //   - Si mandó schedule + otros campos → reintenta SIN schedule para que
    //     al menos los otros se guarden.
    if (tocaSchedule) {
      const fallbackData = { ...updateData }
      for (const { field } of scheduleIntFields) {
        delete fallbackData[field]
      }
      // Si NO queda nada que guardar, mensaje claro
      if (Object.keys(fallbackData).length === 0) {
        return NextResponse.json(
          {
            error: 'El horario laboral no se puede guardar todavía. Tu base de datos necesita un sync — entra a /admin/db-sync, dale click al botón ámbar y vuelve a intentar.',
            code: 'DB_SCHEMA_NEEDS_SYNC',
            requiresSync: true,
          },
          { status: 422 },
        )
      }
      // Hay otros campos → reintentar sin schedule
      try {
        worker = await prisma.worker.update({ where: { id }, data: fallbackData })
        return NextResponse.json({
          data: worker,
          warning: 'El horario laboral no se pudo guardar (DB necesita sync desde /admin/db-sync). Los demás cambios sí se guardaron.',
        })
      } catch (err2) {
        console.error('[workers/PUT] fallback update also failed', err2)
      }
    }

    return NextResponse.json(
      {
        error: 'No se pudo guardar el cambio. Aplica el sync desde /admin/db-sync',
        code: 'DB_UPDATE_ERROR',
        detail: err instanceof Error ? err.message.slice(0, 300) : String(err),
      },
      { status: 500 },
    )
  }

  // Recompute alerts — fechaIngreso/regimen/sueldo/status changes all affect alert state.
  // Never block the update if alerting throws.
  try {
    await generateWorkerAlerts(worker.id)
  } catch (err) {
    console.error('[workers/PUT] generateWorkerAlerts failed', { workerId: worker.id, err })
  }

  // Hook de historia (Ola 2): registra cambios trackeados en WorkerHistoryEvent.
  // Best-effort: si falla, no bloquea la respuesta.
  if (beforeSnapshot) {
    try {
      await logWorkerChanges({
        workerId: worker.id,
        orgId,
        before: beforeSnapshot,
        after: worker as unknown as Record<string, unknown>,
        triggeredBy: ctx.userId,
        reason: typeof body.reason === 'string' ? body.reason.slice(0, 500) : undefined,
        evidenceUrl: typeof body.evidenceUrl === 'string' ? body.evidenceUrl : undefined,
      })
    } catch (err) {
      console.error('[workers/PUT] logWorkerChanges failed', { workerId: worker.id, err })
    }
  }

  // Fire-and-forget compliance score recalculation
  syncComplianceScore(orgId).catch(() => {})

  return NextResponse.json({ data: worker })
})

// =============================================
// DELETE /api/workers/[id] - Soft delete worker (Ola 1, 2026-05)
//
// Comportamiento:
//   1. Marca status = TERMINATED + fechaCese (compatibilidad con código legacy)
//   2. Marca deletedAt + deletedBy + deleteReason (Ley 27444, trazabilidad 6 años)
//   3. Limpia alertas no resueltas (un cesado no sigue alertando)
//   4. Registra evento CESE en WorkerHistoryEvent
//   5. Cascade soft: documents/contracts/payslips siguen accesibles solo en
//      vista filtrada de OWNER/SUPER_ADMIN. La huella legal (boletas/contratos
//      firmados con biometría) NUNCA se borra — su hash en AuditLog persiste.
// =============================================
export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

  // Permite ?reason=... (querystring) o body { reason } para registrar el motivo.
  const url = new URL(req.url)
  let reason = url.searchParams.get('reason') ?? undefined
  if (!reason) {
    try {
      const body = await req.json().catch(() => null)
      if (body && typeof body.reason === 'string') reason = body.reason.slice(0, 500)
    } catch {
      // ignore — body opcional
    }
  }

  const existing = await prisma.worker.findUnique({
    where: { id },
    select: { id: true, orgId: true, deletedAt: true },
  })
  if (!existing || existing.orgId !== orgId) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }
  if (existing.deletedAt) {
    // Ya está soft-deleted — idempotencia
    return NextResponse.json({ success: true, alreadyDeleted: true })
  }

  const now = new Date()
  await prisma.worker.update({
    where: { id },
    data: {
      status: 'TERMINATED',
      fechaCese: now,
      deletedAt: now,
      deletedBy: ctx.userId,
      deleteReason: reason ?? null,
    },
  })

  // Limpia alertas activas — el cesado no sigue triggereando deadlines.
  await prisma.workerAlert.deleteMany({
    where: { workerId: id, resolvedAt: null },
  })

  // Registra evento CESE en historia (Ola 2). Best-effort.
  await logWorkerCese({
    workerId: id,
    orgId,
    triggeredBy: ctx.userId,
    reason,
  })

  return NextResponse.json({ success: true })
})
