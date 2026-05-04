import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { visitaCreateSchema } from '@/lib/sst/schemas'

// =============================================
// GET /api/sst/visitas
// Lista de visitas Field Audit con filtros.
// Query params:
//   sedeId, colaboradorId, estado
//   from, to    — rango de fechaProgramada
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const sedeId = searchParams.get('sedeId')
  const colaboradorId = searchParams.get('colaboradorId')
  const estado = searchParams.get('estado')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (sedeId) where.sedeId = sedeId
  if (colaboradorId) where.colaboradorId = colaboradorId
  if (estado) where.estado = estado
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.gte = new Date(from)
    if (to) range.lte = new Date(to)
    where.fechaProgramada = range
  }

  const [visitas, byEstado] = await Promise.all([
    prisma.visitaFieldAudit.findMany({
      where,
      orderBy: [{ fechaProgramada: 'desc' }],
      include: {
        sede: { select: { id: true, nombre: true, tipoInstalacion: true } },
        colaborador: {
          select: { id: true, nombre: true, apellido: true, dni: true, especialidades: true },
        },
        _count: { select: { hallazgos: true } },
      },
    }),
    prisma.visitaFieldAudit.groupBy({
      by: ['estado'],
      where: { orgId: ctx.orgId },
      _count: true,
    }),
  ])

  return NextResponse.json({
    visitas,
    total: visitas.length,
    statsByEstado: byEstado.reduce(
      (acc, g) => {
        acc[g.estado] = g._count
        return acc
      },
      {} as Record<string, number>,
    ),
  })
})

// =============================================
// POST /api/sst/visitas
// Programa una visita Field Audit en una sede de la org.
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = visitaCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Verificar sede de la org
  const sede = await prisma.sede.findFirst({
    where: { id: data.sedeId, orgId: ctx.orgId },
    select: { id: true, nombre: true },
  })
  if (!sede) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  // Verificar colaborador activo
  const colaborador = await prisma.colaboradorSST.findFirst({
    where: { id: data.colaboradorId, activo: true },
    select: {
      id: true,
      vigenciaContratoHasta: true,
    },
  })
  if (!colaborador) {
    return NextResponse.json(
      { error: 'Colaborador no encontrado o inactivo' },
      { status: 404 },
    )
  }

  // Si tiene vigencia y la visita es posterior, advertir
  const fechaProg = new Date(data.fechaProgramada)
  if (
    colaborador.vigenciaContratoHasta &&
    new Date(colaborador.vigenciaContratoHasta) < fechaProg
  ) {
    return NextResponse.json(
      {
        error:
          'El contrato del colaborador vence antes de la fecha programada. Asigna otro colaborador o renueva el contrato.',
        code: 'COLABORADOR_VIGENCIA_VENCE',
      },
      { status: 409 },
    )
  }

  const visita = await prisma.visitaFieldAudit.create({
    data: {
      orgId: ctx.orgId,
      sedeId: data.sedeId,
      colaboradorId: data.colaboradorId,
      fechaProgramada: fechaProg,
      estado: 'PROGRAMADA',
      notasInspector: data.notasInspector ?? null,
    },
    include: {
      sede: { select: { id: true, nombre: true } },
      colaborador: { select: { id: true, nombre: true, apellido: true } },
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.visita.programada',
        entityType: 'VisitaFieldAudit',
        entityId: visita.id,
        metadataJson: {
          sedeId: visita.sedeId,
          colaboradorId: visita.colaboradorId,
          fechaProgramada: visita.fechaProgramada.toISOString(),
        },
      },
    })
    .catch((e: unknown) => {
      console.error('[visitas/POST] audit log failed:', e)
    })

  return NextResponse.json({ visita }, { status: 201 })
})
