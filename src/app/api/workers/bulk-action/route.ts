import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, hasMinRole } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'
import type { WorkerStatus, RegimenLaboral, TipoCese } from '@/generated/prisma/client'

const VALID_STATUSES: WorkerStatus[] = ['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'TERMINATED']

const VALID_REGIMENES: RegimenLaboral[] = [
  'GENERAL', 'MYPE_MICRO', 'MYPE_PEQUENA', 'AGRARIO', 'CONSTRUCCION_CIVIL',
  'MINERO', 'PESQUERO', 'TEXTIL_EXPORTACION', 'DOMESTICO', 'CAS',
  'MODALIDAD_FORMATIVA', 'TELETRABAJO',
]

const VALID_TIPOS_CESE: TipoCese[] = [
  'RENUNCIA_VOLUNTARIA', 'DESPIDO_CAUSA_JUSTA', 'DESPIDO_ARBITRARIO',
  'MUTUO_DISENSO', 'TERMINO_CONTRATO', 'NO_RENOVACION',
  'FALLECIMIENTO', 'JUBILACION', 'PERIODO_PRUEBA',
]

const MAX_BATCH = 200

/**
 * POST /api/workers/bulk-action
 *
 * Acciones masivas sobre trabajadores. Body siempre incluye:
 *   { ids: string[]; action: string; ...campos según action }
 *
 * Acciones soportadas (Fase 1 — Bulk CRUD):
 *   - change-status: { status: WorkerStatus }
 *   - change-department: { department: string | null }
 *   - change-regimen: { regimenLaboral: RegimenLaboral }
 *   - terminate-bulk: { tipoCese: TipoCese; fechaCese: ISODate; motivoCese: string }
 *
 * Todas las acciones excepto change-status excluyen workers ya TERMINATED.
 * Se reportan los workers saltados con razón en `skipped[]`.
 */
export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  if (!hasMinRole(ctx.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Se requiere rol ADMIN o superior' }, { status: 403 })
  }

  const body = await req.json()
  const { ids, action } = body as { ids: string[]; action: string }

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un ID' }, { status: 400 })
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { error: `Máximo ${MAX_BATCH} trabajadores por operación` },
      { status: 400 },
    )
  }

  switch (action) {
    case 'change-status': {
      const { status } = body as { status?: string }
      if (!status || !VALID_STATUSES.includes(status as WorkerStatus)) {
        return NextResponse.json(
          { error: `Estado inválido. Opciones: ${VALID_STATUSES.join(', ')}` },
          { status: 400 },
        )
      }
      const result = await prisma.worker.updateMany({
        where: { id: { in: ids }, orgId: ctx.orgId },
        data: { status: status as WorkerStatus },
      })
      return NextResponse.json({ updated: result.count, skipped: [], action, status })
    }

    case 'change-department': {
      const { department } = body as { department?: string | null }
      // null/string vacío significa quitar el área (sin departamento)
      const dept = department && department.trim() ? department.trim() : null

      // Excluir TERMINATED — no tiene sentido cambiar área a un cesado
      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      const result = await prisma.worker.updateMany({
        where: { id: { in: [...eligibleIds] }, orgId: ctx.orgId },
        data: { department: dept },
      })
      return NextResponse.json({ updated: result.count, skipped, action, department: dept })
    }

    case 'change-regimen': {
      const { regimenLaboral } = body as { regimenLaboral?: string }
      if (!regimenLaboral || !VALID_REGIMENES.includes(regimenLaboral as RegimenLaboral)) {
        return NextResponse.json(
          { error: `Régimen inválido. Opciones: ${VALID_REGIMENES.join(', ')}` },
          { status: 400 },
        )
      }

      const eligibles = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true },
      })
      const eligibleIds = new Set(eligibles.map(w => w.id))
      const skipped = ids
        .filter(id => !eligibleIds.has(id))
        .map(id => ({ id, reason: 'Trabajador cesado o no encontrado' }))

      const result = await prisma.worker.updateMany({
        where: { id: { in: [...eligibleIds] }, orgId: ctx.orgId },
        data: { regimenLaboral: regimenLaboral as RegimenLaboral },
      })
      return NextResponse.json({ updated: result.count, skipped, action, regimenLaboral })
    }

    case 'terminate-bulk': {
      const { tipoCese, fechaCese, motivoCese } = body as {
        tipoCese?: string
        fechaCese?: string
        motivoCese?: string
      }
      if (!tipoCese || !VALID_TIPOS_CESE.includes(tipoCese as TipoCese)) {
        return NextResponse.json(
          { error: `Tipo de cese inválido. Opciones: ${VALID_TIPOS_CESE.join(', ')}` },
          { status: 400 },
        )
      }
      if (!fechaCese || isNaN(new Date(fechaCese).getTime())) {
        return NextResponse.json({ error: 'fechaCese inválida (formato YYYY-MM-DD)' }, { status: 400 })
      }
      if (!motivoCese || motivoCese.trim().length < 3) {
        return NextResponse.json({ error: 'motivoCese requiere al menos 3 caracteres' }, { status: 400 })
      }

      const fechaCeseDate = new Date(fechaCese)
      const motivoTrim = motivoCese.trim()

      // 1. Workers no cesados, de la org
      const candidates = await prisma.worker.findMany({
        where: { id: { in: ids }, orgId: ctx.orgId, status: { not: 'TERMINATED' } },
        select: { id: true, sueldoBruto: true },
      })

      // 2. Workers con CeseRecord previo (no debería pasar si status != TERMINATED, pero cubrimos
      //    el caso de inconsistencia histórica). CeseRecord.workerId es @unique.
      const existingCeses = candidates.length > 0
        ? await prisma.ceseRecord.findMany({
            where: { workerId: { in: candidates.map(w => w.id) } },
            select: { workerId: true },
          })
        : []
      const idsConCese = new Set(existingCeses.map(c => c.workerId))

      const toProcess = candidates.filter(w => !idsConCese.has(w.id))

      // 3. Build skipped list
      const candidateIds = new Set(candidates.map(w => w.id))
      const skipped: { id: string; reason: string }[] = []
      ids.forEach(id => {
        if (!candidateIds.has(id)) {
          skipped.push({ id, reason: 'Trabajador cesado o no encontrado' })
        } else if (idsConCese.has(id)) {
          skipped.push({ id, reason: 'Ya tiene proceso de cese registrado' })
        }
      })

      // 4. Procesar en chunks de 50 — 200 workers x (1 update + 1 ceseRecord) = 400 writes,
      //    chunks evitan timeouts en Postgres y hacen más simple el rollback parcial.
      const CHUNK_SIZE = 50
      let updated = 0
      for (let i = 0; i < toProcess.length; i += CHUNK_SIZE) {
        const chunk = toProcess.slice(i, i + CHUNK_SIZE)
        const chunkIds = chunk.map(w => w.id)
        await prisma.$transaction([
          prisma.worker.updateMany({
            where: { id: { in: chunkIds }, orgId: ctx.orgId },
            data: {
              status: 'TERMINATED',
              fechaCese: fechaCeseDate,
              motivoCese: motivoTrim,
            },
          }),
          ...chunk.map(w =>
            prisma.ceseRecord.create({
              data: {
                workerId: w.id,
                orgId: ctx.orgId,
                tipoCese: tipoCese as TipoCese,
                causaDetalle: motivoTrim,
                fechaInicioProceso: new Date(),
                fechaCese: fechaCeseDate,
                sueldoBruto: w.sueldoBruto,
                etapa: 'INICIADO',
                observaciones: 'Cese masivo — pendiente cálculo de liquidación individual',
              },
            }),
          ),
        ])
        updated += chunk.length
      }

      return NextResponse.json({ updated, skipped, action, tipoCese, fechaCese: fechaCese })
    }

    default:
      return NextResponse.json({ error: `Acción no reconocida: ${action}` }, { status: 400 })
  }
})
