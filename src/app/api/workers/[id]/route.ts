import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams, withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'

// =============================================
// GET /api/workers/[id] - Get worker detail
//
// Defensivo (2026-04-29): si la migration de campos nuevos (expectedClockInHour,
// isOvertime en includes, etc) no se aplicó en la DB, el `include` con SELECT
// implícito de todas las columnas truena con 500. Este handler intenta primero
// el query completo; si falla por columnas faltantes, cae a un select explícito
// con SOLO los campos legacy que sabemos que existen.
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

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
          error: 'No se pudo cargar el trabajador. La base de datos necesita actualizarse — pídele a tu admin que abra /dashboard/admin/db-sync y aplique los cambios pendientes.',
          code: 'DB_SCHEMA_MISMATCH',
        },
        { status: 500 },
      )
    }
  }

  if (!worker || worker.orgId !== orgId) {
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
          error: 'No se pudo cargar el trabajador. La base de datos necesita actualizarse desde /dashboard/admin/db-sync',
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

  let worker
  try {
    worker = await prisma.worker.update({
      where: { id },
      data: updateData,
    })
  } catch (err) {
    console.error('[workers/PUT] update failed', { id, fields: Object.keys(updateData), err })
    // Si está fallando por columnas de schedule no aplicadas, reintentamos
    // sin esos campos para que al menos lo demás se guarde.
    if (tocaSchedule && Object.keys(updateData).length > scheduleIntFields.length) {
      const fallbackData = { ...updateData }
      for (const { field } of scheduleIntFields) {
        delete fallbackData[field]
      }
      try {
        worker = await prisma.worker.update({ where: { id }, data: fallbackData })
        return NextResponse.json({
          data: worker,
          warning: 'El horario laboral no se pudo guardar (DB no actualizada). Aplica el sync desde /dashboard/admin/db-sync. Los demás cambios sí se guardaron.',
        })
      } catch (err2) {
        console.error('[workers/PUT] fallback update also failed', err2)
      }
    }
    return NextResponse.json(
      {
        error: 'No se pudo guardar el cambio. La base de datos puede necesitar actualizarse desde /dashboard/admin/db-sync',
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

  // Fire-and-forget compliance score recalculation
  syncComplianceScore(orgId).catch(() => {})

  return NextResponse.json({ data: worker })
})

// =============================================
// DELETE /api/workers/[id] - Delete worker
// =============================================
export const DELETE = withRoleParams<{ id: string }>('ADMIN', async (_req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

  const existing = await prisma.worker.findUnique({ where: { id } })
  if (!existing || existing.orgId !== orgId) {
    return NextResponse.json({ error: 'Worker not found' }, { status: 404 })
  }

  // Soft delete — mark as terminated
  await prisma.worker.update({
    where: { id },
    data: {
      status: 'TERMINATED',
      fechaCese: new Date(),
    },
  })

  // Clear unresolved alerts — a terminated worker no longer triggers compliance deadlines.
  await prisma.workerAlert.deleteMany({
    where: { workerId: id, resolvedAt: null },
  })

  return NextResponse.json({ success: true })
})
