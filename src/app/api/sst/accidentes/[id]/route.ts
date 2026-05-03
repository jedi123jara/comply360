import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuthParams } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import { accidenteSatUpdateSchema } from '@/lib/sst/schemas'
import { calcularPlazoSat, type TipoAccidente } from '@/lib/sst/sat-deadline'

// =============================================
// GET /api/sst/accidentes/[id]
// =============================================
export const GET = withAuthParams<{ id: string }>(
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const accidente = await prisma.accidente.findFirst({
      where: { id, orgId: ctx.orgId },
      include: {
        sede: { select: { id: true, nombre: true, tipoInstalacion: true, direccion: true } },
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dni: true,
            position: true,
            fechaIngreso: true,
          },
        },
        investigaciones: {
          orderBy: { fechaInvestigacion: 'desc' },
        },
      },
    })

    if (!accidente) {
      return NextResponse.json({ error: 'Accidente no encontrado' }, { status: 404 })
    }

    // Recalcular el plazo (información derivada, no se persiste)
    const plazo = calcularPlazoSat(accidente.tipo as TipoAccidente, accidente.fechaHora)

    return NextResponse.json({
      accidente,
      plazo: {
        horas: plazo.horas,
        deadline: plazo.deadline.toISOString(),
        descripcion: plazo.descripcion,
        baseLegal: plazo.baseLegal,
        obligadoNotificar: plazo.obligadoNotificar,
        formularioSat: plazo.formularioSat,
      },
    })
  },
)

// =============================================
// PATCH /api/sst/accidentes/[id] — Actualiza datos del tracking SAT manual
// COMPLY360 NO ejecuta RPA: el cliente notifica en gob.pe/774 manualmente y
// luego registra aquí su número de cargo + fecha de envío + foto del cargo.
// =============================================
export const PATCH = withAuthParams<{ id: string }>(
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = accidenteSatUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const existing = await prisma.accidente.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, satEstado: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Accidente no encontrado' }, { status: 404 })
    }

    const data: Record<string, unknown> = {}
    if (parsed.data.satNumeroManual !== undefined) {
      data.satNumeroManual = parsed.data.satNumeroManual
    }
    if (parsed.data.satFechaEnvioManual !== undefined) {
      data.satFechaEnvioManual = parsed.data.satFechaEnvioManual
        ? new Date(parsed.data.satFechaEnvioManual)
        : null
    }
    if (parsed.data.satCargoArchivoUrl !== undefined) {
      data.satCargoArchivoUrl = parsed.data.satCargoArchivoUrl
    }
    if (parsed.data.satEstado) {
      data.satEstado = parsed.data.satEstado
    }

    // Auto-transición: si cargan número manual + fecha + cargo, marcar NOTIFICADO
    if (
      !parsed.data.satEstado &&
      parsed.data.satNumeroManual &&
      parsed.data.satFechaEnvioManual
    ) {
      data.satEstado = 'NOTIFICADO'
    }

    const accidente = await prisma.accidente.update({
      where: { id },
      data,
      include: {
        sede: { select: { id: true, nombre: true } },
        worker: { select: { id: true, firstName: true, lastName: true } },
      },
    })

    return NextResponse.json({ accidente })
  },
)
