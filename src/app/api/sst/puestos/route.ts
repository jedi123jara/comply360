import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { puestoCreateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/puestos — List puestos for the org
// Query params:
//   sedeId    — filtrar por sede
//   workerId  — filtrar por trabajador asignado
// =============================================
export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const sedeId = searchParams.get('sedeId')
  const workerId = searchParams.get('workerId')

  const where: Record<string, unknown> = { orgId }
  if (sedeId) where.sedeId = sedeId
  if (workerId) where.workerId = workerId

  const puestos = await prisma.puestoTrabajo.findMany({
    where,
    orderBy: [{ sedeId: 'asc' }, { nombre: 'asc' }],
    include: {
      sede: { select: { id: true, nombre: true, tipoInstalacion: true } },
      worker: { select: { id: true, firstName: true, lastName: true, dni: true, position: true } },
    },
  })

  return NextResponse.json({ puestos, total: puestos.length })
})

// =============================================
// POST /api/sst/puestos — Create puesto
// =============================================
export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = puestoCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Verificar que la sede pertenece a la org del usuario
  const sede = await prisma.sede.findFirst({
    where: { id: data.sedeId, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!sede) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  // Si se asigna un trabajador, verificar que también pertenece a la org
  if (data.workerId) {
    const worker = await prisma.worker.findFirst({
      where: { id: data.workerId, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!worker) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }
  }

  const puesto = await prisma.puestoTrabajo.create({
    data: {
      orgId: ctx.orgId,
      sedeId: data.sedeId,
      workerId: data.workerId ?? null,
      nombre: data.nombre,
      descripcionTareas: data.descripcionTareas,
      jornada: data.jornada ?? null,
      exposicionFisica: data.exposicionFisica,
      exposicionQuimica: data.exposicionQuimica,
      exposicionBiologica: data.exposicionBiologica,
      exposicionErgonomica: data.exposicionErgonomica,
      exposicionPsicosocial: data.exposicionPsicosocial,
      requiereAlturas: data.requiereAlturas,
      requiereEspacioConfinado: data.requiereEspacioConfinado,
      requiereCalienteFrio: data.requiereCalienteFrio,
      requiereSCTR: data.requiereSCTR,
      requiereExposicionUVSolar: data.requiereExposicionUVSolar,
    },
    include: {
      sede: { select: { id: true, nombre: true } },
      worker: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  return NextResponse.json({ puesto }, { status: 201 })
})
