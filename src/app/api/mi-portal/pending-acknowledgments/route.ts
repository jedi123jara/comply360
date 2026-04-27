/**
 * GET /api/mi-portal/pending-acknowledgments
 *
 * Worker-only. Devuelve los documentos pendientes de firma para el worker
 * autenticado. Usado por:
 *   - Banner persistente en /mi-portal home
 *   - Sección "Por firmar" en /mi-portal/documentos
 *   - Página de lectura+firma /mi-portal/documentos/{id}/firmar
 *
 * Cada item incluye:
 *   - id, title, description, version, type
 *   - daysRemaining (si tiene deadline)
 *   - urgent (true si <= 2 días)
 *
 * Auth: Worker que tenga User vinculado a un Worker entry de su org.
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'
import { getWorkerPendingDocs } from '@/lib/documents/acknowledgments'

export const GET = withWorkerAuth(async (_req, ctx) => {
  // El worker auth context da userId — buscamos el Worker entry vinculado
  const worker = await prisma.worker.findFirst({
    where: { userId: ctx.userId, orgId: ctx.orgId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (!worker) {
    // Worker self-serve sin empresa vinculada — no hay docs pendientes
    return NextResponse.json({ pending: [], total: 0 })
  }

  const pending = await getWorkerPendingDocs(worker.id, ctx.orgId)

  return NextResponse.json({
    pending,
    total: pending.length,
    urgentCount: pending.filter((d) => d.urgent).length,
  })
})
