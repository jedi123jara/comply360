import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { investigacionCreateSchema } from '@/lib/sst/schemas'

// =============================================
// POST /api/sst/accidentes/[id]/investigacion — Crear investigación
// =============================================
export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = investigacionCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const accidente = await prisma.accidente.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!accidente) {
      return NextResponse.json({ error: 'Accidente no encontrado' }, { status: 404 })
    }

    const inv = await prisma.investigacionAccidente.create({
      data: {
        accidenteId: id,
        fechaInvestigacion: new Date(parsed.data.fechaInvestigacion),
        causasInmediatas: parsed.data.causasInmediatas,
        causasBasicas: parsed.data.causasBasicas,
        accionesCorrectivas: parsed.data.accionesCorrectivas,
        responsableId: parsed.data.responsableId ?? null,
      },
    })

    return NextResponse.json({ investigacion: inv }, { status: 201 })
  },
)
