/**
 * GET /api/org-documents/with-ack
 *
 * Lista TODOS los OrgDocument de la org que requieren acuse de recibo,
 * con su progreso (cuántos firmaron / pendientes / %).
 *
 * Para la pantalla admin /dashboard/documentos-firma que centraliza
 * gestión de docs requireAck.
 *
 * Auth: MEMBER+ (cualquier rol del dashboard puede ver).
 */

import { NextResponse } from 'next/server'
import { withPlanGate } from '@/lib/plan-gate'
import { prisma } from '@/lib/prisma'
import { getAcknowledgmentProgressBatch, type AckProgress } from '@/lib/documents/acknowledgments'

const EMPTY_PROGRESS: AckProgress = { total: 0, signed: 0, pending: 0, signedPct: 100, version: 0 }

export const GET = withPlanGate('contratos', async (_req, ctx) => {
  const docs = await prisma.orgDocument.findMany({
    where: {
      orgId: ctx.orgId,
      acknowledgmentRequired: true,
    },
    select: {
      id: true,
      type: true,
      title: true,
      version: true,
      scopeFilter: true,
      isPublishedToWorkers: true,
      publishedAt: true,
      lastNotifiedAt: true,
      acknowledgmentDeadlineDays: true,
      updatedAt: true,
    },
    orderBy: [{ isPublishedToWorkers: 'desc' }, { updatedAt: 'desc' }],
  })

  // FIX N+1: progreso calculado en batch (2 queries totales) en vez de 3 queries
  // por documento.
  const progressMap = await getAcknowledgmentProgressBatch(
    ctx.orgId,
    docs.map((d) => ({ id: d.id, version: d.version, scopeFilter: d.scopeFilter })),
  )
  const withProgress = docs.map((doc) => ({
    ...doc,
    progress: progressMap.get(doc.id) ?? { ...EMPTY_PROGRESS, version: doc.version },
  }))

  return NextResponse.json({
    documents: withProgress,
    total: withProgress.length,
    summary: {
      published: withProgress.filter((d) => d.isPublishedToWorkers).length,
      withPending: withProgress.filter((d) => d.progress.pending > 0).length,
      fullySigned: withProgress.filter((d) => d.progress.pending === 0 && d.progress.total > 0)
        .length,
    },
  })
})

