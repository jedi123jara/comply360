import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-auth'
import type { AuthContext } from '@/lib/auth'

/**
 * POST /api/sst/puestos/bulk-assign
 *
 * Asigna trabajadores a puestos de forma masiva en una sola transacción.
 * Diseñado para que un admin SST pueda completar la matriz puesto → worker
 * de toda una sede en un solo guardado, en lugar de editar uno por uno.
 *
 * Cuerpo:
 *   {
 *     assignments: [
 *       { puestoId: 'cuid', workerId: 'cuid' },        // asignar
 *       { puestoId: 'cuid', workerId: null },          // desasignar
 *     ]
 *   }
 *
 * Comportamiento:
 *   - Validaciones tenant-scoped: puesto y worker deben pertenecer a ctx.orgId.
 *   - Si una asignación falla la validación, se omite de la transacción y se
 *     reporta en `skipped`. Las demás se aplican (best-effort).
 *   - Idempotente: si el puesto ya tiene asignado el mismo worker, no hace
 *     update inútil (cuenta como `unchanged`).
 *   - Audit log con el conteo total y la lista de cambios.
 *
 * Retorna:
 *   { applied, unchanged, skipped: [{ puestoId, reason }] }
 */

const bulkAssignSchema = z.object({
  assignments: z
    .array(
      z.object({
        puestoId: z.string().min(1),
        workerId: z.string().min(1).nullable(),
      }),
    )
    .min(1, 'Debe enviar al menos una asignación')
    .max(500, 'Máximo 500 asignaciones por llamada'),
})

interface SkippedEntry {
  puestoId: string
  reason: string
}

export const POST = withAuth(async (req: NextRequest, ctx: AuthContext) => {
  const body = await req.json().catch(() => ({}))
  const parsed = bulkAssignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { assignments } = parsed.data

  // Validar pertenencia de todos los puestos en una sola query.
  const puestoIds = Array.from(new Set(assignments.map((a) => a.puestoId)))
  const puestos = await prisma.puestoTrabajo.findMany({
    where: { id: { in: puestoIds }, orgId: ctx.orgId },
    select: { id: true, workerId: true },
  })
  const validPuestoMap = new Map(puestos.map((p) => [p.id, p]))

  // Validar pertenencia de todos los workers (solo los no-null) en una sola query.
  const workerIds = Array.from(
    new Set(assignments.map((a) => a.workerId).filter((w): w is string => !!w)),
  )
  const workers = workerIds.length
    ? await prisma.worker.findMany({
        where: { id: { in: workerIds }, orgId: ctx.orgId, status: 'ACTIVE' },
        select: { id: true },
      })
    : []
  const validWorkerSet = new Set(workers.map((w) => w.id))

  // Construir el set de operaciones a aplicar y el de descartes.
  const skipped: SkippedEntry[] = []
  const toApply: Array<{ puestoId: string; workerId: string | null }> = []

  for (const a of assignments) {
    const puesto = validPuestoMap.get(a.puestoId)
    if (!puesto) {
      skipped.push({
        puestoId: a.puestoId,
        reason: 'Puesto no pertenece a esta organización',
      })
      continue
    }
    if (a.workerId !== null && !validWorkerSet.has(a.workerId)) {
      skipped.push({
        puestoId: a.puestoId,
        reason: 'Trabajador no pertenece a esta organización o no está activo',
      })
      continue
    }
    toApply.push(a)
  }

  // Idempotencia: separamos los no-ops para no emitir UPDATEs vacíos.
  const realChanges = toApply.filter((a) => {
    const current = validPuestoMap.get(a.puestoId)!
    return current.workerId !== a.workerId
  })
  const unchanged = toApply.length - realChanges.length

  if (realChanges.length > 0) {
    await prisma.$transaction(
      realChanges.map((a) =>
        prisma.puestoTrabajo.update({
          where: { id: a.puestoId },
          data: { workerId: a.workerId },
        }),
      ),
    )
  }

  const applied = realChanges.length

  // Audit log defensivo de la operación masiva.
  // JSON.parse(JSON.stringify(...)) limpia el objeto a InputJsonValue plano
  // (sin las constraints de tipo que Prisma exige).
  await prisma.auditLog.create({
    data: {
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: 'PUESTOS_BULK_ASSIGN',
      entityType: 'PuestoTrabajo',
      entityId: 'bulk',
      metadataJson: JSON.parse(
        JSON.stringify({
          total: assignments.length,
          applied,
          unchanged,
          skipped: skipped.length,
          skippedDetails: skipped,
        }),
      ),
    },
  })

  return NextResponse.json({
    applied,
    unchanged,
    skippedCount: skipped.length,
    skipped,
  })
})
