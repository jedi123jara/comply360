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
import { getWorkerPendingDocs } from '@/lib/documents/acknowledgments'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const pending = await getWorkerPendingDocs(ctx.workerId, ctx.orgId)

  return NextResponse.json({
    pending,
    total: pending.length,
    urgentCount: pending.filter((d) => d.urgent).length,
  })
})
