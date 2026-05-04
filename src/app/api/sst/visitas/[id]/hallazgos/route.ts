import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { hallazgoCreateSchema } from '@/lib/sst/schemas'

// =============================================
// POST /api/sst/visitas/[id]/hallazgos
// Agrega un hallazgo a una visita Field Audit (no cerrada).
// =============================================
export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = hallazgoCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const data = parsed.data

    const visita = await prisma.visitaFieldAudit.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!visita) {
      return NextResponse.json({ error: 'Visita no encontrada' }, { status: 404 })
    }
    if (visita.estado === 'CERRADA' || visita.estado === 'CANCELADA') {
      return NextResponse.json(
        {
          error: `La visita está ${visita.estado} y no admite nuevos hallazgos.`,
          code: 'VISITA_LOCKED',
        },
        { status: 409 },
      )
    }

    const hallazgo = await prisma.hallazgoFieldAudit.create({
      data: {
        visitaId: id,
        tipo: data.tipo,
        severidad: data.severidad,
        descripcion: data.descripcion,
        fotoUrl: data.fotoUrl ?? null,
        coordenadasGps: data.coordenadasGps ?? undefined,
        accionPropuesta: data.accionPropuesta,
        responsable: data.responsable ?? null,
        plazoCierre: data.plazoCierre ? new Date(data.plazoCierre) : null,
      },
    })

    return NextResponse.json({ hallazgo }, { status: 201 })
  },
)
