import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { sugerirFilasIperc } from '@/lib/sst/iperc-llm'

// =============================================
// POST /api/sst/iperc-bases/[id]/sugerir — Sugerencias IPERC con LLM
//
// Recibe un puestoId. Lee el puesto + sus flags de exposición + el catálogo
// de peligros, y le pide al LLM (DeepSeek V4 via wrapper multi-provider)
// que sugiera filas IPERC pre-llenadas.
//
// El LLM SOLO redacta texto y propone índices; el motor determinístico
// re-calcula IP/NR/clasificación antes de devolver la respuesta.
// =============================================

const bodySchema = z.object({
  puestoId: z.string().min(1, 'puestoId requerido'),
  maxFilas: z.number().int().min(1).max(15).optional(),
})

export const POST = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    // 1. Verificar IPERC pertenece a la org y está editable
    const base = await prisma.iPERCBase.findFirst({
      where: { id, orgId: ctx.orgId },
      include: { sede: true },
    })
    if (!base) {
      return NextResponse.json({ error: 'IPERC no encontrado' }, { status: 404 })
    }
    if (base.estado === 'VIGENTE' || base.estado === 'ARCHIVADO') {
      return NextResponse.json(
        {
          error: `El IPERC está ${base.estado} y no admite cambios. Crea una nueva versión.`,
          code: 'IPERC_LOCKED',
        },
        { status: 409 },
      )
    }

    // 2. Verificar puesto pertenece a la org y a la misma sede
    const puesto = await prisma.puestoTrabajo.findFirst({
      where: { id: parsed.data.puestoId, orgId: ctx.orgId, sedeId: base.sedeId },
      select: {
        nombre: true,
        descripcionTareas: true,
        jornada: true,
        exposicionFisica: true,
        exposicionQuimica: true,
        exposicionBiologica: true,
        exposicionErgonomica: true,
        exposicionPsicosocial: true,
        requiereAlturas: true,
        requiereEspacioConfinado: true,
        requiereCalienteFrio: true,
        requiereSCTR: true,
        requiereExposicionUVSolar: true,
      },
    })
    if (!puesto) {
      return NextResponse.json(
        { error: 'Puesto no encontrado o no pertenece a la sede del IPERC' },
        { status: 404 },
      )
    }

    // 3. Cargar catálogo de peligros (whitelist obligatoria)
    const catalogo = await prisma.catalogoPeligro.findMany({
      orderBy: [{ familia: 'asc' }, { codigo: 'asc' }],
      select: { id: true, codigo: true, familia: true, nombre: true, descripcion: true },
    })

    // 4. Llamar al LLM
    const t0 = Date.now()
    let result
    try {
      result = await sugerirFilasIperc(
        {
          sede: {
            nombre: base.sede.nombre,
            tipoInstalacion: base.sede.tipoInstalacion,
            departamento: base.sede.departamento,
          },
          puesto: {
            nombre: puesto.nombre,
            descripcionTareas: puesto.descripcionTareas,
            jornada: puesto.jornada,
            flags: {
              fisica: puesto.exposicionFisica,
              quimica: puesto.exposicionQuimica,
              biologica: puesto.exposicionBiologica,
              ergonomica: puesto.exposicionErgonomica,
              psicosocial: puesto.exposicionPsicosocial,
              alturas: puesto.requiereAlturas,
              espacioConfinado: puesto.requiereEspacioConfinado,
              calienteFrio: puesto.requiereCalienteFrio,
              sctr: puesto.requiereSCTR,
              uvSolar: puesto.requiereExposicionUVSolar,
            },
          },
          catalogo,
        },
        { orgId: ctx.orgId, maxFilas: parsed.data.maxFilas },
      )
    } catch (err) {
      console.error('[sst/sugerir] error LLM:', err)
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? `Error generando sugerencias con IA: ${err.message}`
              : 'Error generando sugerencias con IA',
          code: 'LLM_ERROR',
        },
        { status: 502 },
      )
    }

    const latencyMs = Date.now() - t0

    return NextResponse.json({
      sugerencias: result.filas,
      descartadas: result.descartadas,
      modelo: result.modelo,
      latencyMs,
      catalogoSize: catalogo.length,
    })
  },
)
