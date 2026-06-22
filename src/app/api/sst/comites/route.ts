import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGate } from '@/lib/plan-gate'
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
export const GET = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const { searchParams } = new URL(req.url)
  const estado = searchParams.get('estado')

  const where: Record<string, unknown> = { orgId: ctx.orgId }
  if (estado) where.estado = estado

  const comites = await prisma.comiteSST.findMany({
    where,
    orderBy: [{ estado: 'asc' }, { mandatoInicio: 'desc' }],
    include: {
      // Sede del subcomité (Art. 44): NULL = Comité principal del empleador. El
      // cliente usa esto para separar/etiquetar el principal de los subcomités.
      sede: { select: { id: true, nombre: true } },
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

  // Conteo de trabajadores activos org-wide (para el Comité principal y el total).
  const numeroTrabajadores = await prisma.worker.count({
    where: { orgId: ctx.orgId, status: 'ACTIVE' },
  })

  // Dotación POR SEDE (Fase 3): cada subcomité se dimensiona por los trabajadores
  // asignados a su sede (Worker.sedeId). Si una sede no tiene dotación asignada,
  // el subcomité degrada al total de la empresa (con aviso en la UI).
  const porSede = await prisma.worker.groupBy({
    by: ['sedeId'],
    where: { orgId: ctx.orgId, status: 'ACTIVE', sedeId: { not: null } },
    _count: { _all: true },
  })
  const countPorSede = new Map<string, number>(
    porSede.map((r) => [r.sedeId as string, r._count._all]),
  )

  // Decoramos cada comité con su análisis y días restantes del mandato.
  const decorated = comites.map((c) => {
    const sedeCount = c.sedeId ? countPorSede.get(c.sedeId) ?? 0 : 0
    const usaDotacionSede = c.sedeId != null && sedeCount > 0
    const n = usaDotacionSede ? sedeCount : numeroTrabajadores
    return {
      ...c,
      analisis: analizarComite(n, c.miembros),
      numeroTrabajadoresAplicado: n,
      dotacionPorSede: usaDotacionSede,
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
export const POST = withPlanGate('sst_completo', async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = comiteCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }
  const data = parsed.data

  // sedeId NULL = Comité principal del empleador; con sedeId = Subcomité de esa
  // sede (Art. 44 D.S. 005-2012-TR).
  const sedeId = data.sedeId ?? null
  if (sedeId) {
    const sede = await prisma.sede.findFirst({
      where: { id: sedeId, orgId: ctx.orgId, activa: true },
      select: { id: true },
    })
    if (!sede) {
      return NextResponse.json(
        { error: 'La sede indicada no existe, no pertenece a la empresa o está inactiva.' },
        { status: 400 },
      )
    }
  }

  // Un comité VIGENTE por (empresa, sede): el principal (sede NULL) y, a lo sumo,
  // un subcomité vigente por sede.
  const vigente = await prisma.comiteSST.findFirst({
    where: { orgId: ctx.orgId, sedeId, estado: 'VIGENTE' },
    select: { id: true },
  })
  if (vigente) {
    return NextResponse.json(
      {
        error: sedeId
          ? 'Ya existe un Subcomité SST vigente para esta sede. Declara su mandato como INACTIVO antes de crear uno nuevo.'
          : 'Ya existe un Comité SST vigente para esta empresa. Declara su mandato como INACTIVO antes de crear uno nuevo.',
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
      sedeId,
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
