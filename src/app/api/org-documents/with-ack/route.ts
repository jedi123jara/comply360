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
import { getAcknowledgmentProgress } from '@/lib/documents/acknowledgments'

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
      isPublishedToWorkers: true,
      publishedAt: true,
      lastNotifiedAt: true,
      acknowledgmentDeadlineDays: true,
      updatedAt: true,
    },
    orderBy: [{ isPublishedToWorkers: 'desc' }, { updatedAt: 'desc' }],
  })

  // Calcular progreso para cada doc en paralelo
  const withProgress = await Promise.all(
    docs.map(async (doc) => {
      const progress = await getAcknowledgmentProgress(ctx.orgId, doc.id)
      return {
        ...doc,
        progress,
      }
    }),
  )

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

