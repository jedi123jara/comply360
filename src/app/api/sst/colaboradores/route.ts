import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withSuperAdmin } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { colaboradorCreateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/colaboradores — Lista de inspectores SST internos.
//
// Tabla GLOBAL (no scoped por org): los colaboradores son empleados o
// contratistas directos de COMPLY360. Cualquier user autenticado puede
// listarlos para programar visitas.
// =============================================
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const onlyActive = searchParams.get('activo') === 'true'
  const especialidad = searchParams.get('especialidad')

  const where: Record<string, unknown> = {}
  if (onlyActive) where.activo = true
  if (especialidad) where.especialidades = { has: especialidad }

  const colaboradores = await prisma.colaboradorSST.findMany({
    where,
    orderBy: [{ activo: 'desc' }, { apellido: 'asc' }],
    select: {
      id: true,
      nombre: true,
      apellido: true,
      dni: true,
      email: true,
      telefono: true,
      tipoColaborador: true,
      vigenciaContratoHasta: true,
      especialidades: true,
      activo: true,
      _count: { select: { visitas: true } },
    },
  })

  return NextResponse.json({ colaboradores, total: colaboradores.length })
})

// =============================================
// POST /api/sst/colaboradores — Crear colaborador (SUPER_ADMIN only).
//
// La gestión de colaboradores es responsabilidad de la plataforma, no de
// las orgs cliente.
// =============================================
export const POST = withSuperAdmin(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = colaboradorCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Unicidad de DNI y email
  const conflict = await prisma.colaboradorSST.findFirst({
    where: { OR: [{ dni: data.dni }, { email: data.email }] },
    select: { id: true, dni: true, email: true },
  })
  if (conflict) {
    return NextResponse.json(
      {
        error: `Ya existe un colaborador con ${conflict.dni === data.dni ? 'ese DNI' : 'ese email'}`,
      },
      { status: 409 },
    )
  }

  const colaborador = await prisma.colaboradorSST.create({
    data: {
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      telefono: data.telefono ?? null,
      tipoColaborador: data.tipoColaborador,
      vigenciaContratoHasta: data.vigenciaContratoHasta
        ? new Date(data.vigenciaContratoHasta)
        : null,
      especialidades: data.especialidades,
      activo: true,
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.colaborador.created',
        entityType: 'ColaboradorSST',
        entityId: colaborador.id,
        metadataJson: {
          dni: colaborador.dni,
          tipoColaborador: colaborador.tipoColaborador,
        },
      },
    })
    .catch((e: unknown) => {
      console.error('[colaboradores/POST] audit log failed:', e)
    })

  return NextResponse.json({ colaborador }, { status: 201 })
})
