// =============================================
// JURISPRUDENCE UPDATE — SERVICE
// CRUD + apply + audit. Llamado desde los endpoints admin.
// =============================================

import { prisma } from '@/lib/prisma'
import { Prisma } from '@/generated/prisma/client'
import type {
  ApplyResult,
  ClauseAffectation,
  RuleAffectation,
} from './types'
import { applyJurisprudenceAffectations } from './apply'
import { logAudit } from '@/lib/audit'

export interface CreateUpdateInput {
  source: 'CORTE_SUPREMA' | 'TRIBUNAL_CONSTITUCIONAL' | 'SUNAFIL' | 'MTPE' | 'OTRO'
  reference: string
  title: string
  publicationDate: Date
  topic: string
  summary: string
  fullTextUrl?: string | null
  affectedRules: RuleAffectation[]
  affectedClauses: ClauseAffectation[]
  notes?: string | null
}

export async function createJurisprudenceUpdate(input: CreateUpdateInput, actorId: string) {
  const created = await prisma.jurisprudenceUpdate.create({
    data: {
      source: input.source,
      reference: input.reference,
      title: input.title,
      publicationDate: input.publicationDate,
      topic: input.topic,
      summary: input.summary,
      fullTextUrl: input.fullTextUrl ?? null,
      affectedRules: input.affectedRules as unknown as Prisma.InputJsonValue,
      affectedClauses: input.affectedClauses as unknown as Prisma.InputJsonValue,
      notes: input.notes ?? null,
    },
  })

  await logAudit({
    orgId: 'PLATFORM', // entity de plataforma — no pertenece a tenant
    userId: actorId,
    action: 'jurisprudence.created',
    entityType: 'JurisprudenceUpdate',
    entityId: created.id,
    metadata: {
      reference: input.reference,
      affectedRules: input.affectedRules.length,
      affectedClauses: input.affectedClauses.length,
    },
  })

  return created
}

export interface UpdateJurisprudenceInput {
  title?: string
  topic?: string
  summary?: string
  fullTextUrl?: string | null
  affectedRules?: RuleAffectation[]
  affectedClauses?: ClauseAffectation[]
  notes?: string | null
}

export async function updateJurisprudenceUpdate(
  id: string,
  input: UpdateJurisprudenceInput,
  actorId: string,
) {
  const existing = await prisma.jurisprudenceUpdate.findUnique({ where: { id } })
  if (!existing) throw new JurisprudenceNotFoundError(id)
  if (existing.reviewStatus === 'APPLIED') {
    throw new Error('Ya fue aplicada — no se puede editar (cree un update nuevo).')
  }

  const data: Prisma.JurisprudenceUpdateUpdateInput = {}
  if (input.title !== undefined) data.title = input.title
  if (input.topic !== undefined) data.topic = input.topic
  if (input.summary !== undefined) data.summary = input.summary
  if (input.fullTextUrl !== undefined) data.fullTextUrl = input.fullTextUrl
  if (input.notes !== undefined) data.notes = input.notes
  if (input.affectedRules !== undefined) {
    data.affectedRules = input.affectedRules as unknown as Prisma.InputJsonValue
  }
  if (input.affectedClauses !== undefined) {
    data.affectedClauses = input.affectedClauses as unknown as Prisma.InputJsonValue
  }

  const updated = await prisma.jurisprudenceUpdate.update({ where: { id }, data })

  await logAudit({
    orgId: 'PLATFORM',
    userId: actorId,
    action: 'jurisprudence.updated',
    entityType: 'JurisprudenceUpdate',
    entityId: id,
    metadata: { fields: Object.keys(input).join(',') },
  })

  return updated
}

export async function approveJurisprudence(id: string, actorId: string) {
  const existing = await prisma.jurisprudenceUpdate.findUnique({ where: { id } })
  if (!existing) throw new JurisprudenceNotFoundError(id)
  if (existing.reviewStatus !== 'PENDING') {
    throw new Error(`No se puede aprobar — estado actual: ${existing.reviewStatus}`)
  }
  const updated = await prisma.jurisprudenceUpdate.update({
    where: { id },
    data: {
      reviewStatus: 'APPROVED',
      reviewedBy: actorId,
      reviewedAt: new Date(),
    },
  })
  await logAudit({
    orgId: 'PLATFORM',
    userId: actorId,
    action: 'jurisprudence.approved',
    entityType: 'JurisprudenceUpdate',
    entityId: id,
  })
  return updated
}

