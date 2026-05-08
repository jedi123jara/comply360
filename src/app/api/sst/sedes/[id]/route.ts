import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withRoleParams } from '@/lib/api-auth'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { sedeUpdateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/sedes/[id]
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const sede = await prisma.sede.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        puestos: {
          orderBy: { nombre: 'asc' },
          include: {
            worker: { select: { id: true, firstName: true, lastName: true, dni: true } },
          },
        },
        iperBases: {
          orderBy: { version: 'desc' },
          select: {
            id: true,
            version: true,
            estado: true,
            fechaAprobacion: true,
            createdAt: true,
            _count: { select: { filas: true } },
          },
        },
        _count: { select: { accidentes: true, visitas: true } },
      },
    })

    if (!sede) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }
    return NextResponse.json({ sede })
  },
)

// =============================================
// PATCH /api/sst/sedes/[id]
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('sst_completo',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = sedeUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.sede.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    const sede = await prisma.sede.update({
      where: { id },
      data: {
        ...parsed.data,
        // Limpiar opcionales nulos: Zod transforma "" → undefined ya, no se requiere extra.
      },
    })

    return NextResponse.json({ sede })
  },
)

// =============================================
// DELETE /api/sst/sedes/[id] — solo ADMIN o superior
// =============================================
export const DELETE = withRoleParams<{ id: string }>(
  'ADMIN',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const existing = await prisma.sede.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        _count: { select: { iperBases: true, accidentes: true, visitas: true } },
      },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
    }

    // Bloquear borrado si tiene IPERC, accidentes o visitas asociadas (audit trail)
    const counts = existing._count
    if (counts.iperBases > 0 || counts.accidentes > 0 || counts.visitas > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar la sede porque tiene registros SST asociados. Marca la sede como inactiva en su lugar.',
          counts,
        },
        { status: 409 },
      )
    }

    await prisma.sede.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  },
)
