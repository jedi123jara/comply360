import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'
import { ipercFilaCreateSchema } from '@/lib/sst/schemas'
import { calcularNivelRiesgo } from '@/lib/sst/iperc-matrix'

// =============================================
// GET /api/sst/iperc-bases/[id]/filas — Listar filas de un IPERC
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const base = await prisma.iPERCBase.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!base) {
      return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
    }

    const filas = await prisma.iPERCFila.findMany({
      where: { iperBaseId: id },
      orderBy: [{ nivelRiesgo: 'desc' }, { proceso: 'asc' }],
    })

    return NextResponse.json({ filas, total: filas.length })
  },
)

// =============================================
// POST /api/sst/iperc-bases/[id]/filas — Crear fila
// El motor determinístico (iperc-matrix.ts) calcula IP, NR y clasificación.
// El cliente envía los 5 índices crudos; el server NUNCA confía en valores
// calculados que vengan del frontend (defensa en profundidad).
// =============================================
export const POST = withPlanGateParams<{ id: string }>('sst_completo',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = ipercFilaCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const data = parsed.data

    // Verificar que el IPERC pertenece a la org y está editable
    const base = await prisma.iPERCBase.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!base) {
      return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
    }
    if (base.estado === 'VIGENTE' || base.estado === 'ARCHIVADO') {
      return NextResponse.json(
        {
          error: `El IPERC está en estado ${base.estado} y no admite nuevas filas. Crea una nueva versión.`,
          code: 'IPERC_LOCKED',
        },
        { status: 409 },
      )
    }

    // Validar peligro si viene
    if (data.peligroId) {
      const peligro = await prisma.catalogoPeligro.findUnique({
        where: { id: data.peligroId },
        select: { id: true },
      })
      if (!peligro) {
        return NextResponse.json({ error: 'Peligro no encontrado en el catálogo' }, { status: 404 })
      }
    }

    // Cálculo determinístico (matriz oficial SUNAFIL R.M. 050-2013-TR)
    const result = calcularNivelRiesgo({
      indicePersonas: data.indicePersonas,
      indiceProcedimiento: data.indiceProcedimiento,
      indiceCapacitacion: data.indiceCapacitacion,
      indiceExposicion: data.indiceExposicion,
      indiceSeveridad: data.indiceSeveridad,
    })

    const fila = await prisma.iPERCFila.create({
      data: {
        iperBaseId: id,
        proceso: data.proceso,
        actividad: data.actividad,
        tarea: data.tarea,
        peligroId: data.peligroId ?? null,
        riesgo: data.riesgo,
        indicePersonas: data.indicePersonas,
        indiceProcedimiento: data.indiceProcedimiento,
        indiceCapacitacion: data.indiceCapacitacion,
        indiceExposicion: data.indiceExposicion,
        indiceProbabilidad: result.indiceProbabilidad,
        indiceSeveridad: result.indiceSeveridad,
        nivelRiesgo: result.nivelRiesgo,
        clasificacion: result.clasificacion,
        esSignificativo: result.esSignificativo,
        controlesActuales: data.controlesActuales,
        controlesPropuestos: data.controlesPropuestos,
        responsable: data.responsable ?? null,
        plazoCierre: data.plazoCierre ? new Date(data.plazoCierre) : null,
      },
    })

    return NextResponse.json(
      {
        fila,
        derived: {
          accionRecomendada: result.accionRecomendada,
          slaPlanAccionDias: result.slaPlanAccionDias,
        },
      },
      { status: 201 },
    )
  },
)
