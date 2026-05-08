import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { miembroUpdateSchema } from '@/lib/sst/schemas'

// =============================================
// PATCH /api/sst/comites/miembros/[id]
// Permite cambiar cargo, origen, o dar de baja (fechaBaja).
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('sst_completo', 
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = miembroUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // Verificar que el miembro pertenece a un comité de la org
    const miembro = await prisma.miembroComite.findFirst({
      where: { id, comite: { orgId: ctx.orgId } },
      select: { id: true, comiteId: true, cargo: true, fechaBaja: true },
    })
    if (!miembro) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    // Si cambia el cargo a PRESIDENTE/SECRETARIO, validar que no haya otro
    if (
      (parsed.data.cargo === 'PRESIDENTE' || parsed.data.cargo === 'SECRETARIO') &&
      parsed.data.cargo !== miembro.cargo
    ) {
      const ocupado = await prisma.miembroComite.findFirst({
        where: {
          comiteId: miembro.comiteId,
          cargo: parsed.data.cargo,
          fechaBaja: null,
          id: { not: id },
        },
        select: { id: true },
      })
      if (ocupado) {
        return NextResponse.json(
          {
            error: `Ya existe un ${parsed.data.cargo === 'PRESIDENTE' ? 'Presidente' : 'Secretario'} activo en este comité.`,
          },
          { status: 409 },
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.cargo) data.cargo = parsed.data.cargo
    if (parsed.data.origen) data.origen = parsed.data.origen
    if (parsed.data.fechaBaja !== undefined) {
      data.fechaBaja = parsed.data.fechaBaja ? new Date(parsed.data.fechaBaja) : null
    }

    const updated = await prisma.miembroComite.update({
      where: { id },
      data,
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
          action: 'sst.comite.miembro.updated',
          entityType: 'MiembroComite',
          entityId: updated.id,
          metadataJson: {
            comiteId: updated.comiteId,
            cargo: updated.cargo,
            origen: updated.origen,
            fechaBaja: updated.fechaBaja?.toISOString() ?? null,
          },
        },
      })
      .catch((e: unknown) => {
        console.error('[miembros/PATCH] audit log failed:', e)
      })

    return NextResponse.json({ miembro: updated })
  },
)

// =============================================
// DELETE /api/sst/comites/miembros/[id]
// Soft delete: setea fechaBaja = now (mantiene el audit trail).
// =============================================
export const DELETE = withPlanGateParams<{ id: string }>('sst_completo', 
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const miembro = await prisma.miembroComite.findFirst({
      where: { id, comite: { orgId: ctx.orgId } },
      select: { id: true, comiteId: true, fechaBaja: true },
    })
    if (!miembro) {
      return NextResponse.json({ error: 'Miembro no encontrado' }, { status: 404 })
    }

    if (miembro.fechaBaja) {
      return NextResponse.json(
        { error: 'Este miembro ya está dado de baja' },
        { status: 409 },
      )
    }

    const updated = await prisma.miembroComite.update({
      where: { id },
      data: { fechaBaja: new Date() },
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.comite.miembro.removed',
          entityType: 'MiembroComite',
          entityId: updated.id,
          metadataJson: { comiteId: updated.comiteId },
        },
      })
      .catch((e: unknown) => {
        console.error('[miembros/DELETE] audit log failed:', e)
      })

    return NextResponse.json({ ok: true })
  },
)

