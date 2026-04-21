/**
 * GET /api/mi-portal/contratos
 *
 * Lista contratos vinculados al trabajador autenticado.
 *
 * Prioriza los pendientes de firma (status APPROVED o IN_REVIEW) en primera
 * posición. Incluye metadatos suficientes para la lista sin el contenido HTML
 * (que solo se carga en el detalle).
 */

import { NextResponse } from 'next/server'
import { withWorkerAuth } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export const GET = withWorkerAuth(async (_req, ctx) => {
  const links = await prisma.workerContract.findMany({
    where: { workerId: ctx.workerId },
    include: {
      contract: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          signedAt: true,
          expiresAt: true,
          createdAt: true,
          updatedAt: true,
          formData: true,
          pdfUrl: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  })

  const now = Date.now()

  const contracts = links
    .filter((l) => l.contract.status !== 'ARCHIVED')
    .map((l) => {
      const c = l.contract
      // Pending to sign: DRAFT, IN_REVIEW, APPROVED (excluye SIGNED / EXPIRED / ARCHIVED)
      const pendingToSign = ['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(c.status)
      const expired = c.expiresAt ? c.expiresAt.getTime() < now : false
      const daysToExpire =
        c.expiresAt && !expired
          ? Math.ceil((c.expiresAt.getTime() - now) / (1000 * 60 * 60 * 24))
          : null

      // Extract signature metadata if present in formData
      const formData = (c.formData ?? {}) as Record<string, unknown>
      const signatureMeta = formData._signature as
        | { level?: string; signedAt?: string }
        | undefined

      return {
        id: c.id,
        title: c.title,
        type: c.type,
        status: c.status,
        pendingToSign,
        signedAt: c.signedAt?.toISOString() ?? null,
        signatureLevel: signatureMeta?.level ?? null,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        expired,
        daysToExpire,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        hasPdf: Boolean(c.pdfUrl),
      }
    })

  // Pending first, then by most recent
  const sorted = contracts.sort((a, b) => {
    if (a.pendingToSign !== b.pendingToSign) return a.pendingToSign ? -1 : 1
    return b.updatedAt.localeCompare(a.updatedAt)
  })

  return NextResponse.json({
    contracts: sorted,
    totals: {
      total: sorted.length,
      pending: sorted.filter((c) => c.pendingToSign).length,
      signed: sorted.filter((c) => c.status === 'SIGNED').length,
    },
  })
})
