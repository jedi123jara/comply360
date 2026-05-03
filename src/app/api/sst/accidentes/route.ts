import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { accidenteCreateSchema } from '@/lib/sst/schemas'
import { calcularPlazoSat } from '@/lib/sst/sat-deadline'

// =============================================
// GET /api/sst/accidentes — List accidentes
// Query params:
//   sedeId         — filter by sede
//   estado         — PENDIENTE | EN_PROCESO | NOTIFICADO | CONFIRMADO | RECHAZADO
//   tipo           — MORTAL | NO_MORTAL | INCIDENTE_PELIGROSO | ENFERMEDAD_OCUPACIONAL
//   from, to       — fecha range (ISO)
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const sedeId = searchParams.get('sedeId')
  const estado = searchParams.get('estado')
  const tipo = searchParams.get('tipo')
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (sedeId) where.sedeId = sedeId
  if (estado) where.satEstado = estado
  if (tipo) where.tipo = tipo
  if (from || to) {
    const range: Record<string, Date> = {}
    if (from) range.gte = new Date(from)
    if (to) range.lte = new Date(to)
    where.fechaHora = range
  }

  const [accidentes, byEstado] = await Promise.all([
    prisma.accidente.findMany({
      where,
      orderBy: { fechaHora: 'desc' },
      include: {
        sede: { select: { id: true, nombre: true, tipoInstalacion: true } },
        worker: { select: { id: true, firstName: true, lastName: true, dni: true } },
        _count: { select: { investigaciones: true } },
      },
    }),
    prisma.accidente.groupBy({
      by: ['satEstado'],
      where: { orgId: ctx.orgId },
      _count: true,
    }),
  ])

  const stats = byEstado.reduce(
    (acc, g) => {
      acc[g.satEstado] = g._count
      return acc
    },
    {} as Record<string, number>,
  )

  return NextResponse.json({
    accidentes,
    total: accidentes.length,
    stats,
  })
})

// =============================================
// POST /api/sst/accidentes — Create accidente
// El servidor calcula `plazoLegalHoras` según el tipo (D.S. 006-2022-TR).
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = accidenteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Verificar sede
  const sede = await prisma.sede.findFirst({
    where: { id: data.sedeId, orgId: ctx.orgId },
    select: { id: true },
  })
  if (!sede) {
    return NextResponse.json({ error: 'Sede no encontrada' }, { status: 404 })
  }

  // Verificar worker si viene
  if (data.workerId) {
    const w = await prisma.worker.findFirst({
      where: { id: data.workerId, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!w) {
      return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
    }
  }

  const fechaHora = new Date(data.fechaHora)
  const plazo = calcularPlazoSat(data.tipo, fechaHora)

  const accidente = await prisma.accidente.create({
    data: {
      orgId: ctx.orgId,
      sedeId: data.sedeId,
      workerId: data.workerId ?? null,
      tipo: data.tipo,
      fechaHora,
      descripcion: data.descripcion,
      plazoLegalHoras: plazo.horas,
      satEstado: 'PENDIENTE',
    },
    include: {
      sede: { select: { id: true, nombre: true } },
      worker: { select: { id: true, firstName: true, lastName: true } },
    },
  })

  return NextResponse.json(
    {
      accidente,
      plazo: {
        horas: plazo.horas,
        deadline: plazo.deadline.toISOString(),
        descripcion: plazo.descripcion,
        baseLegal: plazo.baseLegal,
        obligadoNotificar: plazo.obligadoNotificar,
        formularioSat: plazo.formularioSat,
      },
    },
    { status: 201 },
  )
})