export async function rejectJurisprudence(id: string, actorId: string, reason: string) {
  const existing = await prisma.jurisprudenceUpdate.findUnique({ where: { id } })
  if (!existing) throw new JurisprudenceNotFoundError(id)
  if (existing.reviewStatus === 'APPLIED') {
    throw new Error('Ya fue aplicada — no se puede rechazar.')
  }
  const updated = await prisma.jurisprudenceUpdate.update({
    where: { id },
    data: {
      reviewStatus: 'REJECTED',
      reviewedBy: actorId,
      reviewedAt: new Date(),
      notes: existing.notes ? `${existing.notes}\n[REJECTED]: ${reason}` : `[REJECTED]: ${reason}`,
    },
  })
  await logAudit({
    orgId: 'PLATFORM',
    userId: actorId,
    action: 'jurisprudence.rejected',
    entityType: 'JurisprudenceUpdate',
    entityId: id,
    metadata: { reason: reason.slice(0, 200) },
  })
  return updated
}

/**
 * Aplica las afectaciones de un update. Idempotente: si se llama dos veces
 * la segunda vez verá ALREADY_EXISTS / NOT_FOUND y no duplicará nada.
 *
 * Estado: PENDING/APPROVED → APPLIED (siempre que no tenga errores fatales).
 */
export async function applyJurisprudence(id: string, actorId: string): Promise<{
  update: Awaited<ReturnType<typeof prisma.jurisprudenceUpdate.findUnique>>
  applyResult: ApplyResult
}> {
  const existing = await prisma.jurisprudenceUpdate.findUnique({ where: { id } })
  if (!existing) throw new JurisprudenceNotFoundError(id)
  if (existing.reviewStatus === 'APPLIED') {
    throw new Error('Ya fue aplicada anteriormente.')
  }
  if (existing.reviewStatus === 'REJECTED') {
    throw new Error('Update marcado como rechazado — no se puede aplicar.')
  }

  const rules = (existing.affectedRules as unknown as RuleAffectation[]) ?? []
  const clauses = (existing.affectedClauses as unknown as ClauseAffectation[]) ?? []

  const applyResult = await applyJurisprudenceAffectations(prisma, { rules, clauses })

  const update = await prisma.jurisprudenceUpdate.update({
    where: { id },
    data: {
      reviewStatus: 'APPLIED',
      appliedAt: new Date(),
      appliedBy: actorId,
      applyResult: applyResult as unknown as Prisma.InputJsonValue,
    },
  })

  await logAudit({
    orgId: 'PLATFORM',
    userId: actorId,
    action: 'jurisprudence.applied',
    entityType: 'JurisprudenceUpdate',
    entityId: id,
    metadata: {
      reference: existing.reference,
      changed: applyResult.totalChanged,
      skipped: applyResult.totalSkipped,
      errors: applyResult.totalErrors,
    },
  })

  return { update, applyResult }
}

export async function listJurisprudence(filter: {
  status?: 'PENDING' | 'APPROVED' | 'APPLIED' | 'REJECTED'
  source?: string
  limit?: number
} = {}) {
  return prisma.jurisprudenceUpdate.findMany({
    where: {
      ...(filter.status ? { reviewStatus: filter.status } : {}),
      ...(filter.source ? { source: filter.source as 'CORTE_SUPREMA' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: Math.min(filter.limit ?? 50, 200),
  })
}

export async function getJurisprudence(id: string) {
  return prisma.jurisprudenceUpdate.findUnique({ where: { id } })
}

export class JurisprudenceNotFoundError extends Error {
  constructor(id: string) {
    super(`JurisprudenceUpdate ${id} no encontrado`)
    this.name = 'JurisprudenceNotFoundError'
  }
}
