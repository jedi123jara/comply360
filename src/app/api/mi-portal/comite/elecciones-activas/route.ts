import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withWorkerAuth } from '@/lib/api-auth'

/**
 * GET /api/mi-portal/comite/elecciones-activas
 *
 * Devuelve las elecciones de Comité SST activas en la organización del worker
 * autenticado. Si el worker ya votó, indica `yaVote: true` para ocultar el
 * formulario y mostrar comprobante.
 *
 * Solo devuelve metadata mínima (no expone los votos individuales — eso es
 * solo del admin).
 */

interface CandidatoOut {
  workerId: string
  nombre: string
  origen: 'REPRESENTANTE_EMPLEADOR' | 'REPRESENTANTE_TRABAJADORES'
}

interface EleccionDataRaw {
  estado: 'EN_VOTACION' | 'CERRADA'
  fechaInicio: string
  fechaCierre: string
  cuposEmpleador: number
  cuposTrabajadores: number
  candidatos: Array<{ workerId: string; origen: string }>
  votos: Array<{ electorWorkerId: string; hashFirma: string }>
}

export const GET = withWorkerAuth(async (_req, ctx) => {
  // Buscar SstRecords ACTA_COMITE de elecciones EN_VOTACION
  const records = await prisma.sstRecord.findMany({
    where: { orgId: ctx.orgId, type: 'ACTA_COMITE' },
    select: { id: true, title: true, data: true, createdAt: true },
  })

  const now = Date.now()
  const activas = []
  for (const r of records) {
    const data = r.data as unknown as EleccionDataRaw | null
    if (!data || data.estado !== 'EN_VOTACION') continue
    const inicio = new Date(data.fechaInicio).getTime()
    const cierre = new Date(data.fechaCierre).getTime()
    if (now < inicio || now > cierre) continue

    const yaVote = data.votos.some((v) => v.electorWorkerId === ctx.workerId)

    // Fetch candidate names en una sola query
    const candidatoIds = data.candidatos.map((c) => c.workerId)
    const workers = candidatoIds.length
      ? await prisma.worker.findMany({
          where: { id: { in: candidatoIds }, orgId: ctx.orgId },
          select: { id: true, firstName: true, lastName: true, dni: true },
        })
      : []
    const workerById = new Map(workers.map((w) => [w.id, w]))

    const candidatos: CandidatoOut[] = data.candidatos.map((c) => {
      const w = workerById.get(c.workerId)
      return {
        workerId: c.workerId,
        nombre: w ? `${w.firstName} ${w.lastName}` : '(trabajador no encontrado)',
        origen: c.origen as CandidatoOut['origen'],
      }
    })

    activas.push({
      comiteId: r.title, // title === comiteId en este SstRecord
      fechaInicio: data.fechaInicio,
      fechaCierre: data.fechaCierre,
      cuposEmpleador: data.cuposEmpleador,
      cuposTrabajadores: data.cuposTrabajadores,
      candidatos,
      yaVote,
    })
  }

  return NextResponse.json({ elecciones: activas })
})
