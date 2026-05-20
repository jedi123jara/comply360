/**
 * /api/sst/epp — CRUD entregas de EPP por trabajador.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

export const runtime = 'nodejs'

export const GET = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  const workerId = new URL(req.url).searchParams.get('workerId')
  const rows = await prisma.workerEPP.findMany({
    where: { orgId: ctx.orgId, ...(workerId ? { workerId } : {}) },
    orderBy: { fechaEntrega: 'desc' },
    include: { worker: { select: { firstName: true, lastName: true, dni: true } } },
  })
  return NextResponse.json({ epps: rows })
})

export const POST = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  try {
    const body = await req.json()
    const {
      workerIds,
      tipoEpp,
      marca,
      modelo,
      fechaEntrega,
      cantidadEntregada,
      fechaVencimiento,
      evidenciaFotoUrl,
      firmaWorkerUrl,
      observaciones,
    } = body as {
      workerIds: string[]
      tipoEpp: string
      marca?: string
      modelo?: string
      fechaEntrega: string
      cantidadEntregada?: number
      fechaVencimiento?: string
      evidenciaFotoUrl?: string
      firmaWorkerUrl?: string
      observaciones?: string
    }
    if (!Array.isArray(workerIds) || workerIds.length === 0) {
      return NextResponse.json({ error: 'workerIds requerido' }, { status: 400 })
    }
    if (!tipoEpp || !fechaEntrega) {
      return NextResponse.json({ error: 'tipoEpp y fechaEntrega requeridos' }, { status: 400 })
    }
    const created = await prisma.workerEPP.createMany({
      data: workerIds.map((workerId) => ({
        orgId: ctx.orgId,
        workerId,
        tipoEpp,
        marca: marca ?? null,
        modelo: modelo ?? null,
        fechaEntrega: new Date(fechaEntrega),
        cantidadEntregada: cantidadEntregada ?? 1,
        fechaVencimiento: fechaVencimiento ? new Date(fechaVencimiento) : null,
        evidenciaFotoUrl: evidenciaFotoUrl ?? null,
        firmaWorkerUrl: firmaWorkerUrl ?? null,
        observaciones: observaciones ?? null,
      })),
    })
    return NextResponse.json({ created: created.count }, { status: 201 })
  } catch (err) {
    console.error('[sst/epp POST]', err)
    return NextResponse.json({ error: 'Failed', detail: String(err) }, { status: 500 })
  }
})

export const DELETE = withPlanGate('diagnostico', async (req: NextRequest, ctx: AuthContext) => {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
  await prisma.workerEPP.deleteMany({ where: { id, orgId: ctx.orgId } })
  return NextResponse.json({ deleted: true })
})
