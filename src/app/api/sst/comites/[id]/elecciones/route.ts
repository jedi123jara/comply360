import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withPlanGateParams } from '@/lib/plan-gate'
import type { AuthContext } from '@/lib/auth'

// =============================================
// Elecciones del Comité SST — R.M. 245-2021-TR
//
// Proceso electoral con paridad: empleador designa N representantes (no se
// votan), trabajadores eligen N representantes por votación universal directa
// y secreta. La paridad mínima depende del tamaño:
//   20-49 → 2+2, 50-99 → 3+3, 100-499 → 4+4, etc.
//
// Cada voto se registra con un hash SHA-256 del payload (electorWorkerId +
// candidatoWorkerId + timestamp + comiteId) que sirve como audit trail. NO
// se cifra el voto en sí (es padrón abierto, el reglamento permite trazar
// auditoría de quién votó).
// =============================================

const candidatoSchema = z.object({
  workerId: z.string().min(1),
  origen: z.enum(['REPRESENTANTE_EMPLEADOR', 'REPRESENTANTE_TRABAJADORES']),
})

const eleccionCreateSchema = z.object({
  fechaInicio: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  fechaCierre: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}/)),
  candidatos: z.array(candidatoSchema).min(2).max(40),
  cuposEmpleador: z.number().int().min(1).max(10),
  cuposTrabajadores: z.number().int().min(1).max(10),
})

interface Voto {
  electorWorkerId: string
  candidatoWorkerId: string
  timestamp: string
  hashFirma: string
}

interface EleccionData {
  estado: 'EN_VOTACION' | 'CERRADA'
  fechaInicio: string
  fechaCierre: string
  cuposEmpleador: number
  cuposTrabajadores: number
  candidatos: Array<{ workerId: string; origen: string }>
  votos: Voto[]
  ganadores?: Array<{ workerId: string; origen: string; votos: number }>
}

// =============================================
// GET — Estado actual
// =============================================
export const GET = withPlanGateParams<{ id: string }>('sst_completo',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const comite = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!comite) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    const record = await prisma.sstRecord.findFirst({
      where: { orgId: ctx.orgId, type: 'ACTA_COMITE', title: id },
      orderBy: { updatedAt: 'desc' },
    })

    if (!record) {
      return NextResponse.json({ existe: false, eleccion: null })
    }

    // Enriquecer con datos de los workers
    const data = record.data as unknown as EleccionData
    const workerIds = [
      ...data.candidatos.map((c) => c.workerId),
      ...data.votos.map((v) => v.electorWorkerId),
    ]
    const workers = await prisma.worker.findMany({
      where: { id: { in: [...new Set(workerIds)] } },
      select: { id: true, firstName: true, lastName: true, dni: true },
    })
    const workersById = new Map(workers.map((w) => [w.id, w]))

    // Conteos por candidato
    const conteos: Record<string, number> = {}
    for (const v of data.votos) {
      conteos[v.candidatoWorkerId] = (conteos[v.candidatoWorkerId] ?? 0) + 1
    }

    return NextResponse.json({
      existe: true,
      recordId: record.id,
      eleccion: {
        ...data,
        candidatos: data.candidatos.map((c) => {
          const w = workersById.get(c.workerId)
          return {
            ...c,
            nombre: w ? `${w.firstName} ${w.lastName}` : 'Desconocido',
            dni: w?.dni ?? null,
            votos: conteos[c.workerId] ?? 0,
          }
        }),
        votosTotal: data.votos.length,
      },
    })
  },
)

