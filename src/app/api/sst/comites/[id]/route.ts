import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { comiteUpdateSchema } from '@/lib/sst/schemas'
import { analizarComite, diasRestantesMandato } from '@/lib/sst/comite-rules'

// =============================================
// GET /api/sst/comites/[id] — detalle con miembros + análisis
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const comite = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        miembros: {
          orderBy: [{ cargo: 'asc' }, { fechaAlta: 'asc' }],
          include: {
            worker: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                dni: true,
                position: true,
                regimenLaboral: true,
              },
            },
          },
        },
      },
    })

    if (!comite) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    const numeroTrabajadores = await prisma.worker.count({
      where: { orgId: ctx.orgId, status: 'ACTIVE' },
    })

    const analisis = analizarComite(numeroTrabajadores, comite.miembros)

    return NextResponse.json({
      comite,
      analisis,
      numeroTrabajadores,
      diasRestantesMandato: diasRestantesMandato(comite.mandatoFin),
    })
  },
)

// =============================================
// PATCH /api/sst/comites/[id] — Cambiar estado, actualizar libro de actas,
// extender mandato.
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('sst_completo',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = comiteUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    // Si pasa a VIGENTE, validar que no haya otro VIGENTE
    if (parsed.data.estado === 'VIGENTE' && existing.estado !== 'VIGENTE') {
      const otroVigente = await prisma.comiteSST.findFirst({
        where: { orgId: ctx.orgId, estado: 'VIGENTE', id: { not: id } },
        select: { id: true },
      })
      if (otroVigente) {
        return NextResponse.json(
          { error: 'Ya existe otro Comité SST vigente. Desactívalo primero.' },
          { status: 409 },
        )
      }
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.estado) data.estado = parsed.data.estado
    if (parsed.data.libroActasUrl !== undefined) data.libroActasUrl = parsed.data.libroActasUrl
    if (parsed.data.mandatoFin) data.mandatoFin = new Date(parsed.data.mandatoFin)

    const comite = await prisma.comiteSST.update({
      where: { id },
      data,
    })

    return NextResponse.json({ comite })
  },
)
