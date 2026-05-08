import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { sedeCreateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/sedes — List sedes for the org
// Query params:
//   tipo          — filtrar por tipoInstalacion
//   activa=true   — solo sedes activas (default: todas)
//   search        — busca en nombre / direccion / distrito
// =============================================
export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const onlyActive = searchParams.get('activa') === 'true'
  const search = searchParams.get('search')

  const where: Record<string, unknown> = { orgId }
  if (tipo) where.tipoInstalacion = tipo
  if (onlyActive) where.activa = true
  if (search && search.length >= 2) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { direccion: { contains: search, mode: 'insensitive' } },
      { distrito: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [sedes, total] = await Promise.all([
    prisma.sede.findMany({
      where,
      orderBy: [{ activa: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { puestos: true, iperBases: true, accidentes: true, visitas: true } },
      },
    }),
    prisma.sede.count({ where: { orgId } }),
  ])

  return NextResponse.json({ sedes, total })
})

// =============================================
// POST /api/sst/sedes — Create sede
// =============================================
export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = sedeCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  const sede = await prisma.sede.create({
    data: {
      orgId: ctx.orgId,
      nombre: data.nombre,
      direccion: data.direccion,
      ubigeo: data.ubigeo,
      departamento: data.departamento,
      provincia: data.provincia,
      distrito: data.distrito,
      tipoInstalacion: data.tipoInstalacion,
      areaM2: data.areaM2 ?? null,
      numeroPisos: data.numeroPisos ?? null,
      planoArchivoUrl: data.planoArchivoUrl ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      activa: data.activa ?? true,
    },
  })

  return NextResponse.json({ sede }, { status: 201 })
})