// =============================================
// POST — Iniciar elección
// =============================================
export const POST = withPlanGateParams<{ id: string }>('sst_completo',
  async (req: NextRequest, ctx: AuthContext, { id }) => {
    const body = await req.json().catch(() => ({}))
    const parsed = eleccionCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: parsed.error.flatten() },
        { status: 400 },
      )
    }
    const data = parsed.data

    const comite = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, estado: true },
    })
    if (!comite) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    // Validar todos los candidatos pertenecen a la org
    const workerIds = data.candidatos.map((c) => c.workerId)
    const valid = await prisma.worker.findMany({
      where: { id: { in: workerIds }, orgId: ctx.orgId, status: 'ACTIVE' },
      select: { id: true },
    })
    if (valid.length !== workerIds.length) {
      return NextResponse.json(
        { error: 'Algunos candidatos no pertenecen a la organización o no están activos' },
        { status: 400 },
      )
    }

    // Validar paridad mínima de candidatos
    const empCount = data.candidatos.filter(
      (c) => c.origen === 'REPRESENTANTE_EMPLEADOR',
    ).length
    const trabCount = data.candidatos.filter(
      (c) => c.origen === 'REPRESENTANTE_TRABAJADORES',
    ).length
    if (empCount < data.cuposEmpleador) {
      return NextResponse.json(
        { error: `Mínimo ${data.cuposEmpleador} candidatos del empleador` },
        { status: 400 },
      )
    }
    if (trabCount < data.cuposTrabajadores * 2) {
      return NextResponse.json(
        {
          error: `Necesitas al menos ${data.cuposTrabajadores * 2} candidatos de trabajadores (el doble de los cupos para que haya elección real).`,
        },
        { status: 400 },
      )
    }

    const eleccionData: EleccionData = {
      estado: 'EN_VOTACION',
      fechaInicio: data.fechaInicio,
      fechaCierre: data.fechaCierre,
      cuposEmpleador: data.cuposEmpleador,
      cuposTrabajadores: data.cuposTrabajadores,
      candidatos: data.candidatos,
      votos: [],
    }

    // Crear o actualizar el SstRecord
    const existing = await prisma.sstRecord.findFirst({
      where: { orgId: ctx.orgId, type: 'ACTA_COMITE', title: id },
      select: { id: true },
    })

    let record
    if (existing) {
      record = await prisma.sstRecord.update({
        where: { id: existing.id },
        data: {
          description: `Elección Comité SST · ${comite.id}`,
          data: eleccionData as never,
          status: 'IN_PROGRESS',
        },
      })
    } else {
      record = await prisma.sstRecord.create({
        data: {
          orgId: ctx.orgId,
          type: 'ACTA_COMITE',
          title: id,
          description: `Elección Comité SST · ${comite.id}`,
          data: eleccionData as never,
          status: 'IN_PROGRESS',
        },
      })
    }

    // Marcar el comité como EN_ELECCION
    await prisma.comiteSST.update({
      where: { id },
      data: { estado: 'EN_ELECCION' },
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.comite.eleccion.created',
          entityType: 'ComiteSST',
          entityId: id,
          metadataJson: { recordId: record.id, candidatos: data.candidatos.length },
        },
      })
      .catch(() => undefined)

    return NextResponse.json({ recordId: record.id, eleccion: eleccionData }, { status: 201 })
  },
)

// =============================================
// PATCH — Cerrar elección y calcular ganadores
// =============================================
export const PATCH = withPlanGateParams<{ id: string }>('sst_completo',
  async (_req: NextRequest, ctx: AuthContext, { id }) => {
    const comite = await prisma.comiteSST.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    })
    if (!comite) {
      return NextResponse.json({ error: 'Comité no encontrado' }, { status: 404 })
    }

    const record = await prisma.sstRecord.findFirst({
      where: { orgId: ctx.orgId, type: 'ACTA_COMITE', title: id },
    })
    if (!record) {
      return NextResponse.json({ error: 'No hay elección en curso' }, { status: 404 })
    }

    const data = record.data as unknown as EleccionData
    if (data.estado === 'CERRADA') {
      return NextResponse.json({ error: 'La elección ya fue cerrada' }, { status: 409 })
    }

    // Calcular ganadores
    const conteos: Record<string, number> = {}
    for (const v of data.votos) {
      conteos[v.candidatoWorkerId] = (conteos[v.candidatoWorkerId] ?? 0) + 1
    }

    const candidatosConVotos = data.candidatos.map((c) => ({
      ...c,
      votos: conteos[c.workerId] ?? 0,
    }))

    const empleadorTop = candidatosConVotos
      .filter((c) => c.origen === 'REPRESENTANTE_EMPLEADOR')
      .sort((a, b) => b.votos - a.votos)
      .slice(0, data.cuposEmpleador)

    const trabajadoresTop = candidatosConVotos
      .filter((c) => c.origen === 'REPRESENTANTE_TRABAJADORES')
      .sort((a, b) => b.votos - a.votos)
      .slice(0, data.cuposTrabajadores)

    const ganadores = [...empleadorTop, ...trabajadoresTop]

    const updated: EleccionData = {
      ...data,
      estado: 'CERRADA',
      ganadores,
    }

    await prisma.sstRecord.update({
      where: { id: record.id },
      data: {
        data: updated as never,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Reactivar el comité
    await prisma.comiteSST.update({
      where: { id },
      data: { estado: 'VIGENTE' },
    })

    await prisma.auditLog
      .create({
        data: {
          orgId: ctx.orgId,
          userId: ctx.userId,
          action: 'sst.comite.eleccion.cerrada',
          entityType: 'ComiteSST',
          entityId: id,
          metadataJson: {
            ganadores: ganadores.length,
            votosTotal: data.votos.length,
          },
        },
      })
      .catch(() => undefined)

    return NextResponse.json({ ganadores, votosTotal: data.votos.length })
  },
)

// =============================================
// HELPER — Hash del voto (SHA-256)
// =============================================
export function computarHashVoto(payload: {
  electorWorkerId: string
  candidatoWorkerId: string
  timestamp: string
  comiteId: string
}): string {
  const str = `${payload.electorWorkerId}|${payload.candidatoWorkerId}|${payload.timestamp}|${payload.comiteId}`
  return createHash('sha256').update(str).digest('hex')
}
