/**
 * GET /api/mi-portal/contratos/[id]
 *
 * Detalle completo de un contrato, incluido su contenido renderizado, para que
 * el trabajador lo lea antes de firmar.
 *
 * Defensa en profundidad: valida que el contrato esté vinculado al worker
 * autenticado vía `WorkerContract`.
 */

import { NextResponse } from 'next/server'
import { withWorkerAuthParams } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export const GET = withWorkerAuthParams<{ id: string }>(async (_req, ctx, params) => {
  // Validar vínculo worker ↔ contract
  const link = await prisma.workerContract.findFirst({
    where: { workerId: ctx.workerId, contractId: params.id },
    include: {
      contract: {
        include: {
          organization: {
            select: {
              name: true,
              razonSocial: true,
              ruc: true,
              address: true,
            },
          },
          createdBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      },
    },
  })

  if (!link) {
    return NextResponse.json({ error: 'Contrato no encontrado' }, { status: 404 })
  }

  const c = link.contract
  if (c.status === 'ARCHIVED') {
    return NextResponse.json({ error: 'Contrato archivado' }, { status: 404 })
  }

  const formData = (c.formData ?? {}) as Record<string, unknown>
  const signatureMeta = formData._signature as
    | { level?: string; signedAt?: string; userAgent?: string; ipAddress?: string }
    | undefined

  return NextResponse.json({
    id: c.id,
    title: c.title,
    type: c.type,
    status: c.status,
    pendingToSign: ['DRAFT', 'IN_REVIEW', 'APPROVED'].includes(c.status),
    contentHtml: c.contentHtml ?? '',
    signedAt: c.signedAt?.toISOString() ?? null,
    signature: signatureMeta
      ? {
          level: signatureMeta.level ?? 'SIMPLE',
          signedAt: signatureMeta.signedAt ?? null,
          userAgent: signatureMeta.userAgent ?? null,
        }
      : null,
    expiresAt: c.expiresAt?.toISOString() ?? null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    pdfUrl: c.pdfUrl ?? null,
    organization: {
      name: c.organization.name,
      razonSocial: c.organization.razonSocial,
      ruc: c.organization.ruc,
      address: c.organization.address,
    },
    sentBy: c.createdBy
      ? {
          name: `${c.createdBy.firstName ?? ''} ${c.createdBy.lastName ?? ''}`.trim(),
          email: c.createdBy.email,
        }
      : null,
  })
})
