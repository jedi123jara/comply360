import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// DELETE /api/sst/hallazgos/[id]
// Elimina un hallazgo (sólo si la visita aún no está cerrada).
// =============================================
export const DELETE = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const hallazgo = await prisma.hallazgoFieldAudit.findFirst({
      where: { id, visita: { orgId: ctx.orgId } },
      select: { id: true, visita: { select: { estado: true } } },
    })
    if (!hallazgo) {
      return NextResponse.json({ error: 'Hallazgo no encontrado' }, { status: 404 })
    }
    if (hallazgo.visita.estado === 'CERRADA' || hallazgo.visita.estado === 'CANCELADA') {
      return NextResponse.json(
        { error: 'La visita está cerrada — no se pueden eliminar hallazgos.' },
        { status: 409 },
      )
    }

    await prisma.hallazgoFieldAudit.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  },
)
