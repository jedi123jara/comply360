import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/sst/iperc-bases/[id] — Detalle con filas
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const base = await prisma.iPERCBase.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        sede: { select: { id: true, nombre: true, tipoInstalacion: true } },
        filas: {
          orderBy: [{ clasificacion: 'desc' }, { nivelRiesgo: 'desc' }],
        },
      },
    })

    if (!base) {
      return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
    }

    // Resumen agregado por clasificación
    const summary = base.filas.reduce(
      (acc, f) => {
        acc[f.clasificacion] = (acc[f.clasificacion] ?? 0) + 1
        if (f.esSignificativo) acc.SIGNIFICATIVOS++
        return acc
      },
      {
        TRIVIAL: 0,
        TOLERABLE: 0,
        MODERADO: 0,
        IMPORTANTE: 0,
        INTOLERABLE: 0,
        SIGNIFICATIVOS: 0,
      } as Record<string, number>,
    )

    return NextResponse.json({ base, summary })
  },
)

// =============================================
// PATCH /api/sst/iperc-bases/[id] — Cambiar estado / aprobar
// =============================================
const patchSchema = z.object({
  estado: z.enum(['BORRADOR', 'REVISION', 'VIGENTE', 'VENCIDO', 'ARCHIVADO']).optional(),
  fechaAprobacion: z.string().datetime({ offset: true }).optional().nullable(),
})

export const PATCH = withPlanGateParams<{ id: string }>('sst_completo',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.iPERCBase.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.estado) {
      data.estado = parsed.data.estado
      if (parsed.data.estado === 'VIGENTE' && !parsed.data.fechaAprobacion) {
        data.fechaAprobacion = new Date()
        data.aprobadoPor = ctx.userId
      }
    }
    if (parsed.data.fechaAprobacion !== undefined) {
      data.fechaAprobacion = parsed.data.fechaAprobacion
        ? new Date(parsed.data.fechaAprobacion)
        : null
    }

    const base = await prisma.iPERCBase.update({
      where: { id },
      data,
    })

    return NextResponse.json({ base })
  },
)
