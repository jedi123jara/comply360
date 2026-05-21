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
  const [worker, initialLinks, contractDocuments] = await Promise.all([
    prisma.worker.findUnique({
      where: { id: ctx.workerId },
      select: { dni: true, email: true },
    }),
    prisma.workerContract.findMany({
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
    }),
    prisma.workerDocument.findMany({
      where: {
        workerId: ctx.workerId,
        OR: [
          { documentType: 'contrato_trabajo' },
          { documentType: { contains: 'contrato' } },
          { title: { contains: 'Contrato' } },
          { title: { contains: 'contrato' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
  ])

  let links = initialLinks

  // Contratos legacy: versiones antiguas podían guardar el DNI en formData sin
  // crear WorkerContract. Si encontramos una coincidencia fuerte, la vinculamos
  // en lectura para que el trabajador no vea una bandeja vacía.
  if (worker && links.length === 0) {
    const candidates = await prisma.contract.findMany({
      where: { orgId: ctx.orgId, status: { not: 'ARCHIVED' } },
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
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    const matches = candidates.filter((c) => contractMatchesWorker(c.formData, worker))
    if (matches.length > 0) {
      await Promise.all(
        matches.map((contract) =>
          prisma.workerContract.upsert({
            where: { workerId_contractId: { workerId: ctx.workerId, contractId: contract.id } },
            create: { workerId: ctx.workerId, contractId: contract.id },
            update: {},
          }).catch(() => null),
        ),
      )
      links = matches.map((contract) => ({
        id: `legacy-${contract.id}`,
        workerId: ctx.workerId,
        contractId: contract.id,
        assignedAt: contract.updatedAt,
        contract,
      }))
    }
  }

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
    contractDocuments: contractDocuments.map((d) => ({
      id: d.id,
      title: d.title,
      documentType: d.documentType,
      status: d.status,
      fileUrl: d.fileUrl,
      updatedAt: d.updatedAt.toISOString(),
      createdAt: d.createdAt.toISOString(),
    })),
    totals: {
      total: sorted.length + contractDocuments.length,
      pending: sorted.filter((c) => c.pendingToSign).length,
      signed: sorted.filter((c) => c.status === 'SIGNED').length,
    },
  })
})

function contractMatchesWorker(
  formData: unknown,
  worker: { dni: string | null; email: string | null },
): boolean {
  if (!formData || typeof formData !== 'object') return false
  const data = formData as Record<string, unknown>
  const workerDni = normalizeDigits(worker.dni)
  const workerEmail = normalizeEmail(worker.email)
  const dniKeys = ['trabajador_dni', 'trabajadorDni', 'workerDni', 'dni_trabajador', 'documento_trabajador']
  const emailKeys = ['trabajador_email', 'trabajadorEmail', 'workerEmail', 'email_trabajador']

  if (workerDni) {
    for (const key of dniKeys) {
      if (normalizeDigits(data[key]) === workerDni) return true
    }
  }

  if (workerEmail) {
    for (const key of emailKeys) {
      if (normalizeEmail(data[key]) === workerEmail) return true
    }
  }

  return false
}

function normalizeDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase()
}
