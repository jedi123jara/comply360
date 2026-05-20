/**
 * /api/sst/capacitaciones — CRUD capacitaciones SST por trabajador.
 *
 * GET   ?workerId=X — lista capacitaciones (filtra por worker si se pasa)
 * POST            — registra una nueva capacitación + lista de asistentes
 * DELETE ?id=X    — elimina una capacitación
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  const workerId = new URL(req.url).searchParams.get('workerId')
  const rows = await prisma.workerCapacitacionSST.findMany({
    where: {
      orgId: ctx.orgId,
      ...(workerId ? { workerId } : {}),
    },
    orderBy: { fechaCapacitacion: 'desc' },
    include: {
      worker: {
        select: { id: true, firstName: true, lastName: true, dni: true },
      },
    },
  })
  return NextResponse.json({ capacitaciones: rows })
})

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const {
      workerIds,
      tipo,
      fechaCapacitacion,
      duracionHoras,
      temario,
      instructorNombre,
      instructorEmpresa,
      certificadoUrl,
      firmaWorkerUrl,
      evidenciaFotoUrl,
      observaciones,
    } = body as {
      workerIds: string[]
      tipo: string
      fechaCapacitacion: string
      duracionHoras: number
      temario: string
      instructorNombre?: string
      instructorEmpresa?: string
      certificadoUrl?: string
      firmaWorkerUrl?: string
      evidenciaFotoUrl?: string
      observaciones?: string
    }
    if (!Array.isArray(workerIds) || workerIds.length === 0) {
      return NextResponse.json({ error: 'workerIds requerido' }, { status: 400 })
    }
    if (!tipo || !fechaCapacitacion || !temario) {
      return NextResponse.json({ error: 'tipo, fechaCapacitacion y temario requeridos' }, { status: 400 })
    }
    const fecha = new Date(fechaCapacitacion)
    const created = await prisma.workerCapacitacionSST.createMany({
      data: workerIds.map((workerId) => ({
        orgId: ctx.orgId,
        workerId,
        tipo,
        fechaCapacitacion: fecha,
        duracionHoras,
        temario,
        instructorNombre: instructorNombre ?? null,
        instructorEmpresa: instructorEmpresa ?? null,
        certificadoUrl: certificadoUrl ?? null,
        firmaWorkerUrl: firmaWorkerUrl ?? null,
        evidenciaFotoUrl: evidenciaFotoUrl ?? null,
        observaciones: observaciones ?? null,
      })),
    })
    return NextResponse.json({ created: created.count }, { status: 201 })
  } catch (err) {
    console.error('[sst/capacitaciones POST]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})

export const DELETE = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await prisma.workerCapacitacionSST.deleteMany({ where: { id, orgId: ctx.orgId } })
  return NextResponse.json({ deleted: true })
})
