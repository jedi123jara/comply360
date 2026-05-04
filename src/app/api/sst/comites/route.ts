import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { comiteCreateSchema } from '@/lib/sst/schemas'
import {
  analizarComite,
  calcularFinMandato,
  diasRestantesMandato,
} from '@/lib/sst/comite-rules'

// =============================================
// GET /api/sst/comites
// Lista comités de la org. Devuelve el comité activo (VIGENTE) + análisis de
// composición contra el mínimo legal R.M. 245-2021-TR.
// =============================================
export const GET = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (estado) where.estado = estado

  const comites = await prisma.comiteSST.findMany({
    where,
    orderBy: [{ estado: 'asc' }, { mandatoInicio: 'desc' }],
    include: {
      miembros: {
        orderBy: [{ cargo: 'asc' }, { fechaAlta: 'asc' }],
        include: {
          worker: {
            select: { id: true, firstName: true, lastName: true, dni: true, position: true },
          },
        },
      },
    },
  })

  // Conteo de trabajadores activos para análisis de composición
  const numeroTrabajadores = await prisma.worker.count({
    where: { orgId: ctx.orgId, status: 'ACTIVE' },
  })

  // Decoramos cada comité con su análisis y días restantes del mandato
  const decorated = comites.map((c) => {
    const analisis = analizarComite(numeroTrabajadores, c.miembros)
    return {
      ...c,
      analisis,
      diasRestantesMandato: diasRestantesMandato(c.mandatoFin),
    }
  })

  return NextResponse.json({
    comites: decorated,
    total: decorated.length,
    numeroTrabajadores,
  })
})

// =============================================
// POST /api/sst/comites
// Crea un comité. Si ya existe uno VIGENTE para la org, devuelve 409.
// El fin del mandato se calcula como inicio + 2 años si no se envía.
// =============================================
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = comiteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // Solo un comité VIGENTE por org
  const vigente = await prisma.comiteSST.findFirst({
    where: { orgId: ctx.orgId, estado: 'VIGENTE' },
    select: { id: true, mandatoFin: true },
  })
  if (vigente) {
    return NextResponse.json(
      {
        error:
          'Ya existe un Comité SST vigente para esta empresa. Primero declara su mandato como INACTIVO antes de crear uno nuevo.',
        code: 'COMITE_VIGENTE_EXISTENTE',
        comiteVigenteId: vigente.id,
      },
      { status: 409 },
    )
  }

  const inicio = new Date(data.mandatoInicio)
  const fin = data.mandatoFin ? new Date(data.mandatoFin) : calcularFinMandato(inicio)

  const comite = await prisma.comiteSST.create({
    data: {
      orgId: ctx.orgId,
      mandatoInicio: inicio,
      mandatoFin: fin,
      estado: 'VIGENTE',
      libroActasUrl: data.libroActasUrl ?? null,
    },
  })

  await prisma.auditLog
    .create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        action: 'sst.comite.created',
        entityType: 'ComiteSST',
        entityId: comite.id,
        metadataJson: {
          mandatoInicio: inicio.toISOString(),
          mandatoFin: fin.toISOString(),
        },
      },
    })
    .catch((e: unknown) => {
      console.error('[comites/POST] audit log failed:', e)
    })

  return NextResponse.json({ comite }, { status: 201 })
})
