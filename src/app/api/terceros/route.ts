import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

// =============================================
// GET /api/terceros - List terceros with stats
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get('active') !== 'false'

  const where = {
    orgId,
    ...(activeOnly ? { isActive: true } : {}),
  }

  const terceros = await prisma.tercero.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })

  // Stats
  const total = terceros.length
  const active = terceros.filter((t) => t.isActive).length
  const totalTrabajadores = terceros.reduce(
    (sum, t) => sum + t.trabajadoresAsignados,
    0
  )
  const flaggedMainActivity = terceros.filter(
    (t) => t.isActividadPrincipal && t.isActive
  )
  const expiredContracts = terceros.filter(
    (t) => t.isActive && t.fechaFin && new Date(t.fechaFin) < new Date()
  )

  return NextResponse.json({
    data: {
      stats: {
        total,
        active,
        totalTrabajadores,
        flaggedMainActivity: flaggedMainActivity.length,
        expiredContracts: expiredContracts.length,
      },
      terceros: terceros.map((t) => ({
        ...t,
        fechaInicio: t.fechaInicio.toISOString(),
        fechaFin: t.fechaFin?.toISOString() || null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        isContractExpired: t.fechaFin ? new Date(t.fechaFin) < new Date() : false,
      })),
      baseLegal: {
        tercerizacion: 'Ley 29245 - Ley de Tercerizacion',
        intermediacion: 'Ley 27626 - Ley de Intermediacion Laboral',
        reglamento: 'D.S. 003-2002-TR',
        restriction:
          'Esta prohibido tercerizar actividades que constituyan la actividad principal ' +
          'de la empresa usuaria (Art. 2 Ley 29245). La intermediacion laboral solo puede ' +
          'involucrar actividades complementarias, temporales o especializadas.',
      },
    },
  })
})

// =============================================
// POST /api/terceros - Create new tercero
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const body = await req.json()

  const {
    razonSocial,
    ruc,
    actividadPrincipal,
    tipoServicio,
    contratoUrl,
    fechaInicio,
    fechaFin,
    trabajadoresAsignados = 0,
    isActividadPrincipal = false,
  } = body

  // Validations
  if (!razonSocial || !ruc || !fechaInicio) {
    return NextResponse.json(
      { error: 'razonSocial, ruc y fechaInicio son requeridos' },
      { status: 400 }
    )
  }

  if (!/^\d{11}$/.test(ruc)) {
    return NextResponse.json(
      { error: 'RUC debe tener 11 digitos' },
      { status: 400 }
    )
  }

  if (tipoServicio && !['TERCERIZACION', 'INTERMEDIACION'].includes(tipoServicio)) {
    return NextResponse.json(
      { error: 'tipoServicio debe ser TERCERIZACION o INTERMEDIACION' },
      { status: 400 }
    )
  }

  const tercero = await prisma.tercero.create({
    data: {
      orgId,
      razonSocial,
      ruc,
      actividadPrincipal: actividadPrincipal || null,
      tipoServicio: tipoServicio || null,
      contratoUrl: contratoUrl || null,
      fechaInicio: new Date(fechaInicio),
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      trabajadoresAsignados,
      isActividadPrincipal,
      isActive: true,
    },
  })

  return NextResponse.json({ data: tercero }, { status: 201 })
})

// =============================================
// PUT /api/terceros - Update tercero
// =============================================
export const PUT = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const orgId = ctx.orgId
  const body = await req.json()
  const { id, ...updateData } = body

  if (!id) {
    return NextResponse.json(
      { error: 'Se requiere el id del tercero' },
      { status: 400 }
    )
  }

  // Verify ownership
  const existing = await prisma.tercero.findFirst({
    where: { id, orgId },
  })

  if (!existing) {
    return NextResponse.json(
      { error: 'Tercero no encontrado' },
      { status: 404 }
    )
  }

  // Build update payload (only accepted fields)
  const allowed: Record<string, unknown> = {}
  if (updateData.razonSocial !== undefined) allowed.razonSocial = updateData.razonSocial
  if (updateData.ruc !== undefined) allowed.ruc = updateData.ruc
  if (updateData.actividadPrincipal !== undefined) allowed.actividadPrincipal = updateData.actividadPrincipal
  if (updateData.tipoServicio !== undefined) allowed.tipoServicio = updateData.tipoServicio
  if (updateData.contratoUrl !== undefined) allowed.contratoUrl = updateData.contratoUrl
  if (updateData.fechaInicio !== undefined) allowed.fechaInicio = new Date(updateData.fechaInicio)
  if (updateData.fechaFin !== undefined) allowed.fechaFin = updateData.fechaFin ? new Date(updateData.fechaFin) : null
  if (updateData.trabajadoresAsignados !== undefined) allowed.trabajadoresAsignados = updateData.trabajadoresAsignados
  if (updateData.isActividadPrincipal !== undefined) allowed.isActividadPrincipal = updateData.isActividadPrincipal
  if (updateData.isActive !== undefined) allowed.isActive = updateData.isActive

  const updated = await prisma.tercero.update({
    where: { id, orgId },
    data: allowed,
  })

  return NextResponse.json({ data: updated })
})
