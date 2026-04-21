import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams, withRoleParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { generateWorkerAlerts } from '@/lib/alerts/alert-engine'
import { syncComplianceScore } from '@/lib/compliance/sync-score'

// =============================================
// GET /api/workers/[id] - Get worker detail
// =============================================
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, ctx: AuthContext, params) => {
  const { id } = params
  const orgId = ctx.orgId

  const worker = await prisma.worker.findUnique({
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

  const existing = await prisma.worker.findUnique({ where: { id } })
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

  const worker = await prisma.worker.update({
    where: { id },
    data: updateData,
  })

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
