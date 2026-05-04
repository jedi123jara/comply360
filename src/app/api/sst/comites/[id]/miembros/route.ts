import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { miembroCreateSchema } from '@/lib/sst/schemas'

// =============================================
// POST /api/sst/comites/[id]/miembros — Agregar miembro al comité
// Validaciones:
//   - El comité debe pertenecer a la org del usuario.
//   - El worker debe pertenecer a la org y estar ACTIVE.
//   - No puede haber dos PRESIDENTE ni dos SECRETARIO activos al mismo tiempo.
//   - El mismo worker no puede estar 2 veces como miembro activo.
// =============================================
export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = miembroCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const data = parsed.data

    const comite = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!comite) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    // El worker debe ser de la misma org y estar activo
    const worker = await prisma.worker.findFirst({
      where: { id: data.workerId, orgId: ctx.orgId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (!worker) {
      return NextResponse.json(
        { error: 'Trabajador no encontrado o no está activo' },
        { status: 404 },
      )
    }

    // No duplicar miembro activo
    const yaActivo = await prisma.miembroComite.findFirst({
      where: { comiteId: id, workerId: data.workerId, fechaBaja: null },
      select: { id: true },
    })
    if (yaActivo) {
      return NextResponse.json(
        { error: 'Este trabajador ya es miembro activo del comité' },
        { status: 409 },
      )
    }

    // Cargo único: PRESIDENTE/SECRETARIO únicos entre miembros activos
    if (data.cargo === 'PRESIDENTE' || data.cargo === 'SECRETARIO') {
      const ocupado = await prisma.miembroComite.findFirst({
        where: { comiteId: id, cargo: data.cargo, fechaBaja: null },
        select: { id: true },
      })
      if (ocupado) {
        return NextResponse.json(
          {
            error: `Ya existe un ${data.cargo === 'PRESIDENTE' ? 'Presidente' : 'Secretario'} activo. Da de baja al actual antes de asignar uno nuevo.`,
          },
          { status: 409 },
        )
      }
    }

    const miembro = await prisma.miembroComite.create({
      data: {
        comiteId: id,
        workerId: data.workerId,
        cargo: data.cargo,
        origen: data.origen,
        fechaAlta: data.fechaAlta ? new Date(data.fechaAlta) : new Date(),
      },
      include: {
        worker: {
          select: { id: true, firstName: true, lastName: true, dni: true, position: true },
        },
      },
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.comite.miembro.added',
          entityType: 'MiembroComite',
          entityId: miembro.id,
          metadataJson: {
            comiteId: id,
            workerId: data.workerId,
            cargo: data.cargo,
            origen: data.origen,
          },
        },
      })
      .catch((e: unknown) => {
        console.error('[miembros/POST] audit log failed:', e)
      })

    return NextResponse.json({ miembro }, { status: 201 })
  },
)
