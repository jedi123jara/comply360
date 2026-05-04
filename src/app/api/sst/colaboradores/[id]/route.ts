import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withSuperAdminParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { colaboradorUpdateSchema } from '@/lib/sst/schemas'

// =============================================
// PATCH /api/sst/colaboradores/[id] — actualizar (SUPER_ADMIN)
// Permite cambiar especialidades, vigencia de contrato y activar/desactivar.
// =============================================
export const PATCH = withSuperAdminParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = colaboradorUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.colaboradorSST.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Colaborador no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.nombre !== undefined) data.nombre = parsed.data.nombre
    if (parsed.data.apellido !== undefined) data.apellido = parsed.data.apellido
    if (parsed.data.email !== undefined) data.email = parsed.data.email
    if (parsed.data.telefono !== undefined) data.telefono = parsed.data.telefono
    if (parsed.data.tipoColaborador !== undefined) data.tipoColaborador = parsed.data.tipoColaborador
    if (parsed.data.vigenciaContratoHasta !== undefined) {
      data.vigenciaContratoHasta = parsed.data.vigenciaContratoHasta
        ? new Date(parsed.data.vigenciaContratoHasta)
        : null
    }
    if (parsed.data.especialidades !== undefined) data.especialidades = parsed.data.especialidades
    if (parsed.data.activo !== undefined) data.activo = parsed.data.activo

    const colaborador = await prisma.colaboradorSST.update({
      where: { id },
      data,
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.colaborador.updated',
          entityType: 'ColaboradorSST',
          entityId: colaborador.id,
          metadataJson: { activo: colaborador.activo },
        },
      })
      .catch((e: unknown) => {
        console.error('[colaboradores/PATCH] audit log failed:', e)
      })

    return NextResponse.json({ colaborador })
  },
)
