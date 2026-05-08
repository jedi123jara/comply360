import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { puestoUpdateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/puestos/[id]
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo', 
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const puesto = await prisma.puestoTrabajo.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        sede: { select: { id: true, nombre: true, tipoInstalacion: true } },
        worker: { select: { id: true, firstName: true, lastName: true, dni: true } },
      },
    })

    if (!puesto) {
      return NextResponse.json({ error: 'Puesto no encontrado' }, { status: 404 })
    }
    return NextResponse.json({ puesto })
  },
)

// =============================================
// PATCH /api/sst/puestos/[id]
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('sst_completo', 
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = puestoUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.puestoTrabajo.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Puesto no encontrado' }, { status: 404 })
    }

    // Si se reasigna un workerId, validar pertenencia a la org
    if (parsed.data.workerId) {
      const worker = await prisma.worker.findFirst({
        where: { id: parsed.data.workerId, orgId: ctx.orgId },
        select: { id: true },
      })
      if (!worker) {
        return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
      }
    }

    const puesto = await prisma.puestoTrabajo.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json({ puesto })
  },
)

// =============================================
// DELETE /api/sst/puestos/[id] — solo ADMIN o superior
// =============================================
export const DELETE = withRoleParams<{ id: string }>(
  'ADMIN',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const existing = await prisma.puestoTrabajo.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Puesto no encontrado' }, { status: 404 })
    }
    await prisma.puestoTrabajo.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  },
)

